import * as Phaser from "phaser";
import type { Direction } from "@/game/character/appearance";
import { displayName, type Mon } from "@/game/pokemon/mon";
import { TILE, spriteOf } from "@/game/phaser/constants";
import { snap, viewZoom } from "@/game/phaser/view";
import { petSize } from "@/data/pokemon/heights";

const fronts = new Map<string, { w: number; h: number }>();
/** Escala de cada textura pronta: o sprite fica do tamanho certo no mapa com o detalhe todo. */
const scales = new Map<string, number>();

type Leader = { tx: number; ty: number; dir: Direction; moving: boolean; duration: number };

/**
 * Primeiro Pokémon da equipe andando atrás do líder (herói ou quem está seguindo o herói).
 * Não ocupa tile: segue a trilha do líder, pula a cada passo, vira para o lado em que anda
 * (costas subindo, frente descendo, espelhado para a direita) e respira parado.
 */
export class Pet {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  tx = 0;
  ty = 0;
  dir: Direction = "down";
  moving = false;
  fromX = 0;
  fromY = 0;
  t = 0;
  duration = 0.24;
  speciesKey = "";
  px = 16;
  maxW = 24;
  mon: Mon | null = null;
  lastLeader: { x: number; y: number } | null = null;
  clock = 0;
  hop = 0;
  enabled = true;
  zoom = 1;
  scale = 1;

  constructor(private scene: Phaser.Scene) {
    this.zoom = viewZoom(scene);
    this.shadow = scene.add.ellipse(0, 0, 12, 4, 0x10141e, 0.32).setVisible(false);
    this.sprite = scene.add.image(0, 0, "__DEFAULT").setOrigin(0.5, 1).setVisible(false);
  }

  /** A tela mudou de densidade: refaz o sprite no tamanho novo. */
  setZoom(zoom: number): void {
    if (zoom === this.zoom) return;
    this.zoom = zoom;
    this.face(this.dir);
  }

  /**
   * Recorta a sobra do PNG 96 × 96 e amplia em passo inteiro até passar do tamanho que ele
   * ocupa na tela real. Desenhado reduzido com filtro linear, o Pokémon tem o detalhe do
   * sprite original, e não um borrão de 20 pixels.
   */
  texture(sprite: string, back: boolean, px: number): string | null {
    const source = `mon_${sprite}${back ? "_back" : ""}`;
    const key = `pet_${sprite}_${px}_${this.zoom}${back ? "_back" : ""}`;
    if (this.scene.textures.exists(key)) return key;
    if (!this.scene.textures.exists(source)) return null;
    const img = this.scene.textures.get(source).getSourceImage() as HTMLImageElement;
    const probe = document.createElement("canvas");
    probe.width = img.width;
    probe.height = img.height;
    const pg = probe.getContext("2d");
    if (!pg) return null;
    pg.drawImage(img, 0, 0);
    const data = pg.getImageData(0, 0, img.width, img.height).data;
    let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        if (data[(y * img.width + x) * 4 + 3] > 24) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    // A frente define a escala, para frente e costas terem o mesmo tamanho: a altura da
    // tabela, com teto de largura, e nunca maior que o PNG.
    const front = back ? this.front(sprite) ?? { w, h } : { w, h };
    const size = Math.min(px / front.h, this.maxW / front.w, 1);
    const k = Math.max(1, Math.ceil(size * this.zoom - 0.01));
    const out = this.scene.textures.createCanvas(key, (w + 2) * k, (h + 1) * k);
    const g = out?.getContext();
    if (!out || !g) return null;
    g.imageSmoothingEnabled = false;
    g.drawImage(probe, x0, y0, w, h, k, k, w * k, h * k);
    out.refresh();
    out.setFilter(Phaser.Textures.FilterMode.LINEAR);
    scales.set(key, size / k);
    if (!back) fronts.set(sprite, { w, h });
    return key;
  }

  front(sprite: string): { w: number; h: number } | null {
    if (!fronts.has(sprite)) this.texture(sprite, false, this.px);
    return fronts.get(sprite) ?? null;
  }

  /** Atualiza quem anda junto: o primeiro da equipe que ainda está de pé. */
  sync(party: Mon[] | undefined): void {
    const mon = party?.find((m) => m.hp > 0) ?? null;
    this.mon = mon;
    const key = mon ? spriteOf(mon.species) : "";
    // O tamanho é o do desenho que aparece: evolução sem desenho próprio usa o da primeira
    // forma (Greninja sai como Froakie), e um Froakie do tamanho de um Greninja fica gigante.
    const size = mon ? petSize(key) : { height: 16, width: 24 };
    const px = size.height;
    if (key !== this.speciesKey || px !== this.px) {
      this.speciesKey = key;
      this.px = px;
      this.maxW = size.width;
      this.face(this.dir);
    }
  }

  name(): string {
    return this.mon ? displayName(this.mon) : "";
  }

