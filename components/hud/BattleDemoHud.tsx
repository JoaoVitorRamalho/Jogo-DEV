"use client";

import { HpBar } from "@/components/hud/MonSprite";
import { useUi } from "@/game/core/ui";

/** Caixas de PS da batalha encenada (demonstração do Gael). */
export function BattleDemoHud() {
  const demo = useUi((state) => state.demo);
  if (!demo) return null;
  const { foe, mine } = demo;
  return (
    <div className="battle-hud demo-hud">
      <span className="demo-tag">{demo.title}</span>
      {foe ? (
        <div className="hud-box foe">
          <div className="hud-name">
            <span>{foe.name}</span>
            <span>Nv{foe.level}</span>
          </div>
          <div className="hud-row">
            {foe.status ? <i className="status">{foe.status}</i> : null}
            <HpBar hp={foe.hp} max={foe.max} />
          </div>
        </div>
      ) : null}
      {mine ? (
        <div className="hud-box mine">
          <div className="hud-name">
            <span>{mine.name}</span>
            <span>Nv{mine.level}</span>
          </div>
          <div className="hud-row">
            <HpBar hp={mine.hp} max={mine.max} />
          </div>
          <div className="hud-hp">
            {mine.hp}/{mine.max}
          </div>
        </div>
      ) : null}
    </div>
  );
}
