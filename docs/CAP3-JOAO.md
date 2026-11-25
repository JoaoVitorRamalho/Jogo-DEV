# Capítulo 3 — Ecos sob a Pedra

A abertura já tem roteiro e sequência jogável: Ferrúria → bosque da Rota 2 → Bosque do Orvalho
(`echo_grove`) → Rota 3 → Galeria do Eco (`echo_cave`) → retorno a Nádia → Verdelume.
O Campo, o Dojo e o fechamento do capítulo continuam com falas provisórias.

Nádia, pesquisadora ligada a Celina, pede ajuda para recuperar Bidoof. Dois recrutas e um
encarregado protegem uma operação de extração. Depois das batalhas, o jogador desliga o painel,
liberta Bidoof e volta ao acampamento. Só então a estrada principal e o caminho para Verdelume
ficam liberados. Há cura no acampamento e retorno a ele em caso de derrota, depois de utilizá-lo.

**Cânone confirmado pelo João:** a Rocket fingiu desaparecer e se reorganizou. Thomas parecerá
o chefe quando sua participação for revelada; Giovanni está vivo e comanda nos bastidores.
Nesta abertura, os uniformizados ainda não dizem o nome da organização. A costura vermelha e
os caixotes são pistas; não confirmam a ligação de Thomas. Não antecipar Giovanni nos diálogos.

Procure **`JOÃO:`** no código: cada comentário marca um lugar para escrever.

## Como testar rápido

```bash
npm run dev        # abre em http://localhost:3000
```

Na tela de título, entre com `/?save=teste` e clique em **Carregar**. Depois, no console do
navegador (só funciona em dev):

```js
__game.getState().update((s) => { s.flags = { ...s.flags, chapter1_complete: true, chapter2_complete: true }; });
__world().warp("ferruria", 21, 4, "up");   // começo, perto dos operários
// outros pontos: __world().warp("verdelume", 21, 33, "up")  |  __world().warp("verdelume_gym", 7, 16, "up")
```

Para testar a abertura no save de teste, marque apenas `chapter2_complete: true` e fale com os
operários da saída norte de Ferrúria. Eles orientam a voltar pelo sul e procurar o guarda da
Rota 2. Não marque `ch3_arrived`: essa flag preserva a passagem de saves da versão anterior.

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
| `startOpening` | fim do cap. 2 ou falar com os operários | `ch3_started` |
| `groveGuard` | falar com o guarda na Rota 2 | `r2_grove_open` |
| `ch3Enter` | primeira vez no bosque | `ch3_grove_entered` |
| `ch3Enter` | primeira vez na Rota 3 | `r3_seen` |
| `researcher` | falar com Nádia no mirante leste | `ch3_cave_help`, `ch3_camp` ao aceitar cura |
| `caveFight` / `ch3Event` | aproximar-se ou falar com os recrutas | `beat_rocket_echo_1`, `beat_rocket_echo_2` |
| `caveFight` | enfrentar o encarregado | `beat_rocket_echo_lead` |
| `stopMachine` | usar o painel após vencer o encarregado | `ch3_machine_off` |
| `rescueBidoof` | falar com Bidoof no cercado aberto | `ch3_bidoof_safe` |
| `researcher` | voltar ao acampamento com Bidoof | `ch3_cave_rescued`, `ch3_road_open` |
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
- **HMs e Voo**: `await giveHm("hm01", "Nádia")` (de `game/story/field.ts`) entrega a HM uma vez
  só (flag `got_hm01`) e explica como ensinar. A HM01 abre a moita do começo da Rota 2, que guarda
  2 Doces Raros. A HM02 faz aparecer "Voo" na pausa. Cada cidade entra no mapa do Voo sozinha na
  primeira visita (`fly_unlock_verdelume`, por exemplo). Nenhuma HM é entregue ainda: a hora de
  cada uma é sua. Sugestão de capítulo e passo a passo em `docs/HM-TM-CAMPO.md`.

## Mudar alguém de lugar ou criar NPC novo

As posições ficam em `scripts/build_maps.py` (`build_route3`, `build_verdelume`,
`build_verdelume_gym` e os interiores). Combine com o visual antes de rodar `npm run maps`
(regra do `PARA-HISTORIA.md`).

- **NPC novo**: `m.npc("id", x, y, "down")` no mapa e `npm run maps`, entrada em `data/npcs.ts` e
  fala em `CH3_TALK`.
- **Trocar o id de um NPC**: troque nos três lugares (`build_maps.py`, `npcs.ts`, `CH3_TALK`).

O teste `game/story/chapter3.test.ts` reclama se um NPC ficar sem visual ou sem fala, se uma
placa ficar sem texto, se uma passagem ficar bloqueada ou se as cercas do Dojo deixarem de
fechar o caminho. `chapter3-opening.test.ts` verifica resgate, derrotas, cancelamento do painel,
recompensa única e compatibilidade do diário com saves antigos.

## Quando a história fechar

- [ ] Trocar as falas marcadas com `JOÃO:`
- [ ] Dar nome ao líder (`data/npcs.ts` e `data/trainers.ts`)
- [ ] Revisar os textos da missão `act2_verdelume`
- [ ] `status: "jogável"` em `data/campaign.ts` (`c3_verdelume`) e em `data/cities.ts` (verdelume)
- [ ] `npm test` e `npx tsc --noEmit -p .` antes do push
