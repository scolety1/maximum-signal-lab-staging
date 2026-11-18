import { createSeededRandom } from "../../capsule-core/seeded-random.js";

const DIRECTIONS = Object.freeze({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] });

export function createArena(recipe, seed = "arena-default") {
  const size = recipe.arenaSize;
  const base = {
    seed: String(seed),
    size,
    spawn: { x: 0, y: size - 1 },
    player: { x: 0, y: size - 1 },
    objective: recipe.objective,
    arenaLayout: recipe.arenaLayout || "open",
    hazardMode: recipe.hazardMode || "static",
    hazardCadence: recipe.hazardCadence || 1,
    timerMode: recipe.timerMode || "turns",
    roundDuration: recipe.roundDuration || 10,
    turnLimit: recipe.turnLimit || 18,
    totalRounds: recipe.rounds || 2,
    round: 1,
    targetCount: recipe.targetCount || 0,
    hazardCount: recipe.hazardCount ?? recipe.obstacleCount ?? 2,
    startingShields: recipe.startingShields ?? 1,
    shields: recipe.startingShields ?? 1,
    scoreMultiplier: recipe.scoreMultiplier || 1,
    score: 0,
    combo: 1,
    bestCombo: 1,
    wave: 1,
    routeBonus: 0,
    collected: 0,
    moves: 0,
    ticks: 0,
    invulnerable: 0,
    status: "ready",
    message: objectiveMessage(recipe.objective),
    lastEvent: "ready",
  };
  return freezeArena(buildRound(base, 1));
}

export function startArena(arena) {
  if (!["ready", "paused"].includes(arena.status)) return arena;
  return freezeArena({ ...arena, status: "playing", message: arena.status === "paused" ? "Run resumed." : "Round 1 started.", lastEvent: "start" });
}

export function togglePause(arena) {
  if (arena.status === "playing") return freezeArena({ ...arena, status: "paused", message: "Run paused.", lastEvent: "pause" });
  if (arena.status === "paused") return startArena(arena);
  return arena;
}

export function moveArena(arena, direction) {
  if (arena.status !== "playing") return arena;
  const delta = DIRECTIONS[direction];
  if (!delta) throw new RangeError(`Unknown direction: ${direction}`);

  const player = {
    x: clamp(arena.player.x + delta[0], 0, arena.size - 1),
    y: clamp(arena.player.y + delta[1], 0, arena.size - 1),
  };
  let next = collectAt({ ...arena, player, moves: arena.moves + 1, lastEvent: "move", message: "Keep moving." });
  next = resolveCollision(next);
  if (next.status !== "playing") return freezeArena(next);

  if (arena.timerMode === "turns") {
    next = { ...next, remaining: Math.max(0, next.remaining - 1), ticks: next.ticks + 1, invulnerable: Math.max(0, next.invulnerable - 1) };
    next = moveHazards(next);
    next = resolveCollision(next);
    next = resolveRoundState(next);
  } else {
    next = resolveRoundState(next);
  }
  return freezeArena(next);
}

export function tickArena(arena) {
  if (arena.status !== "playing" || arena.timerMode !== "countdown") return arena;
  let next = {
    ...arena,
    ticks: arena.ticks + 1,
    invulnerable: Math.max(0, arena.invulnerable - 1),
    remaining: Math.max(0, arena.remaining - 1),
    score: arena.objective === "survive" ? arena.score + 5 : arena.score,
    lastEvent: "tick",
    wave: Math.floor((arena.ticks + 1) / Math.max(1, arena.hazardCadence * 3)) + 1,
  };
  next = moveHazards(next);
  next = resolveCollision(next);
  next = resolveRoundState(next);
  return freezeArena(next);
}

function collectAt(arena) {
  const targetIndex = arena.targets.findIndex((item) => sameCell(item, arena.player));
  const powerIndex = arena.powerUps.findIndex((item) => sameCell(item, arena.player));
  let next = arena;
  if (targetIndex >= 0) {
    if (arena.objective === "beacon" && targetIndex !== 0) {
      return { ...arena, combo: 1, message: `Beacon ${arena.targets[targetIndex].order} is locked. Activate beacon ${arena.targets[0].order} next.`, lastEvent: "locked-beacon" };
    }
    const combo = Math.min(5, arena.combo + 1);
    const routeBonus = arena.objective === "collect" ? Math.max(0, arena.remaining) * 2 : 0;
    const points = Math.round(100 * arena.combo * arena.scoreMultiplier) + routeBonus;
    next = {
      ...next,
      targets: arena.targets.filter((_, index) => index !== targetIndex),
      collected: arena.collected + 1,
      score: arena.score + points,
      routeBonus: arena.routeBonus + routeBonus,
      combo,
      bestCombo: Math.max(arena.bestCombo, combo),
      message: arena.objective === "beacon" ? `Beacon activated in order. +${points}` : `Signal collected. +${points}${routeBonus ? ` including ${routeBonus} route bonus` : ""}`,
      lastEvent: "collect",
    };
  }
  if (powerIndex >= 0) {
    next = {
      ...next,
      powerUps: next.powerUps.filter((_, index) => index !== powerIndex),
      shields: Math.min(3, next.shields + 1),
      score: next.score + 50,
      message: "Shield charged. +50",
      lastEvent: "power-up",
    };
  }
  return next;
}

