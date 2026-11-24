import type { Direction } from "@/game/character/appearance";
import type { MoveCategory } from "@/data/pokemon/moves";
import type { ItemId } from "@/data/items";

export type WorldApi = {
  mapKey(): string;
  playerTile(): { x: number; y: number; dir: Direction };
  warp(map: string, x: number, y: number, dir: Direction, fade?: boolean): Promise<void>;
  movePlayer(steps: Direction[]): Promise<void>;
  facePlayer(dir: Direction): void;
  moveNpc(id: string, steps: Direction[]): Promise<void>;
  npcTile(id: string): { x: number; y: number } | null;
  faceNpc(id: string, dir: Direction): void;
  faceNpcToPlayer(id: string): void;
  setNpcVisible(id: string, visible: boolean): void;
  placeNpc(id: string, x: number, y: number, dir: Direction): void;
  emote(id: string, kind: "!" | "?" | "..."): Promise<void>;
  /** Transição do mapa para a batalha: clarões e a tela fechando no preto. */
  battleIntro(kind: "wild" | "trainer"): Promise<void>;
  flash(color?: number): Promise<void>;
  follow(id: string | null): void;
  fadeOutIn(): Promise<void>;
  refreshNpcs(): void;
  refreshPlayer(): Promise<void>;
};

export type BattleVisuals = {
  /** `foeSprite` nulo: só o cenário entra (o treinador manda o Pokémon depois, pela Pokébola). */
  begin(background: string, foeSprite: string | null, playerSprite: string | null): Promise<void>;
  sendOut(side: "player" | "foe", sprite: string): Promise<void>;
  transform(side: "player" | "foe", sprite: string): Promise<void>;
  withdraw(side: "player" | "foe"): Promise<void>;
  attack(side: "player" | "foe", tint: number, category: MoveCategory): Promise<void>;
  hit(side: "player" | "foe", strong: boolean): Promise<void>;
  faint(side: "player" | "foe"): Promise<void>;
  status(side: "player" | "foe", tint: number): Promise<void>;
  throwBall(shakes: number, caught: boolean, item?: ItemId): Promise<void>;
  end(): void;
};

export const bridge: { world: WorldApi | null; battle: BattleVisuals | null } = {
  world: null,
  battle: null,
};

export function world(): WorldApi {
  if (!bridge.world) throw new Error("Mundo ainda não carregado.");
  return bridge.world;
}
