"use client";

import { useEffect, useRef, useState } from "react";
import { useMenu } from "@/components/menus/useMenu";
import { CITIES } from "@/data/cities";
import { QUESTS, questProgress } from "@/data/quests";
import { TYPE_NAME } from "@/data/pokemon/types";
import { useGame } from "@/game/state/store";

export function QuestPanel({ onClose }: { onClose: () => void }) {
  const flags = useGame((state) => state.live?.flags ?? {});
  const [tab, setTab] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const chapter = flags.chapter2_complete ? 2 : flags.chapter1_complete ? 1 : 0;
  const quest = QUESTS[Math.min(chapter, QUESTS.length - 1)];
  const progress = questProgress(quest, flags);
  const menu = useMenu({
    count: tab === 0 ? quest.steps.length : 1,
    enabled: true,
    onCancel: onClose,
    onSelect: onClose,
    onLeft: () => setTab((value) => (value + 1) % 2),
    onRight: () => setTab((value) => (value + 1) % 2),
  });
  useEffect(() => {
    menu.setIndex(Math.min(progress.done, quest.steps.length - 1));
  }, [quest.id, progress.done, tab]);
  useEffect(() => {
    list.current?.querySelector(`[data-quest-index="${menu.index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [menu.index, tab]);

  return (
    <div className="gba-panel quest-panel">
      <h2>◀ {tab === 0 ? `Ato ${quest.act} — ${quest.title}` : "Região de Asteria"} ▶</h2>
      {tab === 0 ? (
        <ul className="quest-list" ref={list}>
          {quest.steps.map((step, index) => (
            <li key={step.flag} data-quest-index={index} aria-current={index === progress.done ? "step" : undefined} className={`${index < progress.done ? "done" : index === progress.done ? "current" : "todo"}${menu.index === index ? " selected" : ""}`}>
              {index < progress.done ? "✔" : index === progress.done ? "▶" : "·"} {index <= progress.done ? step.text : "???"}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="city-list">
          {CITIES.map((city) => (
            <li key={city.id} className={city.status === "jogável" ? "open" : ""}>
              <strong>{city.name}</strong>
              <span>{city.gym ? `Ginásio ${TYPE_NAME[city.gym.type]}` : city.order === 0 ? "Início" : "Liga"}</span>
              <em>{city.status}</em>
            </li>
          ))}
        </ul>
      )}
      <p className="panel-foot">{tab === 0 ? "↑ ↓ rola · " : ""}◀ ▶ páginas · X volta</p>
    </div>
  );
}
