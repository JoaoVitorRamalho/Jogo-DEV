import * as Phaser from "phaser";
import type { BattleVisuals } from "@/game/phaser/bridge";
import { VIEW_H, VIEW_W } from "@/game/phaser/constants";
import { BattleScene } from "@/game/phaser/scenes/BattleScene";
import { BootScene } from "@/game/phaser/scenes/BootScene";
import { WorldScene } from "@/game/phaser/scenes/WorldScene";

const holder = globalThis as unknown as { __jornadaGame?: Phaser.Game | null };

function current(): Phaser.Game | null {
  return holder.__jornadaGame ?? null;
}

export function createGame(parent: HTMLElement, zoom: number): Phaser.Game {
  current()?.destroy(true);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VIEW_W,
    height: VIEW_H,
    pixelArt: true,
    roundPixels: true,
    preserveDrawingBuffer: process.env.NODE_ENV !== "production",
    backgroundColor: "#121018",
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    scale: { mode: Phaser.Scale.NONE, zoom },
    scene: [BootScene, WorldScene, BattleScene],
  });
  holder.__jornadaGame = game;
  if (process.env.NODE_ENV !== "production") (window as unknown as { __jornada?: Phaser.Game }).__jornada = game;
  return game;
}

export function destroyGame(): void {
  current()?.destroy(true);
  holder.__jornadaGame = null;
}

export function setZoom(zoom: number): void {
  current()?.scale.setZoom(zoom);
}

export function openBattle(): Promise<BattleVisuals> {
  const game = current();
  if (!game) return Promise.reject(new Error("Jogo não iniciado"));
  return new Promise((resolve) => {
    BattleScene.ready = resolve;
    if (game.scene.isActive("world")) game.scene.pause("world");
    game.scene.start("battle");
  });
}

export function closeBattle(): void {
  const game = current();
  if (!game) return;
  if (game.scene.isActive("battle")) game.scene.stop("battle");
  if (game.scene.isPaused("world")) game.scene.resume("world");
}
