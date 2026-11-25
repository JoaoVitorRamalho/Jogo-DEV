# GERO — Guia completo (Jornada / Região Asteria)

> **Comece em:** [`LEIA-ANTES.md`](LEIA-ANTES.md)  
> História → [`docs/PARA-HISTORIA.md`](docs/PARA-HISTORIA.md) · Visual → [`docs/PARA-VISUAL.md`](docs/PARA-VISUAL.md)

Projeto **fã**, uso privado entre amigos — **não comercial**, **não publicar**.  
Este arquivo consolida história, personagens, assets, comandos e o que falta refinar.

---

## 1. Pitch

RPG 2D no navegador (Next + Phaser). O jogador **não quer** ser treinador, mas a **mãe doente** e o **prêmio da Liga** empurram a jornada. A ilha **Asteria** mistura Pokémon de Kanto, Hoenn e Sinnoh; por trás: **distorções de espaço**, **Thomas Group** e **Giovanni + Giratina**.

---

## 2. Mapa da campanha

Fonte: `data/campaign.ts`, `data/cities.ts`.

| Ato | Título | Conteúdo |
|-----|--------|----------|
| 1 | A necessidade | Brisamar, inicial, Ren, Pokédex — **jogável** |
| 2 | Descoberta | Ferrúria, Verdelume (Thomas), Porto Coral, Oráculo |
| 3 | Segredos | Velária, Dracônia, Floraviva, Noctária (Thomas ↔ org.) |
| 4 | Legado de Red | Rival final, mãe revela avô, **Mew** |
| 5 | Liga + distorção | Elite Four, Campeão (filho Jessie/James), Thomas+Giovanni |

**8 ginásios:** inseto → lutador → voador → psíquico → fantasma → dragão → fada → sombrio.

**Presentes especiais:** inicial (lab), Gible lv25 (Dracônia, 5 insígnias), Mew lv50 (casa, 8 insígnias + rival final).

---

## 3. Personagens

Detalhes em `data/story/characters.ts`.

| Quem | Papel | Gancho narrativo |
|------|-------|------------------|
| {nome} | Protagonista | Batalha por necessidade, não por diversão |
| Mãe | Família | Tratamento em Oráculo; foto com boné vermelho |
| Profª Lira | Mentora | Anomalias de energia / observatório |
| Ren | Rival | Vizinho, herói barulhento, revanche na Rota 1 |
| Thomas Group | Antagonista (empresa) | Patrocina Liga; escala até crime organizado |
| Giovanni | Antagonista final | União com Giratina no Mundo Distorcido |
| NPCs de Brisamar | Coro | Davi (mar), Otávio (céu dobrado), Bia, Marta, Célia, Tico, Nuno |

**Equipe vilã (cânone confirmado):** a Equipe Rocket fingiu desaparecer e se reorganizou em
segredo. Thomas parecerá o chefe principal quando sua participação aparecer; Giovanni está
vivo e comanda por trás dele. No começo do capítulo 3 surgem recrutas de uniforme escuro,
uma marca vermelha incompleta e uma operação de extração. O nome Rocket, a ligação com
Thomas e a sobrevivência de Giovanni devem ser revelados aos poucos, sem exposição antecipada.

### Pistas já no Cap. 1 (após pacote Pandora)

- **PC do quarto:** patrocínio **Thomas Group** na página da Liga.
- **Foto:** após Pokédex, pensamento sobre o **boné vermelho** (`photo_hint_red`).
- **Ren na Rota 1:** NPC `ren_route1` — revanche opcional (`met_ren_route1`).
- **Bia / Seu Otávio:** reforçam mar estranho e observatório.

---

## 4. Assets — o que o jogo usa hoje

