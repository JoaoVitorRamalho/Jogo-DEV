# Guia da pessoa de HISTÓRIA (obrigatório)

Você escreve **roteiro, diálogos, flags e quests**. O **visual** já está encaminhado por outra pessoa — não remova assets sem combinar.

## 1. Leia nesta ordem

1. [`../GERO.md`](../GERO.md) — atos, cidades, spoilers planejados  
2. [`../data/campaign.ts`](../data/campaign.ts) — capítulos e beats  
3. [`../data/story/characters.ts`](../data/story/characters.ts) — voz dos personagens  

## 2. Onde editar

| O quê | Arquivo |
|-------|---------|
| Capítulo 1 (jogável) | `game/story/chapter1.ts` |
| Capítulo 2 | `game/story/chapter2.ts` (ligado pelos hooks de `chapter1.ts`) |
| Capítulo 3 (palco pronto, falta a história) | `game/story/chapter3.ts`, passo a passo em [`CAP3-JOAO.md`](CAP3-JOAO.md) |
| NPCs no mapa | Diálogo em `chapterN.ts`; aparência em `data/npcs.ts` |
| Placas / objetos | `SIGNS` e handler `sign` em `chapterN.ts` |
| Missão no menu | `data/quests.ts` |
| Novas cidades (texto) | `data/cities.ts` |

## 3. Flags (padrão)

- Snake_case: `talked_mother`, `met_ren_route1`, `reached_forest`  
- Cada passo da quest em `data/quests.ts` deve ter uma flag correspondente  
- Foreshadow já no jogo: `saw_thomas_ad`, `photo_hint_red`, `met_ren_route1` — **não apague** sem substituir  

## 4. O que NÃO fazer

- Não mudar `public/assets/` nem `app/globals.css` (visual)  
- Não rodar `build_maps.py` sem o time visual  
- Não commitar spoilers do ato 5 nos diálogos de Brisamar sem marcar `think()` / opcional  

## 5. Checklist por capítulo novo

1. Entrada em `data/campaign.ts` (`status: "jogável"` quando pronto)  
2. Hooks `StoryHooks` em `game/story/chapterN.ts`  
3. Mapas e warps (pedir ao visual ou seguir `docs/PARA-VISUAL.md`)  
4. `npm test` antes do push  

## 6. Dúvida de lore

Consulte `GERO.md` § 2–3. Thomas, Giovanni, Mew e Giratina já estão amarrados no final da campanha — estenda, não contradiga.

---

Quando terminar um capítulo: avise no chat e atualize `GERO.md` § 7 (status).