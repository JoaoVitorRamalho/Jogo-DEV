"""Gera os mapas do Capítulo 1 em Tiled JSON (editáveis no Tiled) e prévias PNG."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
MAPS = ASSETS / "maps"
PREVIEW = ROOT / ".tmp-art" / "maps"
T = 16

TILESETS = [
    {"name": "overworld", "image": "../tilesets/overworld.png", "w": 640, "h": 576, "first": 1},
    {"name": "inner", "image": "../tilesets/inner.png", "w": 640, "h": 400, "first": 1441},
    {"name": "extra", "image": "../tilesets/extra.png", "w": 256, "h": 112, "first": 2441},
]


KT_FIRST = 2601  # Kenney Tiny Town vem depois de overworld, inner e extra


def KT(i: int) -> int:
    """Tile do Kenney Tiny Town pelo número do arquivo original (tile_XXXX.png)."""
    return KT_FIRST + i


def _kenney_tileset() -> dict | None:
    png = ASSETS / "tilesets" / "kenney_tiny_town.png"
    if not png.is_file():
        return None
    img = Image.open(png)
    return {
        "name": "kenney_town",
        "image": "../tilesets/kenney_tiny_town.png",
        "w": img.width,
        "h": img.height,
        "first": KT_FIRST,
    }


KX_FIRST = KT_FIRST + 144  # kenney_extra.png: tiles no traço do Kenney que o pacote não tem
CAVE_FIRST = KX_FIRST + 32  # cave_entrance.png: paredão rochoso de 8 × 5 casas
CAVE_INNER_FIRST = CAVE_FIRST + 40  # cave_interior.png: pisos, paredes e formações minerais
SAND_RAMP = {(234, 165, 108): (243, 216, 152), (207, 130, 84): (222, 186, 120), (254, 201, 156): (252, 236, 190)}


def KX(i: int) -> int:
    return KX_FIRST + i


def make_kenney_extra() -> dict | None:
    """Gera kenney_extra.png (16 × 2 tiles) a partir da folha do Kenney.

    0–8: areia 3 × 3 (a terra do Kenney recolorida), na ordem quina, borda, miolo."""
    src = ASSETS / "tilesets" / "kenney_tiny_town.png"
    if not src.is_file():
        return None
    sheet = Image.open(src).convert("RGBA")
    out = Image.new("RGBA", (16 * T, 2 * T), (0, 0, 0, 0))
    for k, tile in enumerate((12, 13, 14, 24, 25, 26, 36, 37, 38)):
        sx, sy = (tile % 16) * T, (tile // 16) * T
        piece = sheet.crop((sx, sy, sx + T, sy + T))
        px = piece.load()
        for y in range(T):
            for x in range(T):
                r, g, b, a = px[x, y]
                if (r, g, b) in SAND_RAMP:
                    px[x, y] = (*SAND_RAMP[(r, g, b)], a)
        out.alpha_composite(piece, (k * T, 0))
    path = ASSETS / "tilesets" / "kenney_extra.png"
    out.save(path)
    return {"name": "kenney_extra", "image": "../tilesets/kenney_extra.png", "w": out.width, "h": out.height, "first": KX_FIRST}


def _tilesets_for(m: "Map") -> list[dict]:
    """As folhas antigas sempre; as do Kenney só se o mapa usa algum tile delas."""
    used = {gid for layer in m.layers.values() for row in layer for gid in row}
    sets = list(TILESETS)
    kt = _kenney_tileset()
    if kt and any(KT_FIRST <= gid < KX_FIRST for gid in used):
        sets.append(kt)
    if any(KX_FIRST <= gid < CAVE_FIRST for gid in used):
        sets.append({"name": "kenney_extra", "image": "../tilesets/kenney_extra.png", "w": 16 * T, "h": 2 * T, "first": KX_FIRST})
    if any(CAVE_FIRST <= gid < CAVE_INNER_FIRST for gid in used):
        sets.append({"name": "cave_entrance", "image": "../tilesets/cave_entrance.png", "w": 8 * T, "h": 5 * T, "first": CAVE_FIRST})
    if any(gid >= CAVE_INNER_FIRST for gid in used):
        sets.append({"name": "cave_interior", "image": "../tilesets/cave_interior.png", "w": 8 * T, "h": 8 * T, "first": CAVE_INNER_FIRST})
    return sets


def OW(c: int, r: int) -> int:
    return 1 + r * 40 + c


def IN(c: int, r: int) -> int:
    return 1441 + r * 40 + c


def EX(i: int) -> int:
    return 2441 + i


def EXB(c: int, r: int) -> int:
    """Bloco no extra.png (16 colunas), para carimbar os prédios do capítulo 2."""
    return 2441 + r * 16 + c


WEB, LEVER_OFF, LEVER_ON, HEDGE, MOSS, MOSS2, HEALER, STATUE, HEALMAT = (EX(i) for i in range(16, 25))


WOOD, WOOD2, LABFLOOR, SAND, TALL, TALL_TOP, MAT, WALL_T, WALL_B, LWALL_T, LWALL_B, VOID, MACHINE, PC, BALL = (
    EX(i) for i in range(15)
)
GRASS = [OW(0, 9), OW(1, 9), OW(0, 10), OW(0, 0)]
DIRT = OW(2, 32)
LIP_LEFT, LIP_RIGHT, LIP_TOP, LIP_BOTTOM = OW(0, 30), OW(2, 30), OW(1, 29), OW(1, 31)
WATER = [[OW(16 + c, r) for c in range(4)] for r in range(4)]
WAVES = [OW(0, 1), OW(1, 1), OW(2, 1), OW(3, 1), OW(3, 2), OW(2, 2), OW(1, 2), OW(0, 2)]
SHORE = OW(16, 6)
FLAGSTONE = [[OW(13, 15), OW(14, 15)], [OW(13, 16), OW(14, 16)]]
FLOWERS = [OW(0, 8), OW(1, 8), OW(3, 12)]
CHECKER = IN(0, 0)

LAYERS = ["ground", "detail", "buildings", "above", "collision"]


class Map:
    def __init__(self, name: str, cols: int, rows: int, fill: int | None = None, music: str = "town") -> None:
        self.name = name
        self.cols = cols
        self.rows = rows
        self.music = music
        self.layers = {n: [[0] * cols for _ in range(rows)] for n in LAYERS}
        self.objects: dict[str, list[dict]] = {"warps": [], "npcs": [], "signs": [], "events": [], "spawns": []}
        self.next_id = 1
        if fill is not None:
            for r in range(rows):
                for c in range(cols):
                    self.layers["ground"][r][c] = fill

    def inside(self, c: int, r: int) -> bool:
        return 0 <= c < self.cols and 0 <= r < self.rows

    def set(self, layer: str, c: int, r: int, gid: int) -> None:
        if self.inside(c, r):
            self.layers[layer][r][c] = gid

    def solid(self, c: int, r: int, on: bool = True) -> None:
        self.set("collision", c, r, VOID if on else 0)

    def rect(self, layer: str, c: int, r: int, w: int, h: int, gid: int, solid: bool | None = None) -> None:
        for y in range(r, r + h):
            for x in range(c, c + w):
                self.set(layer, x, y, gid)
                if solid is not None:
                    self.solid(x, y, solid)

    def stamp(
        self,
        c: int,
        r: int,
        src_c: int,
        src_r: int,
        w: int,
        h: int,
        tileset=OW,
        layer: str = "buildings",
        above_rows: int = 0,
        solid: bool = True,
        open_cells: tuple[tuple[int, int], ...] = (),
    ) -> None:
        for dy in range(h):
            for dx in range(w):
                gid = tileset(src_c + dx, src_r + dy)
                target = "above" if dy < above_rows else layer
                self.set(target, c + dx, r + dy, gid)
                blocked = solid and dy >= above_rows and (dx, dy) not in open_cells
                if blocked:
                    self.solid(c + dx, r + dy)

    def obj(self, group: str, name: str, c: float, r: float, w: float = 1, h: float = 1, **props) -> None:
        self.objects[group].append(
            {
                "id": self.next_id,
                "name": name,
                "type": group[:-1],
                "x": c * T,
                "y": r * T,
                "width": w * T,
                "height": h * T,
                "rotation": 0,
                "visible": True,
                "properties": [
                    {"name": k, "type": "int" if isinstance(v, int) and not isinstance(v, bool) else ("bool" if isinstance(v, bool) else "string"), "value": v}
                    for k, v in props.items()
                ],
            }
        )
        self.next_id += 1

    def warp(self, c: int, r: int, target: str, tx: int, ty: int, dir: str, w: int = 1, h: int = 1, door: bool = False) -> None:
        self.obj("warps", f"to_{target}", c, r, w, h, target=target, tx=tx, ty=ty, dir=dir, door=door)

    def npc(self, id: str, c: int, r: int, dir: str = "down", wander: int = 0) -> None:
        self.obj("npcs", id, c, r, dir=dir, wander=wander)

    def sign(self, id: str, c: int, r: int) -> None:
        self.obj("signs", id, c, r)
        self.solid(c, r)

    def event(self, id: str, c: int, r: int, w: int = 1, h: int = 1) -> None:
        self.obj("events", id, c, r, w, h)

    def field(self, id: str, c: int, r: int, kind: str, w: int = 1, h: int = 1) -> None:
        """Obstáculo de golpe de campo (id e tipo em data/field/obstacles.ts).

        Fica sólido no mapa; o jogo desenha o obstáculo e libera a passagem quando a flag dele liga.
        A camada `fields` só existe nos mapas que têm obstáculo."""
        self.objects.setdefault("fields", [])
        self.obj("fields", id, c, r, w, h, kind=kind)
        for y in range(r, r + h):
            for x in range(c, c + w):
                self.solid(x, y)

    def spawn(self, id: str, c: int, r: int, dir: str = "down") -> None:
        self.obj("spawns", id, c, r, dir=dir)

    def to_tiled(self) -> dict:
        tilesets = []
        for ts in _tilesets_for(self):
            cols = ts["w"] // T
            entry = {
                "firstgid": ts["first"],
                "name": ts["name"],
                "image": ts["image"],
                "imagewidth": ts["w"],
                "imageheight": ts["h"],
                "tilewidth": T,
                "tileheight": T,
                "margin": 0,
                "spacing": 0,
                "columns": cols,
                "tilecount": cols * (ts["h"] // T),
            }
            if ts["name"] == "overworld":
                entry["tiles"] = [
                    {
                        "id": WAVES[0] - 1,
                        "animation": [{"tileid": g - 1, "duration": 180} for g in WAVES],
                    }
                ]
            tilesets.append(entry)
        layers = []
        lid = 1
        for name in LAYERS:
            data = [gid for row in self.layers[name] for gid in row]
            layers.append(
                {
                    "id": lid,
                    "name": name,
                    "type": "tilelayer",
                    "width": self.cols,
                    "height": self.rows,
                    "x": 0,
                    "y": 0,
                    "opacity": 1,
                    "visible": name != "collision",
                    "data": data,
                }
            )
            lid += 1
        for group, objects in self.objects.items():
            layers.append(
                {
                    "id": lid,
                    "name": group,
                    "type": "objectgroup",
                    "draworder": "topdown",
                    "opacity": 1,
                    "visible": True,
                    "x": 0,
                    "y": 0,
                    "objects": objects,
                }
            )
            lid += 1
        return {
            "type": "map",
            "version": "1.10",
            "tiledversion": "1.10.2",
            "orientation": "orthogonal",
            "renderorder": "right-down",
            "infinite": False,
            "width": self.cols,
            "height": self.rows,
            "tilewidth": T,
            "tileheight": T,
            "nextlayerid": lid,
            "nextobjectid": self.next_id,
            "properties": [
                {"name": "title", "type": "string", "value": self.name},
                {"name": "music", "type": "string", "value": self.music},
            ],
            "tilesets": tilesets,
            "layers": layers,
        }


def grass_fill(m: Map) -> None:
    for r in range(m.rows):
        for c in range(m.cols):
            pick = (c * 7 + r * 13 + (c * r) % 5) % 11
            m.layers["ground"][r][c] = GRASS[0] if pick < 7 else GRASS[pick % len(GRASS)]


def tree(m: Map, c: int, r: int) -> None:
    for y in range(r, r + 2):
        for x in range(c, c + 2):
            if m.inside(x, y) and m.layers["detail"][y][x] == TALL:
                m.set("detail", x, y, 0)
    m.stamp(c, r, 5, 16, 2, 2, above_rows=1)


def tree_band(m: Map, c0: int, r0: int, w: int, h: int) -> None:
    for r in range(r0, r0 + h, 2):
        for c in range(c0, c0 + w, 2):
            tree(m, c, r)


def path(m: Map, cells: set[tuple[int, int]]) -> None:
    for c, r in cells:
        m.set("ground", c, r, DIRT)
    for c, r in cells:
        for dc, dr, lip in ((-1, 0, LIP_LEFT), (1, 0, LIP_RIGHT), (0, -1, LIP_TOP), (0, 1, LIP_BOTTOM)):
            n = (c + dc, r + dr)
            if n in cells or not m.inside(*n):
                continue
            if m.layers["ground"][n[1]][n[0]] in GRASS:
                m.set("ground", n[0], n[1], lip)


def line_cells(points: list[tuple[int, int]], width: int = 2) -> set[tuple[int, int]]:
    cells: set[tuple[int, int]] = set()
    for (c0, r0), (c1, r1) in zip(points, points[1:]):
        if c0 == c1:
            for r in range(min(r0, r1), max(r0, r1) + 1):
                for k in range(width):
                    cells.add((c0 + k, r))
        else:
            for c in range(min(c0, c1), max(c0, c1) + 1):
                for k in range(width):
                    cells.add((c, r0 + k))
    return cells


def water(m: Map, c0: int, r0: int, w: int, h: int, waves_row: int | None = None) -> None:
    for r in range(r0, r0 + h):
        for c in range(c0, c0 + w):
            gid = WATER[r % 4][c % 4]
            if waves_row is not None and r == waves_row:
                gid = WAVES[0]
            m.set("ground", c, r, gid)
            m.solid(c, r)


def flowers(m: Map, spots: list[tuple[int, int]]) -> None:
    for i, (c, r) in enumerate(spots):
        m.set("detail", c, r, FLOWERS[i % len(FLOWERS)])


def fence_h(m: Map, c: int, r: int, length: int) -> None:
    for i in range(length):
        m.set("buildings", c + i, r, OW(i % 2, 19))
        m.solid(c + i, r)


def house(m: Map, c: int, r: int, lab: bool = False) -> tuple[int, int]:
    """Casa Kenney 5 × 4 nas linhas r+1..r+4, porta em (c+2, r+4), como a casa antiga 5 × 5.

    A linha de cima do telhado fica na camada "above" (o herói passa por trás)."""
    if lab:
        rows = [[48, 49, 49, 51, 50], [60, 61, 61, 61, 62], [76, 88, 77, 88, 79], [76, 77, 89, 77, 79]]
    else:
        # Varia telhado e chaminé pela posição, para a rua não ficar com casas iguais.
        gray = (c * 5 + r * 3) % 3 == 1
        top, low, chimney = (48, 60, 51) if gray else (52, 64, 55)
        roof = [top, top + 1, top + 1, top + 1, top + 2]
        roof[1 + (c + r) % 3] = chimney
        rows = [roof, [low, low + 1, low + 1, low + 1, low + 2], [72, 84, 73, 84, 73], [72, 73, 85, 73, 73]]
    for dy, row in enumerate(rows):
        for dx, tile in enumerate(row):
            m.set("above" if dy == 0 else "buildings", c + dx, r + 1 + dy, KT(tile))
            if (dx, dy) != (2, 3):
                m.solid(c + dx, r + 1 + dy)
    return c + 2, r + 4


TREE_TILES = {OW(5, 16), OW(6, 16), OW(5, 17), OW(6, 17)}
LIPS = {LIP_LEFT, LIP_RIGHT, LIP_TOP, LIP_BOTTOM}
FENCE_TILES = {OW(0, 19), OW(1, 19)}
SIGN_TILE = OW(35, 2)
WATER_TILES = {gid for row in WATER for gid in row} | set(WAVES)


def blob9(m: Map, cells, first, layer_of, edge_full: bool) -> None:
    """Pinta uma mancha 3 × 3 do Kenney (quinas, bordas e miolo) pelo vizinho de cada célula.

    `first` é o tile da quina de cima à esquerda (ou função da célula); `layer_of` diz a camada."""
    cells = set(cells)

    def has(c: int, r: int) -> bool:
        return (c, r) in cells or (edge_full and not m.inside(c, r))

    for c, r in cells:
        n, s, w, e = has(c, r - 1), has(c, r + 1), has(c - 1, r), has(c + 1, r)
        col = 0 if not w else 2 if not e else 1
        row = 0 if not n else 2 if not s else 1
        base = first(c, r) if callable(first) else first
        layer = layer_of(c, r) if callable(layer_of) else layer_of
        m.set(layer, c, r, KT(base + row * 12 + col))


def kenney_skin(m: Map, autumn=lambda c, r: False, open_path_edges: bool = False) -> None:
    """Veste um mapa externo com o Kenney Tiny Town sem mudar colisão, warps, NPCs nem placas.

    Troca grama, terra, árvores, flores, cercas e placas pelo tile equivalente. O resto
    (água, areia, chafariz, barracas, prédios do capítulo 2) continua na folha antiga."""
    L = m.layers
    cells = [(c, r) for r in range(m.rows) for c in range(m.cols)]
    forest = {}
    for layer in ("buildings", "above"):
        for c, r in cells:
            if L[layer][r][c] in TREE_TILES:
                forest[(c, r)] = layer
    dirt = {(c, r) for c, r in cells if L["ground"][r][c] == DIRT}
    grassy = set()
    for c, r in cells:
        if L["ground"][r][c] in GRASS or L["ground"][r][c] in LIPS:
            h = (c * 73 + r * 151 + c * r * 7) % 100
            L["ground"][r][c] = KT(2 if h < 4 else 1 if h < 16 else 0)
            grassy.add((c, r))

    # O Kenney não tem caminho de 1 tile: alarga para o lado de grama livre.
    def free(c: int, r: int) -> bool:
        return (c, r) in grassy and not L["collision"][r][c] and not L["buildings"][r][c]

    for c, r in sorted(dirt):
        if (c - 1, r) not in dirt and (c + 1, r) not in dirt:
            for side in ((c + 1, r), (c - 1, r)):
                if free(*side):
                    dirt.add(side)
                    break
        if (c, r - 1) not in dirt and (c, r + 1) not in dirt:
            for side in ((c, r + 1), (c, r - 1)):
                if free(*side):
                    dirt.add(side)
                    break
    # Nas saídas abertas, a estrada continua além da borda em vez de terminar arredondada.
    blob9(m, dirt, 12, "ground", open_path_edges)

    # Lago no meio da grama ganha uma beira de areia (só visual, não muda a colisão).
    wet0 = {(c, r) for c, r in cells if L["ground"][r][c] in WATER_TILES}
    for c, r in list(grassy):
        if any((c + dc, r + dr) in wet0 for dc in (-1, 0, 1) for dr in (-1, 0, 1)):
            L["ground"][r][c] = SAND
            grassy.discard((c, r))
            L["detail"][r][c] = 0 if L["detail"][r][c] in FLOWERS else L["detail"][r][c]

    # Areia: a terra do Kenney recolorida. A beira com a água não leva grama.
    sand = {(c, r) for c, r in cells if L["ground"][r][c] in (SAND, SHORE)}
    wet = {(c, r) for c, r in cells if L["ground"][r][c] in WATER_TILES}
    for c, r in sand:
        n, s_, w, e = ((c + dc, r + dr) for dc, dr in ((0, -1), (0, 1), (-1, 0), (1, 0)))
        near = sand | wet

        def has(cell):
            return cell in near or not m.inside(*cell)

        col = 0 if not has(w) else 2 if not has(e) else 1
        row = 0 if not has(n) else 2 if not has(s_) else 1
        L["ground"][r][c] = KX(row * 3 + col)
    blob9(m, forest, lambda c, r: 9 if autumn(c, r) else 6, lambda c, r: forest[(c, r)], True)
    # Fileira de 1 tile não fecha a mancha 3 × 3: vira pé de árvore solto.
    for c, r in forest:
        lone_h = (c - 1, r) not in forest and (c + 1, r) not in forest and m.inside(c - 1, r) and m.inside(c + 1, r)
        lone_v = (c, r - 1) not in forest and (c, r + 1) not in forest and m.inside(c, r - 1) and m.inside(c, r + 1)
        if lone_h or lone_v:
            m.set(forest[(c, r)], c, r, KT(3 if autumn(c, r) else 4))

    for c, r in cells:
        if L["detail"][r][c] in FLOWERS and (c, r) in grassy:
            L["detail"][r][c] = KT(2)
        if L["buildings"][r][c] == SIGN_TILE:
            L["buildings"][r][c] = KT(83)
        if L["buildings"][r][c] in FENCE_TILES:
            left = c > 0 and L["buildings"][r][c - 1] in FENCE_TILES | {KT(80), KT(81)}
            right = c + 1 < m.cols and L["buildings"][r][c + 1] in FENCE_TILES
            L["buildings"][r][c] = KT(81 if left and right else 80 if right else 82 if left else 81)


def build_art_lab() -> Map | None:
    """Vila piloto com o Kenney Tiny Town (CC0), para comparar com o tileset de hoje."""
    if _kenney_tileset() is None:
        return None

    K = KT

    cols, rows = 28, 20
    m = Map("art_lab", cols, rows, fill=K(0), music="town")
    gate = range(13, 15)

    def blob(cells: set[tuple[int, int]], first, layer: str, edge_full: bool) -> None:
        """Pinta uma mancha 3 × 3 (quinas, bordas e miolo) pelo vizinho de cada célula.

        `first` é o tile da quina de cima à esquerda, ou uma função da célula que o devolve."""
        def has(c: int, r: int) -> bool:
            return (c, r) in cells or (edge_full and not m.inside(c, r))
        for c, r in cells:
            n, s, w, e = has(c, r - 1), has(c, r + 1), has(c - 1, r), has(c + 1, r)
            col = 0 if not w else 2 if not e else 1
            row = 0 if not n else 2 if not s else 1
            base = first(c, r) if callable(first) else first
            m.set(layer, c, r, K(base + row * 12 + col))

    # Grama com tufo e flor espalhados sem padrão visível.
    for r in range(rows):
        for c in range(cols):
            h = (c * 73 + r * 151 + c * r * 7) % 100
            if h < 5:
                m.set("ground", c, r, K(2))
            elif h < 17:
                m.set("ground", c, r, K(1))

    # Mata em volta, com a saída aberta embaixo e uns pés de outono.
    forest = set()
    for r in range(rows):
        for c in range(cols):
            border = r < 3 or c < 3 or c >= cols - 3 or (r >= rows - 2 and c not in gate)
            if border:
                forest.add((c, r))
    autumn = {(c, r) for c, r in forest if 18 <= c <= 24 and r < 3}
    blob(forest, lambda c, r: 9 if (c, r) in autumn else 6, "buildings", True)
    for c, r in forest:
        m.solid(c, r)

    # Caminhos de terra: rua de cima a baixo, avenida das casas e a praça.
    dirt = set()
    for r in range(8, rows):
        for c in gate:
            dirt.add((c, r))
    for r in (8, 9):
        for c in range(4, 24):
            dirt.add((c, r))
    for r in range(10, 14):
        for c in range(10, 18):
            dirt.add((c, r))
    blob(dirt, 12, "ground", False)

    def house(c: int, r: int, roof: str, wide: bool = False, chimney: bool = False) -> None:
        top, low = (52, 64) if roof == "red" else (48, 60)
        width = 4 if wide else 3
        mids = [1] * (width - 2)
        roof_top = [top] + [top + d for d in mids] + [top + 2]
        roof_low = [low] + [low + d for d in mids] + [low + 2]
        if chimney:
            roof_top[1] = 55 if roof == "red" else 51
        if roof == "red":
            wall = [72, 86, 87, 73] if wide else [84, 85, 84]
        else:
            wall = [88, 89, 89, 88] if wide else [88, 89, 88]
        for dx in range(width):
            m.set("above", c + dx, r, K(roof_top[dx]))
            m.set("buildings", c + dx, r + 1, K(roof_low[dx]))
            m.set("buildings", c + dx, r + 2, K(wall[dx]))
            m.solid(c + dx, r + 1)
            m.solid(c + dx, r + 2)

    house(5, 5, "red", chimney=True)
    house(12, 4, "red", wide=True)
    house(19, 5, "gray")
    house(4, 11, "gray", chimney=True)
    house(20, 11, "red")

    # Cerca com horta de flores à direita da praça.
    for c in range(19, 24):
        m.set("buildings", c, 15, K(81))
        m.solid(c, 15)
    m.set("buildings", 19, 15, K(80))
    m.set("buildings", 23, 15, K(82))
    for c in range(19, 24):
        m.set("detail", c, 16, K(2))

    def prop(c: int, r: int, i: int) -> None:
        m.set("buildings", c, r, K(i))
        m.solid(c, r)

    prop(13, 11, 104)  # poço no meio da praça
    prop(9, 15, 94)    # colmeia
    prop(8, 15, 107)   # pote
    prop(7, 16, 106)   # tora
    prop(16, 15, 95)   # alvo de treino
    prop(24, 10, 29)   # cogumelos na beira da mata
    prop(15, 17, 83)   # placa da entrada
    m.sign("art_lab_sign", 15, 17)
    for c in gate:
        m.warp(c, rows - 1, "brisamar", 12, 15, "up")
    m.spawn("default", 13, rows - 2, "up")
    # A colisão marca com um tile do "extra", que este mapa não carrega: o Phaser quebra ao ler
    # gid sem folha. Aqui ela usa o primeiro tile do Kenney (a camada é invisível).
    grid = m.layers["collision"]
    for r in range(rows):
        grid[r] = [K(0) if gid else 0 for gid in grid[r]]
    return m


def build_brisamar() -> Map:
    m = Map("Vila Brisamar", 40, 32, music="town")
    grass_fill(m)
    tree_band(m, 0, 0, 40, 4)
    tree_band(m, 0, 4, 4, 20)
    tree_band(m, 36, 4, 4, 20)
    for c in (18, 19, 20, 21):
        for r in range(0, 4):
            for layer in ("buildings", "above"):
                m.set(layer, c, r, 0)
            m.solid(c, r, False)
    tree(m, 16, 2)
    tree(m, 22, 2)

    for r in range(24, 27):
        for c in range(0, 40):
            m.set("ground", c, r, SAND)
    for c in range(0, 40):
        m.set("ground", c, 27, SHORE)
    water(m, 0, 28, 40, 4, waves_row=28)
    for c in range(0, 40):
        for r in range(24, 28):
            m.solid(c, r, False)
            m.set("buildings", c, r, 0)
            m.set("above", c, r, 0)
    m.stamp(30, 28, 4, 1, 2, 2, layer="detail", solid=True)
    m.stamp(6, 29, 4, 1, 2, 2, layer="detail", solid=True)
    m.set("detail", 14, 29, OW(2, 0))
    m.set("detail", 22, 30, OW(3, 0))
    m.set("detail", 26, 29, OW(2, 0))

    home_door = house(m, 8, 8)
    neighbor_door = house(m, 27, 8)
    lab_door = house(m, 24, 15, lab=True)

    main = line_cells([(19, 0), (19, 21)])
    main |= line_cells([(10, 13), (26, 13)])
    main |= line_cells([(10, 13), (10, 13)])
    main |= {(home_door[0], home_door[1] + 1), (home_door[0], home_door[1] + 2)}
    main |= {(neighbor_door[0], neighbor_door[1] + 1), (neighbor_door[0], neighbor_door[1] + 2)}
    main |= line_cells([(26, 20), (26, 21)], width=1)
    main |= line_cells([(19, 21), (26, 21)])
    main |= line_cells([(12, 22), (12, 23)])
    main |= line_cells([(12, 21), (19, 21)])
    path(m, main)

    for dy in range(3):
        for dx in range(5):
            m.set("ground", 17 + dx, 16 + dy, FLAGSTONE[(16 + dy) % 2][(17 + dx) % 2])
    m.stamp(18, 15, 22, 9, 3, 3, above_rows=0)
    if _kenney_tileset():
        # A placa é sólida: fica ao lado da passagem, não em cima dela.
        m.sign("goto_art_lab", 11, 16)
        m.set("buildings", 11, 16, OW(35, 2))
        m.warp(12, 16, "art_lab", 13, 18, "up")

    m.stamp(5, 18, 18, 22, 5, 6, above_rows=3, open_cells=())
    for dx in range(5):
        m.solid(5 + dx, 18, False)
        m.solid(5 + dx, 19, False)
        m.solid(5 + dx, 20, False)

    m.stamp(33, 12, 13, 5, 2, 3, above_rows=1)  # casinha do cachorro inteira (telhado na linha 5), longe da casa
    m.stamp(13, 18, 28, 4, 3, 2)
    fence_h(m, 5, 14, 4)
    fence_h(m, 12, 14, 0)
    flowers(m, [(6, 13), (7, 13), (13, 9), (14, 10), (13, 11), (22, 10), (23, 9), (33, 18), (34, 19), (15, 20), (23, 22), (30, 22), (32, 21), (5, 15), (6, 16)])
    for c, r in ((14, 8), (30, 20), (34, 16)):
        m.set("buildings", c, r, OW(2, 14))
        m.solid(c, r)
    m.stamp(33, 22, 33, 0, 1, 2, above_rows=1)
    m.stamp(34, 22, 34, 0, 1, 2, above_rows=1)

    clinic_door = house(m, 14, 4)
    clinic_path = line_cells([(clinic_door[0], clinic_door[1] + 1), (clinic_door[0], 13)], width=1)
    path(m, clinic_path)
    m.sign("sign_clinic", clinic_door[0] - 1, clinic_door[1] + 1)
    m.set("buildings", clinic_door[0] - 1, clinic_door[1] + 1, OW(35, 2))
    m.warp(clinic_door[0], clinic_door[1], "clinic", 5, 6, "up", door=True)

    m.sign("sign_village", 21, 4)
    m.sign("sign_home", 7, 12)
    m.sign("sign_lab", 23, 19)
    m.sign("sign_beach", 15, 23)
    m.npc("mother_town", 10, 14, "down")
    m.npc("mother_lake", 18, 26, "left")
    for c, r in ((21, 4), (7, 12), (23, 19), (15, 23)):
        m.set("buildings", c, r, OW(35, 2))

    m.warp(home_door[0], home_door[1], "house_1f", 6, 7, "up", door=True)
    m.warp(neighbor_door[0], neighbor_door[1], "neighbor", 5, 6, "up", door=True)
    m.warp(lab_door[0], lab_door[1], "lab", 7, 9, "up", door=True)
    m.warp(19, 0, "route1", 11, 42, "up", w=2)
    m.event("north_gate", 19, 1, 2, 1)

    m.spawn("from_house", home_door[0], home_door[1] + 1, "down")
    m.spawn("from_neighbor", neighbor_door[0], neighbor_door[1] + 1, "down")
    m.spawn("from_lab", lab_door[0], lab_door[1] + 1, "down")
    m.spawn("from_route1", 19, 1, "down")

    m.npc("fisher", 20, 26, "down")
    m.npc("girl", 16, 14, "left", wander=3)
    m.npc("gael_town", 24, 21, "left")
    m.npc("elder", 22, 6, "down")
    m.npc("shopkeeper", 7, 21, "down")
    m.npc("kid", 31, 17, "down", wander=4)
    m.npc("ren_gate", 19, 3, "down")
    return m


def interior_box(m: Map, lab: bool = False, floor: int = WOOD) -> None:
    for r in range(m.rows):
        for c in range(m.cols):
            m.set("ground", c, r, floor if (c + r) % 3 else (WOOD2 if floor == WOOD else floor))
    for c in range(m.cols):
        m.set("ground", c, 0, LWALL_T if lab else WALL_T)
        m.set("ground", c, 1, LWALL_B if lab else WALL_B)
        m.solid(c, 0)
        m.solid(c, 1)
    for r in range(m.rows):
        m.solid(-1, r)


def build_house_2f() -> Map:
    m = Map("Casa — Quarto", 10, 8, music="town")
    interior_box(m)
    # cama inteira (peças 17+18) no canto esquerdo
    m.stamp(1, 1, 17, 1, 2, 3, tileset=IN, above_rows=0)
    # janela no centro da parede; TV logo abaixo dela, com um vaso ao lado
    m.stamp(4, 0, 9, 4, 2, 2, tileset=IN, layer="detail", solid=True)
    m.set("buildings", 4, 2, EX(15))
    m.solid(4, 2)
    m.stamp(5, 2, 11, 11, 1, 1, tileset=IN)
    # escada no canto direito e planta grande ao lado dela
    m.stamp(7, 1, 0, 15, 2, 2, tileset=IN, layer="detail", solid=False)
    m.solid(7, 1, False)
    m.solid(8, 1, False)
    m.stamp(9, 1, 8, 12, 1, 2, tileset=IN, above_rows=1)
    # tapete 4x3 centralizado no quarto (bordas 0 e 2, miolo 1 repetido)
    for dx, src in enumerate((0, 1, 1, 2)):
        m.stamp(3 + dx, 4, src, 7, 1, 3, tileset=IN, layer="detail", solid=False)
        for dy in range(3):
            m.solid(3 + dx, 4 + dy, False)
    # estante embaixo da cama, encostada na parede de baixo
    m.stamp(0, 6, 3, 12, 3, 2, tileset=IN)
    # mochila/vaso no canto oposto, fechando o quarto
    m.stamp(9, 7, 11, 11, 1, 1, tileset=IN)
    m.warp(7, 1, "house_1f", 9, 3, "down", w=2)
    m.spawn("bed", 3, 3, "down")
    m.spawn("from_1f", 7, 3, "down")
    m.obj("signs", "bedroom_pc", 4, 2)
    m.obj("signs", "bedroom_window", 5, 2)
    m.obj("signs", "bedroom_bed", 2, 3)
    m.obj("signs", "bedroom_shelf", 1, 6)
    m.obj("signs", "exam_folder", 0, 6)
    m.obj("signs", "bedroom_bag", 9, 7)
    return m


def build_house_1f() -> Map:
    m = Map("Casa — Sala e cozinha", 12, 9, music="town")
    interior_box(m)
    for r in range(2, 5):
        for c in range(0, 5):
            m.set("ground", c, r, CHECKER)
    m.stamp(0, 1, 13, 10, 2, 3, tileset=IN)
    m.stamp(2, 1, 10, 7, 3, 3, tileset=IN)
    m.stamp(4, 0, 12, 0, 2, 1, tileset=IN, layer="detail", solid=False)
    m.stamp(7, 0, 9, 4, 2, 2, tileset=IN, layer="detail", solid=False)
    # escada inteira (3 degraus de altura); antes só aparecia o topo escuro
    m.stamp(9, 1, 2, 15, 2, 3, tileset=IN, layer="detail", solid=False)
    m.stamp(0, 7, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.stamp(11, 7, 11, 11, 1, 1, tileset=IN)
    m.stamp(1, 6, 0, 7, 3, 3, tileset=IN, layer="detail", solid=False)
    for dx in range(3):
        for dy in range(3):
            m.solid(1 + dx, 6 + dy, False)
    m.set("detail", 5, 8, MAT)
    m.set("detail", 6, 8, MAT)
    m.solid(9, 1, False)
    m.solid(10, 1, False)
    m.warp(9, 1, "house_2f", 7, 3, "down", w=2)
    m.warp(5, 8, "brisamar", 10, 13, "down", w=2, door=True)
    m.spawn("from_2f", 9, 3, "down")
    m.spawn("from_outside", 6, 7, "up")
    m.npc("mother", 9, 4, "left")
    # mesa de jantar com toalha (remédios da mãe em cima) e uma cadeira de cada lado
    m.stamp(5, 3, 13, 1, 3, 3, tileset=IN)
    m.stamp(4, 3, 16, 4, 1, 3, tileset=IN, above_rows=1)
    m.stamp(8, 3, 18, 4, 1, 3, tileset=IN, above_rows=1)
    m.set("above", 6, 4, IN(10, 6))
    for c in range(5, 8):
        m.obj("signs", "kitchen_meds", c, 3)
        m.obj("signs", "kitchen_meds", c, 5)
    return m


def build_neighbor() -> Map:
    m = Map("Casa dos Vizinhos", 10, 8, music="town")
    interior_box(m)
    m.stamp(1, 2, 3, 12, 3, 2, tileset=IN)
    m.stamp(5, 3, 13, 1, 3, 3, tileset=IN)
    m.stamp(8, 1, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.stamp(3, 0, 14, 0, 2, 1, tileset=IN, layer="detail", solid=False)
    m.set("detail", 4, 7, MAT)
    m.set("detail", 5, 7, MAT)
    m.warp(4, 7, "brisamar", 29, 13, "down", w=2, door=True)
    m.spawn("from_outside", 5, 6, "up")
    m.npc("neighbor", 3, 5, "right")
    m.npc("gael", 6, 6, "left")
    return m


def build_lab() -> Map:
    m = Map("Laboratório do Prof. Dário", 14, 11, music="town")
    interior_box(m, lab=True, floor=LABFLOOR)
    m.stamp(1, 2, 3, 12, 3, 2, tileset=IN)
    m.stamp(4, 2, 3, 12, 3, 2, tileset=IN)
    m.set("buildings", 8, 1, MACHINE)
    m.set("buildings", 9, 1, PC)
    m.set("buildings", 10, 1, PC)
    m.set("buildings", 12, 1, MACHINE)
    m.stamp(8, 4, 13, 1, 3, 3, tileset=IN)
    m.stamp(12, 2, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.stamp(1, 8, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.stamp(12, 8, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.stamp(1, 5, 0, 12, 3, 3, tileset=IN)
    m.set("detail", 6, 10, MAT)
    m.set("detail", 7, 10, MAT)
    m.warp(6, 10, "brisamar", 26, 20, "down", w=2, door=True)
    m.warp(1, 9, "clearing", 8, 9, "up")
    m.obj("signs", "lab_clearing", 1, 8)
    m.spawn("from_outside", 7, 9, "up")
    m.npc("lira", 11, 6, "down")
    m.npc("gael_lab", 6, 8, "up")
    m.npc("ren_lab", 7, 9, "up")
    m.npc("lab_ball_torchic", 8, 5, "down")
    m.npc("lab_ball_bulbasaur", 9, 5, "down")
    m.npc("lab_ball_froakie", 10, 5, "down")
    m.obj("signs", "ball_torchic", 8, 6)
    m.obj("signs", "ball_bulbasaur", 9, 6)
    m.obj("signs", "ball_froakie", 10, 6)
    m.obj("signs", "lab_books", 2, 3)
    m.obj("signs", "lab_books", 5, 3)
    m.obj("signs", "lab_machine", 8, 1)
    m.obj("signs", "lab_machine", 12, 1)
    return m


def build_route1() -> Map:
    m = Map("Rota 1", 24, 46, music="streets")
    grass_fill(m)
    tree_band(m, 0, 0, 4, 46)
    tree_band(m, 20, 0, 4, 46)
    tree_band(m, 4, 0, 16, 4)
    for c in (10, 11, 12, 13):
        for r in range(0, 4):
            for layer in ("buildings", "above"):
                m.set(layer, c, r, 0)
            m.solid(c, r, False)
    route = line_cells([(11, 45), (11, 36), (7, 36), (7, 26), (14, 26), (14, 16), (9, 16), (9, 8), (11, 8), (11, 0)])
    path(m, route)

    def grass_patch(c0: int, r0: int, w: int, h: int) -> None:
        tall(m, rect(c0, r0, w, h), route)

    grass_patch(13, 37, 6, 6)
    grass_patch(4, 28, 3, 7)
    grass_patch(9, 19, 5, 6)
    grass_patch(16, 9, 4, 7)
    grass_patch(4, 9, 4, 5)
    tree(m, 16, 30)
    tree(m, 4, 40)
    tree(m, 6, 42)
    tree(m, 16, 21)
    tree(m, 13, 5)
    m.stamp(17, 34, 4, 1, 2, 2, layer="buildings")
    flowers(m, [(8, 40), (9, 41), (14, 30), (15, 31), (5, 21), (6, 22), (18, 18), (12, 12)])
    fence_h(m, 4, 25, 3)
    m.sign("sign_route1", 13, 43)
    m.set("buildings", 13, 43, OW(35, 2))
    m.sign("sign_forest", 13, 4)
    m.set("buildings", 13, 4, OW(35, 2))
    m.warp(11, 45, "brisamar", 19, 1, "down", w=2)
    m.warp(11, 0, "forest", 10, 20, "up", w=2)
    m.spawn("from_brisamar", 11, 43, "up")
    m.spawn("from_forest", 11, 2, "down")
    m.event("forest_edge", 10, 1, 4, 1)
    m.npc("gael_route", 13, 40, "left")
    m.npc("youngster", 7, 32, "down")
    m.npc("picnic_mel", 17, 17, "left")
    m.npc("ren_route1", 10, 35, "up")
    m.npc("item_potion", 18, 11, "down")
    m.npc("hiker", 12, 6, "down")
    return m


def build_clinic() -> Map:
    m = Map("Clínica de Brisamar", 10, 8, music="town")
    interior_box(m, lab=True)
    m.stamp(1, 2, 3, 12, 3, 2, tileset=IN)
    m.stamp(6, 2, 10, 7, 3, 3, tileset=IN)
    m.set("detail", 4, 7, MAT)
    m.set("detail", 5, 7, MAT)
    m.warp(4, 7, "brisamar", 16, 9, "down", w=2, door=True)
    m.spawn("from_outside", 5, 6, "up")
    m.npc("doctor", 2, 5, "right")
    m.npc("mother_clinic", 4, 5, "right")
    m.obj("signs", "clinic_desk", 6, 3)
    return m


def build_clearing() -> Map:
    m = Map("Clareira de Treinamento", 16, 12, music="streets")
    grass_fill(m)
    tree_band(m, 0, 0, 16, 2)
    tree_band(m, 0, 2, 2, 10)
    tree_band(m, 14, 2, 2, 10)
    tree_band(m, 2, 10, 12, 2)
    clearing = line_cells([(8, 11), (8, 3)], width=2)
    path(m, clearing)
    for c, r in list(clearing):
        for layer in ("buildings", "above"):
            m.set(layer, c, r, 0)
        m.solid(c, r, False)
    for r in range(4, 8):
        for c in range(4, 7):
            m.set("detail", c, r, TALL)
    m.warp(7, 11, "lab", 7, 9, "up", w=2)
    m.spawn("from_lab", 8, 9, "up")
    m.npc("gael_clearing", 10, 5, "left")
    m.sign("sign_clearing", 5, 3)
    m.set("buildings", 5, 3, OW(35, 2))
    return m


def build_forest() -> Map:
    m = Map("Floresta de Aster", 20, 22, music="dungeon")
    grass_fill(m)
    trail = line_cells([(10, 21), (10, 14), (6, 14), (6, 8), (12, 8), (12, 2), (10, 2), (10, 0)])
    patches = rect(12, 15, 4, 4) | rect(3, 9, 3, 4) | rect(13, 4, 4, 3)
    clearing = rect(8, 4, 4, 6) | rect(12, 4, 6, 4)
    # Reserve as clareiras antes de plantar árvores inteiras, sem cortar copas
    # nem colocar personagens dentro de troncos ou no gargalo da trilha.
    woods(m, trail | patches | clearing | rect(8, 18, 2, 2))
    path(m, trail)
    tall(m, patches, trail | clearing)
    flowers(m, [(8, 7), (10, 4), (16, 7), (14, 4)])
    m.warp(10, 21, "route1", 11, 2, "down", w=2)
    m.warp(10, 0, "route2", 17, 62, "up", w=2)
    m.spawn("from_route", 10, 19, "up")
    m.spawn("from_city", 10, 2, "down")
    m.npc("bia_forest", 6, 12, "down")
    m.npc("ravi", 15, 6, "left")
    m.npc("lost_kid", 8, 5, "down")
    m.npc("cora_forest", 9, 6, "down")  # capítulo 2: a líder investiga a clareira
    m.npc("thomas_researcher", 14, 5, "down")
    m.npc("item_forest_venusaurite", 2, 9)  # pedra mega no canto do capim
    m.sign("sign_forest_in", 8, 18)
    m.set("buildings", 8, 18, OW(35, 2))
    return m


def woods(m: Map, open_cells: set[tuple[int, int]]) -> None:
    """Planta árvores 2x2 em todo bloco par que não encosta em nenhuma célula aberta."""
    for r in range(0, m.rows, 2):
        for c in range(0, m.cols, 2):
            block = {(c, r), (c + 1, r), (c, r + 1), (c + 1, r + 1)}
            if not block & open_cells:
                tree(m, c, r)


def rect(c0: int, r0: int, w: int, h: int) -> set[tuple[int, int]]:
    return {(c, r) for c in range(c0, c0 + w) for r in range(r0, r0 + h)}


def tall(m: Map, cells: set[tuple[int, int]], skip: set[tuple[int, int]]) -> None:
    for c, r in cells - skip:
        if m.inside(c, r) and not any(m.layers[layer][r][c] for layer in ("collision", "buildings", "above")):
            m.set("detail", c, r, TALL)


def post(m: Map, sign_id: str, c: int, r: int) -> None:
    m.sign(sign_id, c, r)
    m.set("buildings", c, r, OW(35, 2))


def build_route2() -> Map:
    """Rota 2: dois caminhos (oeste com mato, leste com treinadores), lago no meio e bosque trancado."""
    m = Map("Rota 2", 36, 64, music="streets")
    grass_fill(m)
    route = line_cells([(17, 63), (17, 53), (8, 53), (8, 32), (12, 32), (12, 13), (17, 13)])
    route |= line_cells([(17, 53), (26, 53), (26, 40), (28, 40), (28, 20), (24, 20), (24, 13), (17, 13)])
    route |= line_cells([(17, 13), (17, 0)])
    spur_pond = line_cells([(8, 36), (14, 36)])
    # A trilha atravessa a parede de árvores até a borda leste do mapa.
    # A abertura de duas casas fica cercada por copas e troncos dos dois lados.
    spur_grove = line_cells([(24, 13), (24, 6), (35, 6)])
    open_cells = route | spur_pond | spur_grove
    for area in (
        rect(16, 48, 4, 16), rect(6, 52, 24, 4), rect(4, 30, 8, 24), rect(8, 12, 8, 20),
        rect(14, 30, 8, 12), rect(12, 36, 2, 2), rect(24, 38, 8, 16), rect(26, 20, 6, 20),
        rect(22, 12, 10, 10), rect(8, 12, 24, 4), rect(16, 0, 4, 12), rect(22, 2, 10, 8), rect(24, 10, 2, 2),
    ):
        open_cells |= area
    # Clareira escondida a leste do começo. A passagem (20-21, 58-59) fica fechada pela moita
    # route2_bush_shortcut, que só sai com Corte (data/field/obstacles.ts).
    open_cells |= rect(20, 58, 2, 2) | rect(22, 58, 6, 4)
    woods(m, open_cells)
    # A fileira de cima de cada árvore é andável (o herói passa atrás da copa). Fecha as duas
    # copas que encostam no começo da rota, senão elas dariam a volta na moita.
    m.solid(20, 60)
    m.solid(20, 62)
    # As copas junto à abertura também fecham as laterais do corredor.
    for c in range(32, 36):
        m.solid(c, 5)
        m.solid(c, 8)
    path(m, route | spur_pond | spur_grove)
    water(m, 16, 32, 5, 6)
    walk = route | spur_pond | spur_grove
    tall(m, rect(4, 34, 4, 16) | rect(10, 40, 2, 8), walk)
    tall(m, rect(8, 16, 4, 12) | rect(14, 18, 2, 8), walk)
    tall(m, rect(30, 22, 2, 14) | rect(24, 42, 2, 8), walk)
    tall(m, rect(26, 2, 6, 4), walk)
    flowers(m, [(5, 31), (10, 50), (15, 41), (21, 31), (20, 14), (9, 14), (29, 16), (23, 3), (31, 8), (14, 57), (25, 44), (31, 52)])
    post(m, "sign_route2", 19, 60)
    post(m, "sign_r2_split", 15, 55)
    post(m, "sign_r2_grove", 25, 10)
    post(m, "sign_r2_north", 19, 3)
    m.warp(17, 63, "forest", 10, 1, "down", w=2)
    m.warp(17, 0, "ferruria", 21, 34, "up", w=2)
    # A transição acontece ao atravessar a abertura, no fim do corredor de árvores.
    m.warp(35, 6, "echo_grove", 4, 27, "up", h=2)
    m.spawn("from_forest", 17, 61, "up")
    m.spawn("from_city", 17, 2, "down")
    m.npc("ranger_r2", 24, 10, "down")
    m.npc("r2_trainer_a", 29, 46, "left")
    m.npc("r2_rui", 18, 56, "down")
    m.npc("r2_tais", 18, 5, "down")
    m.npc("r2_trainer_b", 30, 30, "left")
    m.npc("r2_fisher", 15, 34, "right")
    m.npc("r2_hiker", 14, 54, "right", wander=1)
    m.npc("r2_grove_kid", 28, 8, "left")
    m.npc("item_r2_super", 4, 31)
    m.npc("item_r2_ball", 20, 40)
    m.npc("item_r2_candy", 30, 3)
    m.npc("item_r2_garchompite", 22, 2)  # pedra mega no bosque do Gible
    m.field("route2_bush_shortcut", 20, 58, "cut_bush", h=2)
    m.npc("item_r2_cut", 26, 60)  # prêmio da clareira atrás da moita
    flowers(m, [(23, 59), (27, 58), (22, 61)])
    return m


def build_ferruria() -> Map:
    m = Map("Cidade Ferrúria", 44, 36, music="town")
    grass_fill(m)
    tree_band(m, 0, 0, 44, 3)
    tree_band(m, 0, 3, 3, 31)
    tree_band(m, 41, 3, 3, 31)
    tree_band(m, 0, 34, 44, 2)
    street = line_cells([(21, 35), (21, 0)])
    plaza = rect(15, 15, 14, 8)
    for c, r in street | plaza:
        for layer in ("buildings", "above"):
            m.set(layer, c, r, 0)
        m.solid(c, r, False)
    for c, r in plaza:
        m.set("ground", c, r, FLAGSTONE[r % 2][c % 2])

    m.stamp(5, 5, 5, 2, 5, 5, tileset=EXB, above_rows=1, open_cells=((2, 4),))  # ginásio
    m.stamp(13, 5, 0, 2, 5, 5, tileset=EXB, above_rows=1, open_cells=((2, 4),))  # centro de cura
    m.stamp(25, 5, 10, 2, 5, 5, tileset=EXB, above_rows=1, open_cells=((2, 4),))  # loja
    lab_door = house(m, 33, 5, lab=True)
    gym_door, center_door, mart_door = (7, 9), (15, 9), (27, 9)
    m.stamp(24, 16, 22, 9, 3, 3, above_rows=0)  # chafariz da praça
    homes = {"ferruria_house": (5, 14), "house_locked": (10, 14), "house_locked_2": (31, 14), "house_locked_3": (36, 14), "house_locked_4": (5, 27), "house_locked_5": (11, 27)}
    doors: dict[str, tuple[int, int]] = {}
    for key, (c, r) in homes.items():
        doors[key] = house(m, c, r)
    water(m, 30, 28, 8, 4)
    fence_h(m, 29, 27, 10)

    main = street | line_cells([(5, 11), (38, 11)]) | line_cells([(5, 24), (38, 24)])
    for door in (gym_door, center_door, mart_door, lab_door):
        main |= line_cells([(door[0], door[1] + 1), (door[0], 11)], width=1)
    for key, (c, r) in doors.items():
        if r < 24:
            main |= line_cells([(c, r + 1), (c, 24)], width=1)
        else:
            main |= line_cells([(c, r + 1), (c, 33)], width=1)
    main |= line_cells([(7, 33), (21, 33)], width=1) | line_cells([(13, 24), (13, 26)], width=1) | line_cells([(7, 24), (7, 26)], width=1)
    path(m, main - plaza)
    flowers(m, [(4, 12), (11, 12), (19, 12), (24, 12), (31, 12), (39, 12), (16, 21), (28, 21), (15, 15), (28, 15),
                (24, 27), (25, 28), (26, 27), (24, 30), (26, 31), (39, 26), (3, 31), (18, 29), (19, 30), (40, 20)])
    for c, r in ((11, 10), (31, 10), (3, 20), (18, 14), (26, 14), (39, 31), (17, 28)):
        m.set("buildings", c, r, OW(2, 14))
        m.solid(c, r)

    m.warp(21, 35, "route2", 17, 1, "down", w=2)
    # Saída norte (capítulo 3): os operários ficam em cima da rua até a obra liberar a Rota 3.
    m.warp(21, 0, "route3", 17, 50, "up", w=2)
    m.spawn("from_route3", 21, 1, "down")
    m.warp(gym_door[0], gym_door[1], "ferruria_gym", 7, 16, "up", door=True)
    m.warp(center_door[0], center_door[1], "ferruria_center", 5, 7, "up", door=True)
    m.warp(mart_door[0], mart_door[1], "ferruria_mart", 4, 6, "up", door=True)
    m.warp(lab_door[0], lab_door[1], "ferruria_lab", 7, 9, "up", door=True)
    hx, hy = doors["ferruria_house"]
    m.warp(hx, hy, "ferruria_house", 4, 6, "up", door=True)
    m.spawn("from_route", 21, 33, "up")
    m.spawn("from_lab", lab_door[0], lab_door[1] + 1, "down")
    m.spawn("from_center", center_door[0], center_door[1] + 1, "down")
    m.spawn("from_gym", gym_door[0], gym_door[1] + 1, "down")
    m.spawn("from_mart", mart_door[0], mart_door[1] + 1, "down")

    post(m, "sign_ferruria", 19, 31)
    post(m, "sign_gym", gym_door[0] - 1, gym_door[1] + 1)
    post(m, "sign_center", center_door[0] - 1, center_door[1] + 1)
    post(m, "sign_mart", mart_door[0] - 1, mart_door[1] + 1)
    post(m, "sign_works", 23, 3)
    post(m, "sign_lake", 28, 30)
    m.npc("item_ferruria_blazikenite", 40, 33)  # pedra mega no canto perto do lago
    for key, (dx, dy) in doors.items():
        if key != "ferruria_house":
            m.sign(key, dx, dy)
    m.npc("ferruria_local", 10, 12, "right", wander=2)
    m.npc("ferruria_trainer", 34, 12, "left")
    m.npc("ferruria_kid", 18, 19, "down", wander=2)
    m.npc("ferruria_elder", 16, 17, "right")
    m.npc("ferruria_gossip_a", 29, 19, "right")
    m.npc("ferruria_gossip_b", 30, 19, "left")
    m.npc("ferruria_fisher", 33, 32, "up")
    m.npc("ferruria_gardener", 23, 28, "left", wander=1)
    m.npc("ferruria_bug", 9, 25, "right")
    m.npc("ferruria_jogger", 38, 20, "down", wander=3)
    m.npc("gael_ferruria", 22, 30, "down")
    m.npc("worker_a", 21, 2, "down")
    m.npc("worker_b", 22, 2, "down")
    m.npc("gym_guard", 8, 10, "left")
    return m


def build_ferruria_mart() -> Map:
    m = Map("Loja de Ferrúria", 10, 8, music="town")
    interior_box(m, lab=True, floor=LABFLOOR)
    m.stamp(1, 3, 0, 12, 3, 2, tileset=IN)  # balcão
    m.stamp(5, 2, 3, 12, 3, 2, tileset=IN)  # prateleiras
    m.stamp(5, 5, 3, 12, 3, 2, tileset=IN)
    m.stamp(9, 1, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.set("detail", 4, 7, MAT)
    m.set("detail", 5, 7, MAT)
    m.warp(4, 7, "ferruria", 27, 10, "down", w=2, door=True)
    m.spawn("from_outside", 4, 6, "up")
    m.npc("ferruria_shop", 2, 2, "down")
    for c in (1, 2, 3):
        m.obj("signs", "mart_desk", c, 4)
    m.npc("mart_customer", 8, 4, "left", wander=1)
    return m


def build_ferruria_house() -> Map:
    m = Map("Casa da Família Prado", 10, 8, music="town")
    interior_box(m)
    m.stamp(1, 2, 3, 12, 3, 2, tileset=IN)
    m.stamp(5, 3, 13, 1, 3, 3, tileset=IN)
    m.stamp(8, 1, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.set("detail", 4, 7, MAT)
    m.set("detail", 5, 7, MAT)
    m.warp(4, 7, "ferruria", 7, 19, "down", w=2, door=True)
    m.spawn("from_outside", 4, 6, "up")
    m.npc("prado_mom", 3, 5, "right")
    m.npc("prado_kid", 8, 5, "left", wander=1)
    return m


def build_ferruria_center() -> Map:
    m = Map("Centro de Cura de Ferrúria", 12, 9, music="town")
    interior_box(m, lab=True, floor=LABFLOOR)
    m.stamp(3, 3, 0, 12, 3, 2, tileset=IN)  # balcão
    m.set("buildings", 6, 2, HEALER)
    m.solid(6, 2)
    m.set("buildings", 10, 2, PC)
    m.solid(10, 2)
    m.stamp(1, 2, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.stamp(10, 6, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.set("detail", 4, 5, HEALMAT)
    m.set("detail", 5, 8, MAT)
    m.set("detail", 6, 8, MAT)
    m.warp(5, 8, "ferruria", 15, 10, "down", w=2, door=True)
    m.spawn("from_outside", 5, 7, "up")
    m.npc("nurse", 4, 2, "down")
    for c in (3, 4, 5):
        m.obj("signs", "center_desk", c, 4)
    m.obj("signs", "center_pc", 10, 2)
    m.npc("center_visitor", 8, 5, "left", wander=1)
    return m


def build_ferruria_gym() -> Map:
    """Viveiro-labirinto: teias A e B se alternam quando um casulo é tocado."""
    m = Map("Ginásio de Ferrúria", 15, 18, music="streets")
    interior_box(m, lab=True, floor=MOSS)
    for r in range(2, 18):
        for c in range(15):
            m.set("ground", c, r, MOSS2 if (c * 3 + r) % 5 == 0 else MOSS)
    for r in range(2, 18):
        for c in (0, 14):
            m.set("buildings", c, r, HEDGE)
            m.solid(c, r)
    gaps = {6: (11,), 10: (7,), 13: (3, 11)}
    for r, open_cols in gaps.items():
        for c in range(1, 14):
            if c in open_cols:
                continue
            m.set("buildings", c, r, HEDGE)
            m.solid(c, r)
    for c in (4, 10):
        m.set("buildings", c, 3, STATUE)
        m.solid(c, 3)
    m.set("detail", 7, 17, MAT)
    m.set("detail", 8, 17, MAT)
    m.warp(7, 17, "ferruria", 7, 10, "down", w=2, door=True)
    m.spawn("from_outside", 7, 16, "up")
    m.npc("cora", 7, 3, "down")
    m.npc("gym_guide", 5, 16, "right")
    m.npc("gym_trainer_1", 9, 11, "left")
    m.npc("gym_trainer_2", 4, 8, "right")
    # teias: A fecha quando o casulo está apagado, B quando está aceso
    m.npc("web_a_1", 3, 13)
    m.npc("web_a_2", 7, 10)
    m.npc("web_b_1", 11, 13)
    m.npc("web_b_3", 11, 6)
    for id_, (c, r) in {"lever_1": (12, 11), "lever_2": (2, 8), "lever_3": (12, 15)}.items():
        m.npc(f"{id_}_off", c, r)
        m.npc(f"{id_}_on", c, r)
    return m


def build_ferruria_lab() -> Map:
    m = Map("Laboratório da Profª Celina", 14, 11, music="town")
    interior_box(m, lab=True, floor=LABFLOOR)
    m.stamp(1, 2, 0, 15, 2, 2, tileset=IN)
    m.stamp(4, 2, 2, 15, 2, 2, tileset=IN)
    m.stamp(8, 1, 13, 10, 2, 3, tileset=IN)
    m.stamp(11, 1, 10, 7, 3, 3, tileset=IN)
    m.set("detail", 6, 10, MAT)
    m.set("detail", 7, 10, MAT)
    m.warp(6, 10, "ferruria", 35, 10, "down", w=2, door=True)
    m.spawn("from_outside", 7, 9, "up")
    m.npc("celina", 9, 3, "down")
    m.obj("signs", "celina_terminal", 8, 2)
    return m


# ---------- capítulo 3: Rota 3 e Verdelume ----------
# Só o palco: falas, cenas e flags ficam em game/story/chapter3.ts (guia em docs/CAP3-JOAO.md).


def kenney_prop(m: Map, tile: int, cells, layer: str = "buildings", solid: bool = True) -> None:
    """Objeto de um tile do Kenney (alvo, tronco, poço, vaso, arbusto) em cada célula."""
    for c, r in cells:
        m.set(layer, c, r, KT(tile))
        if solid:
            m.solid(c, r)


def dojo(m: Map, c: int, r: int) -> tuple[int, int]:
    """Dojo de Verdelume: prédio Kenney 7 × 4 de pedra e telhado vermelho, porta no meio.

    Mesma regra da casa: linhas r+1..r+4, telhado de cima na camada "above"."""
    rows = [
        [52, 53, 53, 53, 53, 53, 54],
        [64, 65, 65, 65, 65, 65, 66],
        [76, 88, 77, 88, 77, 88, 79],
        [76, 77, 77, 89, 77, 77, 79],
    ]
    for dy, row in enumerate(rows):
        for dx, tile in enumerate(row):
            m.set("above" if dy == 0 else "buildings", c + dx, r + 1 + dy, KT(tile))
            if (dx, dy) != (3, 3):
                m.solid(c + dx, r + 1 + dy)
    return c + 3, r + 4


def cave_entrance(m: Map, c: int, r: int) -> None:
    """Paredão contínuo, com arco escuro e soleira livre de duas casas no centro."""
    m.stamp(c, r, 0, 0, 8, 5, tileset=lambda x, y: CAVE_FIRST + y * 8 + x, solid=False)
    # A primeira linha acompanha o contorno irregular da crista.
    for dy, first in enumerate((2, 0, 0, 0, 0)):
        for dx in range(first, 8):
            m.solid(c + dx, r + dy, not (dy == 4 and dx in (3, 4)))


def build_route3() -> Map:
    """Rota 3: sai do norte de Ferrúria e sobe até Verdelume.

    Sul: obra do Grupo Thomas com o posto patrocinado. Meio: lago a oeste, campo de mato
    e mirante a leste. Norte: a subida para Verdelume."""
    m = Map("Rota 3", 36, 52, music="streets")
    grass_fill(m)
    route = line_cells([(17, 51), (17, 40), (25, 40), (25, 26), (11, 26), (11, 12), (17, 12), (17, 0)])
    spur_lake = line_cells([(17, 46), (10, 46), (10, 36)])
    spur_view = line_cells([(25, 33), (31, 33), (31, 18)])
    spur_grove = line_cells([(10, 46), (10, 49), (2, 49)])
    spur_cave = line_cells([(31, 18), (31, 16)])
    walk = route | spur_lake | spur_view | spur_grove | spur_cave
    open_cells = set(walk)
    for area in (
        rect(12, 42, 12, 10),  # obra do Grupo Thomas na entrada
        rect(2, 32, 12, 18),  # lago e mato do oeste
        rect(14, 28, 10, 12),  # campo do meio
        rect(27, 14, 8, 22),  # mirante e entrada da caverna
        rect(28, 12, 8, 5),  # espaço para o paredão; copas não cobrem a fachada
        rect(6, 10, 14, 16),  # mato do norte
        rect(14, 0, 8, 10),  # subida para Verdelume
    ):
        open_cells |= area
    woods(m, open_cells)
    path(m, walk)
    water(m, 4, 36, 5, 5)
    tall(m, rect(2, 43, 8, 6), walk)
    tall(m, rect(14, 29, 6, 9), walk)
    tall(m, rect(27, 20, 4, 10), walk)
    tall(m, rect(6, 14, 4, 10) | rect(14, 15, 5, 8), walk)
    flowers(m, [(13, 45), (22, 42), (12, 50), (21, 30), (23, 36), (5, 33), (12, 40), (28, 17), (34, 30), (7, 11), (19, 16), (15, 2), (20, 9), (33, 34)])

    # Obra do Grupo Thomas: posto patrocinado (barraca), cerca e troncos empilhados.
    m.stamp(19, 43, 18, 22, 5, 6, above_rows=3)
    fence_h(m, 12, 43, 4)
    kenney_prop(m, 106, [(13, 49), (14, 49), (13, 50)])

    post(m, "sign_route3", 16, 50)
    post(m, "sign_r3_thomas", 19, 49)
    post(m, "sign_r3_view", 29, 17)
    post(m, "sign_r3_north", 19, 3)
    cave_entrance(m, 28, 12)
    m.warp(31, 16, "echo_cave", 18, 31, "up", w=2)
    m.warp(2, 49, "echo_grove", 21, 2, "down")
    m.warp(17, 51, "ferruria", 21, 1, "down", w=2)
    m.warp(17, 0, "verdelume", 21, 34, "up", w=2)
    m.spawn("from_ferruria", 17, 50, "up")
    m.spawn("from_verdelume", 17, 1, "down")
    m.npc("thomas_promoter", 21, 49, "down")
    m.npc("r3_worker", 15, 44, "down")
    m.npc("r3_fisher", 9, 38, "left")
    m.npc("r3_hiker", 8, 11, "down", wander=1)
    m.npc("r3_trainer_1", 22, 38, "right")
    m.npc("r3_trainer_2", 14, 24, "left")
    m.npc("r3_trainer_3", 20, 6, "left")
    m.npc("item_r3_west", 3, 33)
    m.npc("item_r3_east", 33, 17)
    m.npc("echo_researcher", 29, 19, "down")
    m.npc("echo_bidoof_home", 30, 19, "down")
    return m


def build_echo_grove() -> Map:
    """Bosque do Orvalho: travessia entre o bosque da Rota 2 e a Rota 3."""
    m = Map("Bosque do Orvalho", 28, 30, music="streets")
    grass_fill(m)
    route = line_cells([(4, 29), (4, 23), (12, 23), (12, 15), (21, 15), (21, 0)])
    branch = line_cells([(12, 18), (6, 18), (6, 12)])
    walk = route | branch
    opened = walk | rect(2, 22, 14, 7) | rect(8, 12, 8, 12) | rect(16, 6, 8, 12) | rect(18, 0, 7, 8) | rect(3, 10, 5, 10)
    woods(m, opened)
    path(m, walk)
    tall(m, rect(8, 24, 4, 3) | rect(9, 12, 3, 5) | rect(18, 7, 3, 5), walk)
    flowers(m, [(3, 24), (14, 21), (10, 18), (18, 14), (23, 9)])
    post(m, "sign_echo_grove", 6, 26)
    post(m, "echo_frost", 19, 12)
    m.npc("echo_scout", 14, 20, "left")
    m.npc("item_echo_grove", 5, 12)
    m.warp(4, 29, "route2", 34, 6, "left", w=2)
    m.warp(21, 0, "route3", 3, 49, "right", w=2)
    m.spawn("from_route2", 4, 27, "up")
    m.spawn("from_route3", 21, 2, "down")
    return m


def build_echo_cave() -> Map:
    """Galeria do Eco: dois guardas, sala de extração e o cercado do Bidoof."""
    tile = lambda index: CAVE_INNER_FIRST + index
    m = Map("Galeria do Eco", 36, 34, fill=tile(8), music="streets")
    m.rect("collision", 0, 0, m.cols, m.rows, VOID)
    floor = rect(14, 27, 9, 7) | rect(17, 22, 2, 6) | rect(10, 16, 15, 7) | rect(24, 11, 2, 7) | rect(12, 3, 17, 9) | rect(17, 2, 4, 4)
    for x, y in floor:
        seed = (x * 37 + y * 73 + x * y * 11) % 100
        variant = 6 if seed < 5 else 7 if seed < 10 else (x * 7 + y * 11) % 6
        m.set("ground", x, y, tile(variant))
        m.solid(x, y, False)
    # Maciço escuro e faces rochosas contínuas em volta de cada sala e corredor.
    for y in range(m.rows):
        for x in range(m.cols):
            if (x, y) in floor:
                continue
            face = 16 + (x % 2) if (x, y + 1) in floor else 24 + (x % 2) if (x, y - 1) in floor else 20 if (x + 1, y) in floor else 21 if (x - 1, y) in floor else 8 + ((x + y) % 2)
            m.set("ground", x, y, tile(face))
    # Cada recruta fecha um gargalo; a pedra ao lado impede contornar a batalha.
    for x, y in ((18, 24), (25, 14)):
        m.set("buildings", x, y, tile(32))
        m.solid(x, y)
    # Formações nas bordas das salas; os gargalos e acessos da missão ficam livres.
    for x, y, prop in ((15, 29, 32), (21, 28, 33), (11, 19, 33), (23, 21, 32), (13, 5, 32), (28, 9, 33)):
        m.set("buildings", x, y, tile(prop))
        m.solid(x, y)
    for x, y, prop in ((14, 30, 34), (22, 30, 35), (10, 21, 34), (23, 17, 35), (12, 9, 34), (28, 4, 35)):
        m.set("detail", x, y, tile(prop))
    m.npc("echo_grunt_1", 17, 24, "down")
    m.npc("echo_grunt_2", 24, 14, "down")
    m.npc("echo_lead", 18, 8, "down")
    m.event("echo_grunt_1_challenge", 17, 25, 2, 1)
    m.event("echo_grunt_2_challenge", 24, 15, 2, 1)
    m.event("echo_lead_challenge", 15, 9, 8, 1)
    # Cercado: uma única abertura, controlada pelo painel da máquina.
    for x in range(16, 22):
        for y in (2, 5):
            if (x, y) == (18, 5):
                continue
            m.set("buildings", x, y, KT(81))
            m.solid(x, y)
    for x in (16, 21):
        for y in (3, 4):
            m.set("buildings", x, y, KT(81))
            m.solid(x, y)
    m.npc("echo_cage", 18, 5)
    m.npc("echo_bidoof", 18, 3)
    m.set("buildings", 26, 5, MACHINE)
    m.sign("echo_console", 26, 5)
    m.set("buildings", 25, 5, PC)
    m.solid(25, 5)
    for x, y in ((11, 17), (12, 17), (27, 7)):
        m.set("buildings", x, y, tile(38))
        m.solid(x, y)
    m.obj("signs", "echo_crates", 12, 17)
    m.npc("item_echo_cave", 23, 20)
    m.warp(18, 33, "route3", 31, 17, "down", w=2)
    m.spawn("from_route3", 18, 31, "up")
    return m


def build_verdelume() -> Map:
    """Cidade Verdelume: Dojo (ginásio Lutador), Campo de treinamento patrocinado pelo
    Grupo Thomas e a saída norte fechada até o capítulo 4."""
    m = Map("Cidade Verdelume", 44, 36, music="town")
    grass_fill(m)
    tree_band(m, 0, 0, 44, 3)
    tree_band(m, 0, 3, 3, 31)
    tree_band(m, 41, 3, 3, 31)
    tree_band(m, 0, 34, 44, 2)
    street = line_cells([(21, 35), (21, 0)])
    plaza = rect(15, 13, 14, 8)
    for c, r in street | plaza:
        for layer in ("buildings", "above"):
            m.set(layer, c, r, 0)
        m.solid(c, r, False)
    for c, r in plaza:
        m.set("ground", c, r, FLAGSTONE[r % 2][c % 2])

    gym_door = dojo(m, 4, 5)
    m.stamp(13, 5, 0, 2, 5, 5, tileset=EXB, above_rows=1, open_cells=((2, 4),))  # centro de cura
    m.stamp(25, 5, 10, 2, 5, 5, tileset=EXB, above_rows=1, open_cells=((2, 4),))  # loja
    center_door, mart_door = (15, 9), (27, 9)
    homes = {"verdelume_house": (33, 5), "v_house_locked": (5, 13), "v_house_locked_2": (10, 13), "v_house_locked_3": (31, 13),
             "v_house_locked_4": (36, 13), "v_house_locked_5": (5, 25), "v_house_locked_6": (11, 25)}
    doors = {key: house(m, c, r) for key, (c, r) in homes.items()}

    # Campo de treinamento: cerca com entrada no meio, arbustos a oeste, arena de terra com alvos.
    fence_h(m, 26, 25, 6)
    fence_h(m, 34, 25, 7)
    kenney_prop(m, 5, [(25, r) for r in range(25, 34)])
    arena = rect(27, 27, 12, 6)
    field_gate = line_cells([(32, 24), (32, 26)])

    main = street | line_cells([(4, 11), (38, 11)]) | line_cells([(5, 22), (38, 22)]) | arena | field_gate
    for door in (gym_door, center_door, mart_door, doors["verdelume_house"]):
        main |= line_cells([(door[0], door[1] + 1), (door[0], 11)], width=1)
    for key, (c, r) in doors.items():
        if r == 17:
            main |= line_cells([(c, r + 1), (c, 22)], width=1)
        elif r == 29:
            main |= line_cells([(c, r + 1), (c, 31)], width=1)
    main |= line_cells([(7, 31), (21, 31)], width=1)
    path(m, main - plaza)

    kenney_prop(m, 95, [(29, 28), (36, 28)])  # alvos
    kenney_prop(m, 106, [(39, 27), (40, 27), (40, 28)])  # troncos
    kenney_prop(m, 104, [(25, 16)])  # poço da praça
    kenney_prop(m, 107, [(17, 19), (27, 19)])  # vasos
    kenney_prop(m, 29, [(3, 9), (40, 33), (24, 33)], layer="detail", solid=False)  # cogumelos
    flowers(m, [(4, 4), (12, 4), (19, 4), (24, 4), (31, 4), (39, 4), (3, 20), (19, 26), (24, 27), (17, 28),
                (18, 29), (24, 30), (3, 32), (40, 20), (29, 19), (39, 12)])

    m.warp(21, 35, "route3", 17, 1, "down", w=2)
    m.warp(gym_door[0], gym_door[1], "verdelume_gym", 7, 16, "up", door=True)
    m.warp(center_door[0], center_door[1], "verdelume_center", 5, 7, "up", door=True)
    m.warp(mart_door[0], mart_door[1], "verdelume_mart", 4, 6, "up", door=True)
    hx, hy = doors["verdelume_house"]
    m.warp(hx, hy, "verdelume_house", 4, 6, "up", door=True)
    m.spawn("from_route3", 21, 33, "up")
    m.spawn("from_gym", gym_door[0], gym_door[1] + 1, "down")
    m.spawn("from_center", center_door[0], center_door[1] + 1, "down")
    m.spawn("from_mart", mart_door[0], mart_door[1] + 1, "down")
    m.spawn("from_house", hx, hy + 1, "down")

    post(m, "sign_verdelume", 23, 32)
    post(m, "sign_v_gym", gym_door[0] - 1, gym_door[1] + 1)
    post(m, "sign_v_center", center_door[0] - 1, center_door[1] + 1)
    post(m, "sign_v_mart", mart_door[0] - 1, mart_door[1] + 1)
    post(m, "sign_v_field", 31, 24)
    post(m, "sign_v_north", 23, 3)
    for key, (dx, dy) in doors.items():
        if key != "verdelume_house":
            m.sign(key, dx, dy)

    m.npc("v_gate_a", 21, 2, "down")
    m.npc("v_gate_b", 22, 2, "down")
    m.npc("v_local", 18, 24, "down", wander=2)
    m.npc("v_kid", 19, 17, "down", wander=2)
    m.npc("v_elder", 16, 15, "right")
    m.npc("gael_verdelume", 23, 18, "down")
    m.npc("v_recruiter", 34, 24, "left")
    m.npc("v_coach", 34, 27, "left")
    m.npc("v_trainee_a", 29, 30, "up")
    m.npc("v_trainee_b", 36, 30, "up")
    m.npc("item_v_field", 27, 33)
    return m


def build_verdelume_center() -> Map:
    m = Map("Centro de Cura de Verdelume", 12, 9, music="town")
    interior_box(m, lab=True, floor=LABFLOOR)
    m.stamp(3, 3, 0, 12, 3, 2, tileset=IN)  # balcão
    m.set("buildings", 6, 2, HEALER)
    m.solid(6, 2)
    m.set("buildings", 10, 2, PC)
    m.solid(10, 2)
    m.stamp(1, 2, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.stamp(10, 6, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.set("detail", 4, 5, HEALMAT)
    m.set("detail", 5, 8, MAT)
    m.set("detail", 6, 8, MAT)
    m.warp(5, 8, "verdelume", 15, 10, "down", w=2, door=True)
    m.spawn("from_outside", 5, 7, "up")
    m.npc("v_nurse", 4, 2, "down")
    for c in (3, 4, 5):
        m.obj("signs", "v_center_desk", c, 4)
    m.obj("signs", "center_pc", 10, 2)
    m.npc("v_center_visitor", 8, 5, "left", wander=1)
    return m


def build_verdelume_mart() -> Map:
    m = Map("Loja de Verdelume", 10, 8, music="town")
    interior_box(m, lab=True, floor=LABFLOOR)
    m.stamp(1, 3, 0, 12, 3, 2, tileset=IN)  # balcão
    m.stamp(5, 2, 3, 12, 3, 2, tileset=IN)  # prateleiras
    m.stamp(5, 5, 3, 12, 3, 2, tileset=IN)
    m.stamp(9, 1, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.set("detail", 4, 7, MAT)
    m.set("detail", 5, 7, MAT)
    m.warp(4, 7, "verdelume", 27, 10, "down", w=2, door=True)
    m.spawn("from_outside", 4, 6, "up")
    m.npc("v_shop", 2, 2, "down")
    for c in (1, 2, 3):
        m.obj("signs", "v_mart_desk", c, 4)
    m.npc("v_mart_customer", 8, 4, "left", wander=1)
    return m


def build_verdelume_house() -> Map:
    m = Map("Casa em Verdelume", 10, 8, music="town")
    interior_box(m)
    m.stamp(1, 2, 3, 12, 3, 2, tileset=IN)
    m.stamp(5, 3, 13, 1, 3, 3, tileset=IN)
    m.stamp(8, 1, 8, 12, 1, 2, tileset=IN, above_rows=1)
    m.set("detail", 4, 7, MAT)
    m.set("detail", 5, 7, MAT)
    m.warp(4, 7, "verdelume", 35, 10, "down", w=2, door=True)
    m.spawn("from_outside", 4, 6, "up")
    m.npc("v_family_a", 3, 5, "right")
    m.npc("v_family_b", 8, 5, "left", wander=1)
    return m


def build_verdelume_gym() -> Map:
    """Dojo de Verdelume (ginásio Lutador): três tatames separados por cerca.

    O vão de cada cerca é um NPC "cerca" (v_bar_1, v_bar_2) que some quando o faixa daquele
    tatame perde; a regra fica em CH3_VISIBLE, então dá para mudar a ordem sem mexer no mapa."""
    m = Map("Dojo de Verdelume", 15, 18, music="streets")
    interior_box(m, floor=WOOD)
    for r, gap in ((12, 7), (7, 7)):
        for c in range(m.cols):
            if c == gap:
                continue
            m.set("buildings", c, r, KT(82 if c == gap - 1 else 80 if c == gap + 1 else 81))
            m.solid(c, r)
    for c in (4, 10):
        m.set("buildings", c, 3, STATUE)
        m.solid(c, 3)
    m.set("detail", 7, 17, MAT)
    m.set("detail", 8, 17, MAT)
    m.warp(7, 17, "verdelume", 7, 10, "down", w=2, door=True)
    m.spawn("from_outside", 7, 16, "up")
    m.npc("v_leader", 7, 3, "down")
    m.npc("v_gym_guide", 5, 16, "right")
    m.npc("v_gym_trainer_1", 10, 14, "left")
    m.npc("v_gym_trainer_2", 4, 9, "right")
    m.npc("v_bar_1", 7, 12)
    m.npc("v_bar_2", 7, 7)
    return m


def render_preview(m: Map) -> None:
    sheets = {}
    for ts in _tilesets_for(m):
        sheets[ts["name"]] = (ts["first"], ts["w"] // T, Image.open(ASSETS / ts["image"].replace("../", "")).convert("RGBA"))
    img = Image.new("RGBA", (m.cols * T, m.rows * T), (18, 16, 24, 255))
    for layer in ("ground", "detail", "buildings", "above"):
        for r in range(m.rows):
            for c in range(m.cols):
                gid = m.layers[layer][r][c]
                if not gid:
                    continue
                for name, (first, cols, sheet) in sorted(sheets.items(), key=lambda kv: -kv[1][0]):
                    if gid >= first:
                        local = gid - first
                        sx, sy = (local % cols) * T, (local // cols) * T
                        tile = sheet.crop((sx, sy, sx + T, sy + T))
                        img.alpha_composite(tile, (c * T, r * T))
                        break
    for group, color in (("npcs", (255, 60, 60, 200)), ("warps", (60, 120, 255, 140)), ("signs", (255, 220, 0, 160)), ("fields", (60, 255, 120, 200))):
        for o in m.objects.get(group, []):
            for y in range(int(o["y"]), int(o["y"] + o["height"])):
                for x in range(int(o["x"]), int(o["x"] + o["width"])):
                    if (x + y) % 3 == 0 and 0 <= x < img.width and 0 <= y < img.height:
                        img.putpixel((x, y), color)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    img.resize((img.width * 2, img.height * 2), Image.NEAREST).save(PREVIEW / f"{m.key}.png")


# Pés de outono por mapa (o resto da mata é verde).
AUTUMN = {
    "forest": lambda c, r: ((c // 2) * 7 + (r // 2) * 13) % 10 < 3,
    "route2": lambda c, r: ((c // 2) * 11 + (r // 2) * 5) % 13 < 2,
    "route3": lambda c, r: ((c // 2) * 5 + (r // 2) * 9) % 11 < 2,
}


def main() -> None:
    MAPS.mkdir(parents=True, exist_ok=True)
    make_kenney_extra()
    built = {
        "brisamar": build_brisamar(),
        "house_1f": build_house_1f(),
        "house_2f": build_house_2f(),
        "neighbor": build_neighbor(),
        "lab": build_lab(),
        "clinic": build_clinic(),
        "route1": build_route1(),
        "clearing": build_clearing(),
        "forest": build_forest(),
        "route2": build_route2(),
        "ferruria": build_ferruria(),
        "ferruria_lab": build_ferruria_lab(),
        "ferruria_center": build_ferruria_center(),
        "ferruria_gym": build_ferruria_gym(),
        "ferruria_mart": build_ferruria_mart(),
        "ferruria_house": build_ferruria_house(),
        "route3": build_route3(),
        "echo_grove": build_echo_grove(),
        "echo_cave": build_echo_cave(),
        "verdelume": build_verdelume(),
        "verdelume_center": build_verdelume_center(),
        "verdelume_mart": build_verdelume_mart(),
        "verdelume_gym": build_verdelume_gym(),
        "verdelume_house": build_verdelume_house(),
    }
    for key in ("brisamar", "route1", "clearing", "forest", "route2", "ferruria", "route3", "echo_grove", "verdelume"):
        kenney_skin(built[key], autumn=AUTUMN.get(key, lambda c, r: False), open_path_edges=key == "route2")
    lab = build_art_lab()
    if lab is not None:
        built["art_lab"] = lab
    for key, m in built.items():
        m.key = key
        (MAPS / f"{key}.json").write_text(json.dumps(m.to_tiled()), encoding="utf-8")
        try:
            render_preview(m)
        except OSError as error:
            print(key, "preview skipped", error)
        print(key, m.cols, m.rows)


if __name__ == "__main__":
    main()
