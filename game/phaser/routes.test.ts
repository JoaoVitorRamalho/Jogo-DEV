import { describe, expect, it } from "vitest";
import route1 from "@/public/assets/maps/route1.json";
import route2 from "@/public/assets/maps/route2.json";
import forest from "@/public/assets/maps/forest.json";
import route3 from "@/public/assets/maps/route3.json";
import verdelume from "@/public/assets/maps/verdelume.json";

type Point = { x: number; y: number };
const cases = [
  { name: "Rota 1", map: route1, start: { x: 11, y: 43 }, end: { x: 11, y: 2 } },
  { name: "Rota 2", map: route2, start: { x: 17, y: 61 }, end: { x: 17, y: 2 } },
  { name: "Floresta de Aster", map: forest, start: { x: 10, y: 20 }, end: { x: 10, y: 1 } },
  { name: "Rota 3", map: route3, start: { x: 17, y: 50 }, end: { x: 17, y: 1 } },
  { name: "Cidade Verdelume", map: verdelume, start: { x: 21, y: 33 }, end: { x: 7, y: 10 } },
];

describe.each(cases)("integridade de $name", ({ map, start, end }) => {
  const data = (name: string) => map.layers.find((layer) => layer.name === name)!.data!;
  const npcs = map.layers.find((layer) => layer.name === "npcs")!.objects!;
  const key = ({ x, y }: Point) => `${x},${y}`;
  const neighbors = ({ x, y }: Point) => [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];

  it("mantém conectadas as entradas com todos os NPCs presentes", () => {
    const occupied = new Set(npcs.map((npc) => key({ x: npc.x / 16, y: npc.y / 16 })));
    const seen = new Set<string>();
    const queue = [start];
    for (let i = 0; i < queue.length; i += 1) {
      const tile = queue[i];
      if (tile.x < 0 || tile.y < 0 || tile.x >= map.width || tile.y >= map.height) continue;
      if (data("collision")[tile.y * map.width + tile.x] || occupied.has(key(tile)) || seen.has(key(tile))) continue;
      seen.add(key(tile));
      queue.push(...neighbors(tile));
    }
    expect(seen.has(key(end))).toBe(true);
    for (const npc of npcs) {
      expect(neighbors({ x: npc.x / 16, y: npc.y / 16 }).some((tile) => seen.has(key(tile))), npc.name).toBe(true);
    }
  });

  it("não sobrepõe mato alto a árvores, construções ou colisões", () => {
    data("detail").forEach((tile, index) => {
      if (tile !== 2445) return;
      expect([data("above")[index], data("buildings")[index], data("collision")[index]], `tile ${index % map.width},${Math.floor(index / map.width)}`).toEqual([0, 0, 0]);
    });
  });

  it("não força batalhas por faixas invisíveis que ignoram a visão dos NPCs", () => {
    const events = map.layers.find((layer) => layer.name === "events")!.objects!;
    expect(events.some((event) => event.name.startsWith("sight_"))).toBe(false);
  });
});
