"use client";

import { useEffect, useRef, useState } from "react";
import { HpBar } from "@/components/hud/MonSprite";
import { useTypewriter } from "@/components/hud/useTypewriter";
import { ItemIcon } from "@/components/menus/BagPanel";
import { PartyList } from "@/components/menus/PartyPanel";
import { useMenu } from "@/components/menus/useMenu";
import { ITEMS, type ItemId } from "@/data/items";
import { STATUS_NAME, type StatusId, move } from "@/data/pokemon/moves";
import { species } from "@/data/pokemon/species";
import { TYPE_COLOR, TYPE_NAME } from "@/data/pokemon/types";
import { type Action, type BattleEvent, type BattleState, type Outcome, type Side, activeOf, runTurn, startBattle } from "@/game/battle/engine";
import { defaultRng } from "@/game/core/rng";
import { type BattleRequest, ask, useUi } from "@/game/core/ui";
import type { BattleVisuals } from "@/game/phaser/bridge";
import { type Mon, displayName, evolve, expProgress, learnMove, maxHp, pendingEvolution } from "@/game/pokemon/mon";
import { addMon, markCaught, useGame } from "@/game/state/store";
import { getContextTrack, playSfx, setContextTrack } from "@/lib/audio/engine";
import { useInputFrame } from "@/lib/input/engine";

type Hud = { name: string; level: number; hp: number; max: number; status: StatusId | null; exp: number };
type Mode = "busy" | "action" | "moves" | "bag" | "target" | "party";

const ACTIONS = ["Lutar", "Mochila", "Pokémon", "Fugir"];
const STATUS_TINT: Record<StatusId, number> = { burn: 0xff6030, poison: 0xa040c0, paralysis: 0xf0d030, sleep: 0x8080a0, freeze: 0x80d0ff };

function hudOf(mon: Mon): Hud {
  return { name: displayName(mon), level: mon.level, hp: mon.hp, max: maxHp(mon), status: mon.status, exp: expProgress(mon) };
}

