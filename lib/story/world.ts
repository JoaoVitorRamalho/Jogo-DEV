import { CanvasTexture, NearestFilter, SRGBColorSpace } from "three";
import type { Direction } from "@/lib/character/types";
import type { MapId, StoryState } from "@/lib/story/types";

export const TILE = 32;

export type Grid = string[][];

export type WorldMap = {
  id: MapId;
  name: string;
  grid: Grid;
  cols: number;
  rows: number;
};

export type Npc = {
  id: string;
  name: string;
  x: number;
  y: number;
  hair: string;
  shirt: string;
  skin: string;
};

function fill(cols: number, rows: number, cell = "."): Grid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => cell));
}

function paint(target: Grid, col: number, row: number, width: number, height: number, cell: string) {
  for (let y = row; y < row + height; y += 1) {
    for (let x = col; x < col + width; x += 1) {
      if (target[y]?.[x] !== undefined) target[y][x] = cell;
    }
  }
}

function houseMap(): WorldMap {
  const cells = fill(16, 12, ".");
  paint(cells, 0, 0, 16, 1, "#");
  paint(cells, 0, 11, 16, 1, "#");
  paint(cells, 0, 0, 1, 12, "#");
  paint(cells, 15, 0, 1, 12, "#");
  paint(cells, 1, 1, 3, 2, "b");
  paint(cells, 1, 6, 3, 2, "t");
  cells[11][7] = "1";
  cells[11][8] = "1";
  return { id: "house", name: "Casa de Brisamar", grid: cells, cols: 16, rows: 12 };
}

function villageMap(): WorldMap {
  const cells = fill(30, 22, ".");
  paint(cells, 0, 0, 30, 1, "#");
  paint(cells, 0, 21, 30, 1, "#");
  paint(cells, 0, 0, 1, 22, "#");
  paint(cells, 29, 0, 1, 22, "#");
  paint(cells, 3, 5, 8, 7, "#");
  paint(cells, 4, 6, 6, 5, ".");
  cells[11][6] = "1";
  paint(cells, 18, 5, 9, 7, "#");
  paint(cells, 19, 6, 7, 5, ".");
  cells[11][22] = "2";
  paint(cells, 2, 16, 4, 4, "w");
  paint(cells, 18, 16, 8, 4, "s");
  paint(cells, 4, 12, 22, 4, "p");
  for (let row = 1; row <= 14; row += 1) {
    cells[row][13] = "p";
    cells[row][14] = "p";
  }
  cells[0][13] = "G";
  cells[0][14] = "G";
  return { id: "brisamar", name: "Vila Brisamar", grid: cells, cols: 30, rows: 22 };
}

function labMap(): WorldMap {
  const cells = fill(14, 10, ".");
  paint(cells, 0, 0, 14, 1, "#");
  paint(cells, 0, 9, 14, 1, "#");
  paint(cells, 0, 0, 1, 10, "#");
  paint(cells, 13, 0, 1, 10, "#");
  paint(cells, 2, 2, 3, 2, "t");
  paint(cells, 9, 2, 3, 2, "t");
  cells[9][6] = "1";
  cells[9][7] = "1";
  return { id: "lab", name: "Posto da Professora Lira", grid: cells, cols: 14, rows: 10 };
}

function routeMap(): WorldMap {
  const cells = fill(12, 18, ".");
  paint(cells, 0, 0, 12, 1, "#");
  paint(cells, 0, 17, 12, 1, "#");
  paint(cells, 0, 0, 1, 18, "#");
  paint(cells, 11, 0, 1, 18, "#");
  paint(cells, 1, 0, 4, 18, "#");
  paint(cells, 7, 0, 4, 18, "#");
  cells[17][5] = "1";
  cells[17][6] = "1";
  cells[2][5] = "s";
  cells[2][6] = "s";
  return { id: "route", name: "Rota 1", grid: cells, cols: 12, rows: 18 };
}

export const MAPS: Record<MapId, WorldMap> = {
  house: houseMap(),
  brisamar: villageMap(),
  lab: labMap(),
  route: routeMap(),
};

export function tileCenter(col: number, row: number, rows: number) {
  return {
    x: col * TILE + TILE / 2,
    y: (rows - row) * TILE - TILE / 2,
  };
}

export function tileAt(map: WorldMap, x: number, y: number): string {
  const col = Math.floor(x / TILE);
  const row = map.rows - 1 - Math.floor(y / TILE);
  if (row < 0 || col < 0 || row >= map.rows || col >= map.cols) return "#";
  return map.grid[row][col] ?? "#";
}

export function collides(map: WorldMap, x: number, y: number, story: StoryState): boolean {
  const cell = tileAt(map, x, y);
  if (cell === "G") return !story.tutorialDone;
  return cell === "#" || cell === "w" || cell === "b" || cell === "t";
}

export type Portal = {
  map: MapId;
  col: number;
  row: number;
  direction: Direction;
};

export function portalAt(map: WorldMap, x: number, y: number, story: StoryState): Portal | null {
  const cell = tileAt(map, x, y);
  if (map.id === "house" && cell === "1") {
    return { map: "brisamar", col: 6, row: 12, direction: "down" };
  }
  if (map.id === "brisamar" && cell === "1") {
    return { map: "house", col: 7, row: 9, direction: "up" };
  }
  if (map.id === "brisamar" && cell === "2") {
    return { map: "lab", col: 6, row: 7, direction: "up" };
  }
  if (map.id === "lab" && cell === "1") {
    return { map: "brisamar", col: 22, row: 12, direction: "down" };
  }
  if (map.id === "brisamar" && cell === "G" && story.tutorialDone) {
    return { map: "route", col: 5, row: 15, direction: "up" };
  }
  if (map.id === "route" && cell === "1") {
    return { map: "brisamar", col: 13, row: 2, direction: "down" };
  }
  return null;
}

