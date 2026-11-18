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

    def spawn(self, id: str, c: int, r: int, dir: str = "down") -> None:
        self.obj("spawns", id, c, r, dir=dir)

    def to_tiled(self) -> dict:
        tilesets = []
        for ts in TILESETS:
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
    if lab:
        m.stamp(c, r, 11, 0, 5, 5, above_rows=1, open_cells=((2, 4),))
        m.set("buildings", c + 2, r + 4, OW(8, 4))
    else:
        m.stamp(c, r, 6, 0, 5, 5, above_rows=1, open_cells=((2, 4),))
    return c + 2, r + 4


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
        for r in range(r0, r0 + h):
            for c in range(c0, c0 + w):
                if (c, r) in route:
                    continue
                m.set("detail", c, r, TALL)

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
    tree_band(m, 0, 0, 20, 22)
    trail = line_cells([(10, 21), (10, 14), (6, 14), (6, 8), (12, 8), (12, 2), (10, 2), (10, 0)])
    path(m, trail)
    for c, r in list(trail):
        for layer in ("buildings", "above"):
            m.set(layer, c, r, 0)
        m.solid(c, r, False)

    def grass_patch(c0: int, r0: int, w: int, h: int) -> None:
        for r in range(r0, r0 + h):
            for c in range(c0, c0 + w):
                if (c, r) in trail:
                    continue
                if not m.inside(c, r):
                    continue
                m.set("detail", c, r, TALL)
                m.set("buildings", c, r, 0)
                m.set("above", c, r, 0)
                m.solid(c, r, False)

    grass_patch(12, 15, 4, 4)
    grass_patch(3, 9, 3, 4)
    grass_patch(13, 4, 4, 3)
    flowers(m, [(8, 16), (9, 17), (14, 10), (7, 6)])
    m.warp(10, 21, "route1", 11, 2, "down", w=2)
    m.warp(10, 0, "route2", 17, 62, "up", w=2)
    m.spawn("from_route", 10, 19, "up")
    m.spawn("from_city", 10, 2, "down")
    m.npc("bia_forest", 6, 12, "down")
    m.npc("ravi", 13, 6, "left")
    m.npc("lost_kid", 8, 5, "down")
    m.npc("cora_forest", 9, 8, "left")  # capítulo 2: a líder investiga a floresta
    m.npc("thomas_researcher", 12, 5, "down")
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
        if m.inside(c, r):
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
    spur_grove = line_cells([(24, 13), (24, 6), (28, 6)])
    open_cells = route | spur_pond | spur_grove
    for area in (
        rect(16, 48, 4, 16), rect(6, 52, 24, 4), rect(4, 30, 8, 24), rect(8, 12, 8, 20),
        rect(14, 30, 8, 12), rect(12, 36, 2, 2), rect(24, 38, 8, 16), rect(26, 20, 6, 20),
        rect(22, 12, 10, 10), rect(8, 12, 24, 4), rect(16, 0, 4, 12), rect(22, 2, 10, 8), rect(24, 10, 2, 2),
    ):
        open_cells |= area
    woods(m, open_cells)
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
    m.spawn("from_forest", 17, 61, "up")
    m.spawn("from_city", 17, 2, "down")
    m.npc("ranger_r2", 24, 10, "down")
    m.npc("r2_trainer_a", 29, 46, "left")
    m.npc("r2_trainer_b", 30, 30, "left")
    m.npc("r2_fisher", 15, 34, "right")
    m.npc("r2_hiker", 14, 54, "right", wander=1)
    m.npc("r2_grove_kid", 28, 8, "left")
    m.npc("item_r2_super", 4, 31)
    m.npc("item_r2_ball", 20, 40)
    m.npc("item_r2_candy", 30, 3)
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


def render_preview(m: Map) -> None:
    sheets = {}
    for ts in TILESETS:
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
    for group, color in (("npcs", (255, 60, 60, 200)), ("warps", (60, 120, 255, 140)), ("signs", (255, 220, 0, 160))):
        for o in m.objects[group]:
            for y in range(int(o["y"]), int(o["y"] + o["height"])):
                for x in range(int(o["x"]), int(o["x"] + o["width"])):
                    if (x + y) % 3 == 0 and 0 <= x < img.width and 0 <= y < img.height:
                        img.putpixel((x, y), color)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    img.resize((img.width * 2, img.height * 2), Image.NEAREST).save(PREVIEW / f"{m.key}.png")


def main() -> None:
    MAPS.mkdir(parents=True, exist_ok=True)
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
    }
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