function hexToInt(color: string): number {
  return Number.parseInt(color.replace("#", ""), 16);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function BattleScreen() {
  const request = useUi((state) => state.battle);
  if (!request) return null;
  return <BattleRun request={request} />;
}

function BattleRun({ request }: { request: BattleRequest }) {
  const stateRef = useRef<BattleState | null>(null);
  const prevRef = useRef<BattleState | null>(null);
  const visualsRef = useRef<BattleVisuals | null>(null);
  const leveled = useRef(new Set<string>());
  const started = useRef(false);
  const [foe, setFoe] = useState<Hud | null>(null);
  const [mine, setMine] = useState<Hud | null>(null);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<Mode>("busy");
  const [forced, setForced] = useState(false);
  const [pendingItem, setPendingItem] = useState<ItemId | null>(null);
  const [, force] = useState(0);
  const typer = useTypewriter(message, 60);
  const typedRef = useRef(false);
  const messageGen = useRef(0);
  typedRef.current = typer.done;
  const advanceRef = useRef<(() => void) | null>(null);

  useInputFrame((frame) => {
    const ui = useUi.getState();
    if (ui.dialog || ui.choice) return;
    typer.setFast(frame.held.cancel);
    if (mode === "busy" && (frame.pressed.confirm || frame.pressed.cancel)) advanceRef.current?.();
  });

  function show(text: string): Promise<void> {
    return new Promise((resolve) => {
      const gen = ++messageGen.current;
      typedRef.current = false;
      setMessage(text);
      let timer = 0;
      let settled = false;
      const done = () => {
        if (settled || messageGen.current !== gen) return;
        settled = true;
        window.clearTimeout(timer);
        advanceRef.current = null;
        resolve();
      };
      advanceRef.current = () => {
        if (messageGen.current !== gen) return;
        if (typedRef.current) done();
        else typer.finish();
      };
      const poll = () => {
        if (messageGen.current !== gen) return;
        if (typedRef.current && text.length > 0) timer = window.setTimeout(done, 850);
        else timer = window.setTimeout(poll, 40);
      };
      // Wait one frame so the typewriter effect resets before polling "done".
      timer = window.setTimeout(poll, 80);
    });
  }

  function setHud(side: Side, hud: Hud | null) {
    if (side === "foe") setFoe(hud);
    else setMine(hud);
  }

  function patchHud(side: Side, patch: Partial<Hud>) {
    const apply = (hud: Hud | null) => (hud ? { ...hud, ...patch } : hud);
    if (side === "foe") setFoe(apply);
    else setMine(apply);
  }

  async function learnFlow(uid: string, moveId: string) {
    const st = stateRef.current;
    const mon = st?.player.party.find((entry) => entry.uid === uid);
    if (!mon) return;
    const name = displayName(mon);
    const moveName = move(moveId).name;
    await show(`${name} quer aprender ${moveName}.`);
    await show(`Mas ${name} já sabe quatro golpes.`);
    const forget = (await ask(["Sim", "Não"], { text: `Esquecer um golpe para aprender ${moveName}?` }, 1)) === 0;
    if (forget) {
      const options = [...mon.moves.map((slot) => move(slot.id).name), "Desistir"];
      const index = await ask(options, { text: "Qual golpe esquecer?" }, options.length - 1);
      if (index < mon.moves.length) {
        const old = move(mon.moves[index].id).name;
        learnMove(mon, moveId, index);
        await show(`1, 2 e... Pronto! ${name} esqueceu ${old} e aprendeu ${moveName}!`);
        return;
      }
    }
    await show(`${name} não aprendeu ${moveName}.`);
  }

  async function play(events: BattleEvent[]) {
    for (const event of events) {
      const st = stateRef.current;
      if (!st) return;
      const v = visualsRef.current;
      switch (event.type) {
        case "message":
          await show(event.text);
          break;
        case "sendOut": {
          const source = (prevRef.current ?? st)[event.side].party[event.index] ?? st[event.side].party[event.index];
          const mon = st[event.side].party[event.index];
          setHud(event.side, { ...hudOf(mon), hp: source.hp, status: source.status });
          await v?.sendOut(event.side, species(mon.species).sprite);
          break;
        }
        case "withdraw":
          await v?.withdraw(event.side);
          setHud(event.side, null);
          break;
        case "move": {
          const def = move(event.moveId);
          await v?.attack(event.side, hexToInt(TYPE_COLOR[def.type]), def.category);
          break;
        }
        case "damage":
          playSfx(event.effectiveness > 1 ? "super" : event.effectiveness < 1 ? "weak" : "hit");
          patchHud(event.side, { hp: event.hp, max: event.max });
          await v?.hit(event.side, event.effectiveness > 1 || event.crit);
          await sleep(200);
          break;
        case "heal":
          playSfx("heal");
          patchHud(event.side, { hp: event.hp, max: event.max });
          await sleep(350);
          break;
        case "status":
          patchHud(event.side, { status: event.status });
          if (event.status) await v?.status(event.side, STATUS_TINT[event.status]);
          break;
        case "stage":
          playSfx(event.stages > 0 ? "levelup" : "weak");
          break;
        case "faint":
          playSfx("faint");
          await v?.faint(event.side);
          setHud(event.side, null);
          break;
        case "exp": {
          const mon = st.player.party.find((entry) => entry.uid === event.uid);
          if (mon && activeOf(st, "player").uid === event.uid) patchHud("player", { exp: expProgress(mon) });
          await sleep(300);
          break;
        }
        case "levelUp": {
          leveled.current.add(event.uid);
          playSfx("levelup");
          const mon = st.player.party.find((entry) => entry.uid === event.uid);
          if (mon && activeOf(st, "player").uid === event.uid) patchHud("player", { level: event.level, max: maxHp(mon), hp: mon.hp });
          break;
        }
        case "learnPrompt":
          await learnFlow(event.uid, event.moveId);
          break;
        case "throw":
          playSfx("ball");
          await v?.throwBall(event.shakes, event.caught);
          if (event.caught) playSfx("catch");
          break;
        default:
          break;
      }
    }
  }

  async function finish(outcome: Outcome) {
    const st = stateRef.current;
    if (!st) return;
    let placed: "party" | "box" | null = null;
    const caught = st.caught;
    const newSpecies = caught ? !useGame.getState().live?.dex.caught.includes(caught.species) : false;
    useGame.getState().update((state) => {
      state.party = st.player.party;
      state.bag = st.bag;
      if (caught) placed = addMon(state, caught);
    });
    if (caught && newSpecies) await show(`Os dados de ${species(caught.species).name} foram registrados na Pokédex.`);
    if (caught && placed === "box") await show(`${displayName(caught)} foi enviado ao PC, porque a equipe está cheia.`);
    if (outcome === "win" && st.kind === "wild") playSfx("victory");
    for (const uid of leveled.current) {
      const mon = useGame.getState().live?.party.find((entry) => entry.uid === uid);
      if (!mon) continue;
      const into = pendingEvolution(mon);
      if (!into) continue;
      const before = displayName(mon);
      await show(`O quê? ${before} está evoluindo!`);
      playSfx("levelup");
      await sleep(900);
      useGame.getState().update((state) => {
        const target = state.party.find((entry) => entry.uid === uid);
        if (target) evolve(target, into);
        markCaught(state, into);
      });
      playSfx("catch");
      await show(`Parabéns! ${before} evoluiu para ${species(into).name}!`);
    }
    visualsRef.current?.end();
    const { closeBattle } = await import("@/game/phaser/createGame");
    closeBattle();
    useUi.setState({ battle: null });
    request.resolve(outcome);
  }

  async function next() {
    const st = stateRef.current;
    if (!st) return;
    if (st.outcome) {
      await finish(st.outcome);
      return;
    }
    if (st.needSwitch) {
      setForced(true);
      setMessage("Escolha o próximo Pokémon.");
      setMode("party");
      return;
    }
    setForced(false);
    setMessage(`O que ${displayName(activeOf(st, "player"))} vai fazer?`);
    setMode("action");
  }

  async function takeTurn(action: Action) {
    const prev = stateRef.current;
    if (!prev) return;
    setMode("busy");
    const result = runTurn(prev, action, defaultRng);
    prevRef.current = prev;
    if (result.consumed) stateRef.current = result.state;
    await play(result.events);
    force((n) => n + 1);
    await next();
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const previousTrack = getContextTrack();
    void (async () => {
      playSfx("battle");
      setContextTrack("battle");
      const { openBattle } = await import("@/game/phaser/createGame");
      const visuals = await openBattle();
      visualsRef.current = visuals;
      const { state, events } = startBattle(request.config);
      stateRef.current = state;
      prevRef.current = state;
      await visuals.begin(state.background, species(activeOf(state, "foe").species).sprite, null);
      await play(events);
      await next();
    })();
    return () => {
      setContextTrack(previousTrack);
    };
  }, []);

  const st = stateRef.current;
  const active = st ? activeOf(st, "player") : null;
  const usable = st
    ? (Object.entries(st.bag) as [ItemId, number][]).filter(([id, count]) => count > 0 && (ITEMS[id].pocket === "medicine" || st.kind === "wild"))
    : [];

  const actionMenu = useMenu({
    count: 4,
    columns: 2,
    enabled: mode === "action",
    onSelect: (index) => {
      if (index === 0) setMode("moves");
      if (index === 1) setMode("bag");
      if (index === 2) setMode("party");
      if (index === 3) void takeTurn({ type: "run" });
    },
  });
  const moveMenu = useMenu({
    count: active?.moves.length ?? 0,
    columns: 2,
    enabled: mode === "moves",
    onSelect: (index) => {
      if (!active) return;
      if (active.moves[index].pp <= 0) {
        void show("Não há PP para esse golpe!").then(() => setMode("moves"));
        return;
      }
      void takeTurn({ type: "move", index });
    },
    onCancel: () => setMode("action"),
  });
  const bagMenu = useMenu({
    count: usable.length,
    enabled: mode === "bag",
    onSelect: (index) => {
      const entry = usable[index];
      if (!entry) return;
      if (ITEMS[entry[0]].ball) void takeTurn({ type: "item", item: entry[0] });
      else {
        setPendingItem(entry[0]);
        setMode("target");
      }
    },
    onCancel: () => setMode("action"),
  });
  const targetMenu = useMenu({
    count: st?.player.party.length ?? 0,
    enabled: mode === "target",
    onSelect: (index) => pendingItem && void takeTurn({ type: "item", item: pendingItem, target: index }),
    onCancel: () => setMode("bag"),
  });
  const partyMenu = useMenu({
    count: st?.player.party.length ?? 0,
    enabled: mode === "party",
    onSelect: (index) => {
      if (!st) return;
      const mon = st.player.party[index];
      if (index === st.player.active && !st.needSwitch) {
        void show(`${displayName(mon)} já está em campo!`).then(() => setMode("party"));
        return;
      }
      if (mon.hp <= 0) {
        void show(`${displayName(mon)} não tem energia para lutar!`).then(() => setMode("party"));
        return;
      }
      void takeTurn({ type: "switch", index });
    },
    onCancel: () => {
      if (!forced) setMode("action");
    },
  });

  const highlighted = active?.moves[moveMenu.index];

  return (
    <div className="battle-hud">
      {foe ? (
        <div className="hud-box foe">
          <div className="hud-name">
            <span>{foe.name}</span>
            <span>Nv{foe.level}</span>
          </div>
          <div className="hud-row">
            {foe.status ? <i className="status">{STATUS_NAME[foe.status]}</i> : null}
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
            {mine.status ? <i className="status">{STATUS_NAME[mine.status]}</i> : null}
            <HpBar hp={mine.hp} max={mine.max} />
          </div>
          <div className="hud-hp">
            {mine.hp}/{mine.max}
          </div>
          <div className="hud-exp">
            <i style={{ width: `${mine.exp * 100}%` }} />
          </div>
        </div>
      ) : null}

      {mode === "party" || mode === "target" ? (
        <div className="gba-panel battle-party">
          <h2>{mode === "target" ? `Usar ${pendingItem ? ITEMS[pendingItem].name : ""} em qual?` : forced ? "Escolha o próximo Pokémon" : "Trocar de Pokémon"}</h2>
          {st ? <PartyList party={st.player.party} index={mode === "target" ? targetMenu.index : partyMenu.index} active={st.player.active} /> : null}
          <p className="panel-foot">{forced ? "Z escolhe" : "Z escolhe · X volta"}</p>
        </div>
      ) : null}

      {mode === "bag" ? (
        <div className="gba-panel battle-bag">
          <h2>Mochila</h2>
          <ul className="item-list">
            {usable.length === 0 ? <li className="empty">Nada que possa ser usado agora.</li> : null}
            {usable.map(([id, count], index) => (
              <li key={id} className={index === bagMenu.index ? "active" : ""}>
                <span className="gba-cursor">{index === bagMenu.index ? "▶" : ""}</span>
                <ItemIcon id={id} />
                {ITEMS[id].name}
                <b>{ITEMS[id].infinite ? "∞" : `×${count}`}</b>
              </li>
            ))}
          </ul>
          <p className="item-desc">{usable[bagMenu.index] ? ITEMS[usable[bagMenu.index][0]].description : ""}</p>
        </div>
      ) : null}

      <div className="battle-text">
        {mode === "moves" && active ? (
          <>
            <div className="move-grid">
              {active.moves.map((slot, index) => (
                <button key={slot.id} type="button" className={index === moveMenu.index ? "active" : ""} onClick={() => void takeTurn({ type: "move", index })}>
                  <span className="gba-cursor">{index === moveMenu.index ? "▶" : ""}</span>
                  {move(slot.id).name}
                </button>
              ))}
            </div>
            <div className="move-info">
              {highlighted ? (
                <>
                  <span>
                    PP {highlighted.pp}/{move(highlighted.id).pp}
                  </span>
                  <span style={{ color: TYPE_COLOR[move(highlighted.id).type] }}>{TYPE_NAME[move(highlighted.id).type]}</span>
                </>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className={mode === "action" ? "narrow" : ""}>
              {typer.shown}
              {mode === "busy" && typer.done ? <span className="gba-next">▼</span> : null}
            </p>
            {mode === "action" ? (
              <div className="action-grid">
                {ACTIONS.map((label, index) => (
                  <button key={label} type="button" className={index === actionMenu.index ? "active" : ""}>
                    <span className="gba-cursor">{index === actionMenu.index ? "▶" : ""}</span>
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
