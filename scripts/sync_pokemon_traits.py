"""Atualiza habilidades e proporções de gênero a partir dos dados da PokéAPI.

python -B scripts/sync_pokemon_traits.py [pasta_de_cache]
"""
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from build_assets import MEGA_SPRITE_DEX, ROOT, SPRITE_DEX

CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / ".tools" / "pokeapi"
SOURCE = "https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2"


def fetch(kind, identifier):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{kind}-{identifier}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    with urllib.request.urlopen(f"{SOURCE}/{kind}/{identifier}/index.json", timeout=30) as response:
        data = json.load(response)
    path.write_text(json.dumps(data), encoding="utf-8")
    return data


def traits(item):
    name, dex = item
    pokemon = fetch("pokemon", dex)
    expected = {"giratina": "giratina-altered"}.get(name, name.replace("_", "-"))
    if pokemon["name"] != expected:
        raise ValueError(f"{name}: ID {dex} pertence a {pokemon['name']}")
    species_id = pokemon["species"]["url"].rstrip("/").split("/")[-1]
    species = fetch("pokemon-species", species_id)
    return name, {
        "sourceId": dex,
        "sourceName": pokemon["name"],
        "genderRate": species["gender_rate"],
        "abilities": [
            {"id": ability["ability"]["name"], "slot": ability["slot"], "hidden": ability["is_hidden"]}
            for ability in pokemon["abilities"]
        ],
    }


if __name__ == "__main__":
    ids = {**SPRITE_DEX, **MEGA_SPRITE_DEX}
    with ThreadPoolExecutor(max_workers=4) as pool:
        data = dict(pool.map(traits, ids.items()))
    (ROOT / "data/pokemon/traits.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"{len(data)} espécies e formas verificadas na PokéAPI")
