import { describe, expect, it } from "vitest";
import { FLY_LANDINGS, flyDestinations, flyFlag, flyFlagForMap } from "@/data/field/fly";
import { HMS, type HmItemId } from "@/data/field/hms";
import {
  canLearnHm,
  canOpenFlyMap,
  canUseFieldOnGate,
  fieldUser,
  hmDefFromItem,
  hmItemForMove,
  isHm,
  listOwnedHms,
  ownsHm,
  partyKnowsFieldMove,
} from "@/data/field/logic";
import { FIELD_GATES, fieldGate, gatesForMap } from "@/data/field/obstacles";
import { ITEMS, canUseInBattle, type ItemId } from "@/data/items";
import { move } from "@/data/pokemon/moves";
import { seeded } from "@/game/core/rng";
import { createMon } from "@/game/pokemon/mon";

type Bag = Partial<Record<ItemId, number>>;

const bush = fieldGate("route2_bush_shortcut")!;

/** Pokémon com o golpe no último espaço, como depois de aprender pela HM. */
function withMove(species: string, moveId: string, seed = 1) {
  const mon = createMon(species, 30, seeded(seed));
  mon.moves = [...mon.moves.slice(0, 3), { id: moveId, pp: move(moveId).pp }];
  return mon;
}

describe("catálogo de HMs", () => {
  it("cada HM tem item no bolso HMs, golpe de batalha e não serve em batalha", () => {
    for (const hm of Object.values(HMS)) {
      expect(ITEMS[hm.id].pocket).toBe("hm");
      expect(move(hm.battleMoveId).name).toBeTruthy();
      expect(hmItemForMove(hm.fieldMove)).toBe(hm.id);
      expect(canUseInBattle(hm.id, "wild")).toBe(false);
    }
    expect(isHm("hm01")).toBe(true);
    expect(isHm("potion")).toBe(false);
    expect(hmDefFromItem("hm02")?.fieldMove).toBe("fly");
    expect(listOwnedHms({ hm04: 1, hm01: 1, potion: 3 })).toEqual(["hm01", "hm04"]);
  });

  it("obstáculos têm id e flag únicos, e a moita da Rota 2 é o puzzle jogável", () => {
    expect(new Set(FIELD_GATES.map((gate) => gate.id)).size).toBe(FIELD_GATES.length);
    expect(new Set(FIELD_GATES.map((gate) => gate.clearedFlag)).size).toBe(FIELD_GATES.length);
    expect(bush).toMatchObject({ map: "route2", kind: "cut_bush", status: "jogável" });
    expect(gatesForMap("route2")).toContain(bush);
  });
});

describe("usar golpe no obstáculo", () => {
  it("libera com a HM na mochila e alguém do time com o golpe", () => {
    const mon = withMove("torchic", "cut");
    const bag: Bag = { hm01: 1 };
    expect(ownsHm(bag, "cut")).toBe(true);
    expect(partyKnowsFieldMove([mon], "cut")).toBe(true);
    expect(canUseFieldOnGate(bush, {}, bag, [mon])).toEqual({ ok: true, user: mon });
  });

  it("explica o que falta: HM ou golpe no time", () => {
    const mon = createMon("froakie", 10, seeded(2));
    expect(canUseFieldOnGate(bush, {}, {}, [mon])).toEqual({ ok: false, code: "no_hm" });
    expect(canUseFieldOnGate(bush, {}, { hm01: 1 }, [mon])).toEqual({ ok: false, code: "no_pokemon_move" });
  });

  it("obstáculo já limpo não pede nada de novo", () => {
    expect(canUseFieldOnGate(bush, { [bush.clearedFlag]: true }, {}, [])).toEqual({ ok: false, code: "already_cleared" });
  });

  it("tipo de obstáculo ainda sem animação fica só no texto", () => {
    const boulder = FIELD_GATES.find((gate) => gate.kind === "push_boulder")!;
    const mon = withMove("bidoof", "strength");
    expect(canUseFieldOnGate(boulder, {}, { hm04: 1 }, [mon])).toEqual({ ok: false, code: "not_ready" });
  });

  it("quem usa é o primeiro que sabe, de preferência de pé", () => {
    const tired = withMove("torchic", "cut", 1);
    tired.hp = 0;
    const fresh = withMove("pidgey", "cut", 2);
    expect(fieldUser([tired, fresh], "cut")).toBe(fresh);
    expect(fieldUser([tired], "cut")).toBe(tired);
    expect(fieldUser([], "cut")).toBeNull();
  });
});

describe("ensinar HM", () => {
  it("Voo só para Voador; Surfe só para Água; Corte para qualquer um", () => {
    const charizard = createMon("charizard", 40, seeded(4));
    const greninja = createMon("greninja", 40, seeded(5));
    const froakie = createMon("froakie", 10, seeded(6));
    const cases: [ReturnType<typeof createMon>, HmItemId, string][] = [
      [charizard, "hm02", "ok"],
      [greninja, "hm02", "cant"],
      [froakie, "hm03", "ok"],
      [charizard, "hm03", "cant"],
      [greninja, "hm01", "ok"],
    ];
    for (const [mon, hm, expected] of cases) expect(canLearnHm(mon, hm)).toBe(expected);
  });

  it("não ensina de novo o que já sabe", () => {
    expect(canLearnHm(withMove("staraptor", "fly"), "hm02")).toBe("knows");
  });
});

describe("Voo", () => {
  it("cada cidade com pouso liga a flag em qualquer mapa dela", () => {
    expect(flyFlag("ferruria")).toBe("fly_unlock_ferruria");
    expect(flyFlagForMap("house_1f")).toBe("fly_unlock_brisamar");
    expect(flyFlagForMap("ferruria_center")).toBe("fly_unlock_ferruria");
    expect(flyFlagForMap("verdelume_gym")).toBe("fly_unlock_verdelume");
    expect(flyFlagForMap("route2")).toBeNull();
  });

  it("lista só cidades liberadas, na ordem da viagem e com o nome certo", () => {
    expect(flyDestinations({})).toEqual([]);
    const names = flyDestinations({ fly_unlock_verdelume: true, fly_unlock_brisamar: true, fly_unlock_porto_coral: true }).map((entry) => entry.name);
    expect(names).toEqual(["Vila Brisamar", "Verdelume"]);
    expect(FLY_LANDINGS.map((spot) => spot.cityId)).toEqual(["brisamar", "ferruria", "verdelume"]);
  });

  it("abrir o mapa pede HM02, Voo no time e uma cidade conhecida", () => {
    const flags = { fly_unlock_brisamar: true };
    const flyer = withMove("staraptor", "fly");
    expect(canOpenFlyMap(flags, {}, [flyer])).toEqual({ ok: false, code: "no_hm" });
    expect(canOpenFlyMap(flags, { hm02: 1 }, [createMon("froakie", 10, seeded(3))])).toEqual({ ok: false, code: "no_pokemon_move" });
    expect(canOpenFlyMap({}, { hm02: 1 }, [flyer])).toEqual({ ok: false, code: "no_fly_destinations" });
    expect(canOpenFlyMap(flags, { hm02: 1 }, [flyer])).toEqual({ ok: true, user: flyer });
  });
});
