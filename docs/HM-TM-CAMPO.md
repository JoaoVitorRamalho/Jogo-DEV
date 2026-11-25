# HM, TM e golpes de campo

> **Status (25/11/2026):** o motor está ligado. O Corte na moita da Rota 2 e o Voo pelo menu de
> pausa funcionam de ponta a ponta. Os outros obstáculos já estão no catálogo, mas por enquanto só
> mostram o texto. Nenhuma HM é entregue na história ainda: isso fica com o João.

## Regra de ouro

1. O jogador **ganha** a HM na história. Um save novo começa sem nenhuma.
2. Ele **ensina** o golpe a alguém do time: Mochila › bolso HMs › escolhe o Pokémon. A HM **não se
   gasta** e continua na mochila. Se o Pokémon já tem 4 golpes, ele escolhe qual esquecer.
3. Ele **usa** o golpe no mapa: olha para o obstáculo e aperta Z. Para isso precisa da HM na
   mochila **e** de alguém do time que saiba o golpe. Se faltar algo, a fala diz o quê.
4. **Voo:** com a HM02 e alguém do time que saiba Voo, Pausa › Voo abre o mapa da região. Só
   aparecem as cidades já visitadas (flag `fly_unlock_<cidade>`). Dentro de prédio não dá para voar.

## Onde está cada coisa

| Arquivo | O que faz |
|---|---|
| `data/field/hms.ts` | HM01–HM08: golpe de campo, golpe de batalha e ícone |
| `data/field/logic.ts` | Regras puras e testadas: tem a HM, quem do time sabe, pode ensinar, pode usar no obstáculo, pode abrir o Voo |
| `data/field/obstacles.ts` | Catálogo dos obstáculos (`FIELD_GATES`): id, mapa, tipo, flag `gate_<id>` e status `jogável` ou `rascunho` |
| `data/field/fly.ts` | Pousos (`FLY_LANDINGS`), posição no mapa (`FLY_PINS`), caminhos desenhados (`FLY_ROUTES`) e flags |
| `data/field/tms.ts` | Ícone de TM por tipo (TM com golpe fica para a fase 2) |
| `data/items.ts` | Itens `hm01`…`hm08` no bolso `hm`, que não servem em batalha |
| `data/pokemon/moves.ts` | Os 8 golpes de HM (Corte, Voo, Surfe, Força, Flash, Pedrada, Cascata, Mergulho) |
| `game/story/field.ts` | `giveHm(hm, quemDá)`: entrega uma vez só (flag `got_<hm>`) e explica como ensinar |
| `game/phaser/field.ts` | Põe o obstáculo no mapa, oferece o golpe e anima a saída |
| `game/phaser/scenes/WorldScene.ts` | Colisão do obstáculo, Z na frente dele e `fly_unlock_*` na entrada da cidade |
| `components/menus/BagPanel.tsx` | Bolso HMs e o fluxo de ensinar |
| `components/menus/FlyPanel.tsx` e `PauseMenu.tsx` | Mapa do Voo e a opção "Voo" da pausa, que só aparece com a HM02 |

## Arte original

`python3 scripts/build_field_tiles.py` desenha tudo do zero:

- `public/assets/tilesets/field_obstacles.png`: um quadro 16×16 por obstáculo (moita, rocha,
  pedregulho e os outros);
- `public/assets/ui/items/disc/hm01.png`…`hm08.png` e `tm_<tipo>.png`: discos 24×24.

Os ícones da PokeAPI (`public/assets/ui/items/hm/`, `tm/`, `hm_normal.png`, `tm_normal.png`) e o
`npm run field:assets` que os baixa ficam só na máquina de quem baixou. São arte da Nintendo e
**não vão para o repositório**. O jogo usa os discos acima.

## Como pôr um obstáculo novo

1. **Catálogo:** em `data/field/obstacles.ts`, confira o mapa e troque o status para `"jogável"`.
2. **Mapa:** em `scripts/build_maps.py`, no mapa certo, escreva
   `m.field("<id>", coluna, linha, "<tipo>", w=…, h=…)` em cima de casas **sólidas** (árvore,
   muro). Depois rode `python3 scripts/build_maps.py`.
