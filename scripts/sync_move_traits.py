"""Consulta metadados dos golpes para habilidades de contato e recuo."""
import csv
import io
import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from build_assets import ROOT
from sync_pokemon_traits import fetch


if __name__ == "__main__":
    cache = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / ".tools/pokeapi"
    cache.mkdir(parents=True, exist_ok=True)
    flags_path = cache / "move_flag_map.csv"
    if not flags_path.exists():
        with urllib.request.urlopen("https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/move_flag_map.csv", timeout=30) as response:
            flags_path.write_bytes(response.read())
    contact = {int(row["move_id"]) for row in csv.DictReader(io.StringIO(flags_path.read_text())) if row["move_flag_id"] == "1"}
    with urllib.request.urlopen("https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2/move/index.json", timeout=30) as response:
        index = json.load(response)
    ids = {entry["name"]: entry["url"].rstrip("/").split("/")[-1] for entry in index["results"]}
    names = re.findall(r'id: "([a-z_]+)"', (ROOT / "data/pokemon/moves.ts").read_text(encoding="utf-8"))

    def traits(name):
        identifier = ids[name.replace("_", "-")]
        move = fetch("move", identifier)
        return name, {"contact": int(identifier) in contact, "recoil": max(0, -move["meta"]["drain"]) / 100}

    with ThreadPoolExecutor(max_workers=4) as pool:
        result = dict(pool.map(traits, names))
    (ROOT / "data/pokemon/move-traits.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"{len(result)} golpes verificados")
