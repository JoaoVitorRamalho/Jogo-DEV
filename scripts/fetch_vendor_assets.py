"""Baixa packs opcionais (Kenney/OGA) para public/vendor/. Rode com: python scripts/fetch_vendor_assets.py"""

from __future__ import annotations

import json
import shutil
import urllib.error
import urllib.request
import zipfile
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "public" / "vendor"
MANIFEST = VENDOR / "MANIFEST.json"

# URLs que costumam funcionar sem login (se falhar, o GERO.md lista download manual)
# URLs mudam; se falhar, baixar manual (GERO.md) e extrair em public/vendor/<slug>/
PACKS: list[tuple[str, str]] = [
    ("kenney-game-icons", "https://kenney.nl/media/pages/assets/game-icons/gameicons.zip"),
    ("kenney-ui-pack", "https://kenney.nl/media/pages/assets/ui-pack/ui-pack.zip"),
]


def fetch(url: str, dest: Path) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=120) as resp:
            data = resp.read()
    except (urllib.error.URLError, TimeoutError) as err:
        print(f"  falhou: {err}")
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return True


def unpack(archive: Path, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    name = archive.name.lower()
    if name.endswith(".zip"):
        with zipfile.ZipFile(archive) as zf:
            zf.extractall(target)
    elif name.endswith(".tar.gz") or name.endswith(".tgz"):
        import tarfile

        with tarfile.open(archive, "r:gz") as tf:
            tf.extractall(target)
    else:
        raise ValueError(f"formato não suportado: {archive}")


def main() -> None:
    VENDOR.mkdir(parents=True, exist_ok=True)
    results: dict[str, str] = {}
    for slug, url in PACKS:
        print(slug)
        ext = ".zip" if url.endswith(".zip") else ".tar.gz" if ".tar.gz" in url else ".zip"
        zpath = VENDOR / "_dl" / f"{slug}{ext}"
        ok = fetch(url, zpath)
        out = VENDOR / slug
        if ok:
            if out.exists():
                shutil.rmtree(out)
            try:
                unpack(zpath, out)
                results[slug] = "ok"
                print(f"  -> {out}")
            except (zipfile.BadZipFile, OSError) as err:
                results[slug] = f"unpack_error: {err}"
                print(f"  unpack: {err}")
        else:
            results[slug] = "download_failed"
    MANIFEST.write_text(json.dumps({"packs": results, "note": "Ver GERO.md se algum pack falhou."}, indent=2), encoding="utf-8")
    print("manifest", MANIFEST)


if __name__ == "__main__":
    main()