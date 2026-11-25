"use client";

import { useMenu } from "@/components/menus/useMenu";
import { CITIES } from "@/data/cities";
import { FLY_PINS, FLY_ROUTES, flyDestinations } from "@/data/field/fly";
import { canOpenFlyMap } from "@/data/field/logic";
import { lock, say, useUi } from "@/game/core/ui";
import { bridge } from "@/game/phaser/bridge";
import { displayName } from "@/game/pokemon/mon";
import { useGame } from "@/game/state/store";
import { story } from "@/game/story/hooks";
import { playSfx } from "@/lib/audio/engine";

// Mapa da região em células de 4 px de GBA: 27 x 27 células = 108 px, sempre na grade da tela.
const GRID = 27;
const CELL = 4;
const SIZE = GRID * CELL;

const SEA = "#4f8fd6";
const WAVE = "#78b0ee";
const SAND = "#eedc9e";
const GRASS = "#8ccc66";
const GRASS_DARK = "#6fb253";
const HIGH = "#b5a27c";
const ROUTE = "#d9a45b";
const INK = "#23202c";
const OPEN = "#e05838";
const PICKED = "#ffd84a";
const CLOSED = "#a8a0b8";

type Cell = { x: number; y: number };
type Run = { x: number; y: number; w: number; fill: string };

function pinCell(id: string): Cell {
  const pin = FLY_PINS[id] ?? { x: 50, y: 50 };
  return { x: Math.min(GRID - 1, Math.floor((pin.x / 100) * GRID)), y: Math.min(GRID - 1, Math.floor((pin.y / 100) * GRID)) };
}

/** Células de uma reta (Bresenham), para as rotas ficarem na grade. */
function cellsBetween(from: Cell, to: Cell): Cell[] {
  const cells: Cell[] = [];
  let { x, y } = from;
  const dx = Math.abs(to.x - x);
  const dy = -Math.abs(to.y - y);
  const sx = x < to.x ? 1 : -1;
  const sy = y < to.y ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    cells.push({ x, y });
    if (x === to.x && y === to.y) return cells;
    const twice = 2 * err;
    if (twice >= dy) {
      err += dy;
      x += sx;
    }
    if (twice <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Terreno fixo da região: um continente de borda irregular, praia na costa, planalto ao norte. */
function buildTerrain(): Run[] {
  const pins = Object.keys(FLY_PINS).map(pinCell);
  const peak = pinCell("planalto_liga");
  const road = new Set(FLY_ROUTES.flatMap(([a, b]) => cellsBetween(pinCell(a), pinCell(b))).map(({ x, y }) => y * GRID + x));
  const land = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
    if (pins.some((pin) => Math.abs(pin.x - x) <= 1 && Math.abs(pin.y - y) <= 1)) return true;
    const px = x + 0.5 - GRID / 2;
    const py = y + 0.5 - GRID / 2;
    const angle = Math.atan2(py, px);
    const edge = GRID * (0.43 + 0.04 * Math.sin(angle * 3 + 1) + 0.03 * Math.sin(angle * 5 + 2)) + Math.sin(x * 1.3) * Math.cos(y * 1.1);
    return Math.hypot(px, py) < edge;
  };
  const fill = (x: number, y: number): string => {
    if (!land(x, y)) return (x * 7 + y * 13) % 11 === 0 ? WAVE : SEA;
    if (road.has(y * GRID + x)) return ROUTE;
    if (!land(x - 1, y) || !land(x + 1, y) || !land(x, y - 1) || !land(x, y + 1)) return SAND;
    if (Math.hypot(x - peak.x, y - peak.y) < 4.5) return HIGH;
    return Math.sin(x * 0.8 + 1) * Math.cos(y * 0.9) > 0.55 ? GRASS_DARK : GRASS;
  };
  const runs: Run[] = [];
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const color = fill(x, y);
      const last = runs[runs.length - 1];
      if (last && last.y === y && last.fill === color) last.w += 1;
      else runs.push({ x, y, w: 1, fill: color });
    }
  }
  return runs;
}

const TERRAIN = buildTerrain();

