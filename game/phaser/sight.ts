import type { Direction } from "@/game/character/appearance";

export const TRAINER_SIGHT_RANGE = 2;

const DELTA: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function hasTrainerSight(
  npc: { x: number; y: number; dir: Direction },
  player: { x: number; y: number },
  blocked: (x: number, y: number) => boolean,
  range = TRAINER_SIGHT_RANGE,
): boolean {
  const [dx, dy] = DELTA[npc.dir];
  for (let step = 1; step <= range; step += 1) {
    const x = npc.x + dx * step;
    const y = npc.y + dy * step;
    if (x === player.x && y === player.y) return true;
    if (blocked(x, y)) break;
  }
  return false;
}
