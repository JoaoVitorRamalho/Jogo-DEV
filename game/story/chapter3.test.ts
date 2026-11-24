import { beforeEach, describe, expect, it } from "vitest";
import { ENCOUNTERS } from "@/data/encounters";
import { NPCS } from "@/data/npcs";
import { SPECIES } from "@/data/pokemon/species";
import { TRAINERS } from "@/data/trainers";
import { defaultAppearance } from "@/game/character/appearance";
import { MAP_KEYS } from "@/game/phaser/constants";
import { useGame } from "@/game/state/store";
import { CH2_SIGN_RUN } from "@/game/story/chapter2";
import { CH3_SIGN_RUN, CH3_SIGNS, CH3_TALK, CH3_VISIBLE, ch3CanWarp, ch3Talk } from "@/game/story/chapter3";
import ferruria from "@/public/assets/maps/ferruria.json";
import route3 from "@/public/assets/maps/route3.json";
import verdelume from "@/public/assets/maps/verdelume.json";
import verdelumeCenter from "@/public/assets/maps/verdelume_center.json";
import verdelumeGym from "@/public/assets/maps/verdelume_gym.json";
import verdelumeHouse from "@/public/assets/maps/verdelume_house.json";
import verdelumeMart from "@/public/assets/maps/verdelume_mart.json";

type TiledObject = { name: string; x: number; y: number; width: number; height: number; properties?: { name: string; value: unknown }[] };
type TiledMap = { width: number; height: number; layers: { name: string; data?: number[]; objects?: TiledObject[] }[] };
type Point = { x: number; y: number };

const ALL_MAPS: Record<string, TiledMap> = { ferruria, route3, verdelume, verdelume_center: verdelumeCenter, verdelume_gym: verdelumeGym, verdelume_house: verdelumeHouse, verdelume_mart: verdelumeMart };
const CH3_MAPS = Object.keys(ALL_MAPS).filter((key) => key !== "ferruria");

const objects = (map: TiledMap, layer: string) => map.layers.find((entry) => entry.name === layer)?.objects ?? [];
const prop = (object: TiledObject, name: string) => object.properties?.find((entry) => entry.name === name)?.value;
const tile = (object: TiledObject): Point => ({ x: object.x / 16, y: object.y / 16 });
const key = ({ x, y }: Point) => `${x},${y}`;

/** Casas alcançáveis a partir de start, com os NPCs listados ocupando o chão. */
function reachable(map: TiledMap, start: Point, blockers: string[]): Set<string> {
  const collision = map.layers.find((layer) => layer.name === "collision")!.data!;
  const occupied = new Set(objects(map, "npcs").filter((npc) => blockers.includes(npc.name)).map((npc) => key(tile(npc))));
  const seen = new Set<string>();
  const queue = [start];
  for (let i = 0; i < queue.length; i += 1) {
    const { x, y } = queue[i];
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
    if (collision[y * map.width + x] || occupied.has(key({ x, y })) || seen.has(key({ x, y }))) continue;
    seen.add(key({ x, y }));
    queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }
  return seen;
}

function flags(values: Record<string, boolean>) {
  useGame.getState().update((state) => {
    state.flags = values;
  });
}

describe("capítulo 3: mapas", () => {
  it("registra os mapas novos no jogo", () => {
    for (const map of CH3_MAPS) expect(MAP_KEYS as readonly string[]).toContain(map);
  });

  it("toda saída leva a um mapa existente e a um chão livre", () => {
    for (const [name, map] of Object.entries(ALL_MAPS)) {
      for (const warp of objects(map, "warps")) {
        const target = String(prop(warp, "target"));
        if (name === "ferruria" && !CH3_MAPS.includes(target)) continue;
        expect(MAP_KEYS as readonly string[], `${name} → ${target}`).toContain(target);
        const destination = ALL_MAPS[target];
        if (!destination) continue;
        const landing = { x: Number(prop(warp, "tx")), y: Number(prop(warp, "ty")) };
        const collision = destination.layers.find((layer) => layer.name === "collision")!.data!;
        expect(collision[landing.y * destination.width + landing.x], `${name} → ${target} ${key(landing)}`).toBe(0);
        expect(objects(destination, "npcs").some((npc) => key(tile(npc)) === key(landing)), `NPC em cima da chegada ${target} ${key(landing)}`).toBe(false);
      }
    }
  });

  it("todo NPC dos mapas do capítulo tem visual e fala", () => {
    for (const name of CH3_MAPS) {
      for (const npc of objects(ALL_MAPS[name], "npcs")) {
        expect(NPCS[npc.name], `${name}: ${npc.name} sem entrada em data/npcs.ts`).toBeDefined();
        expect(CH3_TALK[npc.name], `${name}: ${npc.name} sem fala em CH3_TALK`).toBeDefined();
      }
    }
  });

  it("toda placa dos mapas do capítulo tem texto ou ação", () => {
    for (const name of CH3_MAPS) {
      for (const sign of objects(ALL_MAPS[name], "signs")) {
        const known = CH3_SIGNS[sign.name] || CH3_SIGN_RUN[sign.name] || CH2_SIGN_RUN[sign.name];
        expect(known, `${name}: placa ${sign.name} sem texto`).toBeTruthy();
      }
    }
  });

  it("Rota 3 e Verdelume se ligam pelas pontas", () => {
    const north = objects(route3, "warps").find((warp) => prop(warp, "target") === "verdelume");
    const south = objects(verdelume, "warps").find((warp) => prop(warp, "target") === "route3");
    const toRoute = objects(ferruria, "warps").find((warp) => prop(warp, "target") === "route3");
    expect(north && south && toRoute).toBeTruthy();
  });
});

