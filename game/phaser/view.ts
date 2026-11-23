import * as Phaser from "phaser";
import { VIEW_H, VIEW_W } from "@/game/phaser/constants";

/**
 * O canvas tem o tamanho real da tela (240 × 160 vezes o zoom, já com a densidade do
 * celular) e cada cena amplia a própria câmera. O mapa continua em pixel inteiro, mas o
 * que é desenhado em alta resolução (o Pokémon que segue o herói, os da batalha) mostra o
 * detalhe do sprite original em vez de virar bloco.
 */
export function viewZoom(scene: Phaser.Scene): number {
  return Number(scene.registry.get("zoom")) || 1;
}

/** Aplica o zoom na câmera agora e sempre que a janela mudar de tamanho. */
export function fitCamera(scene: Phaser.Scene, onZoom?: (zoom: number) => void): void {
  const apply = () => {
    const zoom = viewZoom(scene);
    const camera = scene.cameras.main;
    camera.setSize(scene.scale.width, scene.scale.height);
    camera.setZoom(zoom);
    onZoom?.(zoom);
  };
  apply();
  scene.registry.events.on("changedata-zoom", apply);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.registry.events.off("changedata-zoom", apply));
}

/** Canto de cima da tela do jogo, em coordenadas de objeto fixo (scrollFactor 0). */
export function viewOrigin(scene: Phaser.Scene): { x: number; y: number } {
  const camera = scene.cameras.main;
  return { x: (camera.width - VIEW_W) / 2, y: (camera.height - VIEW_H) / 2 };
}

/** Arredonda para o pixel real da tela, não para o pixel do jogo. */
export function snap(value: number, zoom: number): number {
  return Math.round(value * zoom) / zoom;
}

/**
 * Cópia do sprite ampliada em passo inteiro (cada pixel vira um bloco k × k, nítido) e com
 * filtro linear. Desenhada com escala 1/k ou menor, ela só é reduzida na tela: o pixel do
 * sprite sai do mesmo tamanho em toda parte, sem a escadinha torta da escala quebrada.
 */
export function hiresTexture(scene: Phaser.Scene, key: string, factor: number): { key: string; k: number } {
  const k = Math.max(1, Math.ceil(factor - 0.01));
  const out = `${key}@${k}`;
  if (k === 1 || !scene.textures.exists(key)) return { key, k: 1 };
  if (scene.textures.exists(out)) return { key: out, k };
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const canvas = scene.textures.createCanvas(out, source.width * k, source.height * k);
  const context = canvas?.getContext();
  if (!canvas || !context) return { key, k: 1 };
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, source.width * k, source.height * k);
  canvas.refresh();
  canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return { key: out, k };
}
