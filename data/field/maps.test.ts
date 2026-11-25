import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FLY_LANDINGS } from "@/data/field/fly";
import { FIELD_GATES, fieldGate } from "@/data/field/obstacles";

// Confere os mapas gerados por scripts/build_maps.py contra o catálogo de obstáculos e o Voo.

type TiledObject = { name: string; x: number; y: number; width: number; height: number; properties?: { name: string; value: unknown }[] };
type TiledLayer = { name: string; type: string; data?: number[]; objects?: TiledObject[] };
type TiledMap = { width: number; height: number; layers: TiledLayer[] };
type Box = { name: string; x: number; y: number; w: number; h: number; props: Record<string, unknown> };

const TILE = 16;
const DIR = fileURLToPath(new URL("../../public/assets/maps/", import.meta.url));
const MAPS = new Map(
  readdirSync(DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => [file.replace(/\.json$/, ""), JSON.parse(readFileSync(DIR + file, "utf8")) as TiledMap]),
);

function objects(map: TiledMap, layer: string): Box[] {
  return (map.layers.find((entry) => entry.name === layer)?.objects ?? []).map((object) => ({
    name: object.name,
    x: Math.round(object.x / TILE),
    y: Math.round(object.y / TILE),
    w: Math.max(1, Math.round(object.width / TILE)),
    h: Math.max(1, Math.round(object.height / TILE)),
    props: Object.fromEntries((object.properties ?? []).map((prop) => [prop.name, prop.value])),
  }));
}

function cells(box: Box): [number, number][] {
  const list: [number, number][] = [];
  for (let y = box.y; y < box.y + box.h; y += 1) for (let x = box.x; x < box.x + box.w; x += 1) list.push([x, y]);
  return list;
}

/** Casas sólidas da camada de colisão, como a WorldScene monta. */
function solid(map: TiledMap): boolean[][] {
  const data = map.layers.find((layer) => layer.name === "collision")?.data ?? [];
  return Array.from({ length: map.height }, (_, y) => Array.from({ length: map.width }, (_, x) => (data[y * map.width + x] ?? 0) > 0));
}

/** Casas alcançáveis a pé a partir de um ponto, só pela colisão (NPC e placa não contam, o teste fica mais duro). */
function reachable(blocked: boolean[][], start: [number, number]): Set<string> {
  const seen = new Set([start.join(",")]);
  const queue = [start];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (ny < 0 || ny >= blocked.length || nx < 0 || nx >= blocked[0].length || blocked[ny][nx] || seen.has(key)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

describe("obstáculos de campo nos mapas", () => {
  it("cada objeto da camada fields existe no catálogo, no mapa certo, e tampa casas sólidas", () => {
    for (const [key, map] of MAPS) {
      const blocked = solid(map);
      for (const box of objects(map, "fields")) {
        const gate = fieldGate(box.name);
        expect(gate, `${key}: ${box.name}`).toBeDefined();
        expect(gate?.map).toBe(key);
        expect(box.props.kind).toBe(gate?.kind);
        for (const [x, y] of cells(box)) expect(blocked[y][x], `${box.name} em ${x},${y}`).toBe(true);
      }
    }
  });

  it("todo obstáculo jogável está desenhado no mapa dele", () => {
    for (const gate of FIELD_GATES.filter((entry) => entry.status === "jogável")) {
      const map = MAPS.get(gate.map);
      expect(map, gate.map).toBeDefined();
      expect(objects(map!, "fields").some((box) => box.name === gate.id), gate.id).toBe(true);
    }
  });

  it("a clareira da Rota 2 só abre com Corte", () => {
    const map = MAPS.get("route2")!;
    const spawn = objects(map, "spawns").find((box) => box.name === "from_forest")!;
    const prize = objects(map, "npcs").find((box) => box.name === "item_r2_cut")!;
    const bush = objects(map, "fields").find((box) => box.name === "route2_bush_shortcut")!;
    const besidePrize = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => `${prize.x + dx},${prize.y + dy}`);
    const blocked = solid(map);
    const closed = reachable(blocked, [spawn.x, spawn.y]);
    expect(besidePrize.some((key) => closed.has(key))).toBe(false);
    for (const [x, y] of cells(bush)) blocked[y][x] = false;
    const open = reachable(blocked, [spawn.x, spawn.y]);
    expect(besidePrize.some((key) => open.has(key))).toBe(true);
  });
});

describe("pousos do Voo", () => {
  it("caem numa casa livre, longe de porta, NPC e placa", () => {
    for (const spot of FLY_LANDINGS) {
      const map = MAPS.get(spot.map);
      expect(map, spot.map).toBeDefined();
      expect(solid(map!)[spot.y]?.[spot.x], `${spot.cityId} sólido`).toBe(false);
      for (const layer of ["warps", "npcs", "signs"]) {
        const hit = objects(map!, layer).find((box) => cells(box).some(([x, y]) => x === spot.x && y === spot.y));
        expect(hit?.name, `${spot.cityId} em cima de ${layer}`).toBeUndefined();
      }
    }
  });
});
