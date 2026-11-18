import { ITEMS, type ItemId } from "@/data/items";
import { type MoveDef, type StageStat, type StatusId, STAT_NAME, move } from "@/data/pokemon/moves";
import { species } from "@/data/pokemon/species";
import { TYPE_NAME, effectiveness } from "@/data/pokemon/types";
import { type Rng, randInt } from "@/game/core/rng";
import { type Mon, addExp, displayName, expYield, grantLevel, maxHp, statsOf } from "@/game/pokemon/mon";

export type Side = "player" | "foe";
export type BattleKind = "wild" | "trainer";
export type Stages = Record<StageStat, number>;
export type Outcome = "win" | "lose" | "run" | "caught";

export type BattleConfig = {
  kind: BattleKind;
  playerParty: Mon[];
  foeParty: Mon[];
  bag: Partial<Record<ItemId, number>>;
  trainerName?: string;
  reward?: number;
  allowLoss?: boolean;
  gentleFoe?: boolean;
  background?: string;
};

type Combatant = { party: Mon[]; active: number; stages: Stages; flinch: boolean };

export type BattleState = {
  kind: BattleKind;
  trainerName?: string;
  reward: number;
  allowLoss: boolean;
  gentleFoe: boolean;
  background: string;
  player: Combatant;
  foe: Combatant;
  bag: Partial<Record<ItemId, number>>;
  escapeAttempts: number;
  participants: string[];
  outcome: Outcome | null;
  needSwitch: boolean;
  pendingLearn: { uid: string; moveId: string }[];
  caught: Mon | null;
  turn: number;
};

export type Action =
  | { type: "move"; index: number }
  | { type: "item"; item: ItemId; target?: number }
  | { type: "switch"; index: number }
  | { type: "run" };

export type BattleEvent =
  | { type: "message"; text: string }
  | { type: "sendOut"; side: Side; index: number }
  | { type: "withdraw"; side: Side }
  | { type: "move"; side: Side; moveId: string }
  | { type: "damage"; side: Side; amount: number; hp: number; max: number; effectiveness: number; crit: boolean }
  | { type: "heal"; side: Side; hp: number; max: number }
  | { type: "status"; side: Side; status: StatusId | null }
  | { type: "stage"; side: Side; stat: StageStat; stages: number }
  | { type: "faint"; side: Side }
  | { type: "miss"; side: Side }
  | { type: "exp"; uid: string; amount: number; level: number; exp: number }
  | { type: "levelUp"; uid: string; level: number }
  | { type: "learnPrompt"; uid: string; moveId: string }
  | { type: "throw"; item: ItemId; shakes: number; caught: boolean }
  | { type: "end"; outcome: Outcome };

const ZERO_STAGES: Stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 };

const STATUS_TEXT: Record<StatusId, string> = {
  burn: "foi queimado",
  poison: "foi envenenado",
  paralysis: "está paralisado",
  sleep: "adormeceu",
  freeze: "congelou",
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function statStageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

export function accuracyStageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
}

export function activeOf(state: BattleState, side: Side): Mon {
  const c = state[side];
  return c.party[c.active];
}

function label(state: BattleState, side: Side): string {
  const mon = activeOf(state, side);
  if (side === "player") return displayName(mon);
  return state.kind === "wild" ? `${displayName(mon)} selvagem` : `${displayName(mon)} inimigo`;
}

