import type { ItemId } from "@/data/items";
import { DEX_ORDER } from "@/data/pokemon/species";
import { type Appearance, defaultAppearance } from "@/game/character/appearance";
import { seeded } from "@/game/core/rng";
import { createMon } from "@/game/pokemon/mon";
import { type GameState, freshState } from "@/game/state/store";

/**
 * Save de teste: capítulo 1 fechado, na entrada sul da Rota 2, com os treinadores da rota
 * ainda de pé. Serve para jogar o capítulo 2 direto e para testar luta, mega e itens.
 * Abre pela URL `?save=teste` ou pelo código ↑ ↑ ↓ ↓ ← → ← → X Z na tela de título.
 */

// Tudo o que o capítulo 1 marca até a despedida. Os escort_* ficam de fora: são estados de
// caminhada que o próprio capítulo apaga no fim.
const CHAPTER1_FLAGS = [
  "woke", "talked_mother", "ch1_morning", "entered_lab", "gael_entered_lab", "got_starter",
  "exam_collected", "tv_off", "exams_delivered", "clinic_done", "home_after_clinic", "lake_done",
  "slept", "night_decision", "talked_gael", "gael_walked_town", "met_dario", "battle_demo",
  "gael_waved", "capture_demo", "license", "ch1_budget", "reached_route1", "met_ren_route1",
  "reached_forest", "helped_lost_kid", "ch1_saw_ferruria", "ch1_arrived_ferruria", "got_pokedex",
  "ch1_back_home_hint", "ch1_scarf", "said_goodbye", "chapter1_complete", "ch1_v2",
];

const TEAM: [string, number][] = [
  ["greninja", 32],
  ["charizard", 32],
  ["garchomp", 31],
  ["blaziken", 31],
  ["venusaur", 30],
  ["staraptor", 30],
];

// Na caixa: os lendários e uma equipe de nível baixo, para quem quiser luta parelha.
const BOX: [string, number][] = [
  ["mew", 30],
  ["giratina", 40],
  ["froakie", 9],
  ["torchic", 9],
  ["bulbasaur", 9],
  ["gible", 9],
  ["starly", 8],
  ["beautifly", 10],
];

const BAG: Partial<Record<ItemId, number>> = {
  potion: 20,
  super_potion: 15,
  infinite_potion: 1,
  antidote: 5,
  paralyze_heal: 5,
  awakening: 5,
  burn_heal: 5,
  pokeball: 30,
  greatball: 20,
  rare_candy: 15,
  venusaurite: 1,
  charizardite_x: 1,
  charizardite_y: 1,
  blazikenite: 1,
  garchompite: 1,
  greninja_ash: 1,
};

export function testSave(appearance?: Appearance): GameState {
  const rng = seeded(0x7e57);
  const state = freshState(appearance ?? { ...defaultAppearance("male"), name: "Viajante" });
  state.map = "route2";
  state.x = 17;
  state.y = 61;
  state.dir = "up";
  for (const flag of CHAPTER1_FLAGS) state.flags[flag] = true;
  state.party = TEAM.map(([id, level], index) => createMon(id, level, rng, { perfect: true, metAt: index === 0 ? "Vila Brisamar" : "Rota 2" }));
  state.box = BOX.map(([id, level]) => createMon(id, level, rng, { perfect: true, metAt: "Rota 2" }));
  state.bag = { ...BAG };
  state.money = 50000;
  state.starter = "froakie";
  state.rivalStarter = "torchic";
  const owned = [...TEAM, ...BOX].map(([id]) => id);
  state.dex = { seen: [...DEX_ORDER], caught: DEX_ORDER.filter((id) => owned.includes(id)) };
  state.playTime = 3 * 3600 + 27 * 60;
  state.savedAt = Date.now();
  return state;
}
