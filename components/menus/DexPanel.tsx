"use client";

import { useState } from "react";
import { MonSprite } from "@/components/hud/MonSprite";
import { useMenu } from "@/components/menus/useMenu";
import { DEX_ORDER, dexEntries, species } from "@/data/pokemon/species";
import { megaFormsFor } from "@/data/pokemon/mega";
import { ABILITIES, abilitySlots } from "@/data/pokemon/abilities";
import { TYPE_COLOR, TYPE_NAME } from "@/data/pokemon/types";
import { useGame } from "@/game/state/store";

export function DexPanel({ onClose }: { onClose: () => void }) {
  const dex = useGame((state) => state.live?.dex ?? { seen: [], caught: [] });
  const entries = DEX_ORDER.filter((id) => dex.seen.includes(id));
  const [detail, setDetail] = useState(false);
  const menu = useMenu({ count: entries.length, enabled: !detail, onSelect: () => entries.length && setDetail(true), onCancel: onClose });
  useMenu({ count: 1, enabled: detail, onSelect: () => setDetail(false), onCancel: () => setDetail(false) });
  const current = entries[menu.index];
  const caught = current ? dex.caught.includes(current) : false;

  return (
    <div className="gba-panel dex-panel">
      <h2>
        Pokédex <small>Vistos {entries.length} · Capturados {dexEntries(dex.caught).length}</small>
      </h2>
      {detail && current ? (
        <div className="dex-detail">
          <MonSprite id={current} size={56} />
          <div>
            <strong>
              Nº {species(current).dex.toString().padStart(3, "0")} {species(current).name}
            </strong>
            <span>Pokémon {species(current).category}</span>
            <span className="types">
              {species(current).types.map((type) => (
                <b key={type} style={{ background: TYPE_COLOR[type] }}>
                  {TYPE_NAME[type]}
                </b>
              ))}
            </span>
            <p>{caught ? species(current).description : "Capture este Pokémon para registrar mais dados."}</p>
            {caught && megaFormsFor(current).length ? (
              <span className="dex-forms">
                {megaFormsFor(current).map((form) => (
                  <span key={form.id}>
                    <MonSprite id={form.id} size={20} />
                    {form.name}
                  </span>
                ))}
              </span>
            ) : null}
            {caught ? <small>Habilidades: {abilitySlots(current).map((slot) => `${ABILITIES[slot.id].name}${slot.hidden ? " (oculta)" : ""}`).join(" · ")}</small> : null}
          </div>
        </div>
      ) : (
        <div className="dex-split">
          <ul className="dex-list">
            {entries.length === 0 ? <li className="empty">Nenhum registro ainda.</li> : null}
            {entries.map((id, index) => (
              <li key={id} className={index === menu.index ? "active" : ""}>
                <span className="gba-cursor">{index === menu.index ? "▶" : ""}</span>
                <span className={dex.caught.includes(id) ? "caught" : "seen"}>●</span>
                {species(id).dex.toString().padStart(3, "0")} {species(id).name}
              </li>
            ))}
          </ul>
          <div className="dex-preview">{current ? <MonSprite id={current} size={48} /> : null}</div>
        </div>
      )}
    </div>
  );
}