3. **Teste:** `npm test` confere se o objeto existe no catálogo, se está no mapa certo e se tampa
   casas sólidas (`data/field/maps.test.ts`).

Hoje só `cut_bush` (moita) e `smash_rock` (rocha) têm animação. Força, Flash, Surfe, Cascata,
Mergulho e Névoa respondem `not_ready` e só mostram o texto do obstáculo.

## Onde entra cada HM na história (sugestão)

| HM | Golpe | Capítulo sugerido | Obstáculo de exemplo (`obstacles.ts`) |
|----|-------|-------------------|----------------------------------------|
| HM01 | Corte | c2 | `route2_bush_shortcut` (jogável) |
| HM06 | Pedrada | c2/c3 | `ferruria_rock_mart`, `echo_cave_smash_wall` |
| HM05 | Flash | c3 | `echo_cave_flash_room` |
| HM04 | Força | c3 | `route3_boulder_gap` |
| HM02 | Voo | c3+ (depois da 2ª cidade) | Pausa › Voo |
| HM03 | Surfe | c4 | `porto_surf_dock` |
| HM07 | Cascata | c7 | `cordilheira_waterfall` |
| HM08 | Mergulho | c8 | `floraviva_dive_lagoon` |

**JOÃO:** a hora de cada HM é sua. Chame `await giveHm("hm01", "Nádia")` na cena que quiser. Até
lá, ninguém consegue HM no jogo normal. A moita da Rota 2 guarda só um prêmio opcional (2 Doces
Raros), e o caminho principal não passa por ela.

## Voo

- Cada cidade com pouso entra no mapa na **primeira visita** a qualquer mapa dela: rua, Centro,
  ginásio ou casa. Quem liga a flag é a `WorldScene`, ao montar o mapa.
- O ponto de pouso fica em `FLY_LANDINGS`. O `maps.test.ts` confere se é uma casa livre, fora de
  porta, NPC e placa.
- Para uma cidade nova, acrescente o pouso em `FLY_LANDINGS` e a posição em `FLY_PINS` (de 0 a
  100). Quando a rota até ela existir, ponha o par em `FLY_ROUTES`.
- O Voo passa por `story.hooks.canWarp`, então uma cena pode barrar a viagem com uma fala.

## Checklist

- [x] Golpes de HM em `data/pokemon/moves.ts`, com nome e descrição em português
- [x] Ensinar pela Mochila, com a HM ficando na mochila
- [x] Tileset `field_obstacles` e camada `fields` nos mapas
- [x] Moita da Rota 2 com Corte (puzzle jogável) e prêmio atrás
- [x] Interação na `WorldScene`, com a colisão que some ao limpar
- [x] Mapa do Voo na pausa, viagem com fade e `fly_unlock_*` na primeira visita
- [ ] Entrega das HMs na história (João)
- [ ] Animação de Força (empurrar pedregulho), Flash, Surfe, Cascata, Mergulho e Névoa
- [ ] TMs com golpe (fase 2)

## Como testar

- `npm test`: a lógica está em `data/field/logic.test.ts` e os mapas em `data/field/maps.test.ts`.
- No jogo, abra com `?save=teste` (ou digite o código ↑ ↑ ↓ ↓ ← → ← → X Z no título). Esse save
  começa na entrada sul da Rota 2, com HM01, HM02 e o Voo de Brisamar e Ferrúria liberado. Ele só
  serve para teste: o save normal não ganha nada disso.
  1. Mochila › HMs › HM01 › Greninja. Depois HM02 › Charizard.
  2. Suba 2 casas e ande 2 para a direita: a moita fica na sua frente. Aperte Z e escolha Sim. No
     caminho, o Rui (treinador logo acima) pode chamar para a luta.
  3. Passe pela moita e pegue o item da clareira (2 Doces Raros).
  4. Pausa › Voo, escolha Ferrúria e aperte Z.
