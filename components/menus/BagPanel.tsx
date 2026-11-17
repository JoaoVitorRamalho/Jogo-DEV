"use client";

import { useState } from "react";
import { PartyList } from "@/components/menus/PartyPanel";
import { useMenu } from "@/components/menus/useMenu";
import { ITEMS, type ItemDef, type ItemId } from "@/data/items";
import { say } from "@/game/core/ui";
import { displayName, maxHp } from "@/game/pokemon/mon";
import { takeItem, useGame } from "@/game/state/store";
import { playSfx } from "@/lib/audio/engine";

const POCKETS: { id: ItemDef["pocket"]; label: string }[] = [
  { id: "medicine", label: "Remédios" },
  { id: "balls", label: "Pokébolas" },
];

export function ItemIcon({ id }: { id: ItemId }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="pixel item-icon" src={`/assets/ui/items/${ITEMS[id].icon}.png`} alt="" />;
}

export function BagPanel({ onClose }: { onClose: () => void }) {
  const live = useGame((state) => state.live);
  const [pocket, setPocket] = useState(0);
  const [target, setTarget] = useState<ItemId | null>(null);
  const items = (Object.entries(live?.bag ?? {}) as [ItemId, number][])
    .filter(([id, count]) => count > 0 && ITEMS[id].pocket === POCKETS[pocket].id)
    .map(([id, count]) => ({ id, count }));

  async function use(id: ItemId) {
    const def = ITEMS[id];
    if (def.ball) {
      await say("Não dá para usar isso agora.");
      return;
    }
    if (!live?.party.length) {
      await say("Você não tem nenhum Pokémon.");
      return;
    }
    setTarget(id);
  }

  async function applyTo(index: number) {
    if (!target || !live) return;
    const def = ITEMS[target];
    const mon = live.party[index];
    let message = "Não terá efeito.";
    if (def.heal && mon.hp > 0 && mon.hp < maxHp(mon)) {
      const gained = Math.min(def.heal, maxHp(mon) - mon.hp);
      useGame.getState().update((state) => {
        if (!takeItem(state, target)) return;
        state.party[index].hp += gained;
      });
      playSfx("heal");
      message = `${displayName(mon)} recuperou ${gained} PS.`;
    } else if (def.cures && mon.status && def.cures.includes(mon.status)) {
      useGame.getState().update((state) => {
        if (!takeItem(state, target)) return;
        state.party[index].status = null;
        state.party[index].sleepTurns = 0;
      });
      playSfx("heal");
      message = `${displayName(mon)} se recuperou.`;
    }
    setTarget(null);
    await say(message);
  }

  const list = useMenu({
    count: items.length,
    enabled: target === null,
    onSelect: (index) => items[index] && use(items[index].id),
    onCancel: onClose,
    onLeft: () => setPocket((value) => (value + POCKETS.length - 1) % POCKETS.length),
    onRight: () => setPocket((value) => (value + 1) % POCKETS.length),
  });
  const targetMenu = useMenu({ count: live?.party.length ?? 0, enabled: target !== null, onSelect: applyTo, onCancel: () => setTarget(null) });
  const selected = items[list.index];

  return (
    <div className="gba-panel bag-panel">
      <h2>
        ◀ {POCKETS[pocket].label} ▶ <small>₽{live?.money ?? 0}</small>
      </h2>
      {target !== null && live ? (
        <>
          <p className="panel-sub">Usar {ITEMS[target].name} em qual Pokémon?</p>
          <PartyList party={live.party} index={targetMenu.index} />
        </>
      ) : (
        <>
          <ul className="item-list">
            {items.length === 0 ? <li className="empty">Bolso vazio.</li> : null}
            {items.map((item, index) => (
              <li key={item.id} className={index === list.index ? "active" : ""}>
                <span className="gba-cursor">{index === list.index ? "▶" : ""}</span>
                <ItemIcon id={item.id} />
                {ITEMS[item.id].name}
                <b>×{item.count}</b>
              </li>
            ))}
          </ul>
          <p className="item-desc">{selected ? ITEMS[selected.id].description : "Setas laterais trocam de bolso."}</p>
        </>
      )}
    </div>
  );
}
