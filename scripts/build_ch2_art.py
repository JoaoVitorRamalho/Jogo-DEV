"""Arte original do capítulo 2 (Ferrúria), gravada no extra.png a partir do índice 16.

Rode depois do build_assets.py: `python3 scripts/build_ch2_art.py`.

Índices (16 colunas por linha no extra.png):
  16 teia (barreira do ginásio)    17 casulo apagado (alavanca)   18 casulo aceso
  19 cerca viva (parede do ginásio) 20/21 piso de musgo             22 máquina de cura
  23 estátua do ginásio             24 tapete de cura
  bloco 5x5 em (0, 2): Centro de Cura   bloco 5x5 em (5, 2): Ginásio de Ferrúria
  bloco 5x5 em (10, 2): Loja de Ferrúria
"""

from __future__ import annotations

import colorsys
import math
from pathlib import Path

from PIL import Image, ImageDraw

from build_assets import tall_grass

ROOT = Path(__file__).resolve().parents[1]
TILES = ROOT / "public" / "assets" / "tilesets"
T = 16
ROWS = 7
OUT = (34, 28, 44, 255)


def tile() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def web() -> Image.Image:
    img, d = tile()
    cx, cy = 7.5, 7.5
    spokes = [i * math.pi / 4 + 0.2 for i in range(8)]
    for a in spokes:
        d.line([(cx, cy), (cx + math.cos(a) * 9, cy + math.sin(a) * 9)], fill=(236, 240, 255, 210))
    for radius, alpha in ((2.5, 230), (5, 210), (7.5, 180)):
        pts = [(cx + math.cos(a) * radius, cy + math.sin(a) * radius) for a in spokes]
        d.line(pts + [pts[0]], fill=(246, 248, 255, alpha))
    for x, y in ((3, 3), (12, 4), (4, 12), (11, 11), (7, 1)):
        img.putpixel((x, y), (190, 230, 255, 255))  # orvalho
    return img


def cocoon(lit: bool) -> Image.Image:
    img, d = tile()
    d.rectangle([3, 12, 12, 15], fill=(112, 116, 132, 255), outline=OUT)  # pedestal
    d.line([(4, 13), (11, 13)], fill=(150, 156, 172, 255))
    body = (246, 204, 84, 255) if lit else (122, 168, 150, 255)
    dark = (196, 136, 40, 255) if lit else (70, 110, 98, 255)
    d.ellipse([4, 1, 11, 12], fill=body, outline=OUT)
    for y in (4, 7, 10):
        d.line([(5, y), (10, y)], fill=dark)
    d.point([(6, 3), (6, 5)], fill=(255, 255, 240, 255))
    if lit:
        for x, y in ((2, 3), (13, 2), (1, 8), (14, 7)):
            img.putpixel((x, y), (255, 244, 160, 255))
    return img


def hedge() -> Image.Image:
    img, d = tile()
    d.rectangle([0, 0, 15, 15], fill=(46, 104, 58, 255))
    for y in range(T):
        for x in range(T):
            n = (x * 7 + y * 13 + (x * y) % 5) % 9
            if n == 0:
                img.putpixel((x, y), (82, 150, 78, 255))
            elif n == 4:
                img.putpixel((x, y), (30, 72, 44, 255))
    d.line([(0, 0), (15, 0)], fill=(112, 178, 96, 255))
    d.line([(0, 15), (15, 15)], fill=(22, 52, 34, 255))
    for x in (2, 7, 12):
        d.point([(x, 1), (x + 1, 2)], fill=(140, 200, 110, 255))
    return img


def moss(alt: bool) -> Image.Image:
    img, d = tile()
    base, line = (164, 172, 142, 255), (132, 140, 114, 255)
    d.rectangle([0, 0, 15, 15], fill=base)
    d.line([(0, 15), (15, 15)], fill=line)
    d.line([(15, 0), (15, 15)], fill=line)
    if alt:
        d.line([(0, 7), (15, 7)], fill=line)
        d.line([(7, 0), (7, 7)], fill=line)
    for x, y in ((3, 3), (4, 3), (10, 11), (11, 12), (12, 11)) if alt else ((2, 10), (3, 11), (11, 4), (12, 4)):
        img.putpixel((x, y), (108, 150, 88, 255))
    return img


def heal_machine() -> Image.Image:
    img, d = tile()
    d.rectangle([0, 3, 15, 15], fill=(226, 230, 238, 255), outline=OUT)
    d.rectangle([2, 5, 13, 8], fill=(80, 196, 172, 255), outline=(30, 90, 84, 255))  # visor
    d.line([(3, 6), (6, 6)], fill=(210, 255, 240, 255))
    for i, x in enumerate((2, 6, 10)):
        d.ellipse([x, 10, x + 3, 13], fill=(64, 178, 160, 255) if i != 1 else (90, 96, 200, 255), outline=OUT)
    d.rectangle([6, 0, 9, 3], fill=(236, 92, 92, 255), outline=OUT)  # luz
    return img