export function startBattle(config: BattleConfig): { state: BattleState; events: BattleEvent[] } {
  const playerParty = clone(config.playerParty);
  const foeParty = clone(config.foeParty);
  const firstAlive = Math.max(0, playerParty.findIndex((mon) => mon.hp > 0));
  const state: BattleState = {
    kind: config.kind,
    trainerName: config.trainerName,
    reward: config.reward ?? 0,
    allowLoss: config.allowLoss ?? false,
    gentleFoe: config.gentleFoe ?? false,
    background: config.background ?? "grass",
    player: { party: playerParty, active: firstAlive, stages: { ...ZERO_STAGES }, flinch: false },
    foe: { party: foeParty, active: 0, stages: { ...ZERO_STAGES }, flinch: false },
    bag: { ...config.bag },
    escapeAttempts: 0,
    participants: [playerParty[firstAlive].uid],
    outcome: null,
    needSwitch: false,
    pendingLearn: [],
    caught: null,
    turn: 0,
  };
  const events: BattleEvent[] = [];
  if (config.kind === "wild") {
    events.push({ type: "message", text: `Um ${displayName(foeParty[0])} selvagem apareceu!` });
  } else {
    events.push({ type: "message", text: `${config.trainerName} quer batalhar!` });
    events.push({ type: "message", text: `${config.trainerName} enviou ${displayName(foeParty[0])}!` });
  }
  events.push({ type: "sendOut", side: "foe", index: 0 });
  events.push({ type: "message", text: `Vai, ${displayName(playerParty[firstAlive])}!` });
  events.push({ type: "sendOut", side: "player", index: firstAlive });
  return { state, events };
}

export type DamageInput = {
  attacker: Mon;
  defender: Mon;
  move: MoveDef;
  attackerStages?: Stages;
  defenderStages?: Stages;
  crit?: boolean;
  roll?: number;
};

export function calcDamage(input: DamageInput): { damage: number; effectiveness: number } {
  const { attacker, defender } = input;
  const def = input.move;
  const types = species(defender.species).types;
  const eff = effectiveness(def.type, types);
  if (eff === 0) return { damage: 0, effectiveness: 0 };
  const fixed = def.effects?.find((effect) => effect.kind === "fixed");
  if (fixed && fixed.kind === "fixed") return { damage: fixed.damage, effectiveness: 1 };
  const a = statsOf(attacker);
  const d = statsOf(defender);
  const physical = def.category === "physical";
  const aStage = input.attackerStages?.[physical ? "atk" : "spa"] ?? 0;
  const dStage = input.defenderStages?.[physical ? "def" : "spd"] ?? 0;
  let attack = (physical ? a.atk : a.spa) * statStageMultiplier(aStage);
  const defense = (physical ? d.def : d.spd) * statStageMultiplier(dStage);
  if (physical && attacker.status === "burn") attack *= 0.5;
  const base = Math.floor(Math.floor((Math.floor((2 * attacker.level) / 5 + 2) * def.power * attack) / defense) / 50) + 2;
  const stab = species(attacker.species).types.includes(def.type) ? 1.5 : 1;
  const roll = input.roll ?? 1;
  const crit = input.crit ? 1.5 : 1;
  const damage = Math.max(1, Math.floor(base * stab * eff * crit * roll));
  return { damage, effectiveness: eff };
}

export function speedOf(mon: Mon, stages: Stages): number {
  const factor = mon.status === "paralysis" ? 0.5 : 1;
  return statsOf(mon).spe * statStageMultiplier(stages.spe) * factor;
}

export function captureOdds(foe: Mon, ballBonus: number, rng: Rng): { shakes: number; caught: boolean } {
  const max = maxHp(foe);
  const rate = species(foe.species).catchRate;
  const statusBonus = foe.status === "sleep" || foe.status === "freeze" ? 2 : foe.status ? 1.5 : 1;
  const a = Math.floor((((3 * max - 2 * foe.hp) * rate * ballBonus) / (3 * max)) * statusBonus);
  if (a >= 255) return { shakes: 4, caught: true };
  const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a))));
  let shakes = 0;
  while (shakes < 4 && Math.floor(rng() * 65536) < b) shakes += 1;
  return { shakes: Math.min(shakes, 3), caught: shakes >= 4 };
}

export function escapes(playerSpeed: number, foeSpeed: number, attempts: number, rng: Rng): boolean {
  if (playerSpeed >= foeSpeed) return true;
  const odds = (Math.floor((playerSpeed * 128) / Math.max(1, foeSpeed)) + 30 * attempts) % 256;
  return Math.floor(rng() * 256) < odds;
}

