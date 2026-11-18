# Guia do VISUAL (obrigatório)

Mapas, HUD, sprites de cidade e integração de packs baixados.

## 1. Leia

1. [`../LEIA-ANTES.md`](../LEIA-ANTES.md)  
2. [`../GERO.md`](../GERO.md) § 4–6  
3. [`../CREDITS.md`](../CREDITS.md)  

## 2. O que já está baixado / no repo

| Item | Pasta |
|------|--------|
| Pokémon batalha | `public/assets/sprites/pokemon/` (PokeAPI via `npm run assets`) |
| Mundo base | `public/assets/tilesets/overworld.png`, `inner.png`, `extra.png` |
| HUD Kenney (recorte) | `public/assets/ui/kenney/` |
| Referência cidade | `public/assets/tilesets/refs/oga-town-tiles.png` |
| Fundos referência | `public/assets/tilesets/refs/oga-backgrounds.png` |
| Pack completo Kenney UI | `public/vendor/kenney-ui-pack/` (local, após `npm run vendor`) |
| Personagens LPC | `public/lpc/` (após `npm run music`) |

## 3. Comandos

```bash
npm run setup    # tudo: LPC + sprites + mapas + vendor
npm run vendor   # só baixar packs e recortar HUD
npm run maps     # regerar JSON dos mapas (Python)
npm run assets   # tilesets + pokémon
```

Estado do último download: `public/vendor/MANIFEST.json`

## 4. HUD já ligado no CSS

`app/globals.css` usa PNGs de `public/assets/ui/kenney/` em:

- `.gba-dialog`, `.hud-box`, `.battle-text` — molduras  
- `.hp-bar` — trilho Kenney  

Ajuste fino: edite só `globals.css` e nomes de arquivo na pasta `kenney/`.

## 5. Próximos passos visuais (checklist)

- [ ] Montar praça/fonte em `brisamar` com `oga-town-tiles.png` no Tiled (`scripts/build_maps.py` ou editor → export)  
- [ ] Laboratório: tiles `inner` + objetos `extra.png`  
- [ ] Batalha: plataformas em `BattleScene.ts` (já mexido pelo João) — alinhar com novo HUD  
- [ ] Opcional: 9-slice maior em `button_rectangle_depth_border.png`  

## 6. O que NÃO fazer

- História: não editar `game/story/chapter1.ts` sem ler [`PARA-HISTORIA.md`](PARA-HISTORIA.md)  
- Não subir packs Nintendo rip no Git público  
- Não trocar sprites Pokémon fora de `build_assets.py`  

## 7. Mapas

Fonte: `scripts/build_maps.py` → `public/assets/maps/*.json`  
NPC novo: função `m.npc("id", x, y, dir)` + entrada em `data/npcs.ts` + diálogo em `chapter1.ts`.