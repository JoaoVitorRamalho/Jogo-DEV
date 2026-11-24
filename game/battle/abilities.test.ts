import { describe, expect, it } from "vitest";
import { ABILITIES, POKEMON_TRAITS, abilityOf, abilitySlots } from "@/data/pokemon/abilities";
import { MEGA_DEFS } from "@/data/pokemon/mega";
import { move } from "@/data/pokemon/moves";
import { SPECIES } from "@/data/pokemon/species";
import { activeOf, availableMegas, calcDamage, runTurn, speedOf, startBattle, type BattleState } from "@/game/battle/engine";
import { createMon, evolve, maxHp, typesOf } from "@/game/pokemon/mon";
import { collectPickup } from "@/game/pokemon/pickup";

const random = () => 0.5;
function mon(id: string, slot = 1) { const value = createMon(id, 35, random, { perfect: true }); value.abilitySlot = slot; return value; }
function duel(player: ReturnType<typeof mon>, foe: ReturnType<typeof mon>, playerMove = "growl", foeMove = "harden") {
  player.moves = [{ id: playerMove, pp: 40 }];
  foe.moves = [{ id: foeMove, pp: 40 }];
  return startBattle({ kind: "wild", playerParty: [player], foeParty: [foe], bag: {} }).state;
}
const turn = (state: BattleState, rng = random) => runTurn(state, { type: "move", index: 0 }, rng).state;

describe("habilidades consultadas na Pokédex", () => {
  it.each(Object.keys(SPECIES))("%s tem habilidades válidas, incluindo slots ocultos", (id) => {
    expect(abilitySlots(id).length).toBeGreaterThan(0);
    for (const slot of abilitySlots(id)) expect(ABILITIES[slot.id]?.description).toBeTruthy();
    expect(abilityOf(createMon(id, 10, random)).id).toBeTruthy();
  });
  it.each(MEGA_DEFS)("$id corresponde à forma correta na fonte", (form) => {
    expect(POKEMON_TRAITS[form.id].sourceId).toBe(form.pokeapiId);
    expect(POKEMON_TRAITS[form.id].sourceName.replaceAll("-", "_")).toBe(form.id);
  });
  it("mantém o slot oculto ao evoluir e funciona com saves sem habilidade gravada", () => {
    const old = mon("torchic"); delete old.abilitySlot;
    expect(abilityOf(old).id).toBe("blaze");
    old.abilitySlot = 3; evolve(old, "combusken");
    expect(abilityOf(old).id).toBe("speed-boost");
  });
});

