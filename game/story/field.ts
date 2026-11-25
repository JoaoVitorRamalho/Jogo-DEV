import { HMS, type HmItemId } from "@/data/field/hms";
import { move } from "@/data/pokemon/moves";
import { say } from "@/game/core/ui";
import { giveOnce, line } from "@/game/story/actions";

/**
 * Entrega uma HM uma vez só (flag `got_<hm>`, por exemplo `got_hm01`) e explica como ensinar.
 *
 * JOÃO: a hora de cada HM é da história. Chame na cena que quiser, por exemplo na recompensa de
 * um personagem: `await giveHm("hm01", "Nádia")`. Sugestão de capítulo em docs/HM-TM-CAMPO.md.
 * A moita do começo da Rota 2 (route2_bush_shortcut) só sai com a HM01; o Voo pede a HM02.
 */
export async function giveHm(hm: HmItemId, from?: string): Promise<boolean> {
  const given = await giveOnce(`got_${hm}`, hm, 1, from);
  if (given) {
    const name = move(HMS[hm].battleMoveId).name;
    await say([line(from, `Abra a Mochila no bolso HMs e ensine ${name} a alguém do time. A HM não se gasta.`)]);
  }
  return given;
}