function immuneTo(mon: Mon, status: StatusId): boolean {
  const types = species(mon.species).types;
  if (status === "burn") return types.includes("fire");
  if (status === "poison") return types.includes("poison") || types.includes("steel");
  if (status === "paralysis") return types.includes("electric");
  if (status === "freeze") return types.includes("ice");
  return false;
}

function applyStatus(state: BattleState, side: Side, status: StatusId, rng: Rng, events: BattleEvent[], fromStatusMove: boolean): void {
  const target = activeOf(state, side);
  if (target.hp <= 0) return;
  if (target.status || immuneTo(target, status)) {
    if (fromStatusMove) events.push({ type: "message", text: "Não teve efeito." });
    return;
  }
  target.status = status;
  if (status === "sleep") target.sleepTurns = randInt(rng, 1, 3);
  events.push({ type: "status", side, status });
  events.push({ type: "message", text: `${label(state, side)} ${STATUS_TEXT[status]}!` });
}

function applyStage(state: BattleState, side: Side, stat: StageStat, stages: number, events: BattleEvent[]): void {
  const c = state[side];
  const before = c.stages[stat];
  const after = Math.max(-6, Math.min(6, before + stages));
  const name = `${STAT_NAME[stat]} de ${label(state, side)}`;
  if (after === before) {
    events.push({ type: "message", text: `${name} não pode ${stages > 0 ? "subir" : "cair"} mais.` });
    return;
  }
  c.stages[stat] = after;
  events.push({ type: "stage", side, stat, stages });
  const amount = Math.abs(stages) >= 2 ? (stages > 0 ? "subiu muito" : "caiu muito") : stages > 0 ? "subiu" : "caiu";
  events.push({ type: "message", text: `${name} ${amount}!` });
}

function other(side: Side): Side {
  return side === "player" ? "foe" : "player";
}

function canAct(state: BattleState, side: Side, rng: Rng, events: BattleEvent[]): boolean {
  const mon = activeOf(state, side);
  const c = state[side];
  if (mon.status === "sleep") {
    mon.sleepTurns -= 1;
    if (mon.sleepTurns > 0) {
      events.push({ type: "message", text: `${label(state, side)} está dormindo.` });
      return false;
    }
    mon.status = null;
    events.push({ type: "status", side, status: null });
    events.push({ type: "message", text: `${label(state, side)} acordou!` });
  }
  if (mon.status === "freeze") {
    if (rng() < 0.2) {
      mon.status = null;
      events.push({ type: "status", side, status: null });
      events.push({ type: "message", text: `${label(state, side)} descongelou!` });
    } else {
      events.push({ type: "message", text: `${label(state, side)} está congelado!` });
      return false;
    }
  }
  if (c.flinch) {
    c.flinch = false;
    events.push({ type: "message", text: `${label(state, side)} hesitou!` });
    return false;
  }
  if (mon.status === "paralysis" && rng() < 0.25) {
    events.push({ type: "message", text: `${label(state, side)} está paralisado! Não consegue se mover!` });
    return false;
  }
  return true;
}

