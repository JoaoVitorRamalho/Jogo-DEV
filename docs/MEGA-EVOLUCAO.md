# Mega Evolução — roteiro e técnica

Documentação para história, visual e programação. Mega **não persiste** fora da batalha (como nos jogos oficiais Gen 6+).

## IDs PokeAPI (sprites frente/costas)

| Chave no jogo | Forma | ID sprite |
|---------------|-------|-----------|
| `venusaur_mega` | Venusaur Mega | 10033 |
| `charizard_mega_x` | Charizard Mega X | 10034 |
| `charizard_mega_y` | Charizard Mega Y | 10035 |
| `blaziken_mega` | Blaziken Mega | 10050 |
| `garchomp_mega` | Garchomp Mega | 10058 |
| `greninja_ash` | Greninja Forma Ash | 10117 |

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
- Escolher **Mega** prepara a transformação e abre a seleção de golpes. A ação enviada é um golpe com a pedra opcional; a transformação ocorre antes dos ataques, no mesmo turno. Voltar cancela a preparação sem consumir turno nem a ativação da equipe.
- Uma mega por equipe por batalha: qualquer entrada verdadeira em `megaUsed` bloqueia outra ativação.
- A mega permanece ao trocar de Pokémon; só reverte ao terminar a batalha.
- Ao terminar a batalha, `battleForm` e `battleTypes` são removidos de toda a equipe.
- Cena própria `BattleVisuals.transform`: energia, explosão e troca de textura no campo, sem Pokébola nem a cena de evolução permanente.
- Greninja Ash tem ativação manual por preferência do projeto: com o Cristal Ash na mochila, o menu exibe **Forma Ash**. Não se transforma automaticamente ao nocautear alguém. Usa a mesma explosão e o mesmo limite de uma ativação por equipe/batalha. Laço de Batalha mantém o efeito sobre Estrela Ninja na forma transformada.

## Habilidades

- Dados por espécie, forma e slot oculto: `data/pokemon/traits.json`, consultados na PokéAPI e atualizados por `scripts/sync_pokemon_traits.py`.
- Catálogo com nomes em português, nomes originais e descrições: `data/pokemon/abilities.ts`.
- Referência de regras: geração VII, para manter coerência entre megas e Greninja Ash. Telepatia é condicional a aliados, que não existem nas batalhas simples atuais.
- `abilitySlot` permanece ao evoluir. A habilidade muda automaticamente com a espécie ou mega. Saves antigos sem o campo usam o primeiro slot da espécie.
- Contato e recuo dos golpes: `data/pokemon/move-traits.json`, atualizados por `scripts/sync_move_traits.py`.
- Habilidades aparecem no resumo e na Pokédex. Coleta usa o catálogo de itens atual; o item encontrado fica segurado e pode ser retirado pelo menu da equipe.

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

Testar em batalha: colocar pedra no save/debug, espécie evoluída na equipe, escolher **Mega** e confirmar um golpe. O Pokémon transforma e ataca no mesmo turno. A mesma seleção vale para a opção manual **Forma Ash**.
