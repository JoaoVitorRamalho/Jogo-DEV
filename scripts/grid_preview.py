"""Gera recortes ampliados com grade e coordenadas de tile para mapear as folhas de arte."""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

src = Path(sys.argv[1])
out = Path(sys.argv[2])
col0, row0, cols, rows = (int(v) for v in sys.argv[3:7])
scale = int(sys.argv[7]) if len(sys.argv) > 7 else 3
tile = 16
image = Image.open(src).convert("RGBA")
crop = image.crop((col0 * tile, row0 * tile, (col0 + cols) * tile, (row0 + rows) * tile))
bg = Image.new("RGBA", crop.size, (255, 0, 255, 255))
bg.alpha_composite(crop)
big = bg.resize((crop.width * scale, crop.height * scale), Image.NEAREST)
pad = 18
canvas = Image.new("RGB", (big.width + pad, big.height + pad), (30, 30, 30))
canvas.paste(big, (pad, pad))
draw = ImageDraw.Draw(canvas)
step = tile * scale
for c in range(cols + 1):
    x = pad + c * step
    draw.line([(x, pad), (x, canvas.height)], fill=(0, 0, 0), width=1)
    if c < cols:
        draw.text((x + 2, 3), str(col0 + c), fill=(255, 255, 0))
for r in range(rows + 1):
    y = pad + r * step
    draw.line([(pad, y), (canvas.width, y)], fill=(0, 0, 0), width=1)
    if r < rows:
        draw.text((1, y + 2), str(row0 + r), fill=(255, 255, 0))
canvas.save(out)