/** Cantos do cursor que pisca em volta da cidade escolhida. */
function Cursor({ x, y }: Cell) {
  const r = 6;
  const corners = [
    [x - r, y - r, 1, 1],
    [x + r - 1, y - r, -1, 1],
    [x - r, y + r - 1, 1, -1],
    [x + r - 1, y + r - 1, -1, -1],
  ];
  return (
    <g className="fly-cursor" fill={INK}>
      {corners.map(([cx, cy, hx, vy]) => (
        <g key={`${cx}-${cy}`}>
          <rect x={hx > 0 ? cx : cx - 2} y={cy} width={3} height={1} />
          <rect x={cx} y={vy > 0 ? cy : cy - 2} width={1} height={3} />
        </g>
      ))}
    </g>
  );
}

export function FlyPanel({ onClose }: { onClose: () => void }) {
  const live = useGame((state) => state.live);
  const entries = live ? flyDestinations(live.flags) : [];
  const here = live ? CITIES.find((city) => city.maps.includes(live.map))?.id : undefined;

  async function fly(index: number) {
    const entry = entries[index];
    const state = useGame.getState().live;
    const world = bridge.world;
    if (!entry || !state || !world) return;
    const check = canOpenFlyMap(state.flags, state.bag, state.party);
    if (!check.ok) return;
    useUi.getState().setPanel(null);
    await lock(async () => {
      if (story.hooks && !(await story.hooks.canWarp(world.mapKey(), entry.map))) return;
      await say(`${displayName(check.user)} usou Voo!`);
      playSfx("swoosh");
      await world.warp(entry.map, entry.x, entry.y, entry.dir, true);
    });
  }

  const menu = useMenu({ count: Math.max(1, entries.length), enabled: true, onSelect: fly, onCancel: onClose });
  if (!live) return null;
  const picked = entries[menu.index];
  const open = new Set(entries.map((entry) => entry.cityId));
  const pickedCell = picked ? pinCell(picked.cityId) : null;
  const pickedCity = CITIES.find((city) => city.id === picked?.cityId);

  return (
    <div className="gba-panel fly-panel">
      <h2>
        Voo<small>{pickedCity?.region ?? "Asteria"}</small>
      </h2>
      <div className="fly-body">
        <svg className="fly-map" viewBox={`0 0 ${SIZE} ${SIZE}`} shapeRendering="crispEdges" role="img" aria-label="Mapa da região">
          <rect width={SIZE} height={SIZE} fill={SEA} />
          {TERRAIN.map((run) => (
            <rect key={`${run.x}-${run.y}`} x={run.x * CELL} y={run.y * CELL} width={run.w * CELL} height={CELL} fill={run.fill} />
          ))}
          {Object.keys(FLY_PINS).map((id) => {
            const cell = pinCell(id);
            const x = cell.x * CELL + CELL / 2;
            const y = cell.y * CELL + CELL / 2;
            if (!open.has(id)) {
              return (
                <g key={id}>
                  <rect x={x - 2} y={y - 2} width={4} height={4} fill="#6a6478" />
                  <rect x={x - 1} y={y - 1} width={2} height={2} fill={CLOSED} />
                </g>
              );
            }
            return (
              <g key={id}>
                <rect x={x - 3} y={y - 3} width={6} height={6} fill={INK} />
                <rect x={x - 2} y={y - 2} width={4} height={4} fill={id === picked?.cityId ? PICKED : OPEN} />
                {id === here ? <rect x={x - 1} y={y - 1} width={2} height={2} fill="#fff" /> : null}
              </g>
            );
          })}
          {pickedCell ? <Cursor x={pickedCell.x * CELL + CELL / 2} y={pickedCell.y * CELL + CELL / 2} /> : null}
        </svg>
        <div className="fly-side">
          <ul className="item-list fly-list">
            {entries.map((entry, index) => (
              <li key={entry.cityId} className={index === menu.index ? "active" : ""} onClick={() => fly(index)}>
                <span className="gba-cursor">{index === menu.index ? "▶" : ""}</span>
                {entry.name}
                {entry.cityId === here ? <em>aqui</em> : null}
              </li>
            ))}
            {entries.length === 0 ? <li className="empty">Nenhuma cidade conhecida.</li> : null}
          </ul>
          {pickedCity ? (
            <ul className="fly-places">
              {pickedCity.landmarks.slice(0, 4).map((place) => (
                <li key={place}>{place}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <p className="panel-foot">Z voa · X volta</p>
    </div>
  );
}
