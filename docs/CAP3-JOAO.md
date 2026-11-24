# Capítulo 3 (Rota 3 e Verdelume): o palco está pronto, falta a história

João, o capítulo 3 já dá para jogar do começo ao fim: mapas, NPCs, treinadores, mato alto, cura,
loja, as cercas do Dojo e a Insígnia Punho funcionam. Toda fala é **provisória**, curta e neutra,
só para o caminho existir. O seu trabalho é trocar texto e, se quiser, mudar a ordem das cenas.

Procure **`JOÃO:`** no código: cada comentário marca um lugar para escrever.

## Como testar rápido

```bash
npm run dev        # abre em http://localhost:3000
```

Na tela de título, entre com `/?save=teste` e clique em **Carregar**. Depois, no console do
navegador (só funciona em dev):

```js
__game.getState().update((s) => { s.flags = { ...s.flags, chapter1_complete: true, chapter2_complete: true }; });
__world().warp("route3", 17, 49, "up");   // começa na Rota 3
// outros pontos: __world().warp("verdelume", 21, 33, "up")  |  __world().warp("verdelume_gym", 7, 16, "up")
```

Para ver a abertura (os operários liberando a estrada), não pule: ande até a saída norte de Ferrúria.

## Onde escrever

| O quê | Onde |
|-------|------|
| Falas e cenas | `game/story/chapter3.ts` (a maioria está em `CH3_TALK`) |
| Placas | `CH3_SIGNS` em `chapter3.ts` |
| Quem aparece e quando | `CH3_VISIBLE` em `chapter3.ts` |
| Nomes e roupas | `data/npcs.ts`, bloco "capítulo 3" |
| Times, prêmio e falas de batalha | `data/trainers.ts`: `r3_nara`, `r3_bel`, `r3_teo`, `v_gym_igor`, `v_gym_ana`, `leader_verdelume` |
| Pokémon do mato da Rota 3 | `data/encounters.ts`, tabela `route3` (os pesos somam 100) |
| Missão no menu | `data/quests.ts`, missão `act2_verdelume` |
| Estoque da loja | função `shop()` em `chapter3.ts` (ids em `data/items.ts`) |

## As cenas, em ordem

| Cena (`chapter3.ts`) | Quando roda | Flag que liga |
|----------------------|-------------|---------------|
| `roadOpen` | falar com os operários da saída norte de Ferrúria, depois do cap. 2 | `ch3_started`, `ch3_road_open` |
| `ch3Enter` | primeira vez na Rota 3 | `r3_seen` |
| `thomasStand` | falar com a Promotora Thomas no posto da Rota 3 (dá 2 Poções uma vez) | `ch3_thomas_stand` |
| `arrival` | primeira vez em Verdelume | `ch3_arrived` |
| `coach` | falar com a Técnica Vera no Campo de treinamento | `ch3_field` |
| `nurse` | falar com a Enfermeira Lis (cura) | `ch3_center` |
| `shop` | falar com a Dona Lurdes (abre a loja) | nenhuma |
| `gymGate` | ao tentar entrar no Dojo (hoje sempre deixa) | nenhuma |
| `gymGuide` | falar com o guia na porta do Dojo | nenhuma |
| batalha | os faixas Igor e Ana te veem ou você fala com eles | `beat_v_gym_igor`, `beat_v_gym_ana` |
| `leader` | falar com o Líder do Dojo (Insígnia Punho e 2 Super Poções) | `beat_leader_verdelume` |
| `chapterEnd` | logo depois da vitória sobre o líder | `chapter3_complete` |

A missão `act2_verdelume` segue a mesma lista: cada passo some quando a flag dele liga.

## As peças que já funcionam

- **Treinador que te vê**: `game/story/watchers.ts` liga o NPC do mapa ao treinador. Depois de
  vencido, ele só repete a fala `after` de `data/trainers.ts`.
- **Cercas do Dojo**: `v_bar_1` some quando o Igor perde e `v_bar_2` quando a Ana perde (está em
  `CH3_VISIBLE`). Quer outra regra, como um quiz? Troque a flag ali.
- **Porta do Dojo**: `gymGate()` devolve `true` para deixar entrar. O comentário dela tem o exemplo
  de exigir o Campo antes.
- **Saída norte de Verdelume**: os vigias `v_gate_a` e `v_gate_b` tampam o caminho até o cap. 4.
  Para tirar, troque o `CH3_VISIBLE` deles por uma flag.
- **Gael em Verdelume** (`gael_verdelume`): está no mapa, mas escondido. Mostre com uma flag quando
  a cena dele existir.
- **Desmaio**: depois de falar com a Enfermeira de Verdelume (`ch3_center`), quem perde volta para o
  Centro de Verdelume.
- **Itens no chão**: `pickup(flag, item, quantidade)` em `CH3_TALK`; o item some depois de pego.

## Mudar alguém de lugar ou criar NPC novo

As posições ficam em `scripts/build_maps.py` (`build_route3`, `build_verdelume`,
`build_verdelume_gym` e os interiores). Combine com o visual antes de rodar `npm run maps`
(regra do `PARA-HISTORIA.md`).

- **NPC novo**: `m.npc("id", x, y, "down")` no mapa e `npm run maps`, entrada em `data/npcs.ts` e
  fala em `CH3_TALK`.
- **Trocar o id de um NPC**: troque nos três lugares (`build_maps.py`, `npcs.ts`, `CH3_TALK`).

O teste `game/story/chapter3.test.ts` reclama se um NPC ficar sem visual ou sem fala, se uma
placa ficar sem texto ou se as cercas do Dojo deixarem de fechar o caminho.

## Quando a história fechar

- [ ] Trocar as falas marcadas com `JOÃO:`
- [ ] Dar nome ao líder (`data/npcs.ts` e `data/trainers.ts`)
- [ ] Revisar os textos da missão `act2_verdelume`
- [ ] `status: "jogável"` em `data/campaign.ts` (`c3_verdelume`) e em `data/cities.ts` (verdelume)
- [ ] `npm test` e `npx tsc --noEmit -p .` antes do push
