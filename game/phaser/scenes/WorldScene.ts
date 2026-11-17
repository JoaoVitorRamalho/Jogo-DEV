import * as Phaser from "phaser";
import { ENCOUNTERS } from "@/data/encounters";
import { NPCS } from "@/data/npcs";
import { type Sfx, playSfx, setContextTrack } from "@/lib/audio/engine";
import { subscribeInput } from "@/lib/input/engine";
import type { Action, InputFrame } from "@/lib/input/types";
import type { Direction } from "@/game/character/appearance";
import { useUi, worldBusy } from "@/game/core/ui";
import { type WorldApi, bridge } from "@/game/phaser/bridge";
import { BALL_FRAME, TALL_GRASS_GID, TALL_GRASS_TOP_FRAME, TILE, VIEW_H, VIEW_W } from "@/game/phaser/constants";
import { buildPlayerTexture } from "@/game/phaser/textures";
import { useGame } from "@/game/state/store";
import { story } from "@/game/story/hooks";

type Props = Record<string, string | number | boolean>;
type MapObject = { name: string; x: number; y: number; w: number; h: number; props: Props };
type WorldData = { map: string; x: number; y: number; dir: Direction; fade?: boolean };

const DIR_ROW: Record<Direction, number> = { down: 0, right: 1, up: 2, left: 3 };
const DELTA: Record<Direction, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const OPPOSITE: Record<Direction, Direction> = { down: "up", up: "down", left: "right", right: "left" };
const DIRS: Direction[] = ["up", "down", "left", "right"];
const WALK = 0.24;
const RUN = 0.13;

class Actor {
  moving = false;
  fromX = 0;
  fromY = 0;
  t = 0;
  duration = WALK;
  stepToggle = false;
  resolve: (() => void) | null = null;
  bumpTimer = 0;

  constructor(
    public sprite: Phaser.GameObjects.Sprite,
    public tx: number,
    public ty: number,
    public dir: Direction,
    public animated: boolean,
  ) {}

  pixel(tx: number, ty: number): { x: number; y: number } {
    return this.animated ? { x: tx * TILE + 8, y: ty * TILE + 19 } : { x: tx * TILE + 8, y: ty * TILE + 15 };
  }

  place(tx: number, ty: number, dir?: Direction): void {
    this.tx = tx;
    this.ty = ty;
    if (dir) this.dir = dir;
    const p = this.pixel(tx, ty);
    this.sprite.setPosition(p.x, p.y);
    this.moving = false;
    this.frame(0);
  }

  frame(col: number): void {
    if (!this.animated) return;
    this.sprite.setFrame(DIR_ROW[this.dir] * 4 + col);
  }

  begin(dir: Direction, duration: number): void {
    const [dx, dy] = DELTA[dir];
    this.dir = dir;
    const p = this.pixel(this.tx, this.ty);
    this.fromX = p.x;
    this.fromY = p.y;
    this.tx += dx;
    this.ty += dy;
    this.t = 0;
    this.duration = duration;
    this.moving = true;
    this.stepToggle = !this.stepToggle;
  }

  advance(dt: number): boolean {
    if (!this.moving) return false;
    this.t += dt / this.duration;
    const p = this.pixel(this.tx, this.ty);
    const k = Math.min(1, this.t);
    this.sprite.setPosition(Math.round(this.fromX + (p.x - this.fromX) * k), Math.round(this.fromY + (p.y - this.fromY) * k));
    this.frame(k < 0.5 ? (this.stepToggle ? 1 : 3) : 0);
    if (k >= 1) {
      this.moving = false;
      this.sprite.setPosition(p.x, p.y);
      return true;
    }
    return false;
  }

  depth(): number {
    return this.sprite.y + 0.5;
  }
}

type Npc = Actor & { id: string; home: { x: number; y: number }; wander: number; wanderTimer: number; scripted: boolean };

