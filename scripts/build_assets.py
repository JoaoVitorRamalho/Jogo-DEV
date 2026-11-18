"""Monta public/assets: tilesets CC0 (ArMM1998), tiles próprios, sprites originais de criaturas e itens."""

from __future__ import annotations

import shutil
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

from build_battle_art import main as build_battle_art, orb

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / ".tmp-art" / "gfx" / "gfx"
OUT = ROOT / "public" / "assets"
T = 16

OUTLINE = (28, 24, 36, 255)

RAW_SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon"
RAW_ITEMS = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items"
# nome do arquivo em ui/items/ -> slug no repositório PokeAPI/sprites
ITEM_SPRITES: dict[str, str] = {
    "potion": "potion",
    "superpotion": "super-potion",
    "antidote": "antidote",
    "paralyze_heal": "paralyze-heal",
    "awakening": "awakening",
    "burn_heal": "burn-heal",
    "pokedex": "data-card",
}
# sprite key no jogo -> número nacional (species.dex do representante)
SPRITE_DEX: dict[str, int] = {
    "bulbasaur": 1,
    "torchic": 255,
    "froakie": 656,
    "wurmple": 265,
    "starly": 396,
    "gible": 443,
    "mew": 151,
    "giratina": 487,
}


def ensure(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def copy_sources() -> None:
    pairs = {
        "Overworld.png": "tilesets/overworld.png",
        "Inner.png": "tilesets/inner.png",
        "objects.png": "sprites/objects.png",
        "NPC_test.png": "sprites/body_base.png",
    }
    for src, dst in pairs.items():
        shutil.copyfile(SRC / src, ensure(OUT / dst))


def palette_of(image: Image.Image, box: tuple[int, int, int, int], count: int) -> list[tuple[int, int, int, int]]:
    region = image.crop(box)
    colors = region.getcolors(4096) or []
    colors = [c for c in colors if c[1][3] == 255]
    colors.sort(reverse=True)
    return [c[1] for c in colors[:count]]


def tile_canvas() -> Image.Image:
    return Image.new("RGBA", (T, T), (0, 0, 0, 0))


def wood_floor(variant: int) -> Image.Image:
    img = tile_canvas()
    d = ImageDraw.Draw(img)
    base = (196, 140, 92, 255)
    light = (214, 162, 110, 255)
    dark = (150, 100, 66, 255)
    seam = (122, 80, 54, 255)
    d.rectangle((0, 0, 15, 15), fill=base)
    for y in (0, 8):
        d.line((0, y + 7, 15, y + 7), fill=seam)
        d.line((0, y, 15, y), fill=light)
    offset = 5 if variant else 11
    d.line((offset, 1, offset, 6), fill=seam)
    d.line(((offset + 8) % 16, 9, (offset + 8) % 16, 14), fill=seam)
    for x, y in ((3, 3), (12, 11), (8, 4)):
        img.putpixel(((x + variant * 3) % 16, y), dark)
    return img


def lab_floor() -> Image.Image:
    img = tile_canvas()
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 15, 15), fill=(226, 230, 236, 255))
    d.rectangle((0, 0, 7, 7), fill=(240, 243, 247, 255))
    d.rectangle((8, 8, 15, 15), fill=(240, 243, 247, 255))
    d.line((0, 15, 15, 15), fill=(186, 194, 206, 255))
    d.line((15, 0, 15, 15), fill=(186, 194, 206, 255))
    return img


