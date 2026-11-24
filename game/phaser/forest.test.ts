import { describe, expect, it } from "vitest";
import forest from "@/public/assets/maps/forest.json";

type Tile = { x: number; y: number };
const width = forest.width;
const collision = forest.layers.find((layer) => layer.name === "collision")!.data!;
const npcs = forest.layers.find((layer) => layer.name === "npcs")!.objects!;
const at = (object: Tile) => ({ x: object.x / 16, y: object.y / 16 });
const key = ({ x, y }: Tile) => `${x},${y}`;
const neighbors = ({ x, y }: Tile): Tile[] => [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];

function reachable(start: Tile): Set<string> {
  const occupied = new Set(npcs.map((npc) => key(at(npc))));
  const seen = new Set<string>();
  const queue = [start];
  for (let i = 0; i < queue.length; i += 1) {
    const tile = queue[i];
    if (tile.x < 0 || tile.y < 0 || tile.x >= width || tile.y >= forest.height) continue;
    if (collision[tile.y * width + tile.x] || occupied.has(key(tile)) || seen.has(key(tile))) continue;
    seen.add(key(tile));
    queue.push(...neighbors(tile));
  }
  return seen;
}

describe("passagens da Floresta de Aster", () => {
  it("mantém a trilha norte–sul livre mesmo com todos os personagens presentes", () => {
    expect(reachable({ x: 10, y: 20 }).has("10,1")).toBe(true);
    expect(reachable({ x: 10, y: 1 }).has("10,20")).toBe(true);
  });

  it.each(npcs)("permite chegar até $name sem atravessar árvores ou outros personagens", (npc) => {
    const tile = at(npc);
    expect(collision[tile.y * width + tile.x], npc.name).toBe(0);
    const seen = reachable({ x: 10, y: 20 });
    expect(neighbors(tile).some((neighbor) => seen.has(key(neighbor))), npc.name).toBe(true);
    for (const name of ["buildings", "above"]) {
      const layer = forest.layers.find((entry) => entry.name === name)!.data!;
      expect(layer[tile.y * width + tile.x], `${npc.name}: ${name}`).toBe(0);
      expect(layer[(tile.y - 1) * width + tile.x], `${npc.name}: cabeça em ${name}`).toBe(0);
    }
  });
});