export class WorldScene extends Phaser.Scene {
  mapKey = "";
  tilemap!: Phaser.Tilemaps.Tilemap;
  layers: Record<string, Phaser.Tilemaps.TilemapLayer> = {};
  blocked: boolean[][] = [];
  warps: MapObject[] = [];
  signs: MapObject[] = [];
  areaEvents: MapObject[] = [];
  npcs = new Map<string, Npc>();
  player!: Actor;
  grassTop!: Phaser.GameObjects.Image;
  bubble!: Phaser.GameObjects.Image;
  animated: { tile: Phaser.Tilemaps.Tile; frames: number[]; duration: number }[] = [];
  animClock = 0;
  pending: Partial<Record<Action, boolean>> = {};
  held: Record<Action, boolean> | null = null;
  unsubscribe: (() => void) | null = null;
  scripts = 0;
  quietUntil = 0;
  turnTimer = 0;
  lastDir: Direction | null = null;
  ready = false;
  static afterCreate: (() => void) | null = null;

  constructor() {
    super("world");
  }

  create(data: WorldData): void {
    this.mapKey = data.map;
    this.ready = false;
    this.npcs.clear();
    this.animated = [];
    this.pending = {};
    this.scripts = 0;
    this.buildMap();
    const texture = this.textures.exists("player") ? "player" : "__MISSING";
    this.player = new Actor(this.add.sprite(0, 0, texture, 0).setOrigin(0.5, 1), data.x, data.y, data.dir, true);
    this.player.place(data.x, data.y, data.dir);
    this.grassTop = this.add.image(0, 0, "extra_sheet", TALL_GRASS_TOP_FRAME).setOrigin(0, 0).setVisible(false);
    this.bubble = this.add.image(0, 0, "bubble_dots").setOrigin(0.5, 1).setDepth(200000).setVisible(false);
    this.buildNpcs();
    this.setupCamera();
    this.unsubscribe = subscribeInput((frame) => this.collect(frame));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    bridge.world = this.api();
    const music = this.mapProp("music");
    setContextTrack(typeof music === "string" ? music : "town");
    this.persistPosition();
    if (data.fade) this.cameras.main.fadeIn(220, 0, 0, 0);
    this.ready = true;
    const after = WorldScene.afterCreate;
    WorldScene.afterCreate = null;
    after?.();
    this.runScript(() => story.hooks?.enterMap(this.mapKey) ?? Promise.resolve());
  }

