import { describe, expect, it } from "vitest";
import { TRAINERS, rollTrainerTeam } from "@/data/trainers";
import { SPECIES } from "@/data/pokemon/species";
import { createMon } from "@/game/pokemon/mon";

describe("equipes variadas dos treinadores", () => {
  it("oferece todas as novas espécies básicas em encontros garantidos", () => {
    const fixed = Object.values(TRAINERS).flatMap((trainer) => trainer.team.filter((member) => !member.alternatives?.length).map((member) => member.species));
    for (const id of ["pachirisu", "bidoof", "pidgey", "caterpie", "wurmple"]) expect(fixed).toContain(id);
  });

  it.each(Object.values(TRAINERS))("$name só usa Pokémon e golpes válidos, sem mudar o nível dos slots", (trainer) => {
    for (const roll of [0, 0.5, 0.999]) {
      const team = rollTrainerTeam(trainer, () => roll);
      expect(team).toHaveLength(trainer.team.length);
      team.forEach((member, index) => {
        expect(SPECIES[member.species]).toBeDefined();
        expect(member.level).toBe(trainer.team[index].level);
        expect(createMon(member.species, member.level, () => 0.5).moves.length).toBeGreaterThan(0);
      });
    }
  });

  it("sorteia equipes diferentes dentro do tema do treinador", () => {
    const trainer = TRAINERS.camper_luan;
    expect(rollTrainerTeam(trainer, () => 0).map((member) => member.species)).toEqual(["starly", "bidoof"]);
    expect(rollTrainerTeam(trainer, () => 0.999).map((member) => member.species)).toEqual(["pidgey", "pachirisu"]);
  });

  it("mantém o Pikachu de Gael na primeira luta após o ginásio em todo sorteio", () => {
    for (const roll of [0, 0.5, 0.999]) {
      const team = rollTrainerTeam(TRAINERS.rival_gael_1, () => roll);
      expect(team[0].species).toBe("pikachu");
      expect(createMon("pikachu", team[0].level, () => roll).moves.map((slot) => slot.id)).toContain("thunder_shock");
    }
  });
});