describe("habilidades de dano e atributos", () => {
  it("Pés Rápidos aumenta Velocidade mesmo com paralisia e Atirador fortalece críticos", () => {
    const quick = mon("poochyena", 2);
    const stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 };
    const normal = speedOf(quick, stages);
    quick.status = "paralysis";
    expect(speedOf(quick, stages)).toBe(normal * 1.5);
    const bee = mon("beedrill", 3), foe = mon("mew");
    const sniper = calcDamage({ attacker: bee, defender: foe, move: move("poison_jab"), crit: true }).damage;
    bee.abilitySlot = 1;
    const regular = calcDamage({ attacker: bee, defender: foe, move: move("poison_jab"), crit: true }).damage;
    expect(sniper).toBeGreaterThanOrEqual(regular * 1.49);
  });
  it("Medo aumenta a Velocidade por acerto e Autoconfiança aumenta Ataque após o nocaute", () => {
    const scared = turn(duel(mon("mew"), mon("poochyena", 3), "twineedle"));
    expect(scared.foe.stages.spe).toBe(2);
    const state = duel(mon("mightyena", 3), mon("mew"), "bite");
    activeOf(state, "foe").hp = 1;
    const boosted = turn(state);
    expect(boosted.player.stages.atk).toBe(1);
    expect(boosted.outcome).toBe("win");
  });
  it.each([["bulbasaur", "vine_whip"], ["torchic", "ember"], ["froakie", "water_gun"], ["beautifly", "bug_bite"]])("%s fortalece seu tipo com poucos PS", (id, moveId) => {
    const attacker = mon(id), defender = mon("mew");
    const full = calcDamage({ attacker, defender, move: move(moveId) }).damage;
    attacker.hp = Math.floor(maxHp(attacker) / 3);
    expect(calcDamage({ attacker, defender, move: move(moveId) }).damage).toBeGreaterThan(full * 1.4);
  });
  it("Gordura Espessa reduz Fogo; Lentes Coloridas aumentam dano resistido", () => {
    const fire = mon("charizard"), grass = mon("venusaur");
    const normal = calcDamage({ attacker: fire, defender: grass, move: move("ember") }).damage;
    grass.battleForm = "venusaur_mega";
    expect(calcDamage({ attacker: fire, defender: grass, move: move("ember") }).damage).toBeLessThan(normal);
    const butterfly = mon("butterfree");
    const resisted = calcDamage({ attacker: butterfly, defender: fire, move: move("bug_bite") }).damage;
    butterfly.abilitySlot = 3;
    expect(calcDamage({ attacker: butterfly, defender: fire, move: move("bug_bite") }).damage).toBeGreaterThanOrEqual(resisted * 1.9);
  });
  it("Garras Duras fortalece contato, sem fortalecer Terremoto", () => {
    const attacker = mon("charizard_mega_x"), foe = mon("mew");
    const claw = calcDamage({ attacker, defender: foe, move: move("dragon_claw") }).damage;
    const unboosted = calcDamage({ attacker, defender: foe, move: { ...move("dragon_claw"), id: "non_contact_control" } }).damage;
    expect(claw).toBeGreaterThan(unboosted * 1.2);
    expect(calcDamage({ attacker, defender: foe, move: move("earthquake") }).damage).toBe(calcDamage({ attacker, defender: foe, move: { ...move("earthquake"), id: "non_contact_control" } }).damage);
  });
  it("Simplicidade dobra mudanças de estágio e Desatenção ignora as do oponente", () => {
    const simple = turn(duel(mon("bidoof"), mon("mew"), "defense_curl"));
    expect(simple.player.stages.def).toBe(2);
    const attacker = mon("bidoof", 2), defender = mon("mew");
    const normal = calcDamage({ attacker, defender, move: move("tackle") }).damage;
    expect(calcDamage({ attacker, defender, move: move("tackle"), defenderStages: { atk: 0, def: 6, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 } }).damage).toBe(normal);
  });
  it("Rivalidade considera o gênero e não altera dano contra Pokémon sem gênero", () => {
    const attacker = mon("beautifly", 3), defender = mon("bidoof"); attacker.gender = "male";
    defender.gender = "male";
    const same = calcDamage({ attacker, defender, move: move("tackle") }).damage;
    defender.gender = "female";
    const opposite = calcDamage({ attacker, defender, move: move("tackle") }).damage;
    defender.gender = "genderless";
    const neutral = calcDamage({ attacker, defender, move: move("tackle") }).damage;
    expect(same).toBeGreaterThan(neutral); expect(neutral).toBeGreaterThan(opposite);
  });
  it("Imprudência fortalece golpes de recuo e o recuo é aplicado", () => {
    const attacker = mon("starly", 3), foe = mon("mew");
    const before = attacker.hp;
    expect(calcDamage({ attacker, defender: foe, move: move("take_down") }).damage).toBeGreaterThan(calcDamage({ attacker, defender: foe, move: { ...move("take_down"), id: "no_recoil_control" } }).damage);
    const state = turn(duel(attacker, foe, "take_down"));
    expect(activeOf(state, "player").hp).toBeLessThan(before);
  });
});

