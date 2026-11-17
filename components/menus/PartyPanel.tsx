"use client";

import { useState } from "react";
import { HpBar, MonSprite } from "@/components/hud/MonSprite";
import { useMenu } from "@/components/menus/useMenu";
import { STATUS_NAME, move } from "@/data/pokemon/moves";
import { species } from "@/data/pokemon/species";
import { TYPE_COLOR, TYPE_NAME } from "@/data/pokemon/types";
import { ask } from "@/game/core/ui";
import { type Mon, displayName, expProgress, maxHp, statsOf } from "@/game/pokemon/mon";
import { useGame } from "@/game/state/store";

export function PartyList({
  party,
  index,
  active,
  marked,
}: {
  party: Mon[];
  index: number;
  active?: number;
  marked?: number | null;
}) {
  return (
    <ul className="party-list">
      {party.map((mon, i) => (
        <li key={mon.uid} className={[i === index ? "active" : "", i === marked ? "marked" : "", mon.hp <= 0 ? "fainted" : ""].join(" ")}>
          <MonSprite id={mon.species} size={24} />
          <div className="party-info">
            <strong>
              {displayName(mon)} {i === active ? <em>em campo</em> : null}
            </strong>
            <span>
              Nv. {mon.level} {mon.status ? <i className="status">{STATUS_NAME[mon.status]}</i> : null}
            </span>
            <HpBar hp={mon.hp} max={maxHp(mon)} />
            <small>
              {mon.hp}/{maxHp(mon)}
            </small>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MonSummary({ mon }: { mon: Mon }) {
  const def = species(mon.species);
  const stats = statsOf(mon);
  return (
    <div className="mon-summary">
      <div className="summary-top">
        <MonSprite id={mon.species} size={48} />
        <div>
          <strong>
            Nº {def.dex.toString().padStart(3, "0")} {displayName(mon)}
          </strong>
          <span>Nv. {mon.level}</span>
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
              <li key={slot.id}>
                <b style={{ background: TYPE_COLOR[def2.type] }} className="type-dot" />
                {def2.name} <small>{slot.pp}/{def2.pp}</small>
              </li>
            );
          })}
        </ul>
      </div>
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
    const choice = await ask(["Resumo", "Mudar ordem", "Voltar"], { text: `O que fazer com ${displayName(party[index])}?` }, 2);
    setBusy(false);
    if (choice === 0) setSummary(index);
    if (choice === 1) setSwapFrom(index);
  }

  const menu = useMenu({
    count: party.length,
    enabled: summary === null && !busy,
    onSelect: select,
    onCancel: () => (swapFrom !== null ? setSwapFrom(null) : onClose()),
  });
  useMenu({ count: 1, enabled: summary !== null, onSelect: () => setSummary(null), onCancel: () => setSummary(null) });

  return (
    <div className="gba-panel party-panel">
      <h2>{swapFrom !== null ? "Trocar com qual?" : "Pokémon"}</h2>
      {summary !== null && party[summary] ? <MonSummary mon={party[summary]} /> : <PartyList party={party} index={menu.index} marked={swapFrom} />}
      <p className="panel-foot">Z escolhe · X volta</p>
    </div>
  );
}
