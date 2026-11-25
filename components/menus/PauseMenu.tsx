"use client";

import { useState } from "react";
import { BagPanel } from "@/components/menus/BagPanel";
import { DexPanel } from "@/components/menus/DexPanel";
import { FlyPanel } from "@/components/menus/FlyPanel";
import { PartyPanel } from "@/components/menus/PartyPanel";
import { PcPanel } from "@/components/menus/PcPanel";
import { QuestPanel } from "@/components/menus/QuestPanel";
import { useMenu } from "@/components/menus/useMenu";
import { canOpenFlyMap, type FieldFail } from "@/data/field/logic";
import { OUTDOOR_MAPS } from "@/game/core/daytime";
import { ask, say, useUi } from "@/game/core/ui";
import { useGame } from "@/game/state/store";
import { dexEntries } from "@/data/pokemon/species";
import { useSession } from "@/lib/game/session";

type Entry = { id: string; label: string };

const FLY_FAIL: Partial<Record<FieldFail, string>> = {
  no_pokemon_move: "Ninguém do time sabe Voo. Ensine com a HM02: Mochila, bolso HMs.",
  no_fly_destinations: "Ainda não há cidade conhecida para voar.",
};

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export function PauseMenu() {
  const panel = useUi((state) => state.panel);
  const live = useGame((state) => state.live);
  const [busy, setBusy] = useState(false);
  const entries: Entry[] = [];
  if (live?.flags.got_pokedex) entries.push({ id: "dex", label: "Pokédex" });
  if (live && live.party.length > 0) entries.push({ id: "party", label: "Pokémon" });
  if (live && live.party.length > 0) entries.push({ id: "pc", label: "PC" });
  entries.push({ id: "bag", label: "Mochila" });
  if (live?.bag.hm02) entries.push({ id: "fly", label: "Voo" });
  entries.push({ id: "quests", label: "Diário" });
  entries.push({ id: "card", label: live?.appearance.name || "Treinador" });
  entries.push({ id: "save", label: "Salvar" });
  entries.push({ id: "options", label: "Opções" });
  entries.push({ id: "quit", label: "Sair" });

  const close = () => useUi.getState().setPanel(null);

  async function select(index: number) {
    const entry = entries[index];
    if (!entry || busy) return;
    if (entry.id === "save") {
      setBusy(true);
      const yes = (await ask(["Sim", "Não"], { text: "Salvar o progresso agora?" }, 1)) === 0;
      if (yes) {
        useGame.getState().save();
        useUi.getState().showToast("Progresso salvo");
      }
      setBusy(false);
      return;
    }
    if (entry.id === "fly") {
      const state = useGame.getState().live;
      if (!state) return;
      const check = canOpenFlyMap(state.flags, state.bag, state.party);
      const problem = !OUTDOOR_MAPS.has(state.map) ? "Aqui dentro não dá para voar." : check.ok ? null : (FLY_FAIL[check.code] ?? "Ainda não dá para voar.");
      if (!problem) {
        useUi.getState().setPanel("fly");
        return;
      }
      setBusy(true);
      await say(problem);
      setBusy(false);
      return;
    }
    if (entry.id === "quit") {
      setBusy(true);
      const yes = (await ask(["Sim", "Não"], { text: "Voltar ao título? O que não foi salvo será perdido." }, 1)) === 0;
      setBusy(false);
      if (yes) {
        useUi.setState({ panel: null, dialog: null, choice: null, battle: null });
        useGame.getState().quit();
        useSession.getState().setScreen("title");
      }
      return;
    }
    useUi.getState().setPanel(entry.id as never);
  }

  const menu = useMenu({ count: entries.length, enabled: panel === "pause" && !busy, onSelect: select, onCancel: close });

  if (!panel || !live) return null;
  if (panel === "party") return <PartyPanel onClose={() => useUi.getState().setPanel("pause")} />;
  if (panel === "pc") return <PcPanel onClose={close} />;
  if (panel === "bag") return <BagPanel onClose={() => useUi.getState().setPanel("pause")} />;
  if (panel === "dex") return <DexPanel onClose={() => useUi.getState().setPanel("pause")} />;
  if (panel === "quests") return <QuestPanel onClose={() => useUi.getState().setPanel("pause")} />;
  if (panel === "fly") return <FlyPanel onClose={() => useUi.getState().setPanel("pause")} />;
  if (panel === "card") return <TrainerCard onClose={() => useUi.getState().setPanel("pause")} />;
  if (panel !== "pause") return null;
  return (
    <div className="gba-window pause-menu">
      {entries.map((entry, index) => (
        <button key={entry.id} type="button" className={index === menu.index ? "active" : ""} onClick={() => select(index)}>
          <span className="gba-cursor">{index === menu.index ? "▶" : ""}</span>
          {entry.label}
        </button>
      ))}
    </div>
  );
}

function TrainerCard({ onClose }: { onClose: () => void }) {
  const live = useGame((state) => state.live);
  useMenu({ count: 1, enabled: true, onSelect: onClose, onCancel: onClose });
  if (!live) return null;
  return (
    <div className="gba-panel card-panel">
      <h2>Cartão de Treinador</h2>
      <dl>
        <dt>Nome</dt>
        <dd>{live.appearance.name || "Treinador"}</dd>
        <dt>Dinheiro</dt>
        <dd>₽{live.money}</dd>
        <dt>Pokédex</dt>
        <dd>
          {dexEntries(live.dex.caught).length} capturados · {dexEntries(live.dex.seen).length} vistos
        </dd>
        <dt>Insígnias</dt>
        <dd>{live.badges.length} / 8</dd>
        <dt>Tempo</dt>
        <dd>{formatTime(live.playTime)}</dd>
      </dl>
      <p className="panel-foot">X volta</p>
    </div>
  );
}
