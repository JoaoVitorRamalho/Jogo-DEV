import { describe, expect, it } from "vitest";
import { ITEMS } from "@/data/items";
import { DEX_ORDER } from "@/data/pokemon/species";
import { defaultAppearance } from "@/game/character/appearance";
import { freshState } from "@/game/state/store";
import { COMPLETE_LEVEL, COMPLETE_MONEY, completeSave, testSave } from "@/game/state/testSave";

describe("completeSave", () => {
  it("enche a Pokédex, a caixa e a mochila sem mexer na história", () => {
    const base = testSave();
    const before = JSON.stringify(base);
    const done = completeSave(base);
    expect(JSON.stringify(base)).toBe(before);
    expect(new Set(done.dex.seen)).toEqual(new Set(DEX_ORDER));
    expect(new Set(done.dex.caught)).toEqual(new Set(DEX_ORDER));
    const owned = new Set([...done.party, ...done.box].map((mon) => mon.species));
    for (const id of DEX_ORDER) expect(owned.has(id), id).toBe(true);
    expect(done.party.map((mon) => mon.uid)).toEqual(base.party.map((mon) => mon.uid));
    expect(done.box.slice(0, base.box.length).map((mon) => mon.uid)).toEqual(base.box.map((mon) => mon.uid));
    expect({ map: done.map, x: done.x, y: done.y, flags: done.flags, badges: done.badges }).toEqual({ map: base.map, x: base.x, y: base.y, flags: base.flags, badges: base.badges });
    for (const def of Object.values(ITEMS)) expect(done.bag[def.id] ?? 0, def.id).toBeGreaterThan(0);
    expect(done.bag.potion).toBe(99);
    expect(done.bag.venusaurite).toBe(1);
    expect(done.money).toBe(COMPLETE_MONEY);
  });

  it("não duplica quem já tem e funciona num jogo do zero", () => {
    const fresh = freshState(defaultAppearance("female"));
    const done = completeSave(fresh);
    expect(done.box).toHaveLength(DEX_ORDER.length);
    expect(done.box.every((mon) => mon.level === COMPLETE_LEVEL)).toBe(true);
    const again = completeSave(done);
    expect(again.box).toHaveLength(DEX_ORDER.length);
  });
});
