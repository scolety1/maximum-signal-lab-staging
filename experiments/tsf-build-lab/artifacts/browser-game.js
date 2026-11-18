import { ARTIFACT_COPY } from "../visitor-copy.js?v=1";
import { createArena, moveArena, startArena, tickArena, togglePause } from "./browser-game-simulation.js";

const KEY_MAP = Object.freeze({ ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" });

export function mountBrowserGame(container, recipe, seed) {
  let arena = createArena(recipe, seed);
  let timer = null;

  container.innerHTML = gameMarkup(recipe, arena);
  const root = container.querySelector(".generated-game");
  const elements = collectGameElements(root);

  function update() {
    const objective = objectiveLabel(recipe.objective);
    root.setAttribute("aria-label", objective);
    elements.objective.textContent = objective;
    elements.pause.textContent = arena.status === "paused" ? "Resume" : "Pause";
    elements.pause.disabled = !["playing", "paused"].includes(arena.status);
    elements.score.textContent = arena.score;
    elements.round.textContent = `${arena.round}/${arena.totalRounds}`;
    elements.remainingLabel.textContent = arena.timerMode === "turns" ? "Moves" : "Time";
    elements.remaining.textContent = arena.remaining;
    elements.shields.textContent = arena.shields;
    elements.combo.textContent = `x${arena.combo}`;
    elements.grid.setAttribute("aria-label", `${objective}. ${arena.remaining} ${arena.timerMode === "turns" ? "moves" : "seconds"} remain.${arena.objective === "survive" ? ` Wave ${arena.wave}.` : ""}`);
    elements.frame.dataset.gameEvent = arena.lastEvent;
    updateCells(elements.cells, arena, recipe);
    updateOverlay(elements, arena, objective);
    elements.message.textContent = arena.message;
  }

  function begin() {
    arena = startArena(arena);
    update();
    root.focus({ preventScroll: true });
    syncTimer();
  }

  function restart() {
    arena = startArena(createArena(recipe, seed));
    update();
    root.focus({ preventScroll: true });
    syncTimer();
  }

  function move(direction) {
    arena = moveArena(arena, direction);
    update();
    syncTimer();
  }

  function pauseOrResume(returnToRoot = false) {
    arena = togglePause(arena);
    update();
    if (returnToRoot) root.focus({ preventScroll: true });
    syncTimer();
  }

  function syncTimer() {
    clearInterval(timer);
    timer = null;
    if (arena.status !== "playing" || arena.timerMode !== "countdown") return;
    timer = setInterval(() => {
      if (document.hidden) return;
      arena = tickArena(arena);
      update();
      if (arena.status !== "playing") syncTimer();
    }, 1000);
  }

  function onClick(event) {
    const overlayAction = event.target.closest("[data-game-action]")?.dataset.gameAction;
    if (overlayAction === "start") return begin();
    if (overlayAction === "replay") return restart();
    if (overlayAction === "resume") return pauseOrResume(true);
    if (event.target.closest("[data-game-pause]")) return pauseOrResume(false);

    const direction = event.target.closest("[data-move]")?.dataset.move;
    if (direction) return move(direction);

    const cell = event.target.closest("[data-cell]");
    if (cell && recipe.movement !== "grid-move" && arena.status === "playing") {
      const [x, y] = cell.dataset.cell.split(":").map(Number);
      const dx = x - arena.player.x;
      const dy = y - arena.player.y;
      if (Math.abs(dx) + Math.abs(dy) === 1) move(dx === 1 ? "right" : dx === -1 ? "left" : dy === 1 ? "down" : "up");
    }
  }

  function onKeyDown(event) {
    if (event.key === " " || event.key === "p" || event.key === "P") {
      if (["playing", "paused"].includes(arena.status)) {
        event.preventDefault();
        pauseOrResume(true);
      }
      return;
    }
    if (event.key === "Enter" && arena.status === "ready") { event.preventDefault(); begin(); return; }
    if (event.key === "Enter" && ["won", "lost"].includes(arena.status)) { event.preventDefault(); restart(); return; }
    const direction = KEY_MAP[event.key];
    if (!direction) return;
    event.preventDefault();
    move(direction);
  }

  function onVisibilityChange() {
    if (document.hidden && arena.status === "playing" && arena.timerMode === "countdown") pauseOrResume(false);
  }

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibilityChange);
  update();
  return () => {
    clearInterval(timer);
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

function gameMarkup(recipe, arena) {
  const movementControls = recipe.movement !== "target-click";
  return `<div class="generated-game generated-game--${escapeText(recipe.arenaLayout)}" style="--artifact-accent:${escapeText(recipe.accent)};--artifact-accent2:${escapeText(recipe.accent2)}" tabindex="0">
    <header class="game-titlebar"><div><span>${ARTIFACT_COPY.game.label}</span><strong>${escapeText(recipe.title)}</strong><small data-game-objective></small></div><button type="button" data-game-pause disabled>Pause</button></header>
    <section class="game-hud" aria-label="Game status"><span>Score <b data-game-score>0</b></span><span>Round <b data-game-round></b></span><span><i data-game-remaining-label></i> <b data-game-remaining></b></span><span>Shields <b data-game-shields></b></span><span>Combo <b data-game-combo></b></span></section>
    <div class="arena-frame" data-game-event="ready"><div class="arena-grid" style="--arena-size:${arena.size}" role="grid">${cellShell(arena.size)}</div><div class="arena-overlay"><span data-overlay-kicker></span><strong data-overlay-title></strong><p data-overlay-copy></p><button type="button" data-game-action="start">Start</button><small data-overlay-note></small></div></div>
    <div class="game-command-row"><div class="arena-controls" aria-label="Movement controls" ${movementControls ? "" : "hidden"}><button type="button" data-move="left" aria-label="Move left">←</button><button type="button" data-move="up" aria-label="Move up">↑</button><button type="button" data-move="down" aria-label="Move down">↓</button><button type="button" data-move="right" aria-label="Move right">→</button></div><span class="tap-callout" ${movementControls ? "hidden" : ""}>Tap an adjacent tile to move</span><p class="arena-help">${controlHelp(recipe.movement)} ${hazardHelp(recipe.hazardMode)}</p></div>
    <p class="game-message" role="status" aria-live="polite"></p>
  </div>`;
}

function collectGameElements(root) {
  return {
    objective: root.querySelector("[data-game-objective]"),
    pause: root.querySelector("[data-game-pause]"),
    score: root.querySelector("[data-game-score]"),
    round: root.querySelector("[data-game-round]"),
    remainingLabel: root.querySelector("[data-game-remaining-label]"),
    remaining: root.querySelector("[data-game-remaining]"),
    shields: root.querySelector("[data-game-shields]"),
    combo: root.querySelector("[data-game-combo]"),
    frame: root.querySelector(".arena-frame"),
    grid: root.querySelector(".arena-grid"),
    cells: [...root.querySelectorAll("[data-cell]")],
    overlay: root.querySelector(".arena-overlay"),
    overlayKicker: root.querySelector("[data-overlay-kicker]"),
    overlayTitle: root.querySelector("[data-overlay-title]"),
    overlayCopy: root.querySelector("[data-overlay-copy]"),
    overlayAction: root.querySelector("[data-game-action]"),
    overlayNote: root.querySelector("[data-overlay-note]"),
    message: root.querySelector(".game-message"),
  };
}

function cellShell(size) {
  const cells = [];
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) cells.push(`<button type="button" tabindex="-1" role="gridcell" data-cell="${x}:${y}" aria-label="empty cell ${x + 1}, ${y + 1}"></button>`);
  return cells.join("");
}

function updateCells(cells, arena, recipe) {
  const targets = new Map(arena.targets.map((item) => [`${item.x}:${item.y}`, item]));
  const hazards = new Map(arena.hazards.map((item) => [`${item.x}:${item.y}`, item]));
  const powerUps = new Map(arena.powerUps.map((item) => [`${item.x}:${item.y}`, item]));
  for (const cell of cells) {
    const [x, y] = cell.dataset.cell.split(":").map(Number);
    const id = `${x}:${y}`;
    const player = arena.player.x === x && arena.player.y === y;
    const hazard = hazards.get(id);
    const target = targets.get(id);
    const powerUp = powerUps.get(id);
    const targetName = recipe.objective === "beacon" ? "beacon" : "signal";
    cell.className = [player && "is-player", hazard && "is-hazard", hazard?.active === false && "is-telegraph", target && (recipe.objective === "beacon" ? "is-beacon" : "is-target"), powerUp && "is-power-up"].filter(Boolean).join(" ");
    cell.setAttribute("aria-label", player ? "player" : hazard ? `${hazard.active === false ? "charging " : "active "}${hazard.behavior} hazard` : target ? (recipe.objective === "beacon" ? `beacon ${target.order}${target === arena.targets[0] ? ", next" : ", locked"}` : targetName) : powerUp ? "shield power-up" : `empty cell ${x + 1}, ${y + 1}`);
    cell.textContent = player ? "◆" : hazard ? (hazard.active === false ? "!" : "×") : target ? (recipe.objective === "beacon" ? String(target.order) : "●") : powerUp ? "⬡" : "";
  }
}

function updateOverlay(elements, arena, objective) {
  const playing = arena.status === "playing";
  elements.overlay.hidden = playing;
  if (playing) return;
  if (arena.status === "ready") {
    setOverlay(elements, "How to win", objective, `Avoid red hazards. A gold shield absorbs one hit. Clear ${arena.totalRounds} short rounds.`, "Start", "start", "Press Enter to start");
    return;
  }
  if (arena.status === "paused") {
    setOverlay(elements, "Paused", "Your run is paused.", "", "Resume", "resume", "");
    return;
  }
  const won = arena.status === "won";
  setOverlay(elements, won ? "You won" : "Run over", won ? "Arena complete" : "Try another route", `Score ${arena.score} · Best combo x${arena.bestCombo} · Round ${arena.round}/${arena.totalRounds}`, "Play again", "replay", "Same choices, same arena");
}

function setOverlay(elements, kicker, title, copy, button, action, note) {
  elements.overlayKicker.textContent = kicker;
  elements.overlayTitle.textContent = title;
  elements.overlayCopy.textContent = copy;
  elements.overlayCopy.hidden = !copy;
  elements.overlayAction.textContent = button;
  elements.overlayAction.dataset.gameAction = action;
  elements.overlayNote.textContent = note;
  elements.overlayNote.hidden = !note;
}

function objectiveLabel(objective) { return ARTIFACT_COPY.game.objectives[objective] || ARTIFACT_COPY.game.objectives.beacon; }
function controlHelp(movement) { return ({ "grid-move": "Use arrows, WASD, or the on-screen pad.", "target-click": "Tap an adjacent tile, or use arrows and WASD.", hybrid: "Tap tiles, use arrows or WASD, or use the on-screen pad." })[movement]; }
function hazardHelp(mode) { return ({ static: "Red hazards stay put.", patrol: "Red hazards patrol in lines.", chase: "Red hazards move toward you.", pulse: "An exclamation mark warns you before a hazard activates." })[mode]; }
function escapeText(value) { const span = document.createElement("span"); span.textContent = String(value ?? ""); return span.innerHTML; }
