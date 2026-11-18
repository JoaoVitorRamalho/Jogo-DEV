"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { MonSprite } from "@/components/hud/MonSprite";
import { species } from "@/data/pokemon/species";
import { useUi } from "@/game/core/ui";
import { playSfx } from "@/lib/audio/engine";
import { useInputFrame } from "@/lib/input/engine";

type Phase = "glow" | "morph" | "flash" | "reveal";

/** Trocas de silhueta, cada vez mais rápidas (ms). Número par: termina na forma nova. */
const MORPH = [560, 480, 420, 360, 300, 250, 210, 170, 140, 115, 95, 80, 70, 60, 55, 50, 50, 50];
const SPARKS = 14;

export function EvolutionScene() {
  const request = useUi((state) => state.evolution);
  const [phase, setPhase] = useState<Phase>("glow");
  const [showNew, setShowNew] = useState(false);
  const [ready, setReady] = useState(false);
  const closing = useRef(false);

  useEffect(() => {
    if (!request) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    closing.current = false;
    setPhase("glow");
    setShowNew(false);
    setReady(false);
    playSfx("levelup");
    let t = 1300;
    at(t, () => setPhase("morph"));
    MORPH.forEach((ms, index) => {
      t += ms;
      at(t, () => setShowNew(index % 2 === 0));
    });
    t += 140;
    at(t, () => {
      setShowNew(true);
      setPhase("flash");
    });
    t += 520;
    at(t, () => {
      setPhase("reveal");
      playSfx("catch");
    });
    t += 900;
    at(t, () => setReady(true));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [request]);

  useInputFrame((frame) => {
    if (!request || !ready || closing.current) return;
    if (!frame.pressed.confirm && !frame.pressed.cancel) return;
    closing.current = true;
    playSfx("cursor");
    useUi.setState({ evolution: null });
    request.resolve();
  });

  if (!request) return null;
  const before = species(request.from).name;
  const after = species(request.to).name;
  const caption = phase === "reveal" ? `Parabéns! ${before} evoluiu para ${after}!` : `O quê? ${before} está evoluindo!`;

  return (
    <div className={`evo is-${phase}`} role="dialog" aria-label={caption}>
      <div className="evo-rays" />
      <div className="evo-ring" />
      <div className="evo-stage">
        <div className={showNew ? "evo-mon evo-new" : "evo-mon evo-old"}>
          <MonSprite id={showNew ? request.to : request.from} size={64} />
        </div>
      </div>
      <div className="evo-sparks" aria-hidden>
        {Array.from({ length: SPARKS }, (_, index) => (
          <i key={index} style={{ "--i": index, "--n": SPARKS } as CSSProperties} />
        ))}
      </div>
      <div className="evo-flash" />
      <div className="gba-dialog evo-caption">
        <p>{caption}</p>
        {ready ? <span className="gba-next">▼</span> : null}
      </div>
    </div>
  );
}
