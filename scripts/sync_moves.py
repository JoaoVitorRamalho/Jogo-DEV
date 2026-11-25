"""Sincroniza os golpes existentes com o espelho oficial de dados da PokéAPI.

python -B scripts/sync_moves.py
As descrições em português ficam em move-descriptions.pt.json para revisão editorial.
"""
import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".tools" / "pokeapi-moves"
SOURCE = "https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2/move"
IDS = {}


def fetch(identifier):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{identifier}.json"
    if not path.exists():
        with urllib.request.urlopen(f"{SOURCE}/{identifier}/index.json", timeout=30) as response:
            path.write_bytes(response.read())
    return json.loads(path.read_text(encoding="utf-8"))


def sync(name):
    data = fetch(IDS[name.replace("_", "-")])
    meta = data["meta"] or {}
    effect = next((entry for entry in data["effect_entries"] if entry["language"]["name"] == "en"), {})
    # Textos dos jogos por turnos; golpes antigos continuam utilizáveis nesta campanha.
    flavors = [" ".join(entry["flavor_text"].split()) for entry in data["flavor_text_entries"]
               if entry["language"]["name"] == "en"
               and entry["version_group"]["name"] not in ("legends-arceus", "legends-za")
               and "recommended" not in entry["flavor_text"].lower()]
    return name, {
        "source": f"https://pokeapi.co/api/v2/move/{data['id']}/",
        "type": data["type"]["name"], "category": data["damage_class"]["name"],
        "power": data["power"], "accuracy": data["accuracy"], "pp": data["pp"], "priority": data["priority"],
        "effect": effect.get("short_effect", "").replace("$effect_chance", str(data["effect_chance"])),
        "flavor": flavors[-1] if flavors else "",
        "drain": meta.get("drain", 0), "minHits": meta.get("min_hits"), "maxHits": meta.get("max_hits"),
        "ailment": meta.get("ailment", {}).get("name", "none"), "ailmentChance": meta.get("ailment_chance", 0),
        "flinchChance": meta.get("flinch_chance", 0), "statChance": meta.get("stat_chance", 0),
        "statChanges": [{"stat": entry["stat"]["name"], "change": entry["change"]} for entry in data["stat_changes"]],
    }


if __name__ == "__main__":
    with urllib.request.urlopen(f"{SOURCE}/index.json", timeout=30) as response:
        index = json.load(response)
    IDS = {entry["name"]: entry["url"].rstrip("/").split("/")[-1] for entry in index["results"]}
    names = re.findall(r'\{ id: "([a-z_]+)"', (ROOT / "data/pokemon/moves.ts").read_text(encoding="utf-8"))
    with ThreadPoolExecutor(max_workers=4) as pool:
        result = dict(pool.map(sync, names))
    (ROOT / "data/pokemon/move-data.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(result)} golpes sincronizados com a PokéAPI.")