function resolveCollision(arena) {
  if (arena.invulnerable > 0) return arena;
  if (!arena.hazards.some((item) => sameCell(item, arena.player) && item.active !== false)) return arena;
  if (arena.shields > 0) {
    return {
      ...arena,
      player: { ...arena.spawn },
      hazards: arena.hazards.map((item) => ({ ...item, x: item.startX, y: item.startY })),
      shields: arena.shields - 1,
      invulnerable: 3,
      combo: 1,
      score: Math.max(0, arena.score - 75),
      message: "Shield absorbed a hazard. -75",
      lastEvent: "shield-hit",
    };
  }
  return { ...arena, status: "lost", combo: 1, message: "A hazard ended the run.", lastEvent: "hit" };
}

function resolveRoundState(arena) {
  if (arena.status !== "playing") return arena;
  const objectiveComplete = arena.objective !== "survive" && arena.targets.length === 0;
  const survived = arena.objective === "survive" && arena.remaining === 0;
  if (objectiveComplete || survived) return completeRound(arena);
  if (arena.remaining === 0) return { ...arena, status: "lost", message: arena.timerMode === "turns" ? "No moves remain." : "Time expired.", lastEvent: "timeout" };
  return arena;
}

function completeRound(arena) {
  const score = arena.score + 150 * arena.round;
  if (arena.round >= arena.totalRounds) {
    return { ...arena, score, status: "won", message: `All ${arena.totalRounds} rounds complete.`, lastEvent: "won" };
  }
  return buildRound({ ...arena, score, combo: 1, round: arena.round + 1, message: `Round ${arena.round + 1} started.`, lastEvent: "round" }, arena.round + 1);
}

function buildRound(arena, round) {
  const random = createSeededRandom(`${arena.seed}:${arena.objective}:${arena.arenaLayout}:${round}`);
  const occupied = new Set([key(arena.spawn.x, arena.spawn.y)]);
  const targets = placeEntities(arena.objective === "survive" ? 0 : arena.targetCount, arena.size, random, occupied, "target")
    .map((item, index) => ({ ...item, order: index + 1 }));
  const hazards = placeEntities(arena.hazardCount + Math.max(0, round - 2), arena.size, random, occupied, "hazard")
    .map((item, index) => ({
      ...item,
      behavior: arena.hazardMode,
      dx: index % 2 === 0 ? 1 : 0,
      dy: index % 2 === 0 ? 0 : -1,
      startX: item.x,
      startY: item.y,
      active: arena.hazardMode !== "pulse" || index % 2 === 0,
    }));
  const powerUps = placeEntities(1, arena.size, random, occupied, "shield");
  return {
    ...arena,
    round,
    player: { ...arena.spawn },
    targets,
    hazards,
    powerUps,
    remaining: arena.timerMode === "turns" ? arena.turnLimit : arena.roundDuration,
    wave: 1,
  };
}

function moveHazards(arena) {
  if (arena.ticks % arena.hazardCadence !== 0) return arena;
  const hazards = arena.hazards.map((hazard, index) => {
    if (hazard.behavior === "static") return hazard;
    if (hazard.behavior === "pulse") return { ...hazard, active: !hazard.active };
    if (hazard.behavior === "chase") {
      if ((arena.ticks + index) % 2 === 1) return hazard;
      const dx = Math.abs(arena.player.x - hazard.x) >= Math.abs(arena.player.y - hazard.y) ? Math.sign(arena.player.x - hazard.x) : 0;
      const dy = dx === 0 ? Math.sign(arena.player.y - hazard.y) : 0;
      return { ...hazard, x: clamp(hazard.x + dx, 0, arena.size - 1), y: clamp(hazard.y + dy, 0, arena.size - 1), active: true };
    }
    let x = hazard.x + hazard.dx;
    let y = hazard.y + hazard.dy;
    let dx = hazard.dx;
    let dy = hazard.dy;
    if (x < 0 || x >= arena.size) { dx *= -1; x = hazard.x + dx; }
    if (y < 0 || y >= arena.size) { dy *= -1; y = hazard.y + dy; }
    return { ...hazard, x, y, dx, dy, active: true };
  });
  return { ...arena, hazards };
}

function placeEntities(count, size, random, occupied, kind) {
  const result = [];
  let guard = 0;
  while (result.length < count && guard < size * size * 4) {
    guard += 1;
    const item = { id: `${kind}-${result.length}`, kind, x: Math.floor(random() * size), y: Math.floor(random() * size) };
    const id = key(item.x, item.y);
    if (occupied.has(id)) continue;
    occupied.add(id);
    result.push(item);
  }
  return result;
}

function objectiveMessage(objective) {
  if (objective === "collect") return "Collect every signal before the round ends.";
  if (objective === "survive") return "Stay clear of hazards until the round ends.";
  return "Activate every beacon before the round ends.";
}

function freezeArena(arena) {
  return Object.freeze({
    ...arena,
    spawn: Object.freeze({ ...arena.spawn }),
    player: Object.freeze({ ...arena.player }),
    targets: Object.freeze(arena.targets.map((item) => Object.freeze({ ...item }))),
    hazards: Object.freeze(arena.hazards.map((item) => Object.freeze({ ...item }))),
    powerUps: Object.freeze(arena.powerUps.map((item) => Object.freeze({ ...item }))),
  });
}

function sameCell(a, b) { return a.x === b.x && a.y === b.y; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function key(x, y) { return `${x}:${y}`; }