  face(dir: Direction): void {
    this.dir = dir;
    if (!this.speciesKey) return;
    const back = dir === "up";
    const key = this.texture(this.speciesKey, back, this.px) ?? this.texture(this.speciesKey, false, this.px);
    if (key) {
      this.sprite.setTexture(key);
      this.scale = scales.get(key) ?? 1;
    }
    // Sprites oficiais olham para a esquerda.
    this.sprite.setFlipX(dir === "right");
  }

  pixel(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE + 8, y: ty * TILE + 15 };
  }

  place(tx: number, ty: number, dir: Direction): void {
    this.tx = tx;
    this.ty = ty;
    this.moving = false;
    this.face(dir);
    const p = this.pixel(tx, ty);
    this.sprite.setPosition(p.x, p.y);
  }

  /** Começa atrás do líder, no tile oposto ao que ele olha, se estiver livre. */
  spawnBehind(leader: Leader, free: (x: number, y: number) => boolean): void {
    const back: Record<Direction, [number, number]> = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] };
    const [dx, dy] = back[leader.dir];
    const ok = free(leader.tx + dx, leader.ty + dy);
    this.place(ok ? leader.tx + dx : leader.tx, ok ? leader.ty + dy : leader.ty, leader.dir);
    this.lastLeader = { x: leader.tx, y: leader.ty };
  }

  /** Chamado todo frame: anda para o tile que o líder acabou de deixar. */
  update(dt: number, leader: Leader | null, depthOf: (y: number) => number): void {
    this.clock += dt;
    const show = this.enabled && Boolean(this.speciesKey) && Boolean(leader);
    if (!show || !leader) {
      this.sprite.setVisible(false);
      this.shadow.setVisible(false);
      return;
    }
    const last = this.lastLeader;
    if (!last) this.lastLeader = { x: leader.tx, y: leader.ty };
    else if (last.x !== leader.tx || last.y !== leader.ty) {
      const jump = Math.abs(last.x - leader.tx) + Math.abs(last.y - leader.ty) > 1;
      if (jump) {
        // Teleporte do líder: fica escondido no tile dele e sai de trás no primeiro passo.
        this.place(leader.tx, leader.ty, leader.dir);
      } else if (Math.abs(this.tx - last.x) + Math.abs(this.ty - last.y) > 1) {
        // Ficou longe (cena que moveu o líder): reaparece no tile que ele acabou de deixar.
        this.place(last.x, last.y, leader.dir);
      } else if (this.tx !== last.x || this.ty !== last.y) {
        this.begin(last.x, last.y, leader.moving ? leader.duration : 0.24);
      }
      this.lastLeader = { x: leader.tx, y: leader.ty };
    }
    const base = this.advance(dt);
    // No mesmo tile do líder (entrou pela porta, sem espaço atrás) ele fica escondido: desenhado
    // embaixo do herói, parecia uma mancha nos pés dele.
    if (!this.moving && this.tx === leader.tx && this.ty === leader.ty) {
      this.sprite.setVisible(false);
      this.shadow.setVisible(false);
      return;
    }
    let lift = 0;
    let squash = 1;
    if (this.moving) {
      lift = Math.sin(Math.PI * Math.min(1, this.t)) * 3;
    } else {
      // Respira devagar: em alta resolução dá para encolher um tico, sem pular pixel.
      squash = 1 - (Math.sin(this.clock * 2.6) * 0.5 + 0.5) * 0.035;
    }
    if (this.hop > 0) {
      this.hop = Math.max(0, this.hop - dt);
      lift += Math.abs(Math.sin(this.hop * Math.PI * 4)) * 5;
    }
    this.sprite.setVisible(true).setPosition(base.x, base.y - snap(lift, this.zoom)).setScale(this.scale, this.scale * squash);
    this.shadow.setVisible(true).setPosition(base.x, base.y - 1).setScale(Math.max(0.7, 1 - lift / 12), 1);
    this.shadow.setSize(Math.max(8, Math.min(16, this.sprite.displayWidth * 0.7)), 4);
    const depth = depthOf(base.y);
    this.shadow.setDepth(depth - 0.2);
    this.sprite.setDepth(depth);
  }

  begin(tx: number, ty: number, duration: number): void {
    const dx = tx - this.tx;
    const dy = ty - this.ty;
    const dir: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    if (dir !== this.dir) this.face(dir);
    const p = this.pixel(this.tx, this.ty);
    this.fromX = p.x;
    this.fromY = p.y;
    this.tx = tx;
    this.ty = ty;
    this.t = 0;
    this.duration = duration;
    this.moving = true;
  }

  advance(dt: number): { x: number; y: number } {
    const p = this.pixel(this.tx, this.ty);
    if (!this.moving) return p;
    this.t += dt / this.duration;
    const k = Math.min(1, this.t);
    if (k >= 1) {
      this.moving = false;
      return p;
    }
    return { x: Math.round(this.fromX + (p.x - this.fromX) * k), y: Math.round(this.fromY + (p.y - this.fromY) * k) };
  }

  /** Pulinho de alegria (quando o herói fala com ele). */
  cheer(): void {
    this.hop = 0.5;
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
