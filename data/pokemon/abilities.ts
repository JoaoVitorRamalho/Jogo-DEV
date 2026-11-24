import rawTraits from "@/data/pokemon/traits.json";

export type AbilityDef = { id: string; name: string; originalName: string; description: string };
export type AbilitySlot = { id: string; slot: number; hidden: boolean };
export type Gender = "male" | "female" | "genderless";
export const POKEMON_TRAITS: Record<string, { sourceId: number; sourceName: string; genderRate: number; abilities: AbilitySlot[] }> = rawTraits;

// Regras da geração VII: megas e a forma Ash coexistem nesta geração.
const entries: [string, string, string, string][] = [
  ["quick-feet", "Pés Rápidos", "Quick Feet", "Aumenta a Velocidade em 50% com um problema de estado e ignora a lentidão da paralisia."],
  ["rattled", "Medo", "Rattled", "Aumenta a Velocidade quando recebe um golpe de Inseto, Fantasma ou Sombrio."],
  ["moxie", "Autoconfiança", "Moxie", "Aumenta o Ataque ao nocautear um adversário com um golpe."],
  ["sniper", "Atirador", "Sniper", "Aumenta em 50% o dano dos próprios acertos críticos."],
  ["static", "Estática", "Static", "Golpes de contato recebidos têm 30% de chance de paralisar quem atacou."],
  ["lightning-rod", "Para-raios", "Lightning Rod", "Anula golpes Elétricos recebidos e aumenta o Ataque Especial."],
  ["overgrow", "Supercrescimento", "Overgrow", "Aumenta golpes de Planta em 50% com um terço dos PS ou menos."],
  ["blaze", "Chama", "Blaze", "Aumenta golpes de Fogo em 50% com um terço dos PS ou menos."],
  ["torrent", "Torrente", "Torrent", "Aumenta golpes de Água em 50% com um terço dos PS ou menos."],
  ["swarm", "Enxame", "Swarm", "Aumenta golpes de Inseto em 50% com um terço dos PS ou menos."],
  ["chlorophyll", "Clorofila", "Chlorophyll", "Dobra a Velocidade sob luz solar intensa."],
  ["speed-boost", "Impulso de Velocidade", "Speed Boost", "Aumenta a Velocidade ao fim de cada turno completo em campo."],
  ["protean", "Mutatipo", "Protean", "Muda o tipo do usuário para o tipo do golpe que vai usar."],
  ["shield-dust", "Pó de Escudo", "Shield Dust", "Bloqueia efeitos secundários dos golpes recebidos."],
  ["run-away", "Fuga", "Run Away", "Garante a fuga de Pokémon selvagens."],
  ["shed-skin", "Troca de Pele", "Shed Skin", "Tem um terço de chance de curar um problema de estado ao fim do turno."],
  ["compound-eyes", "Olhos Compostos", "Compound Eyes", "Aumenta a precisão dos golpes em 30%."],
  ["tinted-lens", "Lentes Coloridas", "Tinted Lens", "Dobra o dano de golpes pouco eficazes."],
  ["rivalry", "Rivalidade", "Rivalry", "Aumenta o dano contra o mesmo gênero e reduz contra o gênero oposto."],
  ["keen-eye", "Olhar Aguçado", "Keen Eye", "Impede quedas de Precisão e ignora aumentos de Evasão do adversário."],
  ["tangled-feet", "Pés Confusos", "Tangled Feet", "Dobra a Evasão enquanto está confuso."],
  ["big-pecks", "Peitoral Forte", "Big Pecks", "Impede que o adversário reduza sua Defesa."],
  ["intimidate", "Intimidação", "Intimidate", "Reduz o Ataque do adversário quando entra em campo."],
  ["reckless", "Imprudência", "Reckless", "Aumenta em 20% o poder dos golpes que causam recuo."],
  ["sand-veil", "Véu de Areia", "Sand Veil", "Aumenta a Evasão na tempestade de areia e impede o dano desse clima."],
  ["rough-skin", "Pele Áspera", "Rough Skin", "Causa dano a quem atinge o usuário com golpes de contato."],
  ["synchronize", "Sincronismo", "Synchronize", "Devolve envenenamento, queimadura ou paralisia ao adversário que os causou."],
  ["pressure", "Pressão", "Pressure", "Golpes dirigidos ao usuário gastam um PP extra."],
  ["telepathy", "Telepatia", "Telepathy", "Impede dano causado por aliados em batalhas em dupla."],
  ["solar-power", "Poder Solar", "Solar Power", "Aumenta o Ataque Especial em 50% no sol, mas perde PS ao fim do turno."],
  ["thick-fat", "Gordura Espessa", "Thick Fat", "Reduz pela metade o dano recebido de Fogo e Gelo."],
  ["tough-claws", "Garras Duras", "Tough Claws", "Aumenta em 30% o poder dos golpes de contato."],
  ["drought", "Seca", "Drought", "Invoca luz solar intensa por cinco turnos ao entrar em campo."],
  ["sand-force", "Força da Areia", "Sand Force", "Fortalece golpes de Terra, Pedra e Aço durante tempestades de areia."],
  ["battle-bond", "Laço de Batalha", "Battle Bond", "Fortalece Estrela Ninja na Forma Ash. A transformação é ativada manualmente pelo treinador."],
  ["simple", "Simplicidade", "Simple", "Dobra as mudanças de estágios dos próprios atributos."],
  ["unaware", "Desatenção", "Unaware", "Ignora estágios de atributos do adversário nos cálculos de dano e precisão."],
  ["moody", "Temperamental", "Moody", "Ao fim do turno, aumenta muito um atributo e reduz outro."],
  ["pickup", "Coleta", "Pickup", "Pode encontrar um item após a batalha, se não estiver segurando um."],
  ["volt-absorb", "Absorção Elétrica", "Volt Absorb", "Anula golpes Elétricos recebidos e recupera um quarto dos PS máximos."],
];

export const ABILITIES: Record<string, AbilityDef> = Object.fromEntries(entries.map(([id, name, originalName, description]) => [id, { id, name, originalName, description }]));

export function abilitySlots(speciesId: string): AbilitySlot[] {
  return POKEMON_TRAITS[speciesId]?.abilities ?? [];
}

export function abilityOf(mon: { species: string; battleForm?: string; abilitySlot?: number; battleBond?: boolean }): AbilityDef {
  if (mon.species === "greninja" && mon.battleBond && !mon.battleForm) return ABILITIES["battle-bond"];
  const slots = abilitySlots(mon.battleForm ?? mon.species);
  const slot = mon.battleForm ? slots[0] : slots.find((entry) => entry.slot === mon.abilitySlot) ?? slots[0];
  if (!slot || !ABILITIES[slot.id]) throw new Error(`Habilidade não cadastrada: ${mon.species}`);
  return ABILITIES[slot.id];
}

export function genderOf(mon: { species: string; uid?: string; gender?: Gender }): Gender {
  if (mon.gender) return mon.gender;
  const rate = POKEMON_TRAITS[mon.species]?.genderRate ?? -1;
  if (rate < 0) return "genderless";
  let hash = 0;
  for (const char of mon.uid ?? mon.species) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 8 < rate ? "female" : "male";
}
