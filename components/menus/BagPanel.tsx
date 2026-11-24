"use client";

import { useState } from "react";
import { PartyList } from "@/components/menus/PartyPanel";
import { useMenu } from "@/components/menus/useMenu";
import { ITEMS, type ItemDef, type ItemId } from "@/data/items";
import { move } from "@/data/pokemon/moves";
import { ask, say, playEvolution } from "@/game/core/ui";
import { displayName, evolve, grantLevel, learnMove, maxHp, pendingEvolution } from "@/game/pokemon/mon";
import { markCaught, takeItem, useGame } from "@/game/state/store";
import { playSfx } from "@/lib/audio/engine";

const POCKETS: { id: ItemDef["pocket"]; label: string }[] = [
  { id: "medicine", label: "Remédios" },
  { id: "balls", label: "Pokébolas" },
  { id: "training", label: "Treino" },
  { id: "mega", label: "Pedras Mega" },
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

  async function forgetMove(uid: string, moveId: string): Promise<void> {
    const mon = useGame.getState().live?.party.find((entry) => entry.uid === uid);
    if (!mon) return;
    const name = displayName(mon);
    const moveName = move(moveId).name;
    await say(`${name} quer aprender ${moveName}.`);
    await say(`Mas ${name} já sabe quatro golpes.`);
    const forget = (await ask(["Sim", "Não"], { text: `Esquecer um golpe para aprender ${moveName}?` }, 1)) === 0;
    if (!forget) {
      await say(`${name} não aprendeu ${moveName}.`);
      return;
    }
    const options = [...mon.moves.map((slot) => move(slot.id).name), "Desistir"];
    const choice = await ask(options, { text: "Qual golpe esquecer?" }, options.length - 1);
    if (choice >= mon.moves.length) {
      await say(`${name} não aprendeu ${moveName}.`);
      return;
    }
    useGame.getState().update((state) => {
      const targetMon = state.party.find((entry) => entry.uid === uid);
      if (targetMon) learnMove(targetMon, moveId, choice);
    });
    await say(`${name} esqueceu ${options[choice]} e aprendeu ${moveName}!`);
  }

  async function applyTo(index: number) {
    if (!target || !live) return;
    const def = ITEMS[target];
    const mon = live.party[index];
    let message = "Não terá efeito.";
    if (target === "greninja_ash") {
      if (mon.species !== "greninja") message = "Este cristal só reage a Greninja.";
      else {
        useGame.getState().update((state) => { state.party[index].battleBond = true; });
        message = `${displayName(mon)} recebeu a habilidade Laço de Batalha!`;
      }
    } else if (def.candy) {
      if (mon.level >= 100) message = `${displayName(mon)} já está no nível máximo.`;
      else {
        const name = displayName(mon);
        const gained: { learned: string[]; pending: string[] } = { learned: [], pending: [] };
        useGame.getState().update((state) => {
          const targetMon = state.party[index];
          if (!targetMon || !takeItem(state, target)) return;
          const level = grantLevel(targetMon);
          if (!level) return;
          gained.learned = level.learned;
          gained.pending = level.pending;
        });
        const updated = useGame.getState().live?.party[index];
        if (!updated || updated.level === mon.level) message = "Não terá efeito.";
        else {
          playSfx("levelup");
          setTarget(null);
          await say(`${name} subiu para o nível ${updated.level}!`);
          for (const learned of gained.learned) await say(`${displayName(updated)} aprendeu ${move(learned).name}!`);
          for (const pending of gained.pending) await forgetMove(updated.uid, pending);
          const current = useGame.getState().live?.party.find((entry) => entry.uid === updated.uid);
          const into = current ? pendingEvolution(current) : null;
          if (current && into) {
            await playEvolution(current.species, into);
            let taught = { learned: [] as string[], pending: [] as string[] };
            useGame.getState().update((state) => {
              const next = state.party.find((entry) => entry.uid === current.uid);
              if (next) taught = evolve(next, into);
              markCaught(state, into);
            });
            const evolved = useGame.getState().live?.party.find((entry) => entry.uid === current.uid);
            if (evolved) for (const learned of taught.learned) await say(`${displayName(evolved)} aprendeu ${move(learned).name}!`);
            for (const pending of taught.pending) await forgetMove(current.uid, pending);
          }
          return;
        }
      }
    } else if (def.heal && mon.hp > 0 && mon.hp < maxHp(mon)) {
      const gained = Math.min(def.heal, maxHp(mon) - mon.hp);
      useGame.getState().update((state) => {
        const targetMon = state.party[index];
        if (!targetMon) return;
        if (!def.infinite && !takeItem(state, target)) return;
        targetMon.hp = Math.min(maxHp(targetMon), targetMon.hp + (def.heal ?? 0));
      });
      playSfx("heal");
      message = `${displayName(mon)} recuperou ${gained} PS.`;
    } else if (def.cures && mon.status && def.cures.includes(mon.status)) {
      useGame.getState().update((state) => {
        if (!def.infinite && !takeItem(state, target)) return;
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
  const targetMenu = useMenu({ count: live?.party.length ?? 0, columns: 2, enabled: target !== null, onSelect: applyTo, onCancel: () => setTarget(null) });
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
                <b>{ITEMS[item.id].infinite ? "∞" : `×${item.count}`}</b>
              </li>
            ))}
          </ul>
          <p className="item-desc">{selected ? ITEMS[selected.id].description : "Setas laterais trocam de bolso."}</p>
        </>
      )}
    </div>
  );
}