describe("capítulo 3: Dojo de Verdelume", () => {
  const entrance = { x: 7, y: 16 };
  const leaderFront = { x: 7, y: 4 };
  const people = objects(verdelumeGym, "npcs").map((npc) => npc.name).filter((name) => !name.startsWith("v_bar_"));

  it("as duas cercas fecham o caminho até o líder", () => {
    expect(reachable(verdelumeGym, entrance, [...people, "v_bar_1", "v_bar_2"]).has(key(leaderFront))).toBe(false);
    expect(reachable(verdelumeGym, entrance, [...people, "v_bar_2"]).has(key(leaderFront))).toBe(false);
  });

  it("com as cercas abertas, dá para chegar ao líder", () => {
    expect(reachable(verdelumeGym, entrance, people).has(key(leaderFront))).toBe(true);
  });

  it("cada faixa pode ser enfrentado antes da cerca dele abrir", () => {
    const first = reachable(verdelumeGym, entrance, [...people, "v_bar_1", "v_bar_2"]);
    const second = reachable(verdelumeGym, entrance, [...people, "v_bar_2"]);
    const around = (name: string) => {
      const npc = objects(verdelumeGym, "npcs").find((entry) => entry.name === name)!;
      const { x, y } = tile(npc);
      return [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }].map(key);
    };
    expect(around("v_gym_trainer_1").some((spot) => first.has(spot))).toBe(true);
    expect(around("v_gym_trainer_2").some((spot) => second.has(spot))).toBe(true);
  });
});

describe("capítulo 3: regras", () => {
  beforeEach(() => useGame.getState().newGame(defaultAppearance()));

  it("os operários só liberam a estrada no capítulo 3", async () => {
    expect(ch3Talk("worker_a", true)).toBeUndefined();
    expect(CH3_VISIBLE.worker_a()).toBe(true);
    expect(await ch3CanWarp("ferruria", "route3")).toBe(false);
    flags({ chapter2_complete: true });
    expect(ch3Talk("worker_a", true)).toBe(CH3_TALK.worker_a);
    flags({ chapter2_complete: true, ch3_road_open: true });
    expect(CH3_VISIBLE.worker_a()).toBe(false);
    expect(CH3_VISIBLE.worker_b()).toBe(false);
    expect(await ch3CanWarp("ferruria", "route3")).toBe(true);
  });

  it("NPC novo fala sempre, sem depender do capítulo", () => {
    expect(ch3Talk("v_kid", false)).toBe(CH3_TALK.v_kid);
  });

  it("cada vitória no Dojo abre a cerca do tatame", () => {
    expect([CH3_VISIBLE.v_bar_1(), CH3_VISIBLE.v_bar_2()]).toEqual([true, true]);
    flags({ beat_v_gym_igor: true });
    expect([CH3_VISIBLE.v_bar_1(), CH3_VISIBLE.v_bar_2()]).toEqual([false, true]);
    flags({ beat_v_gym_igor: true, beat_v_gym_ana: true });
    expect([CH3_VISIBLE.v_bar_1(), CH3_VISIBLE.v_bar_2()]).toEqual([false, false]);
  });

  it("os itens do chão somem depois de pegos", () => {
    expect(CH3_VISIBLE.item_r3_west()).toBe(true);
    flags({ r3_item_west: true });
    expect(CH3_VISIBLE.item_r3_west()).toBe(false);
  });

  it("a Rota 3 tem mato alto com espécies válidas e pesos que somam 100", () => {
    const table = ENCOUNTERS.route3;
    expect(table).toBeDefined();
    expect(table.grass.reduce((sum, slot) => sum + slot.weight, 0)).toBe(100);
    for (const slot of table.grass) {
      expect(SPECIES[slot.species], slot.species).toBeDefined();
      expect(slot.min).toBeLessThanOrEqual(slot.max);
    }
  });

  it("os treinadores do capítulo existem", () => {
    for (const id of ["r3_nara", "r3_bel", "r3_teo", "v_gym_igor", "v_gym_ana", "leader_verdelume"]) expect(TRAINERS[id], id).toBeDefined();
  });
});