  teardown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (bridge.world && bridge.world.mapKey() === this.mapKey) bridge.world = null;
  }

  mapProp(name: string): unknown {
    const props = (this.tilemap.properties ?? []) as { name: string; value: unknown }[];
    return Array.isArray(props) ? props.find((p) => p.name === name)?.value : undefined;
  }

  buildMap(): void {
    this.tilemap = this.make.tilemap({ key: `map_${this.mapKey}` });
    const sets = [
      this.tilemap.addTilesetImage("overworld", "overworld"),
      this.tilemap.addTilesetImage("inner", "inner"),
      this.tilemap.addTilesetImage("extra", "extra"),
    ].filter((set): set is Phaser.Tilemaps.Tileset => Boolean(set));
    const depths: Record<string, number> = { ground: 0, detail: 1, buildings: 2, above: 100000 };
    this.layers = {};
    for (const name of Object.keys(depths)) {
      const layer = this.tilemap.createLayer(name, sets, 0, 0);
      if (layer) {
        layer.setDepth(depths[name]);
        this.layers[name] = layer;
      }
    }
    const collision = this.tilemap.getLayer("collision");
    this.blocked = [];
    for (let y = 0; y < this.tilemap.height; y += 1) {
      const row: boolean[] = [];
      for (let x = 0; x < this.tilemap.width; x += 1) row.push(Boolean(collision && collision.data[y][x].index > 0));
      this.blocked.push(row);
    }
    const read = (layer: string): MapObject[] =>
      (this.tilemap.getObjectLayer(layer)?.objects ?? []).map((object) => ({
        name: object.name,
        x: Math.round((object.x ?? 0) / TILE),
        y: Math.round((object.y ?? 0) / TILE),
        w: Math.max(1, Math.round((object.width ?? TILE) / TILE)),
        h: Math.max(1, Math.round((object.height ?? TILE) / TILE)),
        props: Object.fromEntries(((object.properties ?? []) as { name: string; value: string | number | boolean }[]).map((p) => [p.name, p.value])),
      }));
    this.warps = read("warps");
    this.signs = read("signs");
    this.areaEvents = read("events");
    this.npcObjects = read("npcs");
    for (const tileset of this.tilemap.tilesets) {
      const data = tileset.tileData as Record<string, { animation?: { tileid: number; duration: number }[] }>;
      for (const [local, info] of Object.entries(data ?? {})) {
        if (!info.animation?.length) continue;
        const base = tileset.firstgid + Number(local);
        const frames = info.animation.map((frame) => tileset.firstgid + frame.tileid);
        const duration = info.animation[0].duration;
        for (const layer of Object.values(this.layers)) {
          layer.forEachTile((tile) => {
            if (tile.index === base) this.animated.push({ tile, frames, duration });
          });
        }
      }
    }
  }

  npcObjects: MapObject[] = [];

  buildNpcs(): void {
    for (const object of this.npcObjects) {
      const look = NPCS[object.name];
      const ball = look?.sprite === "ball";
      const key = ball ? "extra_sheet" : `npc_${object.name}`;
      if (!ball && !this.textures.exists(key)) continue;
      const sprite = this.add.sprite(0, 0, key, ball ? BALL_FRAME : 0).setOrigin(0.5, 1);
      const actor = new Actor(sprite, object.x, object.y, (object.props.dir as Direction) ?? "down", !ball) as Npc;
      actor.id = object.name;
      actor.home = { x: object.x, y: object.y };
      actor.wander = Number(object.props.wander ?? 0);
      actor.wanderTimer = 1 + Math.random() * 2;
      actor.scripted = false;
      actor.place(object.x, object.y, actor.dir);
      const visible = story.hooks ? story.hooks.npcVisible(object.name) : true;
      sprite.setVisible(visible);
      this.npcs.set(object.name, actor);
    }
  }

  setupCamera(): void {
    const cam = this.cameras.main;
    const w = this.tilemap.widthInPixels;
    const h = this.tilemap.heightInPixels;
    const x0 = w < VIEW_W ? -Math.floor((VIEW_W - w) / 2) : 0;
    const y0 = h < VIEW_H ? -Math.floor((VIEW_H - h) / 2) : 0;
    cam.setBounds(x0, y0, Math.max(w, VIEW_W), Math.max(h, VIEW_H));
    cam.setBackgroundColor("#121018");
    cam.startFollow(this.player.sprite, true, 1, 1, 0, 14);
    cam.setRoundPixels(true);
  }

  collect(frame: InputFrame): void {
    this.held = frame.held;
    for (const [action, value] of Object.entries(frame.pressed) as [Action, boolean][]) {
      if (value) this.pending[action] = true;
    }
  }

  take(): Partial<Record<Action, boolean>> {
    const pressed = this.pending;
    this.pending = {};
    return pressed;
  }

  busy(): boolean {
    return this.scripts > 0 || worldBusy() || !this.ready;
  }

  async runScript(run: () => Promise<unknown> | undefined): Promise<void> {
    this.scripts += 1;
    try {
      await run();
    } catch (error) {
      console.error(error);
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __lastScriptError?: string }).__lastScriptError = String((error as Error)?.stack ?? error);
      }
    } finally {
      this.scripts -= 1;
      this.quietUntil = this.time.now + 160;
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.tilemap.width && y < this.tilemap.height;
  }

  npcAt(x: number, y: number): Npc | null {
    for (const npc of this.npcs.values()) if (npc.sprite.visible && npc.tx === x && npc.ty === y) return npc;
    return null;
  }

  isBlocked(x: number, y: number, mover: Actor): boolean {
    if (!this.inBounds(x, y)) return true;
    if (this.blocked[y][x]) return true;
    const npc = this.npcAt(x, y);
    if (npc && npc !== mover) return true;
    if (mover !== this.player && this.player.tx === x && this.player.ty === y) return true;
    return false;
  }

  objectAt(list: MapObject[], x: number, y: number): MapObject | null {
    return list.find((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) ?? null;
  }

  onGrass(x: number, y: number): boolean {
    const tile = this.layers.detail?.getTileAt(x, y);
    return Boolean(tile && tile.index === TALL_GRASS_GID);
  }

  update(time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.animClock += deltaMs;
    for (const entry of this.animated) {
      const index = Math.floor(this.animClock / entry.duration) % entry.frames.length;
      if (entry.tile.index !== entry.frames[index]) entry.tile.index = entry.frames[index];
    }
    for (const npc of this.npcs.values()) this.updateNpc(npc, dt);
    this.updatePlayer(time, dt);
    this.updateOverlays();
  }

  updateNpc(npc: Npc, dt: number): void {
    if (npc.moving) {
      if (npc.advance(dt)) {
        const resolve = npc.resolve;
        npc.resolve = null;
        resolve?.();
      }
    } else if (npc.wander > 0 && !npc.scripted && npc.sprite.visible && !this.busy()) {
      npc.wanderTimer -= dt;
      if (npc.wanderTimer <= 0) {
        npc.wanderTimer = 1.4 + Math.random() * 2.4;
        const dir = DIRS[Math.floor(Math.random() * 4)];
        const [dx, dy] = DELTA[dir];
        const nx = npc.tx + dx;
        const ny = npc.ty + dy;
        npc.dir = dir;
        npc.frame(0);
        if (Math.abs(nx - npc.home.x) <= npc.wander && Math.abs(ny - npc.home.y) <= npc.wander && !this.isBlocked(nx, ny, npc)) {
          npc.begin(dir, 0.3);
        }
      }
    }
    npc.sprite.setDepth(npc.depth());
  }

  heldDir(): Direction | null {
    const held = this.held;
    if (!held) return null;
    if (this.lastDir && held[this.lastDir]) return this.lastDir;
    for (const dir of DIRS) if (held[dir]) return dir;
    return null;
  }

  updatePlayer(time: number, dt: number): void {
    const p = this.player;
    if (p.moving) {
      if (p.advance(dt)) {
        const resolve = p.resolve;
        p.resolve = null;
        if (resolve) resolve();
        else this.afterStep();
      }
      p.sprite.setDepth(p.depth());
      return;
    }
    p.sprite.setDepth(p.depth());
    if (this.busy()) this.quietUntil = time + 150;
    if (this.busy() || time < this.quietUntil) {
      this.take();
      if (!p.moving) p.frame(0);
      return;
    }
    const pressed = this.take();
    for (const dir of DIRS) if (pressed[dir]) this.lastDir = dir;
    if (pressed.menu) {
      playSfx("confirm");
      useUi.getState().setPanel("pause");
      return;
    }
    if (pressed.confirm) {
      this.interact();
      return;
    }
    const dir = this.heldDir();
    if (!dir) {
      this.turnTimer = 0;
      p.frame(0);
      return;
    }
    if (dir !== p.dir && pressed[dir]) {
      p.dir = dir;
      p.frame(0);
      this.turnTimer = 0.09;
      return;
    }
    if (this.turnTimer > 0) {
      this.turnTimer -= dt;
      return;
    }
    const [dx, dy] = DELTA[dir];
    if (this.isBlocked(p.tx + dx, p.ty + dy, p)) {
      p.dir = dir;
      p.bumpTimer -= dt;
      p.frame(Math.floor(time / 180) % 2 ? 1 : 3);
      if (p.bumpTimer <= 0) {
        playSfx("bump");
        p.bumpTimer = 0.4;
      }
      return;
    }
    p.begin(dir, this.held?.run ? RUN : WALK);
  }

  afterStep(): void {
    const p = this.player;
    this.persistPosition();
    const warp = this.objectAt(this.warps, p.tx, p.ty);
    if (warp) {
      this.handleWarp(warp);
      return;
    }
    const area = this.objectAt(this.areaEvents, p.tx, p.ty);
    if (area && story.hooks) {
      this.runScript(async () => {
        const blocked = await story.hooks?.event(area.name);
        if (blocked) await this.stepPlayer(OPPOSITE[p.dir]);
      });
      return;
    }
    if (this.onGrass(p.tx, p.ty)) {
      const table = ENCOUNTERS[this.mapKey];
      if (table && Math.random() < table.rate && story.hooks) {
        this.runScript(() => story.hooks?.wild(this.mapKey));
      }
    }
  }

  handleWarp(warp: MapObject): void {
    const target = String(warp.props.target);
    const tx = Number(warp.props.tx);
    const ty = Number(warp.props.ty);
    const dir = (warp.props.dir as Direction) ?? "down";
    this.runScript(async () => {
      const allowed = story.hooks ? await story.hooks.canWarp(this.mapKey, target) : true;
      if (!allowed) {
        await this.stepPlayer(OPPOSITE[this.player.dir]);
        return;
      }
      if (warp.props.door) playSfx("door");
      await this.warpTo(target, tx, ty, dir, true);
    });
  }

  stepPlayer(dir: Direction): Promise<void> {
    const p = this.player;
    const [dx, dy] = DELTA[dir];
    if (this.isBlocked(p.tx + dx, p.ty + dy, p)) {
      p.dir = dir;
      p.frame(0);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      p.resolve = () => {
        this.persistPosition();
        resolve();
      };
      p.begin(dir, WALK);
    });
  }

  warpTo(map: string, x: number, y: number, dir: Direction, fade: boolean): Promise<void> {
    return new Promise((resolve) => {
      const go = () => {
        useGame.getState().update((state) => {
          state.map = map;
          state.x = x;
          state.y = y;
          state.dir = dir;
        });
        WorldScene.afterCreate = resolve;
        this.scene.restart({ map, x, y, dir, fade });
      };
      if (fade) {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, go);
      } else go();
    });
  }

  persistPosition(): void {
    const p = this.player;
    const live = useGame.getState().live;
    if (!live || (live.map === this.mapKey && live.x === p.tx && live.y === p.ty && live.dir === p.dir)) return;
    useGame.getState().update((state) => {
      state.map = this.mapKey;
      state.x = p.tx;
      state.y = p.ty;
      state.dir = p.dir;
    });
  }

  facing(): { x: number; y: number } {
    const [dx, dy] = DELTA[this.player.dir];
    return { x: this.player.tx + dx, y: this.player.ty + dy };
  }

  interactTarget(): { npc: Npc | null; sign: MapObject | null } {
    const { x, y } = this.facing();
    return { npc: this.npcAt(x, y), sign: this.objectAt(this.signs, x, y) };
  }

  interact(): void {
    const { npc, sign } = this.interactTarget();
    if (npc && story.hooks) {
      this.runScript(async () => {
        if (npc.animated) this.faceToward(npc, this.player);
        await story.hooks?.talk(npc.id);
      });
      return;
    }
    if (sign && story.hooks) this.runScript(() => story.hooks?.sign(sign.name));
  }

  faceToward(actor: Actor, target: Actor): void {
    const dx = target.tx - actor.tx;
    const dy = target.ty - actor.ty;
    actor.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    actor.frame(0);
  }

  updateOverlays(): void {
    const p = this.player;
    const gx = p.moving && p.t < 0.4 ? p.tx - DELTA[p.dir][0] : p.tx;
    const gy = p.moving && p.t < 0.4 ? p.ty - DELTA[p.dir][1] : p.ty;
    const inGrass = this.onGrass(p.tx, p.ty) && (!p.moving || p.t >= 0.4);
    this.grassTop.setVisible(inGrass || this.onGrass(gx, gy));
    this.grassTop.setPosition((inGrass ? p.tx : gx) * TILE, (inGrass ? p.ty : gy) * TILE);
    this.grassTop.setDepth(p.depth() + 0.1);
    if (!p.moving && !this.busy()) {
      const { npc, sign } = this.interactTarget();
      const target = npc ? { x: npc.tx, y: npc.ty, tall: npc.animated } : sign ? { x: sign.x, y: sign.y, tall: false } : null;
      if (target) {
        const bob = Math.floor(this.time.now / 300) % 2;
        this.bubble.setVisible(true).setPosition(target.x * TILE + 8, target.y * TILE + (target.tall ? -8 : 0) - bob);
        return;
      }
    }
    this.bubble.setVisible(false);
  }

  actor(id: string): Actor | null {
    if (id === "player") return this.player;
    return this.npcs.get(id) ?? null;
  }

  api(): WorldApi {
    return {
      mapKey: () => this.mapKey,
      playerTile: () => ({ x: this.player.tx, y: this.player.ty, dir: this.player.dir }),
      warp: (map, x, y, dir, fade = true) => this.warpTo(map, x, y, dir, fade),
      movePlayer: async (steps) => {
        for (const step of steps) await this.stepPlayer(step);
      },
      facePlayer: (dir) => {
        this.player.dir = dir;
        this.player.frame(0);
        this.persistPosition();
      },
      moveNpc: async (id, steps) => {
        const npc = this.npcs.get(id);
        if (!npc) return;
        npc.scripted = true;
        for (const step of steps) {
          const [dx, dy] = DELTA[step];
          if (this.isBlocked(npc.tx + dx, npc.ty + dy, npc)) {
            npc.dir = step;
            npc.frame(0);
            await new Promise((r) => this.time.delayedCall(200, r));
            continue;
          }
          await new Promise<void>((resolve) => {
            npc.resolve = resolve;
            npc.begin(step, WALK);
          });
        }
        npc.frame(0);
        npc.scripted = false;
      },
      faceNpc: (id, dir) => {
        const npc = this.npcs.get(id);
        if (!npc) return;
        npc.dir = dir;
        npc.frame(0);
      },
      faceNpcToPlayer: (id) => {
        const npc = this.npcs.get(id);
        if (npc) this.faceToward(npc, this.player);
      },
      setNpcVisible: (id, visible) => this.npcs.get(id)?.sprite.setVisible(visible),
      placeNpc: (id, x, y, dir) => this.npcs.get(id)?.place(x, y, dir),
      emote: (id, kind) =>
        new Promise((resolve) => {
          const target = this.actor(id);
          if (!target) return resolve();
          if (kind === "!") playSfx("discover" as Sfx);
          const icon = this.add.image(target.sprite.x, target.sprite.y - 28, `emote_${kind}`).setOrigin(0.5, 1).setDepth(200001);
          this.tweens.add({ targets: icon, y: icon.y - 3, duration: 120, yoyo: true });
          this.time.delayedCall(750, () => {
            icon.destroy();
            resolve();
          });
        }),
      flash: (color = 0xffffff) =>
        new Promise((resolve) => {
          const c = Phaser.Display.Color.IntegerToRGB(color);
          this.cameras.main.flash(260, c.r, c.g, c.b);
          this.time.delayedCall(280, () => resolve());
        }),
      refreshNpcs: () => {
        for (const npc of this.npcs.values()) npc.sprite.setVisible(story.hooks ? story.hooks.npcVisible(npc.id) : true);
      },
      refreshPlayer: async () => {
        const live = useGame.getState().live;
        if (!live) return;
        await buildPlayerTexture(this, live.appearance);
        this.player.sprite.setTexture("player", DIR_ROW[this.player.dir] * 4);
      },
    };
  }
}