| Tipo | Origem | Script / pasta |
|------|--------|----------------|
| Pokémon (batalha) | [PokeAPI/sprites](https://github.com/PokeAPI/sprites) frente/costas | `scripts/build_assets.py` → `public/assets/sprites/pokemon/` |
| Mundo 16×16 | ArMM1998 Nature (CC0) + tiles `extra.png` | `scripts/build_assets.py`, `.tmp-art/` |
| Personagens | LPC Universal Generator | `scripts/download_assets.py` → `public/lpc/` |
| Música menu/town | CC0 (RPG chip) | `scripts/download_assets.py` → `public/music/` |
| Mapas | Tiled JSON | `public/assets/maps/`, `scripts/build_maps.py` |
| HUD | CSS `.gba-*` + fonte VT323 | `app/globals.css`, `components/hud/` |

### Packs opcionais em `public/vendor/`

Rodar `python scripts/fetch_vendor_assets.py`. Resultado em `public/vendor/MANIFEST.json`.

| Pack | Uso planejado |
|------|----------------|
| Kenney Tiny Dungeon | Referência telhados / dungeon até integrar no Tiled |
| OGA UI Pixel Adventure | Molduras HUD (9-slice futuro) |
| LPC Colonial (OGA) | Praça, casas, laboratório mais “cidade” |

**Se o download falhar (403):** baixar manualmente em [kenney.nl](https://kenney.nl/assets) e [opengameart.org](https://opengameart.org) e extrair em `public/vendor/<nome>/`. Ver `CREDITS.md`.

---

## 5. Comandos (instalar tudo)

```bash
cd Jogo-DEV
npm install
npm run setup    # music + assets + maps + vendor
npm run dev
```

Scripts individuais:

- `npm run music` — LPC (clona `.tmp-lpc` se faltar) + áudio  
- `npm run assets` — tilesets, itens, **sprites PokeAPI**  
- `npm run maps` — regera mapas se fonte mudar  
- `python scripts/fetch_vendor_assets.py` — vendor opcional  

---

## 6. Visual — roadmap (refinar depois)

### Cidade / overworld

1. Mesclar **LPC Colonial** com `overworld.png` nos mapas `brisamar`, `lab`, `neighbor`.  
2. Praia/cais: tiles `sign_beach` + paleta azul-verde.  
3. Fonte/praça: objeto tile ou camada `detail` com `extra.png`.

### HUD / batalha

1. Unificar borda diálogo = borda HP (`--window` em `globals.css`).  
2. Importar painéis de `public/vendor/oga-ui-pixel-adventure` como `background-image` 9-slice.  
3. Ícones de item: Kenney Game Icons ou manter `public/assets/ui/items/`.

### NPC

Aparências em `data/npcs.ts`. Ajustar cores LPC no `download_assets.py` se quiser skin única por NPC.

---

## 7. História — roadmap (código)

| Capítulo | Arquivo alvo | Status |
|----------|--------------|--------|
| 1 Brisamar | `game/story/chapter1.ts` | Jogável + foreshadow Thomas/Ren/foto |
| 2 Ferrúria | `game/story/chapter2.ts` | Jogável — floresta, ginásio Inseto e rival |
| 3 Ecos sob a Pedra | `game/story/chapter3.ts` | Abertura jogável — bosque, caverna, resgate e chegada a Verdelume; Campo/Dojo com falas provisórias |
| 4+ | `chapterN.ts` + `installChapterN` | Ver `data/campaign.ts` |

Quest log: `data/quests.ts` — acompanha as etapas dos capítulos 1–3.

---

## 8. Links úteis (repositórios)

- Sprites Pokémon: https://github.com/PokeAPI/sprites  
- LPC personagens: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator  
- Kenney (CC0): https://kenney.nl/assets — Tiny Town, UI Pack, Game Icons  
- 0x72 tilesets: https://github.com/0x72/2D-Dungeon-Pack  
- OpenGameArt LPC colonial / farming: https://opengameart.org  

---

## 9. Créditos e uso

Ver `CREDITS.md`. Asteria é fã fiction; nomes Pokémon / referências Nintendo são homenagem em ambiente **privado**.

---

*Última atualização: pacote IDE Value TI (pull + setup + foreshadow Cap. 1). Refinem juntos no Git depois.*
