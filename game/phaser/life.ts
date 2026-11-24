import * as Phaser from "phaser";
import { waterMarks } from "@/game/core/mapLife";
import { TILE } from "@/game/phaser/constants";
import { canvasTexture, glint, HI, makeTextures, ripple } from "@/game/phaser/fountain";
import { canvasOf, sourceArt } from "@/game/phaser/smooth";

/**
 * Mapa vivo: o capim alto solta pedacinhos quando o jogador entra (o balanço do capim por cima
 * das pernas fica na cena, em `updateOverlays`), a água brilha, abre ondinhas e às vezes passa a
 * sombra de um peixe, e na floresta caem folhas.
 *
 * Vale igual nos modos Pixel e Suave: nada aqui lê a ampliação do mapa, só a arte original.
 * Tudo é objeto da cena e some quando o mapa troca.
 */

// ---------- capim ----------

/** Cores do capim alto (extra.png, quadro 4), do claro ao escuro. */
const GRASS_TINTS = [0xb0f080, 0x7ade5c, 0x3abe41, 0x2ca640];

const bits = new WeakMap<Phaser.Scene, Phaser.GameObjects.Particles.ParticleEmitter>();

function grassBits(scene: Phaser.Scene): Phaser.GameObjects.Particles.ParticleEmitter {
  const old = bits.get(scene);
  if (old?.scene) return old;
  canvasTexture(scene, "fx_blade", 2 * HI, 5 * HI, (g) => {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.moveTo(0.5, 5 * HI);
    g.quadraticCurveTo(0, 2 * HI, 1.3 * HI, 0);
    g.quadraticCurveTo(2 * HI, 2.6 * HI, 2 * HI - 0.5, 5 * HI);
    g.closePath();
    g.fill();
  });
  const emitter = scene.add.particles(0, 0, "fx_blade", {
    emitting: false,
    // Espalha a saída num retângulo de 10 × 4 px em volta do ponto pedido.
    emitZone: {
      type: "random" as const,
      source: {
        getRandomPoint: (point: Phaser.Types.Math.Vector2Like) => {
          point.x = -5 + Math.random() * 10;
          point.y = -2 + Math.random() * 4;
        },
      },
    },
    lifespan: { min: 360, max: 520 },
    speedX: { min: -34, max: 34 },
    speedY: { min: -64, max: -36 },
    gravityY: 240,
    rotate: { min: -50, max: 50 },
    scale: { start: 0.26, end: 0.2 },
    alpha: { start: 1, end: 0, ease: "Quad.easeIn" },
    tint: GRASS_TINTS,
  });
  bits.set(scene, emitter);
  return emitter;
}

/** Pedacinhos de capim que pulam do tile (tx, ty) quando o pé entra nele. */
export function grassBurst(scene: Phaser.Scene, tx: number, ty: number, depth: number): void {
  grassBits(scene).setDepth(depth).explode(4, tx * TILE + 8, ty * TILE + 11);
}

// ---------- água ----------

type Sheet = CanvasImageSource & { width: number; height: number };
const sheetWater = new WeakMap<object, Uint8Array>();

/** Quais tiles da folha são água. Lido uma vez por folha, da arte original. */
function waterOf(image: Sheet, tile: number): Uint8Array {
  const known = sheetWater.get(image);
  if (known) return known;
  const [, g] = canvasOf(image.width, image.height);
  g.drawImage(image, 0, 0);
  const marks = waterMarks(g.getImageData(0, 0, image.width, image.height).data, image.width, image.height, tile);
  sheetWater.set(image, marks);
  return marks;
}

type Cell = { x: number; y: number; open: boolean };

/**
 * Água descoberta do mapa: tile do chão que é água e não tem nada por cima (ponte, pedra,
 * árvore). `open` = água dos quatro lados também, longe da margem (fora do mapa conta como
 * água: o mar continua).
 */
function findWater(scene: Phaser.Scene, tilemap: Phaser.Tilemaps.Tilemap): Cell[] {
  const ground = tilemap.getLayer("ground");
  if (!ground) return [];
  const covers = ["detail", "buildings", "above"].flatMap((name) => tilemap.getLayer(name) ?? []);
  const W = tilemap.width;
  const H = tilemap.height;
  const T = tilemap.tileWidth;
  const marks = new Map<Phaser.Tilemaps.Tileset, Uint8Array | null>();
  const isWater = (gid: number): boolean => {
    const set = tilemap.tilesets.find((s) => gid >= s.firstgid && gid < s.firstgid + s.total);
    if (!set) return false;
    if (!marks.has(set)) {
      const image = sourceArt(scene, set.name);
      marks.set(set, image ? waterOf(image, T) : null);
    }
    return marks.get(set)?.[gid - set.firstgid] === 1;
  };
  const water = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const index = ground.data[y][x]?.index ?? -1;
      if (index < 1 || covers.some((layer) => (layer.data[y][x]?.index ?? -1) >= 1)) continue;
      if (isWater(index)) water[y * W + x] = 1;
    }
  }
  const at = (x: number, y: number) => x < 0 || y < 0 || x >= W || y >= H || water[y * W + x] === 1;
  const cells: Cell[] = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (water[y * W + x]) cells.push({ x, y, open: at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1) });
    }
  }
  return cells;
}

