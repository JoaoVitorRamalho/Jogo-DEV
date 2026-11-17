"use client";

import { useEffect } from "react";
import { playSfx } from "@/lib/audio/engine";
import { chooseStarter, strike } from "@/lib/story/chapter";
import { play } from "@/lib/story/control";
import { useScene } from "@/lib/story/scene";
import { STARTERS } from "@/lib/story/types";
import { MAPS } from "@/lib/story/world";
import { useSave } from "@/lib/save/store";

export function StoryHud() {
  const scene = useScene();
  const story = useSave((state) => state.slot?.story);
  const place = story ? MAPS[story.map].name : "Vila Brisamar";
  const partner = story?.starter ? STARTERS[story.starter].name : "";
  const open = scene.lines.length > 0 || scene.choice !== null || scene.battle !== null;
  play.locked = open;

  useEffect(() => {
    play.onFrame = (input) => {
      const current = useScene.getState();
      if (current.choice) {
        if (input.pressed.up) current.moveChoice(-1);
        if (input.pressed.down) current.moveChoice(1);
        if (input.pressed.confirm) {
          const option = current.choice.options[current.choice.index];
          if (option) {
            playSfx("confirm");
            chooseStarter(option.id);
          }
        }
        return;
      }
      if (current.lines.length > 0) {
        if (input.pressed.confirm || input.pressed.cancel) {
          playSfx("confirm");
          current.advance();
        }
        return;
      }
      if (current.battle && input.pressed.confirm) {
        playSfx("confirm");
        strike();
      }
    };
    return () => {
      play.onFrame = null;
      play.locked = false;
    };
  }, []);

  const line = scene.lines[scene.index];
  const starter = story?.starter ? STARTERS[story.starter] : null;
  const rival = scene.battle ? STARTERS[scene.battle.rivalId] : null;

  return (
    <>
      <div className="place-card">
        <strong>{place}</strong>
        {partner ? <span>{partner}</span> : null}
      </div>
      {scene.battle && starter && rival ? (
        <div className="battle">
          <Creature name={rival.name} tint={rival.tint} hp={scene.battle.rivalHp} />
          <Creature name={starter.name} tint={starter.tint} hp={scene.battle.playerHp} mine />
        </div>
      ) : null}
      {scene.choice ? (
        <div className="dialogue">
          <p>{scene.choice.title}</p>
          <div className="choices">
            {scene.choice.options.map((option, index) => (
              <button
                key={option.id}
                type="button"
                className={index === scene.choice?.index ? "choice active" : "choice"}
                onClick={() => {
                  playSfx("confirm");
                  chooseStarter(option.id);
                }}
              >
                {index === scene.choice?.index ? "▶ " : ""}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {line ? (
        <div className="dialogue">
          {line.speaker ? <strong>{line.speaker}</strong> : null}
          <p>{line.text}</p>
          <em>Z continua</em>
        </div>
      ) : null}
    </>
  );
}

function Creature({ name, tint, hp, mine }: { name: string; tint: string; hp: number; mine?: boolean }) {
  return (
    <div className={mine ? "mon mine" : "mon"}>
      <i style={{ background: tint }} />
      <div>
        <strong>{name}</strong>
        <span>
          <b style={{ width: `${Math.max(0, Math.min(100, (hp / 24) * 100))}%` }} />
        </span>
      </div>
    </div>
  );
}
