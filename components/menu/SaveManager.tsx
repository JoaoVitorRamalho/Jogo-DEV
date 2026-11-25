"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { species } from "@/data/pokemon/species";
import { parseSaveFile, serializeSave } from "@/game/state/saveFiles";
import { useGame, type GameState } from "@/game/state/store";
import { useInputFrame } from "@/lib/input/engine";

function savedWhen(state: GameState): string {
  return state.savedAt ? new Date(state.savedAt).toLocaleString("pt-BR") : "Início da jornada";
}

function summary(state: GameState): string {
  return `${state.badges.length} insígnia(s) · ${state.party.map((mon) => `${species(mon.species).name} Nv. ${mon.level}`).join(", ") || "Sem Pokémon"}`;
}

function download(state: GameState) {
  const url = URL.createObjectURL(new Blob([serializeSave(state)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `jornada-${new Date(state.savedAt || Date.now()).toISOString().replace(/[:.]/g, "-")}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SaveManager({ onClose }: { onClose: () => void }) {
  const slot = useGame((state) => state.slot);
  const backups = useGame((state) => state.backups);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<GameState | null>(null);
  const [message, setMessage] = useState("");

  useInputFrame((frame) => { if (frame.pressed.cancel) onClose(); });

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPending(null);
    try {
      if (file.size > 2_000_000) throw new Error("O arquivo é grande demais para um save da Jornada.");
      setPending(parseSaveFile(await file.text()));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível abrir o arquivo.");
    }
  }

  function restore(state: GameState, reason: "import" | "restore") {
    try {
      useGame.getState().loadState(state, reason);
      setPending(null);
      setMessage("Save restaurado. Volte ao menu e escolha Continuar.");
    } catch {
      setMessage("Não foi possível gravar no navegador. Baixe uma cópia do save antes de tentar novamente.");
    }
  }

  return (
    <div className="ts-modal" role="dialog" aria-modal="true" aria-label="Saves e backups">
      <div className="ts-modal-card ts-saves-card">
        <p className="ts-modal-title">Saves e backups</p>
        <p>Antes de iniciar outro jogo ou carregar um mundo de testes, o save anterior fica guardado aqui. São mantidas até 10 cópias.</p>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={readFile} />
        <div className="ts-modal-actions">
          <button type="button" className="ts-modal-btn" onClick={() => fileInput.current?.click()}>Importar arquivo</button>
          {slot ? <button type="button" className="ts-modal-btn" onClick={() => download(slot)}>Baixar save atual</button> : null}
          <button type="button" className="ts-modal-btn" onClick={onClose}>Voltar</button>
        </div>
        {message ? <p className="ts-modal-note" role="status">{message}</p> : null}
        {pending ? (
          <section className="ts-save-copy" aria-label="Save para importar">
            <p><strong>{pending.appearance.name || "Viajante"}</strong> · {savedWhen(pending)}</p>
            <p>{summary(pending)}</p>
            <p>Seu save atual será preservado nos backups.</p>
            <div className="ts-modal-actions">
              <button type="button" className="ts-modal-btn" onClick={() => restore(pending, "import")}>Restaurar este save</button>
              <button type="button" className="ts-modal-btn" onClick={() => setPending(null)}>Cancelar importação</button>
            </div>
          </section>
        ) : null}
        <div className="ts-save-history" aria-label="Backups anteriores">
          {backups.length ? backups.map((backup) => (
            <section className="ts-save-copy" key={backup.id}>
              <p><strong>{backup.state.appearance.name || "Viajante"}</strong> · {savedWhen(backup.state)}</p>
              <p>{summary(backup.state)}</p>
              <div className="ts-modal-actions">
                <button type="button" className="ts-modal-btn" onClick={() => restore(backup.state, "restore")}>Restaurar backup</button>
                <button type="button" className="ts-modal-btn" onClick={() => download(backup.state)}>Baixar backup</button>
              </div>
            </section>
          )) : <p className="ts-modal-note">Ainda não há backups automáticos. Você também pode importar um arquivo recuperado.</p>}
        </div>
      </div>
    </div>
  );
}