export function npcsFor(story: StoryState): Npc[] {
  const map = MAPS[story.map];
  const at = (col: number, row: number) => tileCenter(col, row, map.rows);
  if (story.map === "house") {
    const spot = at(8, 4);
    return [{ id: "mother", name: "Mãe", x: spot.x, y: spot.y, hair: "#6b4423", shirt: "#d8c4a4", skin: "#e2b08a" }];
  }
  if (story.map === "lab") {
    const spot = at(6, 3);
    return [{ id: "lira", name: "Professora Lira", x: spot.x, y: spot.y, hair: "#2f6b4f", shirt: "#f4f7fb", skin: "#e0b08a" }];
  }
  if (story.map === "brisamar") {
    const list: Npc[] = [];
    const fisher = at(19, 17);
    list.push({ id: "fisher", name: "Pescador", x: fisher.x, y: fisher.y, hair: "#88847c", shirt: "#3d6f9a", skin: "#c9926a" });
    if (story.choseStarter) {
      const ren = at(22, 13);
      list.push({ id: "ren", name: "Ren", x: ren.x, y: ren.y, hair: "#1d2430", shirt: "#2f6adf", skin: "#e2b08a" });
    }
    return list;
  }
  if (story.map === "route") {
    const sign = at(5, 2);
    return [{ id: "sign", name: "Placa", x: sign.x, y: sign.y, hair: "#8a6a3a", shirt: "#e6d7b0", skin: "#8a6a3a" }];
  }
  return [];
}

function person(context: CanvasRenderingContext2D, npc: Npc) {
  context.fillStyle = npc.shirt;
  context.fillRect(10, 18, 12, 12);
  context.fillStyle = npc.skin;
  context.fillRect(12, 8, 8, 8);
  context.fillStyle = npc.hair;
  context.fillRect(11, 6, 10, 4);
  context.fillStyle = "#2a2118";
  context.fillRect(14, 26, 3, 6);
  context.fillRect(18, 26, 3, 6);
}

export function drawNpcTexture(npc: Npc): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 40;
  const context = canvas.getContext("2d");
  if (!context) return new CanvasTexture(canvas);
  if (npc.id === "sign") {
    context.fillStyle = "#8a6a3a";
    context.fillRect(14, 16, 4, 18);
    context.fillStyle = "#efe6d2";
    context.fillRect(6, 4, 20, 14);
    context.fillStyle = "#2a2118";
    context.fillRect(9, 8, 14, 2);
    context.fillRect(9, 12, 10, 2);
  } else {
    person(context, npc);
  }
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function floorColor(map: MapId, cell: string): string {
  if (cell === "#" || cell === "b" || cell === "t") return map === "house" || map === "lab" ? "#d9c7a4" : "#6e8a4e";
  if (cell === "w") return "#3a7ec7";
  if (cell === "p") return "#c4a06a";
  if (cell === "s") return "#e4d2a4";
  if (cell === "1" || cell === "2" || cell === "G") return "#8d6a3c";
  if (map === "house") return "#e7d3ae";
  if (map === "lab") return "#d5dde6";
  return "#3f8f4e";
}

export function drawMap(map: WorldMap): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = map.cols * TILE;
  canvas.height = map.rows * TILE;
  const context = canvas.getContext("2d");
  if (!context) return new CanvasTexture(canvas);
  for (let row = 0; row < map.rows; row += 1) {
    for (let col = 0; col < map.cols; col += 1) {
      const cell = map.grid[row][col];
      context.fillStyle = floorColor(map.id, cell);
      context.fillRect(col * TILE, row * TILE, TILE, TILE);
      if ((col + row) % 2 === 0 && (cell === "." || cell === "p")) {
        context.fillStyle = map.id === "house" || map.id === "lab" ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.06)";
        context.fillRect(col * TILE, row * TILE, TILE, TILE);
      }
      if (cell === "#") {
        context.fillStyle = map.id === "brisamar" || map.id === "route" ? "#7a3b32" : "#8d6b45";
        context.fillRect(col * TILE, row * TILE, TILE, TILE);
        context.fillStyle = "rgba(255,255,255,0.08)";
        context.fillRect(col * TILE, row * TILE, TILE, 4);
      }
      if (cell === "w") {
        context.fillStyle = "rgba(255,255,255,0.25)";
        context.fillRect(col * TILE + 6, row * TILE + 18, 16, 3);
      }
      if (cell === "b") {
        context.fillStyle = "#f2f4f8";
        context.fillRect(col * TILE + 4, row * TILE + 8, 24, 16);
        context.fillStyle = "#6a8fbf";
        context.fillRect(col * TILE + 6, row * TILE + 10, 20, 6);
      }
      if (cell === "t") {
        context.fillStyle = "#7a4e32";
        context.fillRect(col * TILE + 4, row * TILE + 10, 24, 14);
        context.fillStyle = "#f4f1ea";
        context.fillRect(col * TILE + 8, row * TILE + 6, 8, 6);
      }
      if (cell === "G") {
        context.fillStyle = "#245c32";
        context.fillRect(col * TILE, row * TILE, TILE, TILE);
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
