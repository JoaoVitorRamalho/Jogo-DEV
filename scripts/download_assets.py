"""Baixa o recorte LPC (idle/walk/run) e as faixas CC0 do menu."""

from __future__ import annotations

import json
import re
import struct
import subprocess
import time
import urllib.error
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SPRITE_ROOT = PUBLIC / "lpc" / "sprites"
MUSIC_ROOT = PUBLIC / "music"
RAW = "https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/"
ANIMS = ("idle", "walk", "run")
HATS = {
    "sheet_definitions/headwear/hats/caps/hat_cap_leather.json",
    "sheet_definitions/headwear/hats/caps/hat_cap_cavalier.json",
    "sheet_definitions/headwear/hats/formal/hat_formal_bowler.json",
    "sheet_definitions/headwear/hats/formal/hat_formal_crown.json",
    "sheet_definitions/headwear/hats/formal/hat_formal_tiara.json",
    "sheet_definitions/headwear/hats/formal/hat_formal_tophat.json",
    "sheet_definitions/headwear/hats/holiday/hat_holiday_christmas.json",
    "sheet_definitions/headwear/hats/holiday/hat_holiday_elf.json",
    "sheet_definitions/headwear/hats/holiday/hat_holiday_santa.json",
    "sheet_definitions/headwear/hats/magic/hat_magic_wizard.json",
    "sheet_definitions/headwear/hats/magic/hat_magic_large.json",
    "sheet_definitions/headwear/hats/tricorne/hat_tricorne.json",
}
PALETTES = {
    "body": "palette_definitions/body/body_ulpc.json",
    "hair": "palette_definitions/hair/hair_ulpc.json",
    "cloth": "palette_definitions/cloth/cloth_ulpc.json",
    "eye": "palette_definitions/eye/eye_ulpc.json",
}
PALETTE_BASE = {"body": "light", "hair": "orange", "cloth": "white", "eye": "blue"}
TRACKS = {
    "rpgchip01_title_screen": "title.ogg",
    "rpgchip03_town": "town.ogg",
    "rpgchip06_dungeon": "dungeon.ogg",
    "rpgchip09_rainy_streets": "streets.ogg",
    "rpgchip13_battle_1": "battle.ogg",
}


