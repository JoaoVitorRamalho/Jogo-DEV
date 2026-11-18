import { ENCOUNTERS } from "@/data/encounters";
import { ITEMS, type ItemId } from "@/data/items";
import { species } from "@/data/pokemon/species";
import { TRAINERS } from "@/data/trainers";
import type { BattleConfig, Outcome } from "@/game/battle/engine";
import { defaultRng } from "@/game/core/rng";
import { type Line, ask, battle, say, useUi } from "@/game/core/ui";
import { world } from "@/game/phaser/bridge";
import { createMon } from "@/game/pokemon/mon";
import { type GameState, giveItem, healParty, live, markSeen, useGame } from "@/game/state/store";
import { playSfx } from "@/lib/audio/engine";

export function state(): GameState {
  return live();
}

export function flag(name: string): boolean {
  return Boolean(useGame.getState().live?.flags[name]);
}

export function setFlag(name: string, value = true): void {
  useGame.getState().update((s) => {
    s.flags[name] = value;
  });
}

export function hero(): string {
  return state().appearance.name || "Viajante";
}

export function child(): string {
  return state().appearance.sex === "female" ? "filha" : "filho";
}

export function line(speaker: string | undefined, text: string): Line {
  return { speaker, text: text.replaceAll("{nome}", hero()).replaceAll("{filho}", child()) };
}

export function lines(speaker: string | undefined, texts: string[]): Line[] {
  return texts.map((text) => line(speaker, text));
}

export async function talk(speaker: string | undefined, ...texts: string[]): Promise<void> {
  await say(lines(speaker, texts));
}

export async function think(...texts: string[]): Promise<void> {
  await say(texts.map((text) => line(undefined, `(${text})`)));
}

export async function yesNo(prompt?: Line, preview?: string): Promise<boolean> {
  return (await ask(["Sim", "Não"], prompt, 1, preview)) === 0;
}

export function autosave(): void {
  useGame.getState().save();
  useUi.getState().showToast("Progresso salvo");
}

export async function giveOnce(flagName: string, item: ItemId, count: number, from?: string): Promise<boolean> {
  const given = useGame.getState().grantOnce(flagName, (s) => giveItem(s, item, count));
  if (given) {
    playSfx("discover");
    const name = ITEMS[item].name;
    await say([line(from, count > 1 ? `${hero()} recebeu ${count}× ${name}!` : `${hero()} recebeu ${name}!`)]);
  }
  return given;
}

export async function healAtHome(): Promise<void> {
  useGame.getState().update((s) => healParty(s));
  playSfx("heal");
}

export function hasHealthyMon(): boolean {
  return state().party.some((mon) => mon.hp > 0);
}

export async function runBattle(config: Omit<BattleConfig, "playerParty" | "bag">): Promise<Outcome> {
  const s = state();
  useGame.getState().update((st) => {
    for (const mon of config.foeParty) markSeen(st, mon.species);
  });
  return battle({ ...config, playerParty: s.party, bag: s.bag });
}

export async function blackout(): Promise<void> {
  useGame.getState().update((s) => {
    healParty(s);
    s.money = Math.floor(s.money / 2);
  });
  await world().warp("house_1f", 8, 5, "up");
  await talk(undefined, `${hero()} correu de volta para casa...`);
  await talk("Mãe", "Ei... olha pra mim. Está tudo bem.", "Descansem um pouco. Os dois.");
}

export async function trainerBattle(id: string, npc: string): Promise<boolean> {
  const def = TRAINERS[id];
  if (flag(`beat_${id}`)) {
    await talk(def.name, ...def.after);
    return true;
  }
  await world().emote(npc, "!");
  await talk(def.name, ...def.intro);
  const foeParty = def.team.map((member) => createMon(member.species, member.level, defaultRng));
  const outcome = await runBattle({ kind: "trainer", foeParty, trainerName: def.name, reward: def.reward });
  if (outcome === "win") {
    useGame.getState().grantOnce(`beat_${id}`, (s) => {
      s.money += def.reward;
    });
    await talk(def.name, ...def.defeat);
    return true;
  }
  if (outcome === "lose") await blackout();
  return false;
}

export async function wildEncounter(mapKey: string): Promise<void> {
  const table = ENCOUNTERS[mapKey];
  if (!table || !hasHealthyMon()) return;
  const total = table.grass.reduce((sum, slot) => sum + slot.weight, 0);
  let roll = Math.random() * total;
  const slot = table.grass.find((entry) => (roll -= entry.weight) < 0) ?? table.grass[0];
  const level = slot.min + Math.floor(Math.random() * (slot.max - slot.min + 1));
  const foe = createMon(slot.species, level, defaultRng, { metAt: mapKey });
  const outcome = await runBattle({ kind: "wild", foeParty: [foe], background: table.background });
  if (outcome === "lose") await blackout();
}

export function speciesName(id: string): string {
  return species(id).name;
}
