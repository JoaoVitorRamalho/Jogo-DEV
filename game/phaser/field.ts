import type * as Phaser from "phaser";
import { FIELD_MOVE_FOR_OBSTACLE, HMS } from "@/data/field/hms";
import { canUseFieldOnGate, hmItemForMove } from "@/data/field/logic";
import { FIELD_FRAME, OBSTACLE_TEXT, type FieldGate, fieldGate } from "@/data/field/obstacles";
import { move } from "@/data/pokemon/moves";
import { ask, say } from "@/game/core/ui";
import { TILE } from "@/game/phaser/constants";
import { displayName } from "@/game/pokemon/mon";
import { useGame } from "@/game/state/store";
import { playCry, playSfx } from "@/lib/audio/engine";

type Cell = { x: number; y: number };
type FieldObject = { name: string; x: number; y: number; w: number; h: number };

/** Obstáculo de golpe de campo no mapa: as casas que ele tampa e o desenho de cada uma. */
export type FieldObstacle = { gate: FieldGate; cells: Cell[]; sprites: Phaser.GameObjects.Image[] };

/**
 * Monta a camada `fields` do mapa. Obstáculo já limpo (flag ligada) libera as casas e não aparece;
 * os outros ficam sólidos e desenhados com a folha `field_sheet`, na mesma régua de fundo dos NPCs.
 */
export function placeFieldObstacles(scene: Phaser.Scene, objects: FieldObject[], blocked: boolean[][]): FieldObstacle[] {
  const flags = useGame.getState().live?.flags ?? {};
  const placed: FieldObstacle[] = [];
  for (const object of objects) {
    const gate = fieldGate(object.name);
    if (!gate) {
      console.warn(`[campo] obstáculo "${object.name}" não está em data/field/obstacles.ts`);
      continue;
    }
    const cells: Cell[] = [];
    for (let y = object.y; y < object.y + object.h; y += 1) for (let x = object.x; x < object.x + object.w; x += 1) cells.push({ x, y });
    const cleared = Boolean(flags[gate.clearedFlag]);
    for (const { x, y } of cells) if (blocked[y]?.[x] !== undefined) blocked[y][x] = !cleared;
    if (cleared) continue;
    const frame = FIELD_FRAME[gate.kind];
    const sprites =
      frame === undefined
        ? []
        : cells.map(({ x, y }) => scene.add.image(x * TILE + TILE / 2, (y + 1) * TILE, "field_sheet", frame).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 0.5));
    placed.push({ gate, cells, sprites });
  }
  return placed;
}

export function obstacleAt(list: FieldObstacle[], x: number, y: number): FieldObstacle | null {
  return list.find((item) => item.cells.some((cell) => cell.x === x && cell.y === y)) ?? null;
}

/**
 * O jogador olhou o obstáculo. Sem HM ou sem o golpe no time, só explica o que falta; com tudo
 * certo, pergunta se quer usar. Devolve true quando o golpe foi usado (a cena anima e limpa).
 */
export async function offerFieldMove(obstacle: FieldObstacle): Promise<boolean> {
  const live = useGame.getState().live;
  if (!live) return false;
  const { gate } = obstacle;
  const hm = hmItemForMove(FIELD_MOVE_FOR_OBSTACLE[gate.kind]);
  const moveName = hm ? move(HMS[hm].battleMoveId).name : "";
  const check = canUseFieldOnGate(gate, live.flags, live.bag, live.party);
  if (!check.ok) {
    const lines = [{ text: OBSTACLE_TEXT[gate.kind] }];
    if (check.code === "no_pokemon_move" && hm) {
      lines.push({ text: `Ninguém do time sabe ${moveName}. Ensine com a ${hm.toUpperCase()}: Mochila, bolso HMs.` });
    }
    await say(lines);
    return false;
  }
  await say(OBSTACLE_TEXT[gate.kind]);
  if ((await ask(["Sim", "Não"], { text: `Usar ${moveName}?` }, 1)) !== 0) return false;
  playCry(check.user.species);
  await say(`${displayName(check.user)} usou ${moveName}!`);
  return true;
}

/** Tira o obstáculo da tela com um corte (moita) ou estilhaço (rocha) e grava a flag. */
export function clearFieldObstacle(scene: Phaser.Scene, obstacle: FieldObstacle, blocked: boolean[][]): Promise<void> {
  playSfx(obstacle.gate.kind === "smash_rock" ? "hit" : "swoosh");
  useGame.getState().update((s) => {
    s.flags[obstacle.gate.clearedFlag] = true;
  });
  for (const { x, y } of obstacle.cells) if (blocked[y]?.[x] !== undefined) blocked[y][x] = false;
  if (!obstacle.sprites.length) return Promise.resolve();
  return new Promise((resolve) => {
    scene.tweens.add({
      targets: obstacle.sprites,
      scaleX: obstacle.gate.kind === "smash_rock" ? 1.25 : 1.15,
      scaleY: obstacle.gate.kind === "smash_rock" ? 0.4 : 0.2,
      alpha: 0,
      duration: 260,
      ease: "Quad.easeIn",
      onComplete: () => {
        for (const sprite of obstacle.sprites) sprite.destroy();
        obstacle.sprites = [];
        resolve();
      },
    });
  });
}
