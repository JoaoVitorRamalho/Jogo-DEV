"""Arte original dos golpes de campo: obstáculos 16×16 e discos HM/TM 24×24.

    python3 scripts/build_field_tiles.py

Tudo é desenhado aqui, pixel a pixel, com a paleta da folha Kenney Tiny Town (contorno ameixa,
verdes e terra) para combinar com os mapas. Nada vem de sprite oficial: o repositório é público.

Saídas:
- public/assets/tilesets/field_obstacles.png: um quadro por obstáculo, na ordem de FRAMES
  (a mesma de FIELD_FRAME em data/field/obstacles.ts).
- public/assets/ui/items/disc/hm01.png … hm08.png e tm_<tipo>.png (um disco por tipo).
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TILES = ROOT / "public" / "assets" / "tilesets" / "field_obstacles.png"
DISCS = ROOT / "public" / "assets" / "ui" / "items" / "disc"

INK = (63, 38, 49, 255)
LEAF_LIGHT = (190, 228, 142, 255)
LEAF = (132, 198, 105, 255)
LEAF_DARK = (71, 159, 74, 255)
STONE_LIGHT = (232, 224, 211, 255)
STONE = (184, 172, 158, 255)
STONE_DARK = (134, 122, 113, 255)
MIST = (246, 248, 252, 175)
MIST_EDGE = (205, 215, 228, 210)
GOLD = (246, 205, 84, 255)
GOLD_DARK = (201, 143, 43, 255)
WHITE = (255, 255, 255, 255)

# Ordem dos quadros na folha. Mudou aqui, mude FIELD_FRAME em data/field/obstacles.ts.
FRAMES = ["cut_bush", "smash_rock", "push_boulder", "defog_mist"]

# Cor do disco por tipo do golpe (escolha própria, puxada para a paleta quente do Kenney).
TYPE_COLOR = {
    "normal": (196, 186, 150),
    "fire": (234, 120, 56),
    "water": (84, 142, 226),
    "electric": (244, 200, 60),
    "grass": (112, 186, 84),
    "ice": (140, 210, 214),
    "fighting": (190, 64, 52),
    "poison": (156, 84, 160),
    "ground": (214, 176, 98),
    "flying": (150, 150, 236),
    "psychic": (236, 98, 140),
    "bug": (160, 178, 48),
    "rock": (178, 152, 72),
    "ghost": (110, 88, 152),
    "dragon": (104, 72, 222),
    "dark": (104, 84, 72),
    "steel": (170, 172, 196),
    "fairy": (230, 150, 176),
}

# HM -> tipo do golpe que ela ensina (data/field/hms.ts).
HM_TYPES = {
    "hm01": "normal",
    "hm02": "flying",
    "hm03": "water",
    "hm04": "normal",
    "hm05": "electric",  # Flash é Normal; o disco amarelo lembra luz e não repete o cinza
    "hm06": "fighting",
    "hm07": "water",
    "hm08": "water",
}

Mask = set[tuple[int, int]]


def edge(mask: Mask, x: int, y: int) -> bool:
    return any((x + dx, y + dy) not in mask for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))


def paint(img: Image.Image, mask: Mask, shade, ink=INK) -> None:
    """Contorno em toda borda da máscara; o miolo pega a cor que shade(x, y) devolver."""
    for x, y in mask:
        img.putpixel((x, y), ink if ink and edge(mask, x, y) else shade(x, y))


def ellipse(cx: float, cy: float, rx: float, ry: float, size: int = 16, power: float = 2.0) -> Mask:
    return {
        (x, y)
        for y in range(size)
        for x in range(size)
        if abs((x + 0.5 - cx) / rx) ** power + abs((y + 0.5 - cy) / ry) ** power <= 1
    }


def leaf(angle: float, length: float, width: float, base=(8.0, 15.2)) -> tuple[Mask, callable]:
    """Folha comprida saindo da base, inclinada `angle` graus; devolve a máscara e o sombreado
    (metade esquerda clara, nervura escura, metade direita no tom médio)."""
    a = math.radians(angle)
    ux, uy = math.sin(a), -math.cos(a)
    mx, my = base[0] + ux * length / 2, base[1] + uy * length / 2
    cells: Mask = set()
    for y in range(16):
        for x in range(16):
            dx, dy = x + 0.5 - mx, y + 0.5 - my
            u = dx * ux + dy * uy
            v = dx * -uy + dy * ux
            if (u / (length / 2)) ** 2 + (v / (width / 2)) ** 2 <= 1:
                cells.add((x, y))

    def shade(x: int, y: int):
        dx, dy = x + 0.5 - mx, y + 0.5 - my
        v = dx * -uy + dy * ux
        return LEAF_LIGHT if v < -0.6 else LEAF_DARK if v < 0.6 else LEAF

    return cells, shade


def bush() -> Image.Image:
    """Moita de folhas compridas abertas em leque: diferente da moita redonda do Kenney, pede Corte."""
    img = Image.new("RGBA", (16, 16))
    # de trás para a frente: cada folha pinta o próprio contorno por cima das de trás
    for angle, length, width in ((-62, 12.5, 5.2), (62, 12.5, 5.2), (-30, 14.5, 5.4), (30, 14.5, 5.4), (0, 15.0, 5.6)):
        cells, shade = leaf(angle, length, width)
        paint(img, cells, shade)
    return img


def stone_shade(mask: Mask, cx: float, cy: float):
    def shade(x: int, y: int):
        if (x - 1, y) not in mask or (x, y - 1) not in mask:
            return STONE_LIGHT
        if (x - cx) * 0.8 + (y - cy) > 2.2:
            return STONE_DARK
        return STONE

    return shade


def cracked_rock() -> Image.Image:
    """Rocha rachada de base larga: a rachadura em zigue-zague diz que ela quebra."""
    img = Image.new("RGBA", (16, 16))
    mask = {(x, y) for x, y in ellipse(8, 10, 7.6, 6.6, power=2.6) if y <= 15}
    paint(img, mask, stone_shade(mask, 8, 10))
    for x, y in ((8, 4), (8, 5), (7, 6), (6, 7), (7, 8), (8, 9), (9, 9), (8, 10), (7, 11), (7, 12), (10, 10), (11, 11)):
        img.putpixel((x, y), INK)
    for x, y in ((9, 5), (7, 7), (9, 10)):
        img.putpixel((x, y), STONE_DARK)
    return img


def boulder() -> Image.Image:
    """Pedregulho redondo e pesado: o brilho no alto e as pintas dão volume."""
    img = Image.new("RGBA", (16, 16))
    mask = ellipse(8, 8.6, 7.6, 7.2)
    paint(img, mask, stone_shade(mask, 8, 8.6))
    for x, y in ((4, 4), (5, 4), (4, 5)):
        img.putpixel((x, y), WHITE)
    for x, y in ((10, 6), (6, 10), (11, 11), (9, 13)):
        img.putpixel((x, y), STONE_DARK)
    return img


def mist() -> Image.Image:
    """Nuvem de névoa translúcida, sem contorno escuro."""
    img = Image.new("RGBA", (16, 16))
    mask: Mask = set()
    for cx, cy, r in ((4.5, 10, 4), (9, 7.5, 5), (12.5, 10.5, 3.5), (7.5, 12, 4)):
        mask |= ellipse(cx, cy, r, r)
    paint(img, mask, lambda x, y: MIST_EDGE if edge(mask, x, y) else MIST, ink=None)
    return img


def disc(color: tuple[int, int, int], hm: bool) -> Image.Image:
    """Disco 24×24 com furo no meio. HM tem aro dourado; TM, só a cor do tipo."""
    img = Image.new("RGBA", (24, 24))
    cx = cy = 12.0
    mask = {(x, y) for y in range(24) for x in range(24) if math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= 10.6}
    hole = {(x, y) for y in range(24) for x in range(24) if math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= 1.6}
    ring = {(x, y) for y in range(24) for x in range(24) if math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= 3.7}
    body = mask - hole
    light = tuple(min(255, int(c + (255 - c) * 0.42)) for c in color) + (255,)
    dark = tuple(int(c * 0.72) for c in color) + (255,)
    base = color + (255,)

    def shade(x: int, y: int):
        r = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
        if hm and r > 8.7:
            return GOLD_DARK if (x - cx) + (y - cy) > 4 else GOLD
        if (x, y) in ring:
            return STONE_LIGHT if (x + y) < 24 else STONE
        if (x - cx) + (y - cy) > 6:
            return dark
        if (x - cx) + (y - cy) < -7 and r > 5:
            return light
        return base

    for x, y in body:
        outside = any((x + dx, y + dy) not in body for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        img.putpixel((x, y), INK if outside else shade(x, y))
    # brilho: três pixels claros na diagonal de cima
    for x, y in ((6, 8), (7, 7), (8, 6)):
        img.putpixel((x, y), WHITE)
    return img


def main() -> None:
    drawers = {"cut_bush": bush, "smash_rock": cracked_rock, "push_boulder": boulder, "defog_mist": mist}
    sheet = Image.new("RGBA", (16 * len(FRAMES), 16))
    for index, name in enumerate(FRAMES):
        sheet.paste(drawers[name](), (index * 16, 0))
    TILES.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(TILES)
    DISCS.mkdir(parents=True, exist_ok=True)
    for hm, type_id in HM_TYPES.items():
        disc(TYPE_COLOR[type_id], hm=True).save(DISCS / f"{hm}.png")
    for type_id, color in TYPE_COLOR.items():
        disc(color, hm=False).save(DISCS / f"tm_{type_id}.png")
    print(f"{TILES.relative_to(ROOT)} ({len(FRAMES)} quadros) e {len(HM_TYPES) + len(TYPE_COLOR)} discos em {DISCS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
