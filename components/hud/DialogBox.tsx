"use client";

import { useTypewriter } from "@/components/hud/useTypewriter";
import { useUi } from "@/game/core/ui";
import { playSfx } from "@/lib/audio/engine";
import { useInputFrame } from "@/lib/input/engine";

export function DialogBox() {
  const dialog = useUi((state) => state.dialog);
  const choice = useUi((state) => state.choice);
  const line = dialog ? dialog.lines[dialog.index] : null;
  const typer = useTypewriter(line?.text ?? "");

  useInputFrame(
    (frame) => {
      if (!dialog || useUi.getState().choice) return;
      typer.setFast(frame.held.cancel);
      if (!frame.pressed.confirm && !frame.pressed.cancel) return;
      if (!typer.done) {
        if (frame.pressed.confirm) typer.finish();
        return;
      }
      playSfx("cursor");
      const current = useUi.getState().dialog;
      if (!current) return;
      if (current.index < current.lines.length - 1) {
        useUi.setState({ dialog: { ...current, index: current.index + 1 } });
      } else {
        useUi.setState({ dialog: null, lastLine: current.lines[current.index] });
        current.resolve();
        window.setTimeout(() => {
          const ui = useUi.getState();
          if (!ui.choice && !ui.dialog) useUi.setState({ lastLine: null });
        }, 0);
      }
    },
    Boolean(dialog),
  );

  if (!dialog || !line) return null;
  return (
    <div className={choice ? "gba-dialog dim" : "gba-dialog"}>
      {line.speaker ? <div className="gba-speaker">{line.speaker}</div> : null}
      <p>
        {typer.shown}
        {typer.done ? <span className="gba-next">▼</span> : null}
      </p>
    </div>
  );
}

export function ChoiceBox() {
  const choice = useUi((state) => state.choice);

  useInputFrame(
    (frame) => {
      const current = useUi.getState().choice;
      if (!current) return;
      const count = current.options.length;
      if (frame.pressed.up) {
        playSfx("cursor");
        useUi.setState({ choice: { ...current, index: (current.index + count - 1) % count } });
      }
      if (frame.pressed.down) {
        playSfx("cursor");
        useUi.setState({ choice: { ...current, index: (current.index + 1) % count } });
      }
      if (frame.pressed.confirm) {
        playSfx("confirm");
        useUi.setState({ choice: null });
        current.resolve(current.index);
      }
      if (frame.pressed.cancel && current.cancel !== null) {
        playSfx("cancel");
        useUi.setState({ choice: null });
        current.resolve(current.cancel);
      }
    },
    Boolean(choice),
  );

  if (!choice) return null;
  return (
    <>
      {choice.prompt ? (
        <div className="gba-dialog">
          {choice.prompt.speaker ? <div className="gba-speaker">{choice.prompt.speaker}</div> : null}
          <p>{choice.prompt.text}</p>
        </div>
      ) : null}
      {choice.preview ? (
        <div className="starter-preview">
          <img className="pixel" src={`/assets/sprites/pokemon/${choice.preview}.png`} alt="" />
        </div>
      ) : null}
      <div className={choice.prompt ? "gba-choice raised" : "gba-choice"}>
        {choice.options.map((option, index) => (
          <button
            key={option}
            type="button"
            className={index === choice.index ? "active" : ""}
            onClick={() => {
              useUi.setState({ choice: null });
              choice.resolve(index);
            }}
          >
            <span className="gba-cursor">{index === choice.index ? "▶" : ""}</span>
            {option}
          </button>
        ))}
      </div>
    </>
  );
}

export function ToastAndHint() {
  const toast = useUi((state) => state.toast);
  const hint = useUi((state) => state.hint);
  const dialog = useUi((state) => state.dialog);
  return (
    <>
      {toast ? <div className="gba-toast">{toast}</div> : null}
      {hint && !dialog ? <div className="gba-hint">{hint}</div> : null}
    </>
  );
}
