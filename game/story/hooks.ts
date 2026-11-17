export type StoryHooks = {
  npcVisible(id: string): boolean;
  talk(id: string): Promise<void>;
  sign(id: string): Promise<void>;
  event(id: string): Promise<boolean>;
  enterMap(key: string): Promise<void>;
  canWarp(from: string, to: string): Promise<boolean>;
  wild(mapKey: string): Promise<void>;
};

export const story: { hooks: StoryHooks | null } = { hooks: null };
