"""Baixa packs visuais e instala recortes em public/assets/ui/."""

from __future__ import annotations

import json
import re
import shutil
import urllib.error
import urllib.request
import zipfile
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "public" / "vendor"
HUD = ROOT / "public" / "assets" / "ui" / "kenney"
MANIFEST = VENDOR / "MANIFEST.json"
UA = {"User-Agent": "jornada-assets/1.0"}

PACKS: list[tuple[str, str]] = [
    (
        "kenney-ui-pack",
        "https://opengameart.org/sites/default/files/kenney_ui-pack.zip",
    ),
    (
        "oga-town-tiles",
        "https://opengameart.org/sites/default/files/town_tiles.png",
    ),
    (
        "oga-backgrounds",
        "https://opengameart.org/sites/default/files/Backgrounds.png",
    ),
]

# Arquivos do UI pack que o jogo usa (relativos dentro do zip)
HUD_PICKS = [
    "PNG/Blue/Default/button_square_depth_border.png",
    "PNG/Blue/Default/button_rectangle_depth_border.png",
    "PNG/Blue/Default/button_round_depth_border.png",
    "PNG/Blue/Default/slide_horizontal_color_section.png",
    "PNG/Blue/Default/slide_horizontal_grey_section.png",
    "PNG/Blue/Default/slide_horizontal_grey_section_wide.png",
    "PNG/Blue/Default/slide_vertical_color_section.png",
    "PNG/Blue/Default/check_square_color_checkmark.png",
]


def fetch(url: str) -> bytes | None:
    request = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(request, timeout=180) as resp:
            return resp.read()
    except (urllib.error.URLError, TimeoutError) as err:
        print(f"  falhou: {err}")
        return None


def unpack_zip(blob: bytes, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(BytesIO(blob)) as zf:
        zf.extractall(target)


def install_kenney_hud(vendor_dir: Path) -> list[str]:
    """Copia PNGs escolhidos para public/assets/ui/kenney/."""
    if HUD.exists():
        shutil.rmtree(HUD)
    HUD.mkdir(parents=True)
    installed: list[str] = []
    zips = list(vendor_dir.glob("*.zip")) + list((vendor_dir / "kenney-ui-pack").rglob("*.zip"))
    zip_root = vendor_dir / "kenney-ui-pack"
    names_in_tree: dict[str, Path] = {}
    if zip_root.exists():
        for p in zip_root.rglob("*.png"):
            names_in_tree[p.as_posix().split("kenney-ui-pack/", 1)[-1]] = p

    if not names_in_tree:
        blob_path = vendor_dir / "_dl" / "kenney-ui-pack.zip"
        if blob_path.exists():
            with zipfile.ZipFile(blob_path) as zf:
                for rel in HUD_PICKS:
                    try:
                        data = zf.read(rel)
                        out = HUD / Path(rel).name
                        out.write_bytes(data)
                        installed.append(out.name)
                    except KeyError:
                        pass
        return installed

    for rel in HUD_PICKS:
        src = names_in_tree.get(rel)
        if src and src.is_file():
            out = HUD / src.name
            shutil.copyfile(src, out)
            installed.append(out.name)
    return installed


def save_tile_reference(blob: bytes, path: Path) -> bool:
    if len(blob) < 200 or blob[:8] != b"\x89PNG\r\n\x1a\n":
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(blob)
    return True


def main() -> None:
    VENDOR.mkdir(parents=True, exist_ok=True)
    dl_dir = VENDOR / "_dl"
    dl_dir.mkdir(parents=True, exist_ok=True)
    results: dict[str, str] = {}

    for slug, url in PACKS:
        print(slug)
        blob = fetch(url)
        if not blob:
            results[slug] = "download_failed"
            continue
        if url.endswith(".zip"):
            zpath = dl_dir / f"{slug}.zip"
            zpath.write_bytes(blob)
            out = VENDOR / slug
            if out.exists():
                shutil.rmtree(out)
            unpack_zip(blob, out)
            results[slug] = f"ok ({len(blob)} bytes)"
        else:
            ref = ROOT / "public" / "assets" / "tilesets" / "refs" / f"{slug}.png"
            if save_tile_reference(blob, ref):
                results[slug] = f"ok -> {ref.relative_to(ROOT)}"
            else:
                results[slug] = "not_a_png"

    hud_files = install_kenney_hud(VENDOR)
    results["hud_installed"] = ", ".join(hud_files) if hud_files else "none"

    MANIFEST.write_text(
        json.dumps({"packs": results, "hud_dir": str(HUD.relative_to(ROOT))}, indent=2),
        encoding="utf-8",
    )
    print("manifest", MANIFEST)
    if hud_files:
        print("hud", hud_files)


if __name__ == "__main__":
    main()