function useMove(state: BattleState, side: Side, moveIndex: number, rng: Rng, events: BattleEvent[]): void {
  const attacker = activeOf(state, side);
  const targetSide = other(side);
  const defender = activeOf(state, targetSide);
  if (attacker.hp <= 0) return;
  if (!canAct(state, side, rng, events)) return;
  const slot = attacker.moves[moveIndex];
  const usable = slot && slot.pp > 0;
  const def = usable ? move(slot.id) : move("tackle");
  if (usable) slot.pp -= 1;
  events.push({ type: "move", side, moveId: def.id });
  events.push({ type: "message", text: `${label(state, side)} usou ${def.name}!` });

  const selfOnly = def.category === "status" && (def.effects ?? []).every((effect) => effect.kind === "stage" && effect.target === "self");
  if (!selfOnly && defender.hp <= 0) {
    events.push({ type: "message", text: "Mas não havia alvo." });
    return;
  }
  if (def.accuracy !== null && !selfOnly) {
    const stage = state[side].stages.accuracy - state[targetSide].stages.evasion;
    const accuracy = def.accuracy * accuracyStageMultiplier(stage);
    if (rng() * 100 >= accuracy) {
      events.push({ type: "miss", side });
      events.push({ type: "message", text: `${label(state, side)} errou o ataque!` });
      return;
    }
  }

  if (def.category === "status") {
    if (def.powder && species(defender.species).types.includes("grass")) {
      events.push({ type: "message", text: `Não afeta ${label(state, targetSide)}...` });
      return;
    }
    for (const effect of def.effects ?? []) {
      if (effect.kind === "stage") applyStage(state, effect.target === "self" ? side : targetSide, effect.stat, effect.stages, events);
      if (effect.kind === "status") applyStatus(state, targetSide, effect.status, rng, events, true);
    }
    return;
  }

  const hits = def.hits ?? 1;
  let landed = 0;
  let lastEff = 1;
  for (let hit = 0; hit < hits && defender.hp > 0; hit += 1) {
    const crit = rng() < (def.highCrit ? 1 / 8 : 1 / 16);
    const roll = 0.85 + rng() * 0.15;
    const result = calcDamage({
      attacker,
      defender,
      move: def,
      attackerStages: state[side].stages,
      defenderStages: state[targetSide].stages,
      crit,
      roll,
    });
    lastEff = result.effectiveness;
    if (result.effectiveness === 0) {
      events.push({ type: "message", text: `Não afeta ${label(state, targetSide)}...` });
      return;
    }
    const amount = Math.min(defender.hp, result.damage);
    defender.hp -= amount;
    landed += 1;
    events.push({ type: "damage", side: targetSide, amount, hp: defender.hp, max: maxHp(defender), effectiveness: result.effectiveness, crit });
    if (crit) events.push({ type: "message", text: "Um golpe crítico!" });
  }
  if (lastEff > 1) events.push({ type: "message", text: "É super eficaz!" });
  if (lastEff > 0 && lastEff < 1) events.push({ type: "message", text: "Não é muito eficaz..." });
  if (hits > 1) events.push({ type: "message", text: `Acertou ${landed} vez(es)!` });

  if (defender.hp > 0) {
    for (const effect of def.effects ?? []) {
      if (effect.kind === "status" && rng() < effect.chance) applyStatus(state, targetSide, effect.status, rng, events, false);
      if (effect.kind === "stage" && rng() < (effect.chance ?? 1)) {
        applyStage(state, effect.target === "self" ? side : targetSide, effect.stat, effect.stages, events);
      }
      if (effect.kind === "flinch" && rng() < effect.chance) state[targetSide].flinch = true;
    }
  }
}

export function chooseFoeMove(state: BattleState, rng: Rng): number {
  const foe = activeOf(state, "foe");
  const target = activeOf(state, "player");
  const options = foe.moves.map((slot, index) => ({ slot, index })).filter(({ slot }) => slot.pp > 0);
  if (options.length === 0) return 0;
  if (state.kind === "wild" || state.gentleFoe) {
    if (state.gentleFoe) {
      const status = options.filter(({ slot }) => move(slot.id).category === "status");
      if (status.length && rng() < 0.55) return status[Math.floor(rng() * status.length)].index;
      const damaging = options.filter(({ slot }) => move(slot.id).category !== "status");
      const pool = damaging.length ? damaging : options;
      pool.sort((a, b) => move(a.slot.id).power - move(b.slot.id).power);
      return pool[0].index;
    }
    return options[Math.floor(rng() * options.length)].index;
  }
  const targetTypes = species(target.species).types;
  const foeTypes = species(foe.species).types;
  const scored = options.map(({ slot, index }) => {
    const def = move(slot.id);
    if (def.category === "status") return { index, score: 18 + rng() * 10 };
    const eff = effectiveness(def.type, targetTypes);
    const stab = foeTypes.includes(def.type) ? 1.5 : 1;
    return { index, score: def.power * eff * stab * (0.85 + rng() * 0.3) };
  });
  scored.sort((a, b) => b.score - a.score);
  return rng() < 0.75 ? scored[0].index : scored[Math.floor(rng() * scored.length)].index;
}

