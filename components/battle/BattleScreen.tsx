"use client";

import { useEffect, useRef, useState } from "react";
import { spriteOf } from "@/game/phaser/constants";
import { HpBar } from "@/components/hud/MonSprite";
import { MoveDetails } from "@/components/hud/MoveDetails";
import { useTypewriter } from "@/components/hud/useTypewriter";
import { ItemIcon } from "@/components/menus/BagPanel";
import { PartyList } from "@/components/menus/PartyPanel";
import { useMenu } from "@/components/menus/useMenu";
import { ITEMS, type ItemId, canUseInBattle } from "@/data/items";
import { STATUS_NAME, type StatusId, move } from "@/data/pokemon/moves";
import { species } from "@/data/pokemon/species";
import { TYPE_COLOR } from "@/data/pokemon/types";
import { battleSpeciesId } from "@/data/pokemon/mega";
import { type Action, type BattleEvent, type BattleState, type Outcome, type Side, activeOf, availableMegas, runTurn, startBattle } from "@/game/battle/engine";
import { defaultRng } from "@/game/core/rng";
import { type BattleRequest, ask, useUi, playEvolution } from "@/game/core/ui";
import type { BattleVisuals } from "@/game/phaser/bridge";
import { type Mon, displayName, evolve, expProgress, learnMove, maxHp, pendingEvolution } from "@/game/pokemon/mon";
import { addMon, markCaught, useGame } from "@/game/state/store";
import { playCry, playSfx, playVictory } from "@/lib/audio/engine";
import { useInputFrame } from "@/lib/input/engine";
import { collectPickup } from "@/game/pokemon/pickup";

type Hud = { name: string; level: number; hp: number; max: number; status: StatusId | null; exp: number };
type Mode = "busy" | "action" | "moves" | "bag" | "target" | "party";