def sand(ow: Image.Image) -> Image.Image:
    sample = ow.crop((16 * T, 6 * T, 16 * T + T, 6 * T + 8))
    colors = sorted(sample.getcolors(256) or [], reverse=True)
    base = colors[0][1] if colors else (238, 238, 140, 255)
    stripe = colors[1][1] if len(colors) > 1 else (200, 220, 100, 255)
    img = tile_canvas()
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 15, 15), fill=base)
    for y in (2, 9):
        for x in range(16):
            yy = y + (1 if (x // 4) % 2 else 0)
            img.putpixel((x, yy), stripe)
    for x, y in ((4, 6), (12, 13), (9, 4)):
        img.putpixel((x, y), stripe)
    return img


def tall_grass(full: bool) -> Image.Image:
    img = tile_canvas()
    dark = (30, 96, 46, 255)
    mid = (52, 148, 62, 255)
    light = (112, 200, 84, 255)
    outline = (18, 64, 34, 255)
    if full:
        d = ImageDraw.Draw(img)
        d.rectangle((0, 0, 15, 15), fill=(66, 170, 70, 255))
    blades = [(1, 2), (5, 0), (9, 1), (13, 2), (3, 8), (7, 7), (11, 8), (15, 9)]
    for bx, by in blades:
        for h in range(7):
            y = by + h
            if y > 15:
                break
            width = 1 if h < 2 else 2
            for dx in range(width):
                x = (bx - dx) % 16
                color = light if h < 2 else (mid if h < 5 else dark)
                img.putpixel((x, y), color)
            left = (bx - width) % 16
            right = (bx + 1) % 16
            if h >= 1:
                img.putpixel((left, y), outline)
                img.putpixel((right, y), outline)
    if not full:
        for y in range(0, 8):
            for x in range(16):
                img.putpixel((x, y), (0, 0, 0, 0))
    return img


def doormat() -> Image.Image:
    img = tile_canvas()
    d = ImageDraw.Draw(img)
    d.rectangle((1, 4, 14, 13), fill=(160, 54, 48, 255), outline=(92, 30, 30, 255))
    for x in range(3, 13, 3):
        d.line((x, 6, x, 11), fill=(196, 92, 70, 255))
    return img


def wall(top: bool, lab: bool) -> Image.Image:
    img = tile_canvas()
    d = ImageDraw.Draw(img)
    if lab:
        paper, stripe, trim, base = (232, 238, 244, 255), (208, 220, 232, 255), (120, 150, 184, 255), (86, 112, 146, 255)
    else:
        paper, stripe, trim, base = (238, 214, 168, 255), (222, 192, 142, 255), (146, 96, 60, 255), (110, 70, 44, 255)
    d.rectangle((0, 0, 15, 15), fill=paper)
    for x in range(0, 16, 4):
        d.line((x, 0, x, 15), fill=stripe)
    if top:
        d.rectangle((0, 0, 15, 2), fill=trim)
        d.line((0, 3, 15, 3), fill=base)
    else:
        d.rectangle((0, 11, 15, 15), fill=trim)
        d.line((0, 11, 15, 11), fill=base)
        d.line((0, 15, 15, 15), fill=base)
    return img


def void() -> Image.Image:
    img = tile_canvas()
    ImageDraw.Draw(img).rectangle((0, 0, 15, 15), fill=(18, 16, 24, 255))
    return img


def machine() -> Image.Image:
    img = tile_canvas()
    d = ImageDraw.Draw(img)
    d.rectangle((1, 3, 14, 15), fill=(196, 206, 220, 255), outline=OUTLINE)
    d.rectangle((3, 5, 12, 9), fill=(60, 180, 200, 255), outline=(30, 60, 80, 255))
    for i, color in enumerate(((220, 60, 60, 255), (240, 200, 60, 255), (80, 200, 100, 255))):
        d.rectangle((3 + i * 4, 11, 4 + i * 4, 12), fill=color)
    return img


def computer() -> Image.Image:
    img = tile_canvas()
    d = ImageDraw.Draw(img)
    d.rectangle((2, 2, 13, 10), fill=(70, 74, 90, 255), outline=OUTLINE)
    d.rectangle((4, 4, 11, 8), fill=(110, 200, 150, 255))
    d.rectangle((6, 11, 9, 12), fill=(70, 74, 90, 255))
    d.rectangle((3, 13, 12, 14), fill=(180, 184, 196, 255), outline=OUTLINE)
    return img


def symmetric(rows: list[str], width: int) -> list[str]:
    half = width // 2
    out = []
    for row in rows:
        left = (row + "." * half)[:half]
        out.append(left + left[::-1])
    while len(out) < width:
        out.append("." * width)
    return out[:width]


def paint(rows: list[str], colors: dict[str, tuple[int, int, int]], size: int, outline: bool = True) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    filled = set()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in colors:
                img.putpixel((x, y), colors[ch] + (255,))
                filled.add((x, y))
    if outline:
        border = set()
        for x, y in filled:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                p = (x + dx, y + dy)
                if p not in filled and 0 <= p[0] < size and 0 <= p[1] < size:
                    border.add(p)
        for x, y in filled:
            r, g, b, a = img.getpixel((x, y))
            below = (x + 1, y + 1)
            above = (x - 1, y - 1)
            if below not in filled:
                img.putpixel((x, y), (int(r * 0.78), int(g * 0.78), int(b * 0.8), a))
            elif above not in filled:
                img.putpixel((x, y), (min(255, int(r * 1.12 + 12)), min(255, int(g * 1.12 + 12)), min(255, int(b * 1.1 + 12)), a))
        for p in border:
            img.putpixel(p, OUTLINE)
    return img


CREATURES: dict[str, tuple[dict[str, tuple[int, int, int]], list[str]]] = {
    "torchic": (
        {
            "O": (240, 128, 48),
            "D": (200, 84, 40),
            "P": (252, 178, 98),
            "Y": (252, 214, 72),
            "B": (244, 176, 40),
            "E": (28, 28, 36),
            "W": (255, 255, 255),
            "L": (232, 180, 56),
        },
        [
            "................",
            "................",
            "...............Y",
            "...........Y..YY",
            "..........YY.YYY",
            "..........YYYYYY",
            "..........OOOOYY",
            "........OOOOOOOO",
            ".......OOOOOOOOO",
            "......OOOOOOOOOO",
            "......OOOOOOOOOO",
            ".....OOOEEOOOOOO",
            ".....OOEWEOOOOOO",
            ".....OOOEEOOOOBB",
            ".....OOOOOOOOOBB",
            "......OOOOOOOOOB",
            "......OOOOOOOOOO",
            ".......OOOOOOOOO",
            "........OOOOOOOO",
            ".......DDOOOOOOO",
            "......DDDOOOOOPP",
            "......DDDOOOOPPP",
            ".......DDOOOOPPP",
            "........OOOOOPPP",
            "........OOOOOOPP",
            ".........OOOOOOO",
            "..........OOOOOO",
            "...........LL...",
            "...........LL...",
            "..........LLLL..",
            ".........L.LL.L.",
            "................",
        ],
    ),
    "bulbasaur": (
        {
            "T": (96, 196, 168),
            "S": (56, 140, 120),
            "G": (104, 200, 72),
            "g": (56, 140, 56),
            "R": (208, 48, 64),
            "W": (255, 255, 255),
            "M": (40, 64, 56),
        },
        [
            "................",
            "................",
            "............ggGG",
            "..........ggGGGG",
            ".........gGGgGGG",
            ".........gGGgGGG",
            "......T..gGGgGGG",
            "......TT.gGGgGGG",
            "......TTTTTggGGG",
            ".....TTTTTTTTTgg",
            "....TTTTTTTTTTTT",
            "....TTTTTTTTTTTT",
            "...TTSSTTTTTTTTT",
            "...TTTWRRRTTTTTT",
            "...TTTRRRRTTTTTT",
            "...TTTTRRTTTTTTT",
            "...TTTTTTTTTTTTT",
            "....TTTTTTTTTTTT",
            "....TTTTTTMMMMMM",
            ".....TTTTTTTTTTT",
            "......TTTTTTTTTT",
            ".....TTT..TTTTTT",
            "....TTTTT.TTSTTT",
            "....TTTTT.TTTTTT",
            "....TTTTT..TTTTT",
            "....TTTTT..TTTTT",
            "....TTTTT...TTTT",
            "....WTWTW.......",
            "................",
            "................",
            "................",
            "................",
        ],
    ),
    "froakie": (
        {
            "B": (72, 140, 216),
            "Y": (248, 216, 72),
            "E": (24, 24, 32),
            "W": (240, 248, 255),
            "L": (168, 208, 240),
            "M": (40, 80, 150),
        },
        [
            "................",
            "................",
            "................",
            "................",
            "................",
            "........BBBBBBBB",
            "......BBBBBBBBBB",
            ".....BYYYBBBBBBB",
            "....BYYYEEBBBBBB",
            "....BYYYEEBBBBBB",
            "....BBYYYBBBBBBB",
            "....BBBBBBBBBBBB",
            ".....BBBBBBBBMMM",
            ".....BBBBBBBBBBB",
            "......WWWWWWWWWW",
            ".....WWWWWWWWWWW",
            "....WW.WWWWWW.WW",
            ".....WWW.BBBBBBB",
            "........BBBBBBBB",
            ".......BBBBBLLLL",
            ".......BBBBLLLLL",
            "......BB.BBLLLLL",
            "......B..BBLLLLL",
            ".........BBBBLLL",
            ".......BBBBBBBBB",
            "......BBBB...BBB",
            ".....BBBB.....BB",
            "....BBBB........",
            "...LLLL.........",
            "................",
            "................",
            "................",
        ],
    ),
    "wurmple": (
        {
            "R": (216, 64, 64),
            "Y": (248, 208, 80),
            "C": (248, 232, 184),
            "E": (24, 24, 32),
            "W": (240, 240, 240),
        },
        [
            "................",
            "................",
            "................",
            "................",
            ".........W......",
            ".........WW.....",
            "..........WW....",
            "..........RRRRRR",
            "........RRRRRRRR",
            ".......RRRRRRRRR",
            "......RRRRRRRRRR",
            "......RRREERRRRR",
            "......RRREERRRRR",
            "......RRRRRRRRRR",
            "......YYRRRRRRYY",
            ".......YYRRRRYYY",
            "........RRRRRRYY",
            ".........RRRRRRR",
            ".......RRRRRRRRR",
            "......RRYRRRCCCC",
            "......RRRRRRCCCC",
            ".....RRRRRRRCCCC",
            ".....RYRRRRCCCCC",
            ".....RRRRRRCCCCC",
            "......RRRRRRCCCC",
            "......WW.RRRRRRR",
            "..........WW....",
            "................",
            "................",
            "................",
            "................",
            "................",
        ],
    ),
    "starly": (
        {
            "K": (56, 52, 64),
            "W": (244, 244, 244),
            "E": (20, 20, 24),
            "O": (248, 152, 56),
            "G": (140, 136, 150),
            "D": (88, 84, 100),
        },
        [
            "................",
            "................",
            "................",
            "................",
            "................",
            "..........KK....",
            "...........KKK..",
            "..........KKKKKK",
            "........KKKKKKKK",
            ".......KKKKKKKKK",
            ".......KKWWWKKKK",
            "......KKWWEEKKKK",
            "......KKWWWWKKOO",
            ".......KKKKKKOOO",
            "........KKKKKKOO",
            ".........GGGGGGG",
            "........GGGGGWWW",
            ".......GGGGGWWWW",
            "......DGGGGWWWWW",
            "......DDGGGWWGWW",
            "......DDDGGWWWWW",
            ".......DDGGGWWWW",
            "........DDGGGWWW",
            ".........GGGGGGG",
            "...........OO...",
            "..........OOOO..",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
        ],
    ),
}

ITEMS: dict[str, tuple[dict[str, tuple[int, int, int]], list[str]]] = {
    "ball": (
        {"R": (220, 52, 52), "W": (244, 244, 244), "K": (40, 36, 48), "H": (255, 190, 190)},
        ["........", ".....RRR", "...RRRRR", "..RRHRRR", "..RRRRRR", ".RRRRRRR", ".RRRRRRK", ".KKKKKKW",
         ".WWWWWKW", ".WWWWWWW", "..WWWWWW", "..WWWWWW", "...WWWWW", ".....WWW", "........", "........"],
    ),
    "greatball": (
        {"R": (60, 110, 220), "S": (220, 52, 52), "W": (244, 244, 244), "K": (40, 36, 48)},
        ["........", ".....RRR", "...SSRRR", "..SSRRRR", "..RRRRRR", ".RRRRRRR", ".RRRRRRK", ".KKKKKKW",
         ".WWWWWKW", ".WWWWWWW", "..WWWWWW", "..WWWWWW", "...WWWWW", ".....WWW", "........", "........"],
    ),
    "potion": (
        {"C": (200, 200, 210), "P": (170, 90, 220), "L": (210, 160, 240), "W": (250, 250, 250)},
        ["........", "......CC", "......CC", ".......W", "......WW", ".....PPP", "....PPPP", "...PPLLP",
         "...PPLPP", "...PPPPP", "...PPPPP", "...PPPPP", "....PPPP", ".....PPP", "........", "........"],
    ),
    "superpotion": (
        {"C": (200, 200, 210), "P": (240, 150, 40), "L": (252, 210, 120), "W": (250, 250, 250)},
        ["........", "......CC", "......CC", ".......W", "......WW", ".....PPP", "....PPPP", "...PPLLP",
         "...PPLPP", "...PPPPP", "...PPPPP", "...PPPPP", "....PPPP", ".....PPP", "........", "........"],
    ),
    "antidote": (
        {"C": (200, 200, 210), "P": (70, 180, 90), "L": (170, 230, 160), "W": (250, 250, 250)},
        ["........", "......CC", "......CC", ".......W", "......WW", ".....PPP", "....PPPP", "...PPLLP",
         "...PPLPP", "...PPPPP", "...PPPPP", "...PPPPP", "....PPPP", ".....PPP", "........", "........"],
    ),
}


def build_extra(ow: Image.Image) -> None:
    tiles = [
        wood_floor(0),
        wood_floor(1),
        lab_floor(),
        sand(ow),
        tall_grass(True),
        tall_grass(False),
        doormat(),
        wall(True, False),
        wall(False, False),
        wall(True, True),
        wall(False, True),
        void(),
        machine(),
        computer(),
    ]
    tiles.append(orb((40, 178, 160), (18, 104, 100), (236, 184, 64), None, 16))
    sheet = Image.new("RGBA", (T * 16, T * 2), (0, 0, 0, 0))
    previous = OUT / "tilesets" / "extra.png"
    if previous.exists():  # tiles pintados à mão depois da lista (ex.: a TV, índice 15) ficam
        old = Image.open(previous).convert("RGBA")
        for index in range(len(tiles), 32):
            box = ((index % 16) * T, (index // 16) * T, (index % 16 + 1) * T, (index // 16 + 1) * T)
            sheet.paste(old.crop(box), box[:2])
    for index, tile in enumerate(tiles):
        sheet.paste(tile, ((index % 16) * T, (index // 16) * T), tile)
    sheet.save(ensure(OUT / "tilesets" / "extra.png"))


def _fetch_sprite(url: str) -> Image.Image:
    with urllib.request.urlopen(url, timeout=60) as resp:
        return Image.open(resp).convert("RGBA")


def build_creatures() -> None:
    for name, dex in SPRITE_DEX.items():
        _fetch_sprite(f"{RAW_SPRITES}/{dex}.png").save(ensure(OUT / "sprites" / "pokemon" / f"{name}.png"))
        _fetch_sprite(f"{RAW_SPRITES}/back/{dex}.png").save(ensure(OUT / "sprites" / "pokemon" / f"{name}_back.png"))


def _resize_item_icon(img: Image.Image, size: int = 24) -> Image.Image:
    img.thumbnail((size, size), Image.Resampling.NEAREST)
    return img


def build_items() -> None:
    for filename, slug in ITEM_SPRITES.items():
        img = _fetch_sprite(f"{RAW_ITEMS}/{slug}.png")
        _resize_item_icon(img).save(ensure(OUT / "ui" / "items" / f"{filename}.png"))


def main() -> None:
    copy_sources()
    ow = Image.open(SRC / "Overworld.png").convert("RGBA")
    build_extra(ow)
    build_creatures()
    build_items()
    build_battle_art()
    print("assets ok")


if __name__ == "__main__":
    main()
