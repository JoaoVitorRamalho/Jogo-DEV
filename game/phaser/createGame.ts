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

/** Densidade da tela em passo inteiro (celular 3×, notebook 1× ou 2×). */
function density(): number {
  return Math.max(1, Math.min(3, Math.round(window.devicePixelRatio || 1)));
}

/**
 * `zoom` é o tamanho na página (pixels CSS por pixel do jogo). O canvas por dentro tem
 * zoom × densidade pixels reais por pixel do jogo, e as cenas ampliam a câmera nisso.
 */
export function createGame(parent: HTMLElement, zoom: number): Phaser.Game {
  current()?.destroy(true);
  const ratio = density();
  const real = zoom * ratio;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VIEW_W * real,
    height: VIEW_H * real,
    pixelArt: true,
    roundPixels: true,
    preserveDrawingBuffer: process.env.NODE_ENV !== "production",
    backgroundColor: "#121018",
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / ratio },
    scene: [BootScene, WorldScene, BattleScene],
  });
  game.registry.set("zoom", real);
  holder.__jornadaGame = game;
  if (process.env.NODE_ENV !== "production") (window as unknown as { __jornada?: Phaser.Game }).__jornada = game;
  return game;
}

export function destroyGame(): void {
  current()?.destroy(true);
  holder.__jornadaGame = null;
}

export function setZoom(zoom: number): void {
  const game = current();
  if (!game) return;
  const ratio = density();
  const real = zoom * ratio;
  game.scale.setZoom(1 / ratio);
  game.scale.resize(VIEW_W * real, VIEW_H * real);
  game.registry.set("zoom", real);
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
