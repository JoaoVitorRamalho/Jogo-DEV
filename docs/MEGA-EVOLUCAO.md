# Mega Evolução — roteiro e técnica

Documentação para história, visual e programação. Mega **não persiste** fora da batalha (como nos jogos oficiais Gen 6+).

## IDs PokeAPI (sprites frente/costas)

| Chave no jogo | Forma | ID sprite |
|---------------|-------|-----------|
| `venusaur_mega` | Venusaur Mega | 10033 |
| `charizard_mega_x` | Charizard Mega X | 10034 |
| `charizard_mega_y` | Charizard Mega Y | 10035 |
| `blaziken_mega` | Blaziken Mega | 10051 |
| `garchomp_mega` | Garchomp Mega | 10089 |
| `greninja_ash` | Greninja Forma Ash | 10077 |

Sprites: `npm run setup` → `scripts/build_assets.py` (`MEGA_SPRITE_DEX`).

## Pedras (itens)

| ItemId | Nome | Base |
|--------|------|------|
| `venusaurite` | Venusaurita | Venusaur |
| `charizardite_x` | Charizardita X | Charizard |
| `charizardite_y` | Charizardita Y | Charizard |
| `blazikenite` | Blazikenita | Blaziken |
| `garchompite` | Garchompite | Garchomp |
| `greninja_ash` | Cristal Ash | Greninja (só evento) |

Catálogo: `data/pokemon/mega.ts`. Espécies mega entram em `SPECIES` via merge em `data/pokemon/species.ts`.

## Batalha

- Menu **Mega** aparece se o ativo pode mega evoluir e a pedra está na mochila.
- Um mega por Pokémon por batalha (`megaUsed` por `uid`).
- Troca de Pokémon **reverte** a mega no que saiu de campo.
- Ao terminar a batalha, `battleForm` é removido de toda a equipe.
- Cena: mesma `EvolutionScene` da evolução permanente + troca de textura Phaser (`sendOut`).

## Sugestões de história (depois)

1. **Ferrúria / Asteria** — NPC cientista explica pedras; primeira Venusaurita em quest tardia (não no Cap. 2).
2. **Charizard X vs Y** — rival escolhe uma pedra; jogador a outra (diálogo na forja).
3. **Garchomp Mega** — chefe de ginásio ou líder de equipe antagonista.
4. **Greninja Ash** — arc emocional com Gael/Froakie; **não** vender na loja; `greninja_ash` só via flag de quest.
5. Cutscene opcional: flash azul na pedra antes do menu Mega (só `playSfx` hoje; VFX extra no Phaser depois).

## Dev rápido

```bash
cd /home/value/sandbox/Jogo-DEV
npm run setup   # baixa sprites mega
npm test
```

Testar em batalha: colocar pedra no save/debug, espécie evoluída na equipe, escolher **Mega** no turno.