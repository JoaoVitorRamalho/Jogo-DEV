"use client";

import { useState } from "react";
import { PartyList } from "@/components/menus/PartyPanel";
import { useMenu } from "@/components/menus/useMenu";
import { say, useUi } from "@/game/core/ui";
import { displayName } from "@/game/pokemon/mon";
import { depositMon, exchangeMon, withdrawMon, type StorageResult } from "@/game/pokemon/storage";
import { useGame, type GameState } from "@/game/state/store";

const PAGE_SIZE = 6;

export function PcPanel({ onClose }: { onClose: () => void }) {
  const live = useGame((state) => state.live);
  const [mode, setMode] = useState<"menu" | "box" | "deposit" | "swap">("menu");
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function transfer(run: (state: GameState) => StorageResult, message: string) {
    if (busy) return;
    const outcome = { result: "invalid" as StorageResult };
    useGame.getState().update((state) => { outcome.result = run(state); });
    if (outcome.result === "ok") {
      useUi.getState().showToast(message);
      setSelectedBox(null);
      setMode(mode === "deposit" ? "deposit" : "box");
    } else {
      const result = outcome.result;
      setBusy(true);
      await say(result === "last_mon" ? "Você precisa manter um Pokémon na equipe." : result === "last_healthy" ? "Mantenha pelo menos um Pokémon com energia na equipe." : result === "party_full" ? "A equipe está cheia. Escolha um Pokémon para trocar." : "Esse Pokémon não está mais disponível.");
      setBusy(false);
    }
  }

  const actions = ["Retirar ou trocar", "Depositar", "Sair"];
  function chooseAction(index: number) {
    if (index === 2) onClose();
    else setMode(index === 0 ? "box" : "deposit");
  }
  const mainMenu = useMenu({ count: actions.length, enabled: mode === "menu" && !busy, onSelect: chooseAction, onCancel: onClose });
  const boxMenu = useMenu({
    count: live?.box.length ?? 0, columns: 2, enabled: mode === "box" && !busy,
    onSelect: (index) => {
      const mon = live?.box[index];
      if (!mon) return;
      if (live.party.length >= 6) { setSelectedBox(mon.uid); setMode("swap"); }
      else void transfer((state) => withdrawMon(state, state.box.findIndex((entry) => entry.uid === mon.uid)), `${displayName(mon)} entrou na equipe.`);
    },
    onCancel: () => setMode("menu"),
  });
  const partyMenu = useMenu({
    count: live?.party.length ?? 0, columns: 2, enabled: (mode === "deposit" || mode === "swap") && !busy,
    onSelect: (index) => {
      const mon = live?.party[index];
      if (!mon) return;
      if (mode === "deposit") void transfer((state) => depositMon(state, state.party.findIndex((entry) => entry.uid === mon.uid)), `${displayName(mon)} foi enviado à Box.`);
      else void transfer((state) => exchangeMon(state, state.party.findIndex((entry) => entry.uid === mon.uid), state.box.findIndex((entry) => entry.uid === selectedBox)), "Os Pokémon foram trocados.");
    },
    onCancel: () => { setSelectedBox(null); setMode(mode === "swap" ? "box" : "menu"); },
  });
  if (!live) return null;
  const pageStart = Math.floor(boxMenu.index / PAGE_SIZE) * PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(live.box.length / PAGE_SIZE));
  const selected = live.box.find((mon) => mon.uid === selectedBox);
  return (
    <div className="gba-panel pc-panel">
      <h2>{mode === "swap" ? "Trocar por qual?" : mode === "deposit" ? "Depositar Pokémon" : "PC de Pokémon"}<small>{mode === "box" ? `${Math.floor(pageStart / PAGE_SIZE) + 1}/${pages}` : `${live.party.length}/6`}</small></h2>
      <p className="panel-sub">{mode === "swap" && selected ? `${displayName(selected)} vai entrar na equipe.` : `Equipe: ${live.party.length}/6 · Box: ${live.box.length}`}</p>
      {mode === "menu" ? (
        <div className="pc-actions">{actions.map((label, index) => <button key={label} type="button" className={mainMenu.index === index ? "active" : ""} onClick={() => chooseAction(index)}><span className="gba-cursor">{mainMenu.index === index ? "▶" : ""}</span>{label}</button>)}</div>
      ) : mode === "box" ? (
        live.box.length ? <PartyList party={live.box.slice(pageStart, pageStart + PAGE_SIZE)} index={boxMenu.index - pageStart} /> : <p>A Box está vazia.</p>
      ) : <PartyList party={live.party} index={partyMenu.index} />}
      <p className="panel-foot">{mode === "box" ? "Z retira/troca · X volta" : mode === "deposit" ? "Z deposita · X volta" : "Z escolhe · X volta"}</p>
    </div>
  );
}
