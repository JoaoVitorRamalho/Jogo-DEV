"use client";

import { useState } from "react";
import { useMenu } from "@/components/menus/useMenu";
import { CITIES } from "@/data/cities";
import { QUESTS, questProgress } from "@/data/quests";
import { TYPE_NAME } from "@/data/pokemon/types";
import { useGame } from "@/game/state/store";

export function QuestPanel({ onClose }: { onClose: () => void }) {
  const flags = useGame((state) => state.live?.flags ?? {});
  const [tab, setTab] = useState(0);
  useMenu({
    count: 1,
    enabled: true,
    onCancel: onClose,
    onSelect: onClose,
    onLeft: () => setTab((value) => (value + 1) % 2),
    onRight: () => setTab((value) => (value + 1) % 2),
  });
  const quest = QUESTS[flags.chapter1_complete ? 1 : 0];
  const progress = questProgress(quest, flags);

  return (
    <div className="gba-panel quest-panel">
      <h2>◀ {tab === 0 ? `Ato ${quest.act} — ${quest.title}` : "Região de Asteria"} ▶</h2>
      {tab === 0 ? (
        <ul className="quest-list">
          {quest.steps.map((step, index) => (
            <li key={step.flag} className={index < progress.done ? "done" : index === progress.done ? "current" : "todo"}>
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
      <p className="panel-foot">◀ ▶ troca de página · X volta</p>
    </div>
  );
}