function fishTexture(scene: Phaser.Scene): void {
  canvasTexture(scene, "fx_fish", 8 * HI, 4 * HI, (g) => {
    g.fillStyle = "#0b2747";
    g.beginPath();
    g.ellipse(4.8 * HI, 2 * HI, 3 * HI, 1.35 * HI, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(2.2 * HI, 2 * HI);
    g.lineTo(0.3 * HI, 0.7 * HI);
    g.lineTo(0.8 * HI, 2 * HI);
    g.lineTo(0.3 * HI, 3.3 * HI);
    g.closePath();
    g.fill();
  });
}

/** Sombra de peixe que atravessa uns tiles de água aberta e mergulha com uma ondinha. */
function swim(scene: Phaser.Scene, open: Set<number>, W: number, from: Cell, done: () => void): boolean {
  const T = TILE;
  const dir = Math.random() < 0.5 ? -1 : 1;
  let len = 0;
  for (let x = from.x + dir; len < 4 && x >= 0 && x < W && open.has(from.y * W + x); x += dir) len += 1;
  if (len < 2) return false;
  const y = from.y * T + 6 + Math.random() * 4;
  const x0 = from.x * T + 8;
  const x1 = (from.x + dir * len) * T + 8;
  const duration = len * 850 + Math.random() * 500;
  const fish = scene.add.image(x0, y, "fx_fish").setDepth(1.5).setAlpha(0).setScale(0.25).setFlipX(dir < 0);
  scene.tweens.add({ targets: fish, x: x1, duration, ease: "Sine.easeInOut" });
  scene.tweens.add({ targets: fish, angle: { from: -7, to: 7 }, duration: 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  scene.tweens.add({ targets: fish, alpha: 0.3, duration: 600, ease: "Sine.easeOut" });
  scene.tweens.add({
    targets: fish,
    alpha: 0,
    delay: duration - 600,
    duration: 600,
    ease: "Sine.easeIn",
    onComplete: () => {
      if (fish.scene) ripple(scene, fish.x, fish.y, 0.16);
      scene.tweens.killTweensOf(fish);
      fish.destroy();
      done();
    },
  });
  return true;
}

/** Brilho, ondinhas e peixe na água que está na tela. Quanto mais água à vista, mais vida. */
export function addWaterLife(scene: Phaser.Scene, tilemap: Phaser.Tilemaps.Tilemap): void {
  const cells = findWater(scene, tilemap);
  if (!cells.length) return;
  makeTextures(scene);
  fishTexture(scene);
  const T = tilemap.tileWidth;
  const W = tilemap.width;
  const open = new Set(cells.filter((c) => c.open).map((c) => c.y * W + c.x));
  const pick = <V>(list: V[]): V => list[Math.floor(Math.random() * list.length)];
  const TICK = 250;
  let fishAt = scene.time.now + 2500 + Math.random() * 3000;
  let swimming = false;

  scene.time.addEvent({
    delay: TICK,
    loop: true,
    callback: () => {
      const view = scene.cameras.main.worldView;
      const near = cells.filter((c) => c.x * T + T > view.x && c.x * T < view.right && c.y * T + T > view.y && c.y * T < view.bottom);
      if (!near.length) return;
      const nearOpen = near.filter((c) => c.open);
      const perTick = TICK / 1000;
      // Brilho: até 3 por segundo; ondinha: até 1 por segundo, só longe da margem.
      if (Math.random() < Math.min(3, near.length / 40) * perTick) {
        const c = pick(near);
        glint(scene, c.x * T + 3 + Math.random() * (T - 6), c.y * T + 3 + Math.random() * (T - 6));
      }
      if (nearOpen.length && Math.random() < Math.min(1, nearOpen.length / 60) * perTick) {
        const c = pick(nearOpen);
        ripple(scene, c.x * T + 4 + Math.random() * (T - 8), c.y * T + 5 + Math.random() * (T - 10), 0.15 + Math.random() * 0.05);
      }
      if (!swimming && scene.time.now >= fishAt && nearOpen.length >= 6) {
        swimming = swim(scene, open, W, pick(nearOpen), () => {
          swimming = false;
          fishAt = scene.time.now + 5000 + Math.random() * 5000;
        });
      }
    },
  });
}

// ---------- folhas ----------

/** Quantas folhas no ar ao mesmo tempo, por mapa. */
const LEAF_MAPS: Record<string, number> = { forest: 12, clearing: 8 };
/** Amarelo, laranja e verde-claro: verde de folha some em cima do capim. */
const LEAF_TINTS = [0xd9ec7a, 0xf2dc64, 0xf0b048, 0xe48a48, 0xc6e46a];

type Leaf = {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  spin: number;
  size: number;
  age: number;
  life: number;
};

function leafTexture(scene: Phaser.Scene): void {
  canvasTexture(scene, "fx_leaf", 6 * HI, 4 * HI, (g) => {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.moveTo(0.5, 2 * HI);
    g.quadraticCurveTo(3 * HI, -0.7 * HI, 6 * HI - 0.5, 2 * HI);
    g.quadraticCurveTo(3 * HI, 4.7 * HI, 0.5, 2 * HI);
    g.fill();
    g.strokeStyle = "rgba(0, 0, 0, 0.35)";
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = "rgba(0, 0, 0, 0.28)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(1.2 * HI, 2 * HI);
    g.lineTo(5.3 * HI, 2 * HI);
    g.stroke();
  });
}

/** Folhas caindo na tela, presas ao mundo: quando a câmera anda, elas ficam para trás. */
export function addLeaves(scene: Phaser.Scene, mapKey: string): void {
  const count = LEAF_MAPS[mapKey];
  if (!count) return;
  leafTexture(scene);
  const camera = scene.cameras.main;
  const leaves: Leaf[] = [];
  let frames = 0;

  const reset = (leaf: Leaf, view: Phaser.Geom.Rectangle, anywhere: boolean) => {
    leaf.x = view.x - 10 + Math.random() * (view.width + 40);
    leaf.y = anywhere ? view.y + Math.random() * view.height * 0.85 : view.y - 6 - Math.random() * 30;
    leaf.vx = -10 + Math.random() * 7;
    leaf.vy = 9 + Math.random() * 8;
    leaf.phase = Math.random() * Math.PI * 2;
    leaf.spin = 2.2 + Math.random() * 2.6;
    leaf.size = 0.27 + Math.random() * 0.06;
    leaf.life = 5 + Math.random() * 4;
    leaf.age = anywhere ? Math.random() * leaf.life * 0.6 : 0;
    leaf.image.setTint(LEAF_TINTS[Math.floor(Math.random() * LEAF_TINTS.length)]);
  };

  const tick = (_time: number, deltaMs: number) => {
    // Espera a câmera achar o jogador antes de espalhar as primeiras folhas.
    frames += 1;
    if (frames < 3) return;
    const view = camera.worldView;
    if (!leaves.length) {
      for (let i = 0; i < count; i += 1) {
        const leaf = { image: scene.add.image(0, 0, "fx_leaf").setDepth(100001).setAlpha(0) } as Leaf;
        reset(leaf, view, true);
        leaves.push(leaf);
      }
    }
    const dt = Math.min(0.05, deltaMs / 1000);
    for (const leaf of leaves) {
      leaf.age += dt;
      const swing = Math.sin(leaf.age * 1.7 + leaf.phase);
      // Cai mais devagar nas pontas do balanço, como folha de verdade.
      leaf.x += (leaf.vx + swing * 10) * dt;
      leaf.y += leaf.vy * (0.55 + 0.45 * Math.abs(Math.cos(leaf.age * 1.7 + leaf.phase))) * dt;
      if (leaf.age >= leaf.life || leaf.y > view.bottom + 6 || leaf.x < view.x - 40 || leaf.x > view.right + 40) reset(leaf, view, false);
      const fade = Math.max(0, Math.min(1, leaf.age / 0.7, (leaf.life - leaf.age) / 1.2));
      // Vira de um lado para o outro, sem ficar fina demais: de lado ela sumiria.
      const flip = Math.cos(leaf.age * leaf.spin + leaf.phase);
      leaf.image
        .setPosition(leaf.x, leaf.y)
        .setAngle(swing * 40)
        .setScale(leaf.size * Math.sign(flip) * (0.3 + 0.7 * Math.abs(flip)), leaf.size)
        .setAlpha(0.95 * fade);
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, tick);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, tick));
}