describe("entrada, imunidades e precisão", () => {
  it("Estática paralisa quem fez contato, incluindo tipos Terra, mas não golpes à distância", () => {
    const contact = turn(duel(mon("gible"), mon("pikachu"), "tackle"), () => 0);
    expect(activeOf(contact, "player").status).toBe("paralysis");
    const special = turn(duel(mon("mew"), mon("pikachu"), "confusion"), () => 0);
    expect(activeOf(special, "player").status).toBeNull();
    const immune = turn(duel(mon("pachirisu"), mon("pikachu"), "tackle"), () => 0);
    expect(activeOf(immune, "player").status).toBeNull();
  });
  it("Para-raios anula dano e Onda de Choque, mesmo com evasão alta, e aumenta At. Esp.", () => {
    for (const id of ["thunder_shock", "thunder_wave"]) {
      const before = duel(mon("pachirisu"), mon("pikachu", 3), id);
      before.foe.stages.evasion = 6;
      const hp = activeOf(before, "foe").hp;
      const after = turn(before, () => 0.9);
      expect(activeOf(after, "foe").hp).toBe(hp);
      expect(activeOf(after, "foe").status).toBeNull();
      expect(after.foe.stages.spa).toBe(1);
    }
  });
  it("Intimidação reduz Ataque na entrada e Pressão gasta PP extra apenas em golpes dirigidos ao portador", () => {
    const { state } = startBattle({ kind: "wild", playerParty: [mon("staraptor")], foeParty: [mon("mew")], bag: {} });
    expect(state.foe.stages.atk).toBe(-1);
    const target = turn(duel(mon("froakie"), mon("giratina"), "tackle"));
    expect(activeOf(target, "player").moves[0].pp).toBe(38);
    const self = turn(duel(mon("froakie"), mon("giratina"), "defense_curl"));
    expect(activeOf(self, "player").moves[0].pp).toBe(39);
  });
  it("Pó de Escudo bloqueia paralisia secundária, mas não Pó Venenoso", () => {
    const blocked = turn(duel(mon("pachirisu"), mon("wurmple"), "nuzzle"), () => 0);
    expect(activeOf(blocked, "foe").status).toBeNull();
    const direct = turn(duel(mon("pachirisu"), mon("wurmple"), "poison_powder"), () => 0);
    expect(activeOf(direct, "foe").status).toBe("poison");
  });
  it.each(["spark", "thunder_wave"])("Absorção Elétrica anula %s e recupera PS", (moveId) => {
    const target = mon("pachirisu", 3); target.hp = 1;
    const result = turn(duel(mon("froakie"), target, moveId));
    expect(activeOf(result, "foe").hp).toBe(1 + Math.floor(maxHp(target) / 4));
    expect(activeOf(result, "foe").status).toBeNull();
  });
  it("Pele Áspera causa dano apenas em golpes de contato", () => {
    const mine = mon("mew"), target = mon("garchomp", 3);
    const contact = turn(duel(mine, target, "tackle"));
    expect(activeOf(contact, "player").hp).toBe(mine.hp - Math.floor(maxHp(mine) / 8));
    const area = turn(duel(mon("mew"), mon("garchomp", 3), "earthquake"));
    expect(activeOf(area, "player").hp).toBe(maxHp(activeOf(area, "player")));
  });
  it("não concede vitória se o último Pokémon também cair pelo contato com Pele Áspera", () => {
    const mine = mon("mew"), target = mon("garchomp", 3);
    mine.hp = target.hp = 1;
    const state = duel(mine, target, "quick_attack");
    expect(turn(state).outcome).toBe("lose");
  });
  it("Olhar Aguçado impede queda de Precisão e Peitoral Forte impede queda de Defesa", () => {
    expect(turn(duel(mon("pidgey"), mon("bidoof"), "growl", "sand_attack")).player.stages.accuracy).toBe(0);
    const weak = mon("bidoof"); weak.level = 5;
    expect(turn(duel(mon("pidgey", 3), weak, "growl", "crunch"), () => 0).player.stages.def).toBe(0);
  });
  it("Olhos Compostos aumenta precisão; Pés Confusos aumenta evasão durante confusão", () => {
    const accurate = turn(duel(mon("butterfree"), mon("bidoof"), "poison_powder"), () => 0.9);
    expect(activeOf(accurate, "foe").status).toBe("poison");
    const dizzy = duel(mon("pidgey", 2), mon("bidoof"), "growl", "tackle"); dizzy.player.confused = 3;
    const after = turn(dizzy, () => 0.6);
    expect(activeOf(after, "player").hp).toBe(activeOf(dizzy, "player").hp);
  });
  it("Mutatipo muda o tipo antes do golpe; Sincronismo devolve envenenamento", () => {
    const protean = turn(duel(mon("greninja", 3), mon("mew"), "quick_attack"));
    expect(typesOf(activeOf(protean, "player"))).toEqual(["normal"]);
    const sync = turn(duel(mon("mew"), mon("wurmple"), "growl", "poison_powder"), () => 0);
    expect(activeOf(sync, "player").status).toBe("poison");
    expect(activeOf(sync, "foe").status).toBe("poison");
  });
  it("Telepatia não torna o portador imune a ataques adversários em batalha simples", () => {
    expect(calcDamage({ attacker: mon("froakie"), defender: mon("giratina", 3), move: move("water_gun") }).damage).toBeGreaterThan(0);
  });
});

