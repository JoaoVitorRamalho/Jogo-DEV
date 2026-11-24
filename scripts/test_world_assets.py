"""Regressões de geração: python -B scripts/test_world_assets.py."""

import tempfile
import unittest
import hashlib
import json
from pathlib import Path
from unittest.mock import patch

from PIL import Image

import build_battle_art as art
import build_maps as maps


class WorldAssetsTests(unittest.TestCase):
    def test_mega_sprites_match_verified_forms(self):
        manifest = json.loads((maps.ROOT / "data/pokemon/mega-sprite-digests.json").read_text(encoding="utf-8"))
        for filename, expected in manifest.items():
            with self.subTest(sprite=filename), Image.open(maps.ASSETS / "sprites/pokemon" / filename) as image:
                image = image.convert("RGBA")
                self.assertEqual(list(image.size), expected["size"])
                self.assertEqual(hashlib.sha256(image.tobytes()).hexdigest(), expected["rgbaSha256"])

    def test_grass_never_overlaps_a_tree_in_either_build_order(self):
        for tree_first in (True, False):
            with self.subTest(tree_first=tree_first):
                world = maps.Map("teste", 6, 6)
                cells = maps.rect(2, 2, 2, 2)
                if tree_first:
                    maps.tree(world, 2, 2)
                    maps.tall(world, cells, set())
                else:
                    maps.tall(world, cells, set())
                    maps.tree(world, 2, 2)
                for x, y in cells:
                    self.assertNotEqual(world.layers["detail"][y][x], maps.TALL)

    def test_pokeball_has_a_red_top_and_white_bottom(self):
        with Image.open(maps.ASSETS / "ui/items/ball.png") as image:
            image = image.convert("RGBA")
            mid = image.height // 2
            top = [image.getpixel((x, y)) for y in range(mid) for x in range(image.width)]
            bottom = [image.getpixel((x, y)) for y in range(mid, image.height) for x in range(image.width)]
            self.assertTrue(any(a and r > 130 and r > g * 1.5 and r > b * 1.4 for r, g, b, a in top))
            self.assertTrue(any(a and min(r, g, b) > 180 and max(r, g, b) - min(r, g, b) < 60 for r, g, b, a in bottom))

    def test_background_generator_does_not_replace_capture_icons(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            items = root / "ui/items"
            items.mkdir(parents=True)
            for name in ("ball", "greatball"):
                (items / f"{name}.png").write_bytes(b"keep the standard ball")
            with patch.object(art, "OUT", root):
                art.main()
            for name in ("ball", "greatball"):
                self.assertEqual((items / f"{name}.png").read_bytes(), b"keep the standard ball")


if __name__ == "__main__":
    unittest.main()
