"use client";

import { create } from "zustand";

export type Screen = "title" | "options" | "creator" | "field";

type Session = {
  screen: Screen;
  setScreen: (screen: Screen) => void;
};

export const useSession = create<Session>((set) => ({
  screen: "title",
  setScreen: (screen) => set({ screen }),
}));