def fetch(url: str, timeout: int = 60) -> bytes | None:
    request = urllib.request.Request(url, headers={"User-Agent": "jornada-assets"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
            if attempt == 3 or error.code not in (429, 500, 502, 503):
                raise
        except Exception:
            if attempt == 3:
                raise
        time.sleep(0.8 * (attempt + 1))
    return None


def want(path: str) -> bool:
    if not path.startswith("sheet_definitions/") or not path.endswith(".json"):
        return False
    name = path.rsplit("/", 1)[-1]
    if name.startswith("meta_"):
        return False
    if path in ("sheet_definitions/body/body.json", "sheet_definitions/body/shadow.json"):
        return True
    if "/faces/face_" in path or "/eyebrows/eyebrows_" in path:
        return True
    if path.startswith("sheet_definitions/hair/") and "/extensions/" not in path:
        return True
    if "/torso/shirts/" in path and "/sleeves/" not in path:
        return True
    if "/legs/pants/" in path and "child" not in name and "pregnant" not in name:
        return True
    if "/legs/skirts/" in path and "child" not in name:
        return True
    if "/feet/shoes/" in path or "/feet/boots/" in path:
        return True
    if name in ("feet_sandals.json", "feet_slippers.json"):
        return True
    if "/glasses/facial_glasses" in path:
        return True
    return path in HATS


def slot_of(path: str) -> str | None:
    if path.endswith("body/body.json"):
        return "body"
    if path.endswith("body/shadow.json"):
        return "shadow"
    if "/faces/" in path:
        return "expression"
    if "/eyebrows/" in path:
        return "eyebrows"
    if "/beards/" in path:
        return "beard"
    if "/hair/" in path:
        return "hair"
    if "/shirts/" in path:
        return "shirt"
    if "/legs/" in path:
        return "legs"
    if "/feet/" in path:
        return "shoes"
    if "/hats/" in path:
        return "hat"
    if "/glasses/" in path:
        return "glasses"
    return None


def materials_of(recolors: object, shadow: bool) -> list[str]:
    if shadow or not isinstance(recolors, dict):
        return []
    if isinstance(recolors.get("material"), str):
        return [recolors["material"]]
    found: list[str] = []
    for value in recolors.values():
        if isinstance(value, dict) and isinstance(value.get("material"), str):
            if value["material"] not in found:
                found.append(value["material"])
    return found


def clean_path(template: str, sex: str) -> str | None:
    path = template.replace("${head}", sex)
    if "${" in path or "/child/" in path:
        return None
    return path if path.endswith("/") else path + "/"


def layers_of(definition: dict) -> list[dict]:
    layers = []
    for key, value in definition.items():
        if not key.startswith("layer_") or not isinstance(value, dict):
            continue
        paths = {}
        for sex in ("male", "female"):
            raw = value.get(sex)
            if isinstance(raw, str):
                cleaned = clean_path(raw, sex)
                if cleaned:
                    paths[sex] = cleaned
        if paths:
            layers.append({"z": int(value.get("zPos", 0)), "paths": paths})
    layers.sort(key=lambda layer: layer["z"])
    return layers


def credits_of(definition: dict) -> list[dict]:
    credits = []
    for entry in definition.get("credits") or []:
        if not isinstance(entry, dict):
            continue
        credits.append(
            {
                "authors": entry.get("authors") or [],
                "licenses": entry.get("licenses") or [],
                "urls": entry.get("urls") or [],
                "notes": entry.get("notes") or "",
            }
        )
    return credits


def png_size(data: bytes) -> tuple[int, int] | None:
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", data[16:24])


def download_png(rel: str) -> bool:
    destination = SPRITE_ROOT / rel
    if destination.exists() and destination.stat().st_size > 80:
        data = destination.read_bytes()
        size = png_size(data)
        if size and size[1] == 256 and size[0] % 64 == 0:
            return True
        destination.unlink(missing_ok=True)
    data = fetch(RAW + "spritesheets/" + rel.replace("\\", "/"))
    if not data:
        return False
    size = png_size(data)
    if not size or size[1] != 256 or size[0] % 64 != 0:
        return False
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return True


def download_music() -> None:
    MUSIC_ROOT.mkdir(parents=True, exist_ok=True)
    if all((MUSIC_ROOT / name).exists() for name in TRACKS.values()):
        print("music already present")
        return
    page = fetch("https://opengameart.org/content/15-melodic-rpg-chiptunes")
    if not page:
        raise SystemExit("Não achei a página das músicas CC0.")
    html = page.decode("utf-8", "replace")
    match = re.search(r'href="(https://opengameart.org/sites/default/files/[^"]*15_melodic_rpg_chiptunes_ogg[^"]*\.zip)"', html)
    if not match:
        match = re.search(r'href="(/sites/default/files/[^"]*15_melodic_rpg_chiptunes_ogg[^"]*\.zip)"', html)
    if not match:
        raise SystemExit("Não achei o zip das músicas na página.")
    url = match.group(1)
    if url.startswith("/"):
        url = "https://opengameart.org" + url
    print("music", url)
    blob = fetch(url, timeout=180)
    if not blob:
        raise SystemExit("Falha ao baixar o zip das músicas.")
    with zipfile.ZipFile(BytesIO(blob)) as archive:
        names = archive.namelist()
        for stem, target in TRACKS.items():
            hit = next((name for name in names if Path(name).stem == stem and name.lower().endswith(".ogg")), None)
            if not hit:
                raise SystemExit(f"Faixa ausente no zip: {stem}")
            (MUSIC_ROOT / target).write_bytes(archive.read(hit))
            print("saved", target)


def repo_files() -> list[str]:
    repo = ROOT / ".tmp-lpc"
    if not (repo / ".git").exists():
        raise SystemExit("O clone parcial do LPC não está em .tmp-lpc.")
    output = subprocess.check_output(
        ["git", "ls-tree", "-r", "--name-only", "HEAD"],
        cwd=repo,
        text=True,
        encoding="utf-8",
    )
    return output.splitlines()


def main() -> None:
    print("reading LPC file list...")
    definitions = [path for path in repo_files() if want(path)]
    print(f"{len(definitions)} definitions")

    parsed: dict[str, dict] = {}

    def load_definition(path: str) -> tuple[str, dict | None]:
        blob = fetch(RAW + path)
        if not blob:
            return path, None
        return path, json.loads(blob)

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(load_definition, path) for path in definitions]
        for future in as_completed(futures):
            path, definition = future.result()
            if definition:
                parsed[path] = definition

    palettes: dict[str, dict] = {}
    for key, path in PALETTES.items():
        blob = fetch(RAW + path)
        if not blob:
            raise SystemExit(f"Paleta ausente: {path}")
        palettes[key] = {"base": PALETTE_BASE[key], "colors": json.loads(blob)}

    records = []
    for path, definition in parsed.items():
        slot = slot_of(path)
        if not slot:
            continue
        animations = definition.get("animations") or []
        if "walk" not in animations or "idle" not in animations:
            continue
        layers = layers_of(definition)
        if not layers:
            continue
        sexes = [sex for sex in ("male", "female") if all(sex in layer["paths"] for layer in layers)]
        if slot == "body" and sexes != ["male", "female"] and set(sexes) != {"male", "female"}:
            if "male" not in sexes or "female" not in sexes:
                raise SystemExit("O corpo masculino ou feminino não foi encontrado.")
        if slot not in ("body", "shadow") and not sexes:
            continue
        records.append(
            {
                "path": path,
                "id": Path(path).stem,
                "name": definition.get("name") or Path(path).stem,
                "slot": slot,
                "sexes": sexes,
                "layers": layers,
                "materials": materials_of(definition.get("recolors"), slot == "shadow"),
                "credits": credits_of(definition),
            }
        )

    pngs: set[str] = set()
    for record in records:
        for layer in record["layers"]:
            for sex in record["sexes"] or ("male", "female"):
                folder = layer["paths"].get(sex)
                if not folder:
                    continue
                for anim in ANIMS:
                    pngs.add(f"{folder}{anim}.png")

    print(f"downloading {len(pngs)} sprites...")
    ok: set[str] = set()
    done = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(download_png, rel): rel for rel in sorted(pngs)}
        for future in as_completed(futures):
            rel = futures[future]
            done += 1
            if future.result():
                ok.add(rel)
            if done % 40 == 0 or done == len(pngs):
                print(f"  {done}/{len(pngs)}")

    def files_ok(record: dict, sex: str, required: tuple[str, ...]) -> bool:
        for layer in record["layers"]:
            folder = layer["paths"].get(sex)
            if not folder:
                return False
            for anim in required:
                if f"{folder}{anim}.png" not in ok:
                    return False
        return True

    items = []
    body = None
    shadow = None
    used_ids: set[str] = set()
    for record in records:
        sexes = [sex for sex in record["sexes"] if files_ok(record, sex, ("idle", "walk"))]
        if record["slot"] == "body":
            if "male" not in sexes or "female" not in sexes:
                raise SystemExit("Sprites de corpo incompletos.")
            body = record
            continue
        if record["slot"] == "shadow":
            if sexes:
                shadow = record
            continue
        if not sexes:
            continue
        item_id = record["id"]
        if item_id in used_ids:
            item_id = f"{item_id}_{record['slot']}"
        used_ids.add(item_id)
        items.append({**record, "id": item_id, "sexes": sexes})

    if body is None:
        raise SystemExit("Corpo LPC ausente.")
    if not any(item["id"] == "face_neutral" for item in items):
        raise SystemExit("A expressão neutra (olhos) não foi baixada.")

    items.sort(key=lambda item: (item["slot"], item["name"].lower()))
    for record in (body, shadow, *items):
        if record:
            record.pop("path", None)

    notice = (
        "Sprites do Liberated Pixel Cup, publicados no OpenGameArt. "
        "Cada peça mantém a licença do autor: CC0, CC-BY, CC-BY-SA 3.0, OGA-BY 3.0 ou GPL 3.0. "
        "Quando a peça exige compartilhamento pela mesma licença, a arte derivada segue CC-BY-SA 4.0. "
        "Coleção: https://opengameart.org/content/lpc-collection"
    )
    catalog = {
        "frame": 64,
        "directions": ["up", "left", "down", "right"],
        "animations": {
            "idle": {"cycle": [0, 0, 1], "fps": 5},
            "walk": {"cycle": [1, 2, 3, 4, 5, 6, 7, 8], "fps": 9},
            "run": {"cycle": [0, 1, 2, 3, 4, 5, 6, 7], "fps": 12},
        },
        "palettes": palettes,
        "body": body,
        "shadow": shadow,
        "items": items,
        "notice": notice,
    }
    out = PUBLIC / "lpc"
    out.mkdir(parents=True, exist_ok=True)
    (out / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")

    authors: set[str] = set()
    lines = [notice, "", "Música: 15 Melodic RPG Chiptunes, de Aureolus_Omicron, CC0.", "https://opengameart.org/content/15-melodic-rpg-chiptunes", ""]
    for record in [body, shadow, *items]:
        if not record:
            continue
        for credit in record["credits"]:
            authors.update(credit["authors"])
            lines.append(f"{record['name']}: {', '.join(credit['authors'])} ({', '.join(credit['licenses'])})")
    lines.insert(4, "Autores: " + ", ".join(sorted(authors)))
    lines.insert(5, "")
    (out / "CREDITOS.txt").write_text("\n".join(lines), encoding="utf-8")

    counts: dict[str, int] = {}
    for item in items:
        counts[item["slot"]] = counts.get(item["slot"], 0) + 1
    print("slots", counts)
    print("items", len(items))
    download_music()
    print("done")


if __name__ == "__main__":
    main()