function endOfTurn(state: BattleState, events: BattleEvent[]): void {
  for (const side of ["player", "foe"] as Side[]) {
    const mon = activeOf(state, side);
    if (mon.hp <= 0) continue;
    if (mon.status === "burn" || mon.status === "poison") {
      const amount = Math.min(mon.hp, Math.max(1, Math.floor(maxHp(mon) / 8)));
      mon.hp -= amount;
      events.push({
        type: "message",
        text: mon.status === "burn" ? `${label(state, side)} sofre com a queimadura!` : `${label(state, side)} sofre com o veneno!`,
      });
      events.push({ type: "damage", side, amount, hp: mon.hp, max: maxHp(mon), effectiveness: 1, crit: false });
    }
  }
}

function awardExp(state: BattleState, events: BattleEvent[]): void {
  const foe = activeOf(state, "foe");
  const alive = state.participants
    .map((uid) => state.player.party.find((mon) => mon.uid === uid))
    .filter((mon): mon is Mon => Boolean(mon && mon.hp > 0));
  if (alive.length === 0) return;
  const total = expYield(foe, state.kind === "trainer");
  const share = Math.max(1, Math.floor(total / alive.length));
  for (const mon of alive) {
    const results = addExp(mon, share);
    events.push({ type: "message", text: `${displayName(mon)} ganhou ${share} pontos de experiência!` });
    events.push({ type: "exp", uid: mon.uid, amount: share, level: mon.level, exp: mon.exp });
    for (const result of results) {
      events.push({ type: "levelUp", uid: mon.uid, level: result.level });
      events.push({ type: "message", text: `${displayName(mon)} subiu para o nível ${result.level}!` });
      for (const learned of result.learned) {
        events.push({ type: "message", text: `${displayName(mon)} aprendeu ${move(learned).name}!` });
      }
      for (const pending of result.pending) {
        state.pendingLearn.push({ uid: mon.uid, moveId: pending });
        events.push({ type: "learnPrompt", uid: mon.uid, moveId: pending });
      }
    }
  }
}

function handleFaints(state: BattleState, events: BattleEvent[]): void {
  const foe = activeOf(state, "foe");
  if (foe.hp <= 0 && state.outcome === null) {
    events.push({ type: "faint", side: "foe" });
    events.push({ type: "message", text: `${label(state, "foe")} desmaiou!` });
    awardExp(state, events);
    const next = state.foe.party.findIndex((mon) => mon.hp > 0);
    if (next >= 0) {
      state.foe.active = next;
      state.foe.stages = { ...ZERO_STAGES };
      state.foe.flinch = false;
      state.participants = [activeOf(state, "player").uid];
      events.push({ type: "message", text: `${state.trainerName} enviou ${displayName(state.foe.party[next])}!` });
      events.push({ type: "sendOut", side: "foe", index: next });
    } else {
      state.outcome = "win";
      if (state.kind === "trainer") {
        events.push({ type: "message", text: `Você venceu ${state.trainerName}!` });
        if (state.reward > 0) events.push({ type: "message", text: `Você recebeu ₽${state.reward} pela vitória.` });
      }
      events.push({ type: "end", outcome: "win" });
      return;
    }
  }
  const mine = activeOf(state, "player");
  if (mine.hp <= 0 && state.outcome === null) {
    events.push({ type: "faint", side: "player" });
    events.push({ type: "message", text: `${displayName(mine)} desmaiou!` });
    state.participants = state.participants.filter((uid) => uid !== mine.uid);
    if (state.player.party.some((mon) => mon.hp > 0)) {
      state.needSwitch = true;
    } else {
      state.outcome = "lose";
      events.push({ type: "message", text: "Você não tem mais Pokémon em condições de lutar!" });
      events.push({ type: "end", outcome: "lose" });
    }
  }
}