const ACTIONS = ["Lutar", "Mochila", "Pokémon", "Fugir"];
const BAG_POCKETS = [{ id: "medicine", label: "Cura" }, { id: "balls", label: "Pokébolas" }] as const;
const BAG_PAGE_SIZE = 5;
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
  const turnBusy = useRef(false);
  /** Espécie que está em campo de cada lado, para o grito certo quando ela desmaia. */
  const onField = useRef<Record<Side, string | null>>({ player: null, foe: null });
  const [foe, setFoe] = useState<Hud | null>(null);
  const [mine, setMine] = useState<Hud | null>(null);
  const [message, setMessageState] = useState({ text: "" });
  const setMessage = (text: string) => setMessageState({ text });
  const [mode, setMode] = useState<Mode>("busy");
  const [forced, setForced] = useState(false);
  const [pendingItem, setPendingItem] = useState<ItemId | null>(null);
  const [pendingMega, setPendingMega] = useState<ItemId | null>(null);
  const [bagPocket, setBagPocket] = useState(0);
  const [, force] = useState(0);
  const typer = useTypewriter(message.text, 60);
  const typedRef = useRef(false);
  const messageGen = useRef(0);
  typedRef.current = typer.done;
  const advanceRef = useRef<(() => void) | null>(null);

  useInputFrame((frame) => {
    const ui = useUi.getState();
    if (ui.dialog || ui.choice || ui.evolution) return;
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

  async function learnFlow(uid: string, moveId: string, live = false) {
    const st = stateRef.current;
    const mon = live ? useGame.getState().live?.party.find((entry) => entry.uid === uid) : st?.player.party.find((entry) => entry.uid === uid);
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
        if (live) {
          useGame.getState().update((state) => {
            const target = state.party.find((entry) => entry.uid === uid);
            if (target) learnMove(target, moveId, index);
          });
        } else learnMove(mon, moveId, index);
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
          // o selvagem já está em campo desde a entrada: nada de Pokébola para ele
          if (event.side === "foe" && st.kind === "wild" && onField.current.foe) break;
          await v?.sendOut(event.side, spriteOf(battleSpeciesId(mon)));
          onField.current[event.side] = mon.species;
          playCry(mon.species);
          break;
        }
        case "withdraw":
          await v?.withdraw(event.side);
          setHud(event.side, null);
          break;
        case "move": {
          const def = move(event.moveId);
          if (def.category !== "status") playSfx("swoosh");
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
          playSfx(event.stages > 0 ? "statUp" : "statDown");
          break;
        case "faint": {
          const fallen = onField.current[event.side];
          playSfx("faint");
          if (fallen) playCry(fallen, { faint: true });
          await v?.faint(event.side);
          setHud(event.side, null);
          onField.current[event.side] = null;
          // o último do adversário caiu: a música da luta sai e entra a fanfarra
          if (event.side === "foe" && st.outcome === "win") playVictory();
          break;
        }
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
          await v?.throwBall(event.shakes, event.caught, event.item);
          if (event.caught) playSfx("catch");
          break;
        case "mega": {
          const mon = st[event.side].party[st[event.side].active];
          playSfx("levelup");
          await v?.transform(event.side, spriteOf(event.to));
          patchHud(event.side, { name: displayName(mon), max: maxHp(mon) });
          onField.current[event.side] = event.to;
          playCry(event.to);
          break;
        }
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
      for (const mon of st.player.party) {
        delete mon.battleForm;
        delete mon.battleTypes;
      }
      state.party = st.player.party;
      state.bag = st.bag;
      if (caught) placed = addMon(state, caught);
    });
    if (caught && newSpecies) await show(`Os dados de ${species(caught.species).name} foram registrados na Pokédex.`);
    if (caught && placed === "box") await show(`${displayName(caught)} foi enviado ao PC, porque a equipe está cheia.`);
    if (outcome === "run") playSfx("flee");
    for (const uid of leveled.current) {
      const mon = useGame.getState().live?.party.find((entry) => entry.uid === uid);
      if (!mon) continue;
      const into = pendingEvolution(mon);
      if (!into) continue;
      await playEvolution(mon.species, into);
      let taught = { learned: [] as string[], pending: [] as string[] };
      useGame.getState().update((state) => {
        const target = state.party.find((entry) => entry.uid === uid);
        if (target) taught = evolve(target, into);
        markCaught(state, into);
      });
      const evolved = useGame.getState().live?.party.find((entry) => entry.uid === uid);
      if (evolved) {
        for (const id of taught.learned) await show(`${displayName(evolved)} aprendeu ${move(id).name}!`);
        for (const id of taught.pending) await learnFlow(uid, id, true);
      }
    }
    if (outcome !== "lose") {
      let found: ReturnType<typeof collectPickup> = [];
      useGame.getState().update((state) => { found = collectPickup(state.party, defaultRng); });
      for (const entry of found) {
        const mon = useGame.getState().live?.party.find((candidate) => candidate.uid === entry.uid);
        if (mon) await show(`${displayName(mon)} encontrou ${ITEMS[entry.item].name} com Coleta!`);
      }
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
    if (!prev || turnBusy.current) return;
    turnBusy.current = true;
    try {
      setMode("busy");
      const result = runTurn(prev, action, defaultRng);
      if (result.consumed) setPendingMega(null);
      prevRef.current = prev;
      if (result.consumed) stateRef.current = result.state;
      await play(result.events);
      force((n) => n + 1);
      await next();
    } finally {
      turnBusy.current = false;
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const { openBattle } = await import("@/game/phaser/createGame");
      const visuals = await openBattle();
      visualsRef.current = visuals;
      const { state, events } = startBattle(request.config);
      stateRef.current = state;
      prevRef.current = state;
      const foe = activeOf(state, "foe");
      const wild = state.kind === "wild";
      await visuals.begin(state.background, wild ? spriteOf(battleSpeciesId(foe)) : null, null);
      if (wild) {
        onField.current.foe = foe.species;
        playCry(foe.species);
      }
      await play(events);
      await next();
    })();
  }, []);

  const st = stateRef.current;
  const active = st ? activeOf(st, "player") : null;
  const megaOptions = st && active ? availableMegas(active, st.bag, st.megaUsed) : [];
  const transformLabel = megaOptions[0]?.kind === "bond" ? "Forma Ash" : "Mega";
  const actionLabels = megaOptions.length ? (["Lutar", transformLabel, "Mochila", "Pokémon", "Fugir"] as const) : (ACTIONS as readonly string[]);
  const pockets = st?.kind === "wild" ? BAG_POCKETS : BAG_POCKETS.slice(0, 1);
  const usable = st
    ? (Object.entries(st.bag) as [ItemId, number][]).filter(([id, count]) => count > 0 && ITEMS[id].pocket === pockets[bagPocket].id && canUseInBattle(id, st.kind))
    : [];

  const actionMenu = useMenu({
    count: actionLabels.length,
    columns: 2,
    enabled: mode === "action",
    onSelect: chooseAction,
  });
  // Toque e clique também escolhem (antes só o teclado e o controle).
  function chooseAction(index: number) {
      const label = actionLabels[index];
      if (label === "Lutar") { setPendingMega(null); setMode("moves"); }
      else if (label === transformLabel) {
        void (async () => {
          let chosen = megaOptions[0];
          if (megaOptions.length > 1) {
            const names = megaOptions.map((m) => ITEMS[m.stone].name);
            const pick = await ask(names, { text: "Qual Mega Evolução?" }, names.length - 1);
            chosen = megaOptions[pick];
          }
          if (chosen) { setPendingMega(chosen.stone); setMode("moves"); }
        })();
      } else if (label === "Mochila") setMode("bag");
      else if (label === "Pokémon") setMode("party");
      else if (label === "Fugir") void takeTurn({ type: "run" });
  }
  function chooseMove(index: number) {
    if (!active) return;
    if (active.moves[index].pp <= 0) {
      setMode("busy");
      void show("Não há PP para esse golpe!").then(() => setMode("moves"));
      return;
    }
    void takeTurn({ type: "move", index, ...(pendingMega ? { mega: pendingMega } : {}) });
  }

  const moveMenu = useMenu({
    count: active?.moves.length ?? 0,
    columns: 2,
    enabled: mode === "moves",
    onSelect: chooseMove,
    onCancel: () => { setPendingMega(null); setMode("action"); },
  });
  function changePocket(index: number) {
    setBagPocket(index);
    bagMenu.setIndex(0);
  }

  function useBagItem(index: number) {
    const entry = usable[index];
    if (!entry) return;
    if (ITEMS[entry[0]].ball) void takeTurn({ type: "item", item: entry[0] });
    else {
      setPendingItem(entry[0]);
      setMode("target");
    }
  }

  const bagMenu = useMenu({
    count: usable.length,
    enabled: mode === "bag",
    onSelect: useBagItem,
    onLeft: () => changePocket((bagPocket + pockets.length - 1) % pockets.length),
    onRight: () => changePocket((bagPocket + 1) % pockets.length),
    onCancel: () => setMode("action"),
  });
  const bagPageStart = Math.floor(bagMenu.index / BAG_PAGE_SIZE) * BAG_PAGE_SIZE;
  const targetMenu = useMenu({
    count: st?.player.party.length ?? 0,
    columns: 2,
    enabled: mode === "target",
    onSelect: (index) => pendingItem && void takeTurn({ type: "item", item: pendingItem, target: index }),
    onCancel: () => setMode("bag"),
  });
  const partyMenu = useMenu({
    count: st?.player.party.length ?? 0,
    columns: 2,
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
          {st ? <PartyList party={st.player.party} index={mode === "target" ? targetMenu.index : partyMenu.index} active={st.player.active} onPick={(i) => (mode === "target" ? targetMenu : partyMenu).pick(i)} /> : null}
          <p className="panel-foot">{forced ? "Z escolhe" : "Z escolhe · X volta"}</p>
        </div>
      ) : null}

      {mode === "bag" ? (
        <div className="gba-panel battle-bag">
          <h2>Mochila</h2>
          <nav className="battle-bag-tabs" aria-label="Categorias da mochila">
            {pockets.map((pocket, index) => (
              <button key={pocket.id} type="button" aria-pressed={index === bagPocket} onClick={() => changePocket(index)}>{pocket.label}</button>
            ))}
          </nav>
          <ul className="item-list">
            {usable.length === 0 ? <li className="empty">{bagPocket === 1 ? "Você não tem Pokébolas." : "Nenhum item de cura."}</li> : null}
            {usable.slice(bagPageStart, bagPageStart + BAG_PAGE_SIZE).map(([id, count], offset) => (
              <li key={id} className={bagPageStart + offset === bagMenu.index ? "active" : ""} onClick={() => bagMenu.pick(bagPageStart + offset)}>
                <span className="gba-cursor">{bagPageStart + offset === bagMenu.index ? "▶" : ""}</span>
                <ItemIcon id={id} />
                {ITEMS[id].name}
                <b>{ITEMS[id].infinite ? "∞" : `×${count}`}</b>
              </li>
            ))}
          </ul>
          <p className="item-desc">{usable[bagMenu.index] ? ITEMS[usable[bagMenu.index][0]].description : ""}</p>
          <p className="panel-foot battle-bag-foot"><span>{pockets.length > 1 ? "← → bolsos · " : ""}Z usa · X volta</span><span>{usable.length ? `${bagMenu.index + 1}/${usable.length}` : ""}</span></p>
        </div>
      ) : null}

      <div className={`battle-text${mode === "moves" ? " is-moves" : ""}`}>
        {mode === "moves" && active ? (
          <>
            <div className="move-grid">
              {active.moves.map((slot, index) => (
                <button key={slot.id} type="button" className={index === moveMenu.index ? "active" : ""} onMouseEnter={() => moveMenu.setIndex(index)} onFocus={() => moveMenu.setIndex(index)} onClick={() => moveMenu.pick(index)}>
                  <span className="gba-cursor">{index === moveMenu.index ? "▶" : ""}</span>
                  {move(slot.id).name}
                </button>
              ))}
            </div>
            <div className="move-info">
              {highlighted ? (
                <>
                  <MoveDetails definition={move(highlighted.id)} pp={highlighted.pp} description={false} />
                  {pendingMega ? <b className="mega-ready">{pendingMega === "greninja_ash" ? "Forma Ash pronta" : "Mega pronta"}</b> : null}
                </>
              ) : null}
            </div>
            {highlighted ? <p className="move-description battle-move-description" aria-live="polite">{move(highlighted.id).description}</p> : null}
          </>
        ) : (
          <>
            <p className={mode === "action" ? "narrow" : ""}>
              {typer.shown}
              {mode === "busy" && typer.done ? <span className="gba-next">▼</span> : null}
            </p>
            {mode === "action" ? (
              <div className="action-grid">
                {actionLabels.map((label, index) => (
                  <button key={label} type="button" className={index === actionMenu.index ? "active" : ""} onClick={() => actionMenu.pick(index)}>
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
