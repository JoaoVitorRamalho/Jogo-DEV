# Progresso — Jornada (migração Phaser)

**Branch:** `migracao-phaser`  
**Backup:** commit `8fc9e14` em `main` (Three.js + capítulo antigo)  
**Data:** 2026-11-17

## Checklist (critérios da Fase 1–3)

| Critério | Status | Evidência |
|---|---|---|
| Jogo inicia no navegador | Feito | `http://localhost:3000` — título “Jornada — Região de Asteria” |
| Menu inicial | Feito | Novo jogo / Continuar / Opções |
| Personalização de personagem | Feito | Criador com pele, olhos, cabelo, roupa, calça/saia, sapatos, chapéu, acessório; prévia 16×32 |
| Mundo em Phaser | Feito | Cenas `boot`, `world`, `battle` |
| Tilesets / sprites coerentes | Feito | ArMM1998 + extras + compositor |
| Andar e correr | Feito | Setas/WASD + Shift |
| Colisões | Feito | Camada `collision` nos mapas Tiled |
| Câmera seguindo o jogador | Feito | `cameras.main.startFollow` |
| Casa acessível | Feito | Quarto → escada → sala → porta |
| Brisamar ambientada | Feito | Captura `p7-village.png` |
| Diálogo da mãe | Feito | Conversa completa com escolhas |
| Laboratório | Feito | Captura `p8-lab.png` |
| Escolha do inicial | Feito | Torchic / Bulbasaur / Froakie |
| Primeira batalha | Feito | Batalha com Ren (turno a turno) |
| Rota 1 | Feito | Warp norte após despedida |
| Salvar / carregar | Feito | Autosave + Continuar; migração do save antigo |
| TypeScript limpo | Feito | `npm run typecheck` |
| Testes automatizados | Feito | 24 testes Vitest (batalha, mon, save) |
| Three.js removido | Feito | Dependências e código de mundo Three/R3F removidos |
| Batalha selvagem (UI) | Feito | Encontro Wurmple: HUD, turnos, fuga; mundo retomado |

## Pendente / próximo

- Floresta de Aster e ginásio de Ferrúria (Capítulo 2).
- Afinamento visual da HUD de batalha e profundidade de NPCs vs móveis.
- Multiplayer: só arquitetura; **não** marcado como funcional.

## Como rodar

```bat
.tools\node-v22.23.5-win-x64\npm.cmd run assets
.tools\node-v22.23.5-win-x64\npm.cmd run maps
.tools\node-v22.23.5-win-x64\npm.cmd run test
.tools\node-v22.23.5-win-x64\npm.cmd run dev
```

## Scripts úteis

- `scripts/build_assets.py` — tiles extras e sprites de criaturas/itens  
- `scripts/build_maps.py` — mapas Tiled JSON + prévias  
- `npx vitest run` — regras de batalha e estado