function switchIn(state: BattleState, index: number, events: BattleEvent[]): boolean {
  const target = state.player.party[index];
  if (!target || target.hp <= 0 || index === state.player.active) return false;
  events.push({ type: "withdraw", side: "player" });
  events.push({ type: "message", text: `Volte, ${displayName(activeOf(state, "player"))}!` });
  state.player.active = index;
  state.player.stages = { ...ZERO_STAGES };
  state.player.flinch = false;
  if (!state.participants.includes(target.uid)) state.participants.push(target.uid);
  events.push({ type: "message", text: `Vai, ${displayName(target)}!` });
  events.push({ type: "sendOut", side: "player", index });
  return true;
}

function consumeItem(state: BattleState, item: ItemId, count: number): void {
  if (ITEMS[item].infinite) return;
  state.bag[item] = count - 1;
}

function useItem(state: BattleState, item: ItemId, target: number, rng: Rng, events: BattleEvent[]): "used" | "invalid" | "caught" {
  const def = ITEMS[item];
  const count = state.bag[item] ?? 0;
  if (count <= 0) return "invalid";
  if (def.candy) {
    const mon = state.player.party[target];
    if (!mon) return "invalid";
    const result = grantLevel(mon);
    if (!result) {
      events.push({ type: "message", text: `${displayName(mon)} já está no nível máximo.` });
      return "invalid";
    }
    consumeItem(state, item, count);
    events.push({ type: "levelUp", uid: mon.uid, level: result.level });
    events.push({ type: "message", text: `${displayName(mon)} subiu para o nível ${result.level}!` });
    if (target === state.player.active) events.push({ type: "heal", side: "player", hp: mon.hp, max: maxHp(mon) });
    for (const learned of result.learned) events.push({ type: "message", text: `${displayName(mon)} aprendeu ${move(learned).name}!` });
    for (const pending of result.pending) {
      state.pendingLearn.push({ uid: mon.uid, moveId: pending });
      events.push({ type: "learnPrompt", uid: mon.uid, moveId: pending });
    }
    return "used";
  }
  if (def.ball) {
    if (state.kind !== "wild") {
      events.push({ type: "message", text: "Não dá para capturar o Pokémon de outro treinador!" });
      return "invalid";
    }
    consumeItem(state, item, count);
    const foe = activeOf(state, "foe");
    const result = captureOdds(foe, def.ball, rng);
    events.push({ type: "message", text: `Você lançou uma ${def.name}!` });
    events.push({ type: "throw", item, shakes: result.shakes, caught: result.caught });
    if (result.caught) {
      foe.ball = item;
      state.caught = foe;
      state.outcome = "caught";
      events.push({ type: "message", text: `Peguei! ${displayName(foe)} foi capturado!` });
      events.push({ type: "end", outcome: "caught" });
      return "caught";
    }
    const texts = ["Ah, não! Ele escapou!", "Quase! Ele escapou!", "Droga! Estava quase!", "Por pouco!"];
    events.push({ type: "message", text: texts[result.shakes] ?? texts[0] });
    return "used";
  }
  const mon = state.player.party[target];
  if (!mon || mon.hp <= 0) return "invalid";
  if (def.heal) {
    const max = maxHp(mon);
    if (mon.hp >= max) {
      events.push({ type: "message", text: "Não terá efeito." });
      return "invalid";
    }
    consumeItem(state, item, count);
    const before = mon.hp;
    mon.hp = Math.min(max, mon.hp + def.heal);
    events.push({ type: "message", text: `Você usou ${def.name} em ${displayName(mon)}.` });
    if (target === state.player.active) events.push({ type: "heal", side: "player", hp: mon.hp, max });
    events.push({ type: "message", text: `${displayName(mon)} recuperou ${mon.hp - before} PS.` });
    return "used";
  }
  if (def.cures) {
    if (!mon.status || !def.cures.includes(mon.status)) {
      events.push({ type: "message", text: "Não terá efeito." });
      return "invalid";
    }
    consumeItem(state, item, count);
    mon.status = null;
    mon.sleepTurns = 0;
    if (target === state.player.active) events.push({ type: "status", side: "player", status: null });
    events.push({ type: "message", text: `${displayName(mon)} se recuperou.` });
    return "used";
  }
  return "invalid";
}

