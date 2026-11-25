"use client";

import { useState } from "react";
import { HpBar, MonSprite } from "@/components/hud/MonSprite";
import { MoveDetails } from "@/components/hud/MoveDetails";
import { useMenu } from "@/components/menus/useMenu";
import { STATUS_NAME, move } from "@/data/pokemon/moves";
import { species } from "@/data/pokemon/species";
import { abilityOf } from "@/data/pokemon/abilities";
import { ITEMS } from "@/data/items";
import { TYPE_COLOR, TYPE_NAME } from "@/data/pokemon/types";
import { ask, say } from "@/game/core/ui";
import { type Mon, displayName, expProgress, maxHp, statsOf } from "@/game/pokemon/mon";
import { giveItem, useGame } from "@/game/state/store";
import { useInputFrame } from "@/lib/input/engine";

export function PartyList({
  party,
  index,
  active,
  marked,
  onPick,
}: {
  party: Mon[];
  index: number;
  active?: number;
  marked?: number | null;
  onPick?: (index: number) => void;
}) {
  return (
    <ul className="party-list">
      {party.map((mon, i) => (
        <li key={mon.uid} className={[i === index ? "active" : "", i === marked ? "marked" : "", mon.hp <= 0 ? "fainted" : ""].join(" ")} onClick={onPick ? () => onPick(i) : undefined}>
          <MonSprite id={mon.species} size={24} />
          <div className="party-info">
            <strong>
              {displayName(mon)} {i === active ? <em>em campo</em> : null}
            </strong>
            <div className="party-meta">
              <span>Nv. {mon.level} {mon.status ? <i className="status">{STATUS_NAME[mon.status]}</i> : null}</span>
              <small>{mon.hp}/{maxHp(mon)}</small>
            </div>
            <HpBar hp={mon.hp} max={maxHp(mon)} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MonSummary({ mon }: { mon: Mon }) {
  const [tab, setTab] = useState<"stats" | "moves">("stats");
  const moves = useMenu({ count: mon.moves.length, enabled: tab === "moves", onLeft: () => setTab("stats") });
  useInputFrame((frame) => { if (frame.pressed.right) setTab("moves"); }, tab === "stats");
  const selected = mon.moves[moves.index];
  const def = species(mon.species);
  const ability = abilityOf(mon);
  const stats = statsOf(mon);
  return (
    <div className="mon-summary">
      <nav className="summary-tabs" aria-label="Abas do resumo">
        <button type="button" aria-pressed={tab === "stats"} onClick={() => setTab("stats")}>Dados</button>
        <button type="button" aria-pressed={tab === "moves"} onClick={() => setTab("moves")}>Golpes</button>
      </nav>
      {tab === "stats" ? <div className="summary-data">
      <div className="summary-top">
        <MonSprite id={mon.species} size={48} />
        <div>
          <strong>
            Nº {def.dex.toString().padStart(3, "0")} {displayName(mon)}
          </strong>
          <span>Nv. {mon.level}</span>
          <span title={ability.originalName}>Habilidade: {ability.name}</span>
          <small>{ability.description}</small>
          {mon.heldItem ? <small>Item: {ITEMS[mon.heldItem].name}</small> : null}
          <span className="types">
            {def.types.map((type) => (
              <b key={type} style={{ background: TYPE_COLOR[type] }}>
                {TYPE_NAME[type]}
              </b>
            ))}
          </span>
          <span className="exp-line">
            EXP <i style={{ width: `${expProgress(mon) * 100}%` }} />
          </span>
        </div>
      </div>
      <div className="summary-grid">
        <ul>
          <li>PS {mon.hp}/{stats.hp}</li>
          <li>Ataque {stats.atk}</li>
          <li>Defesa {stats.def}</li>
          <li>At. Esp. {stats.spa}</li>
          <li>Def. Esp. {stats.spd}</li>
          <li>Velocidade {stats.spe}</li>
        </ul>
        <ul>
          {mon.moves.map((slot) => {
            const def2 = move(slot.id);
            return (
              <li key={slot.id} className={slot === selected ? "summary-move selected" : "summary-move"}>
                <button type="button" onClick={() => { moves.setIndex(mon.moves.indexOf(slot)); setTab("moves"); }}>
                <b style={{ background: TYPE_COLOR[def2.type] }} className="type-dot" />
                {def2.name} <small>{slot.pp}/{def2.pp}</small>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      </div> : (
        <>
          <strong className="summary-move-heading">{displayName(mon)} · Nv. {mon.level}</strong>
          <div className="summary-move-view">
            <ul>
              {mon.moves.map((slot, index) => (
                <li key={slot.id} className={slot === selected ? "summary-move selected" : "summary-move"}>
                  <button type="button" onClick={() => moves.setIndex(index)} onMouseEnter={() => moves.setIndex(index)} onFocus={() => moves.setIndex(index)}>
                    <b className="type-dot" style={{ background: TYPE_COLOR[move(slot.id).type] }} />
                    {move(slot.id).name}
                  </button>
                </li>
              ))}
            </ul>
            {selected ? <MoveDetails definition={move(selected.id)} pp={selected.pp} /> : null}
          </div>
        </>
      )}
    </div>
  );
}

export function PartyPanel({ onClose }: { onClose: () => void }) {
  const party = useGame((state) => state.live?.party ?? []);
  const [summary, setSummary] = useState<number | null>(null);
  const [swapFrom, setSwapFrom] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function select(index: number) {
    if (swapFrom !== null) {
      useGame.getState().update((state) => {
        const list = state.party;
        [list[swapFrom], list[index]] = [list[index], list[swapFrom]];
      });
      setSwapFrom(null);
      return;
    }
    setBusy(true);
    const held = party[index].heldItem;
    const options = ["Resumo", "Mudar ordem", ...(held ? ["Retirar item"] : []), "Voltar"];
    const choice = await ask(options, { text: `O que fazer com ${displayName(party[index])}?` }, options.length - 1);
    setBusy(false);
    if (choice === 0) setSummary(index);
    if (choice === 1) setSwapFrom(index);
    if (choice === 2 && held) {
      useGame.getState().update((state) => {
        const item = state.party[index].heldItem;
        if (item) { giveItem(state, item, 1); delete state.party[index].heldItem; }
      });
      await say(`${ITEMS[held].name} foi guardado na mochila.`);
    }
  }

  const menu = useMenu({
    count: party.length,
    columns: 2,
    enabled: summary === null && !busy,
    onSelect: select,
    onCancel: () => (swapFrom !== null ? setSwapFrom(null) : onClose()),
  });
  useInputFrame((frame) => { if (frame.pressed.cancel || frame.pressed.menu) setSummary(null); }, summary !== null);

  return (
    <div className="gba-panel party-panel">
      <h2>{swapFrom !== null ? "Trocar com qual?" : "Pokémon"}</h2>
      {summary !== null && party[summary] ? <MonSummary mon={party[summary]} /> : <PartyList party={party} index={menu.index} marked={swapFrom} />}
      <p className="panel-foot">{summary !== null ? "←→ abas · ↑↓ golpes · X volta" : "Z escolhe · X volta"}</p>
    </div>
  );
}
