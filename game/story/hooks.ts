export type StoryHooks = {
  npcVisible(id: string): boolean;
  talk(id: string): Promise<void>;
  sign(id: string): Promise<void>;
  event(id: string): Promise<boolean>;
  enterMap(key: string): Promise<void>;
  canWarp(from: string, to: string): Promise<boolean>;
  wild(mapKey: string): Promise<void>;
  /** Treinador que desafia quem passa na frente dele (linha de visão). */
  watcher?(npcId: string): boolean;
  /** O treinador viu o jogador: vem até ele e a batalha começa. */
  spotted?(npcId: string): Promise<void>;
};

export const story: { hooks: StoryHooks | null } = { hooks: null };