def statue() -> Image.Image:
    img, d = tile()
    d.rectangle([3, 11, 12, 15], fill=(120, 124, 138, 255), outline=OUT)
    d.polygon([(7, 1), (12, 6), (7, 11), (2, 6)], fill=(110, 186, 120, 255), outline=OUT)  # folha/insígnia
    d.line([(7, 2), (7, 10)], fill=(60, 120, 70, 255))
    d.point([(5, 5), (9, 5)], fill=(200, 240, 200, 255))
    return img


def heal_mat() -> Image.Image:
    img, d = tile()
    d.rectangle([0, 0, 15, 15], fill=(220, 98, 104, 255))
    d.rectangle([1, 1, 14, 14], outline=(250, 214, 140, 255))
    d.rectangle([6, 4, 9, 11], fill=(255, 246, 236, 255))
    d.rectangle([4, 6, 11, 9], fill=(255, 246, 236, 255))
    return img


def recolor(block: Image.Image, rows_px: int, hue: float, sat: float = 1.0, light: float = 1.0) -> Image.Image:
    """Troca a cor do telhado (as primeiras `rows_px` linhas), mantendo o sombreado."""
    out = block.copy()
    px = out.load()
    for y in range(min(rows_px, out.height)):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if s < 0.12 or l < 0.12:  # contorno e cinzas ficam
                continue
            nr, ng, nb = colorsys.hls_to_rgb(hue, min(1, l * light), min(1, s * sat + 0.15))
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return out


def plate(img: Image.Image, x: int, y: int, bg: tuple[int, int, int], symbol: str) -> None:
    d = ImageDraw.Draw(img)
    d.rectangle([x, y, x + 15, y + 9], fill=(*bg, 255), outline=OUT)
    if symbol == "cross":
        d.rectangle([x + 6, y + 2, x + 9, y + 7], fill=(255, 255, 255, 255))
        d.rectangle([x + 4, y + 3, x + 11, y + 6], fill=(255, 255, 255, 255))
    elif symbol == "bag":
        d.rectangle([x + 4, y + 3, x + 11, y + 8], fill=(255, 255, 255, 255))
        d.arc([x + 5, y, x + 10, y + 6], 180, 360, fill=(255, 255, 255, 255))
    else:
        d.polygon([(x + 7, y + 1), (x + 11, y + 5), (x + 7, y + 8), (x + 3, y + 5)], fill=(250, 214, 96, 255), outline=OUT)


def main() -> None:
    sheet_path = TILES / "extra.png"
    old = Image.open(sheet_path).convert("RGBA")
    sheet = Image.new("RGBA", (T * 16, T * ROWS), (0, 0, 0, 0))
    sheet.paste(old.crop((0, 0, T * 16, T)), (0, 0))  # linha 0 (0..15) é do build_assets
    for index, img in ((4, tall_grass(True)), (5, tall_grass(False))):  # mato alto redesenhado
        sheet.paste(Image.new("RGBA", (T, T)), (index * T, 0))
        sheet.paste(img, (index * T, 0), img)
    singles = [web(), cocoon(False), cocoon(True), hedge(), moss(False), moss(True), heal_machine(), statue(), heal_mat()]
    for i, img in enumerate(singles):
        index = 16 + i
        sheet.paste(img, ((index % 16) * T, (index // 16) * T), img)

    ow = Image.open(TILES / "overworld.png").convert("RGBA")
    house = ow.crop((6 * T, 0, 11 * T, 5 * T))
    lab = ow.crop((11 * T, 0, 16 * T, 5 * T))
    center = recolor(house, 3 * T, hue=0.0, sat=1.25, light=1.1)  # telhado vermelho-coral
    plate(center, 2 * T, 2 * T + 3, (214, 70, 76), "cross")
    gym = recolor(lab, 3 * T, hue=0.36, sat=1.1, light=1.0)  # telhado verde-musgo
    door = ow.crop((8 * T, 4 * T, 9 * T, 5 * T))  # a porta da casa (o laboratório põe a dele à parte)
    gym.paste(door, (2 * T, 4 * T))
    plate(gym, 2 * T, 2 * T + 3, (46, 104, 58), "badge")
    mart = recolor(house, 3 * T, hue=0.6, sat=1.2, light=1.05)  # telhado azul
    plate(mart, 2 * T, 2 * T + 3, (52, 104, 200), "bag")
    sheet.paste(mart, (10 * T, 2 * T))
    sheet.paste(center, (0, 2 * T))
    sheet.paste(gym, (5 * T, 2 * T))
    sheet.save(sheet_path)
    print("extra.png", sheet.size)


if __name__ == "__main__":
    main()