export function runTurn(input: BattleState, action: Action, rng: Rng): { state: BattleState; events: BattleEvent[]; consumed: boolean } {
  const state = clone(input);
  const events: BattleEvent[] = [];
  if (state.outcome) return { state, events, consumed: false };

  if (state.needSwitch) {
    if (action.type !== "switch" || !switchIn(state, action.index, events)) return { state: input, events: [], consumed: false };
    state.needSwitch = false;
    return { state, events, consumed: true };
  }

  state.turn += 1;
  let playerMoveIndex: number | null = null;

  if (action.type === "run") {
    if (state.kind === "trainer") {
      return { state: input, events: [{ type: "message", text: "Não dá para fugir de uma batalha contra treinador!" }], consumed: false };
    }
    state.escapeAttempts += 1;
    const ok = escapes(speedOf(activeOf(state, "player"), state.player.stages), speedOf(activeOf(state, "foe"), state.foe.stages), state.escapeAttempts, rng);
    if (ok) {
      state.outcome = "run";
      events.push({ type: "message", text: "Você fugiu em segurança!" });
      events.push({ type: "end", outcome: "run" });
      return { state, events, consumed: true };
    }
    events.push({ type: "message", text: "Não conseguiu fugir!" });
  } else if (action.type === "item") {
    const result = useItem(state, action.item, action.target ?? state.player.active, rng, events);
    if (result === "invalid") return { state: input, events, consumed: false };
    if (result === "caught") return { state, events, consumed: true };
  } else if (action.type === "switch") {
    if (!switchIn(state, action.index, events)) return { state: input, events: [], consumed: false };
  } else {
    playerMoveIndex = action.index;
  }

  const foeIndex = chooseFoeMove(state, rng);
  const order: Side[] = [];
  if (playerMoveIndex === null) {
    order.push("foe");
  } else {
    const pMove = move(activeOf(state, "player").moves[playerMoveIndex]?.id ?? "tackle");
    const fMove = move(activeOf(state, "foe").moves[foeIndex]?.id ?? "tackle");
    const pPriority = pMove.priority ?? 0;
    const fPriority = fMove.priority ?? 0;
    const pSpeed = speedOf(activeOf(state, "player"), state.player.stages);
    const fSpeed = speedOf(activeOf(state, "foe"), state.foe.stages);
    const playerFirst = pPriority !== fPriority ? pPriority > fPriority : pSpeed !== fSpeed ? pSpeed > fSpeed : rng() < 0.5;
    order.push(...(playerFirst ? (["player", "foe"] as Side[]) : (["foe", "player"] as Side[])));
  }

  for (const side of order) {
    if (state.outcome || state.needSwitch) break;
    if (activeOf(state, side).hp <= 0) continue;
    useMove(state, side, side === "player" ? (playerMoveIndex ?? 0) : foeIndex, rng, events);
    handleFaints(state, events);
  }
  if (!state.outcome && !state.needSwitch) {
    endOfTurn(state, events);
    handleFaints(state, events);
  }
  state.player.flinch = false;
  state.foe.flinch = false;
  return { state, events, consumed: true };
}

export function describeEffectiveness(value: number): string {
  if (value === 0) return "sem efeito";
  if (value > 1) return "super eficaz";
  if (value < 1) return "pouco eficaz";
  return "normal";
}

export function typeLine(speciesId: string): string {
  return species(speciesId)
    .types.map((type) => TYPE_NAME[type])
    .join(" / ");
}
