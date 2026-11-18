"""Arte original da batalha: cenários, plataformas e as esferas de captura.

Tudo é desenhado aqui, pixel a pixel (nada baixado). Rode sozinho com
`python3 scripts/build_battle_art.py` ou pelo `build_assets.py`.

Cenários (240x160): grass (rota), town (vila), forest (mata), gym (ginásio).
Esferas (24x24): ball (Esfera) e greatball (Esfera Plus).
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets"
W, H = 240, 160
HORIZON = 62
OUTLINE = (34, 28, 44, 255)

Color = tuple[int, int, int]


def mix(a: Color, b: Color, t: float) -> Color:
    t = max(0.0, min(1.0, t))
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def dither_gradient(img: Image.Image, top: int, bottom: int, stops: list[Color]) -> None:
    """Degradê vertical em poucas cores, com pontilhado ordenado (cara de GBA)."""
    px = img.load()
    span = max(1, bottom - top)
    steps = len(stops) - 1
    for y in range(top, bottom):
        pos = (y - top) / span * steps
        idx = min(steps - 1, int(pos))
        frac = pos - idx
        for x in range(W):
            use_next = frac * 16 > BAYER[y % 4][x % 4]
            c = stops[idx + 1] if use_next else stops[idx]
            px[x, y] = c + (255,)


def cloud(d: ImageDraw.ImageDraw, x: int, y: int, w: int, light: Color, shade: Color) -> None:
    h = max(6, w // 4)
    d.ellipse((x, y + h // 3, x + w, y + h), fill=shade)
    d.ellipse((x + w // 6, y, x + w // 2 + 4, y + h - 2), fill=light)
    d.ellipse((x + w // 3, y - h // 3, x + w * 3 // 4, y + h - 3), fill=light)
    d.ellipse((x + w // 2, y + 1, x + w - 3, y + h - 2), fill=light)
    d.rectangle((x + 3, y + h - 3, x + w - 3, y + h - 2), fill=shade)


def ridge(img: Image.Image, base: int, amp: float, freq: float, phase: float, body: Color, light: Color | None = None,
          snow: Color | None = None) -> None:
    d = ImageDraw.Draw(img)
    tops = []
    for x in range(W):
        v = math.sin(x * freq + phase) * amp + math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.35
        top = int(base - abs(v))
        tops.append(top)
        d.line((x, top, x, HORIZON + 2), fill=body + (255,))
    if light:
        for x in range(1, W):
            if tops[x] < tops[x - 1]:  # encosta virada para a luz
                d.line((x, tops[x], x, tops[x] + 3), fill=light + (255,))
    if snow:
        peak = min(tops)
        for x, top in enumerate(tops):
            if top <= peak + 3:
                d.line((x, top, x, top + 1), fill=snow + (255,))


def tree_line(img: Image.Image, base: int, rng: random.Random, dark: Color, mid: Color, light: Color, size: int) -> None:
    d = ImageDraw.Draw(img)
    x = -size
    while x < W + size:
        r = size + rng.randint(-1, 2)
        cy = base - r + rng.randint(-2, 2)
        d.ellipse((x - r, cy - r, x + r, cy + r), fill=dark + (255,))
        d.ellipse((x - r + 2, cy - r + 1, x + r - 3, cy + r - 3), fill=mid + (255,))
        d.ellipse((x - r // 2, cy - r + 2, x + 1, cy - r // 3), fill=light + (255,))
        x += r + rng.randint(1, 4)
    d.rectangle((0, base - 2, W, HORIZON + 2), fill=dark + (255,))


def meadow(img: Image.Image, rng: random.Random, near: Color, far: Color, blade: Color, flowers: list[Color]) -> None:
    px = img.load()
    d = ImageDraw.Draw(img)
    for y in range(HORIZON, H):
        t = (y - HORIZON) / (H - HORIZON)
        base = mix(far, near, t)
        for x in range(W):
            px[x, y] = base + (255,)
    # faixas de perspectiva: ficam mais largas perto da câmera
    y = HORIZON + 3
    gap = 3
    while y < H:
        shade = mix(far, near, (y - HORIZON) / (H - HORIZON))
        stripe = mix(shade, blade, 0.45)
        for x in range(0, W, 2):
            if (x // 2 + y) % 3:
                px[x, y] = stripe + (255,)
        y += gap
        gap += 1
    # tufos de grama
    for _ in range(90):
        x = rng.randrange(W)
        y = rng.randrange(HORIZON + 6, H)
        tall = 1 + (y - HORIZON) // 22
        d.line((x, y, x, y - tall), fill=blade + (255,))
        d.point((x - 1, y - tall + 1), fill=blade + (255,))
        d.point((x + 1, y - tall + 1), fill=blade + (255,))
    for _ in range(26):
        x = rng.randrange(4, W - 4)
        y = rng.randrange(HORIZON + 8, H - 2)
        c = rng.choice(flowers)
        d.point((x, y), fill=c + (255,))
        if y > HORIZON + 40:
            d.point((x + 1, y), fill=c + (255,))
            d.point((x, y - 1), fill=(255, 246, 200, 255))


def house(d: ImageDraw.ImageDraw, x: int, base: int, w: int, roof: Color, wall: Color, trim: Color) -> None:
    h = w * 2 // 3
    d.rectangle((x, base - h, x + w, base), fill=wall + (255,))
    d.polygon([(x - 3, base - h + 1), (x + w // 2, base - h - w // 2), (x + w + 3, base - h + 1)], fill=roof + (255,))
    d.line((x - 3, base - h + 1, x + w + 3, base - h + 1), fill=trim + (255,))
    d.rectangle((x + w // 2 - 2, base - 6, x + w // 2 + 2, base), fill=trim + (255,))
    d.rectangle((x + 3, base - h + 4, x + 6, base - h + 7), fill=(255, 230, 150, 255))
    d.rectangle((x + w - 6, base - h + 4, x + w - 3, base - h + 7), fill=(255, 230, 150, 255))


def light_pool(img: Image.Image, cx: int, cy: int, rx: int, ry: int, tint: Color, strength: float) -> None:
    px = img.load()
    for y in range(max(0, cy - ry), min(H, cy + ry)):
        for x in range(max(0, cx - rx), min(W, cx + rx)):
            dist = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if dist < 1 and (1 - dist) * 16 * strength > BAYER[y % 4][x % 4]:
                r, g, b, _ = px[x, y]
                px[x, y] = mix((r, g, b), tint, 0.25) + (255,)


def backdrop_grass(rng: random.Random) -> Image.Image:
    img = Image.new("RGBA", (W, H))
    dither_gradient(img, 0, HORIZON + 4, [(92, 156, 232), (128, 188, 244), (186, 222, 250), (232, 244, 252)])
    d = ImageDraw.Draw(img)
    for x, y, w in ((8, 10, 46), (96, 4, 34), (150, 16, 56), (206, 8, 30)):
        cloud(d, x, y, w, (255, 255, 255), (214, 230, 246))
    ridge(img, 46, 12, 0.035, 0.6, (140, 170, 214), (170, 196, 230), (240, 246, 255))
    ridge(img, 54, 6, 0.06, 2.1, (98, 150, 150), (120, 172, 160))
    tree_line(img, HORIZON, rng, (40, 98, 70), (62, 132, 84), (104, 170, 100), 7)
    meadow(img, rng, (92, 168, 84), (138, 200, 112), (60, 128, 64), [(250, 250, 250), (250, 214, 86), (238, 120, 150)])
    light_pool(img, 180, 82, 58, 14, (240, 255, 200), 0.6)
    light_pool(img, 64, 138, 74, 18, (240, 255, 200), 0.5)
    return img


def backdrop_town(rng: random.Random) -> Image.Image:
    img = Image.new("RGBA", (W, H))
    dither_gradient(img, 0, HORIZON + 4, [(120, 108, 196), (226, 148, 156), (250, 196, 150), (252, 226, 186)])
    d = ImageDraw.Draw(img)
    d.ellipse((150, 30, 190, 70), fill=(255, 232, 170, 255))
    for x, y, w in ((14, 14, 40), (110, 8, 30), (196, 20, 40)):
        cloud(d, x, y, w, (255, 226, 214), (232, 176, 180))
    ridge(img, 52, 8, 0.03, 1.3, (150, 120, 168), (176, 140, 180))
    for x, w, roof in ((6, 22, (200, 84, 72)), (40, 18, (72, 118, 196)), (70, 26, (214, 150, 64)),
                       (128, 20, (96, 150, 96)), (160, 28, (200, 84, 72)), (204, 22, (120, 96, 168))):
        house(d, x, HORIZON, w, roof, (240, 226, 200), (124, 84, 64))
    d.rectangle((0, HORIZON - 1, W, HORIZON + 1), fill=(124, 84, 64, 255))
    meadow(img, rng, (196, 166, 120), (226, 204, 160), (170, 138, 96), [(250, 240, 220), (214, 110, 90)])
    # calçada de pedras
    for y in range(HORIZON + 6, H, 7):
        off = (y // 7) % 2 * 8
        for x in range(-off, W, 16):
            d.rounded_rectangle((x + 1, y, x + 13, y + 4), 2, outline=(178, 146, 106, 255))
    light_pool(img, 64, 138, 74, 18, (255, 240, 200), 0.5)
    return img


def backdrop_forest(rng: random.Random) -> Image.Image:
    img = Image.new("RGBA", (W, H))
    dither_gradient(img, 0, HORIZON + 4, [(40, 84, 76), (70, 128, 96), (130, 178, 120), (190, 216, 150)])
    tree_line(img, 40, rng, (28, 64, 56), (40, 86, 68), (56, 110, 80), 12)
    tree_line(img, HORIZON, rng, (30, 80, 56), (48, 112, 70), (86, 150, 86), 9)
    d = ImageDraw.Draw(img)
    for _ in range(6):  # raios de luz entre as copas
        x = rng.randrange(W)
        for k in range(30):
            if rng.random() < 0.2:
                d.point((x + k // 3, 10 + k * 2), fill=(220, 240, 180, 255))
    meadow(img, rng, (64, 128, 70), (98, 160, 88), (40, 96, 56), [(250, 230, 120), (240, 240, 250)])
    light_pool(img, 180, 82, 58, 14, (220, 255, 190), 0.7)
    light_pool(img, 64, 138, 74, 18, (220, 255, 190), 0.6)
    return img


def backdrop_gym(rng: random.Random) -> Image.Image:
    img = Image.new("RGBA", (W, H))
    dither_gradient(img, 0, HORIZON + 4, [(36, 40, 70), (60, 66, 110), (92, 96, 150)])
    d = ImageDraw.Draw(img)
    # janelões e pilares
    for x in range(10, W, 46):
        d.rectangle((x, 10, x + 26, 48), fill=(120, 170, 220, 255))
        d.rectangle((x + 12, 10, x + 14, 48), fill=(72, 84, 130, 255))
        d.rectangle((x, 28, x + 26, 29), fill=(72, 84, 130, 255))
        d.line((x + 3, 14, x + 9, 22), fill=(200, 230, 255, 255))
        d.rectangle((x + 32, 0, x + 38, HORIZON), fill=(48, 52, 90, 255))
        d.rectangle((x + 32, 0, x + 33, HORIZON), fill=(84, 90, 140, 255))
    # faixas da arquibancada
    d.rectangle((0, 50, W, HORIZON), fill=(70, 50, 90, 255))
    for x in range(0, W, 6):
        c = rng.choice([(236, 108, 92), (252, 210, 90), (110, 170, 236), (240, 240, 240)])
        d.rectangle((x + 1, 53, x + 3, 56), fill=c + (255,))
    # piso de quadra com perspectiva
    px = img.load()
    for y in range(HORIZON, H):
        t = (y - HORIZON) / (H - HORIZON)
        for x in range(W):
            board = int((x - W / 2) / (10 + t * 30)) % 2
            c = mix((212, 168, 112), (186, 140, 90), 0.5 if board else 0)
            px[x, y] = mix(c, (150, 108, 70), t * 0.6) + (255,)
    d.line((0, HORIZON, W, HORIZON), fill=(250, 250, 250, 255))
    d.ellipse((W // 2 - 70, 96, W // 2 + 70, 128), outline=(250, 250, 250, 255))
    d.line((W // 2, HORIZON, W // 2, H), fill=(250, 250, 250, 255))
    light_pool(img, 180, 82, 58, 14, (255, 250, 220), 0.7)
    light_pool(img, 64, 138, 74, 18, (255, 250, 220), 0.6)
    return img


PLATFORMS: dict[str, tuple[Color, Color, Color, Color]] = {
    #          aro escuro      terra          topo            brilho
    "grass": ((52, 110, 60), (126, 92, 62), (104, 178, 88), (150, 212, 120)),
    "town": ((150, 112, 76), (126, 92, 62), (214, 186, 140), (240, 220, 180)),
    "forest": ((36, 84, 52), (96, 70, 50), (78, 146, 76), (122, 186, 104)),
    "gym": ((60, 60, 96), (90, 90, 130), (232, 232, 240), (255, 255, 255)),
}


def platform(width: int, colors: tuple[Color, Color, Color, Color], rng: random.Random, grass: bool) -> Image.Image:
    rim, soil, top, shine = colors
    img = Image.new("RGBA", (width, 28), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 6, width - 1, 27), fill=OUTLINE)
    d.ellipse((1, 7, width - 2, 26), fill=soil + (255,))
    d.ellipse((0, 1, width - 1, 21), fill=OUTLINE)
    d.ellipse((1, 2, width - 2, 20), fill=rim + (255,))
    d.ellipse((3, 2, width - 4, 18), fill=top + (255,))
    d.ellipse((width // 5, 4, width * 3 // 5, 10), fill=shine + (255,))
    if grass:
        for _ in range(width // 4):
            a = rng.random() * math.tau
            x = int(width / 2 + math.cos(a) * (width / 2 - 3))
            y = int(11 + math.sin(a) * 8)
            if y > 12:
                d.line((x, y, x, y - 2), fill=rim + (255,))
    else:
        d.ellipse((width // 2 - 20, 7, width // 2 + 20, 15), outline=rim + (255,))
    return img


def orb(body: Color, body_dark: Color, band: Color, mark: str | None, size: int = 24) -> Image.Image:
    """Esfera de captura original: corpo colorido em cima, base creme, anel dourado e gema em losango."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    c = (size - 1) / 2
    r = size * 0.442
    cream, cream_dark = (246, 240, 226), (196, 186, 170)
    for y in range(size):
        for x in range(size):
            dx, dy = x - c, y - c
            dist = math.hypot(dx, dy)
            if dist > r:
                continue
            if dist > r - 1.1:
                px[x, y] = OUTLINE
                continue
            light = (-dx * 0.55 - dy * 0.8) / r  # luz vindo de cima à esquerda
            if abs(dy) <= 1.2:
                col = mix(band, (255, 255, 255), max(0.0, light) * 0.4)
                if abs(dy) > 0.6 and dy > 0:
                    col = mix(band, (120, 80, 30), 0.45)
            elif dy < 0:
                col = mix(body_dark, body, 0.55 + light * 0.6)
            else:
                col = mix(cream_dark, cream, 0.6 + light * 0.7)
            px[x, y] = col + (255,)
    d = ImageDraw.Draw(img)
    # gema em losango no centro
    g = size // 2
    k = 4 if size >= 20 else 3
    d.polygon([(g, g - k), (g + k, g), (g, g + k), (g - k, g)], fill=OUTLINE)
    d.polygon([(g, g - k + 1), (g + k - 1, g), (g, g + k - 1), (g - k + 1, g)], fill=band + (255,))
    d.point((g, g - 1), fill=(255, 252, 230, 255))
    # brilho
    s = size / 24
    d.point((round(7 * s), round(5 * s)), fill=(255, 255, 255, 255))
    d.point((round(6 * s), round(6 * s)), fill=(255, 255, 255, 255))
    if mark == "stars" and size >= 20:
        for sx, sy in ((7, 8), (16, 6)):
            d.point((sx, sy), fill=band + (255,))
            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                d.point((sx + ox, sy + oy), fill=mix(band, (255, 255, 255), 0.4) + (255,))
    return img


def main() -> None:
    rng = random.Random(7)
    builders = {"grass": backdrop_grass, "town": backdrop_town, "forest": backdrop_forest, "gym": backdrop_gym}
    battle = OUT / "battle"
    battle.mkdir(parents=True, exist_ok=True)
    for name, build in builders.items():
        build(rng).save(battle / f"bg_{name}.png")
        for side, width in (("enemy", 112), ("player", 136)):
            platform(width, PLATFORMS[name], rng, name != "gym").save(battle / f"platform_{name}_{side}.png")
    items = OUT / "ui" / "items"
    items.mkdir(parents=True, exist_ok=True)
    orb((40, 178, 160), (18, 104, 100), (236, 184, 64), None).save(items / "ball.png")
    orb((104, 92, 214), (52, 40, 130), (250, 206, 84), "stars").save(items / "greatball.png")
    print("arte da batalha ok")


if __name__ == "__main__":
    main()