describe("clima e fim de turno", () => {
  it("Seca invoca sol por cinco turnos e Clorofila dobra a Velocidade", () => {
    const solar = startBattle({ kind: "wild", playerParty: [mon("charizard_mega_y")], foeParty: [mon("mew")], bag: {} }).state;
    expect(solar.weather).toEqual({ kind: "sun", turns: 5 });
    const plant = mon("bulbasaur", 3);
    expect(speedOf(plant, solar.player.stages, "sun")).toBe(speedOf(plant, solar.player.stages) * 2);
  });
  it("Impulso de Velocidade e Temperamental funcionam ao fim do turno", () => {
    const boost = turn(duel(mon("blaziken", 3), mon("mew")));
    expect(boost.player.stages.spe).toBe(1);
    const moody = turn(duel(mon("bidoof", 3), mon("mew")));
    expect(Object.values(moody.player.stages).sort()).toEqual([-1, 0, 0, 0, 0, 0, 2]);
  });
  it("Troca de Pele cura estado; Poder Solar causa desgaste sob sol", () => {
    const cocoon = mon("silcoon"); cocoon.status = "paralysis";
    expect(activeOf(turn(duel(cocoon, mon("mew")), () => 0.3), "player").status).toBeNull();
    const state = duel(mon("charizard", 3), mon("mew")); state.weather = { kind: "sun", turns: 5 };
    const before = activeOf(state, "player").hp;
    expect(activeOf(turn(state), "player").hp).toBe(before - Math.floor(maxHp(activeOf(state, "player")) / 8));
  });
  it("Força da Areia aumenta dano no clima certo e Véu de Areia protege da tempestade", () => {
    const mega = mon("garchomp_mega"), defender = mon("mew");
    expect(calcDamage({ attacker: mega, defender, move: move("earthquake"), weather: "sand" }).damage).toBeGreaterThan(calcDamage({ attacker: mega, defender, move: move("earthquake") }).damage);
    const state = duel(mon("gible"), mon("mew")); state.weather = { kind: "sand", turns: 5 }; activeOf(state, "player").battleTypes = ["normal"];
    expect(activeOf(turn(state), "player").hp).toBe(activeOf(state, "player").hp);
  });
  it("Fuga garante escapar de selvagens; Coleta respeita a chance e o item segurado", () => {
    const slow = mon("pachirisu"); slow.level = 1;
    const flee = runTurn(duel(slow, mon("giratina")), { type: "run" }, () => 0.99);
    expect(flee.state.outcome).toBe("run");
    const picker = mon("pachirisu", 2);
    expect(collectPickup([picker], () => 0.99)).toEqual([]);
    expect(collectPickup([picker], () => 0)).toHaveLength(1);
    expect(picker.heldItem).toBeTruthy();
    expect(collectPickup([picker], () => 0)).toEqual([]);
  });
});

describe("Laço de Batalha", () => {
  it("aplica os tipos da Forma Ash ao transformar um Greninja que usou Mutatipo", () => {
    const player = mon("greninja", 3); player.battleTypes = ["normal"];
    const foe = mon("mew"); foe.moves = [{ id: "harden", pp: 40 }];
    const state = startBattle({ kind: "wild", playerParty: [player], foeParty: [foe], bag: { greninja_ash: 1 } }).state;
    const result = runTurn(state, { type: "move", index: 0, mega: "greninja_ash" }, random);
    expect(typesOf(activeOf(result.state, "player"))).toEqual(["water", "dark"]);
    expect(abilityOf(activeOf(result.state, "player")).id).toBe("battle-bond");
  });
  it("aguarda a escolha manual mesmo depois de nocautear um adversário", () => {
    const player = createMon("greninja", 50, random, { battleBond: true }); player.moves = [{ id: "pound", pp: 35 }];
    const first = mon("wurmple"); first.hp = 1;
    const state = startBattle({ kind: "trainer", trainerName: "Teste", playerParty: [player, mon("charizard")], foeParty: [first, mon("mew")], bag: { charizardite_x: 1, greninja_ash: 1 } }).state;
    const result = runTurn(state, { type: "move", index: 0 }, random);
    expect(activeOf(result.state, "player").battleForm).toBeUndefined();
    expect(result.events.filter((event) => event.type === "mega")).toHaveLength(0);
    expect(Object.values(result.state.megaUsed)).toEqual([]);
    expect(availableMegas(activeOf(result.state, "player"), result.state.bag, result.state.megaUsed)).toHaveLength(1);
    const manual = runTurn(result.state, { type: "move", index: 0, mega: "greninja_ash" }, random);
    expect(activeOf(manual.state, "player").battleForm).toBe("greninja_ash");
    expect(manual.events.filter((event) => event.type === "mega")).toHaveLength(1);
    expect(availableMegas(manual.state.player.party[1], manual.state.bag, manual.state.megaUsed)).toHaveLength(0);
  });
});
