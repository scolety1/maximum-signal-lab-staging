import { SCENARIOS, WINES } from "./fixtures.js";

export function createRound(seed = "sommelier-rush") {
  const scenario = SCENARIOS[hashSeed(seed) % SCENARIOS.length];
  return freezeRound({ seed: String(seed), scenarioId: scenario.id, status: "active", paused: false, elapsed: 0,
    tables: scenario.tables.map((table) => ({ ...table, patienceLeft: table.patience, status: "waiting", result: null })),
    inventory: WINES.map((wine) => ({ ...wine, available: true })), events: { unavailable: false, changedRequest: false }, receipts: [], score: 0 });
}

export function advanceRound(round, seconds = 1) {
  if (round.status !== "active" || round.paused || seconds <= 0) return round;
  const scenario = getScenario(round.scenarioId);
  const elapsed = Math.min(scenario.duration, round.elapsed + seconds);
  let tables = round.tables.map((table) => table.status === "waiting" ? { ...table, patienceLeft: Math.max(0, table.patienceLeft - seconds) } : table);
  let inventory = round.inventory;
  let events = { ...round.events };
  let receipts = [...round.receipts];
  if (!events.unavailable && elapsed >= scenario.unavailable.at) {
    inventory = inventory.map((wine) => wine.id === scenario.unavailable.wineId ? { ...wine, available: false } : wine);
    events.unavailable = true;
    const wine = inventory.find((item) => item.id === scenario.unavailable.wineId);
    receipts.push({ id: "unavailable", tone: "notice", message: `${wine.name} is unavailable. Choose a substitute.` });
  }
  if (!events.changedRequest && elapsed >= scenario.change.at) {
    const configuredTarget = tables.find((table) => table.id === scenario.change.tableId && table.status === "waiting");
    const targetId = configuredTarget?.id || tables.find((table) => table.status === "waiting")?.id;
    tables = tables.map((table) => table.id === targetId ? { ...table, dish: scenario.change.dish, pairing: scenario.change.pairing, idealWineIds: [...scenario.change.idealWineIds], requestChanged: true } : table);
    events.changedRequest = true;
    const target = tables.find((table) => table.id === targetId);
    if (target) receipts.push({ id: "changed-request", tone: "notice", message: `${target.label} changed the order to ${scenario.change.dish}.` });
  }
  tables = tables.map((table) => table.status === "waiting" && table.patienceLeft <= 0 ? { ...table, status: "missed" } : table);
  const finished = tables.every((table) => table.status !== "waiting") || elapsed >= scenario.duration;
  return freezeRound({ ...round, elapsed, tables, inventory, events, receipts, status: finished ? "complete" : "active" });
}

export function serveWine(round, tableId, wineId) {
  if (round.status !== "active" || round.paused) throw new Error("Service is not active.");
  const table = round.tables.find((item) => item.id === tableId);
  const wine = round.inventory.find((item) => item.id === wineId);
  if (!table || !wine) throw new RangeError("Choose a valid table and wine.");
  if (table.status !== "waiting") throw new Error("That table is no longer waiting.");
  if (!wine.available) throw new Error("That bottle is unavailable.");
  const result = scorePairing(table, wine, round.events.unavailable);
  const tables = round.tables.map((item) => item.id === tableId ? { ...item, status: "served", result } : item);
  const receipts = [...round.receipts, { id: `served-${tableId}`, tone: result.total >= 75 ? "success" : "mixed", message: `${table.label}: ${result.explanation}` }];
  const score = round.score + result.total;
  return freezeRound({ ...round, tables, receipts, score, status: tables.every((item) => item.status !== "waiting") ? "complete" : round.status });
}

export function scorePairing(table, wine, substitutionActive = false) {
  const direct = table.idealWineIds.includes(wine.id);
  const alternate = table.alternateWineIds.includes(wine.id);
  const pairing = direct ? 30 : wine.pairings.includes(table.pairing) ? 24 : alternate ? 18 : 7;
  const preference = wine.style === table.preference ? 25 : wine.body === table.body ? 18 : 9;
  const budget = wine.price <= table.budget ? 20 : wine.price <= table.budget + 8 ? 12 : 2;
  const substitution = substitutionActive ? (alternate ? 15 : direct ? 13 : wine.pairings.includes(table.pairing) ? 9 : 3) : 10;
  const ratio = table.patience ? table.patienceLeft / table.patience : 0;
  const timing = ratio >= 0.65 ? 10 : ratio >= 0.3 ? 7 : 3;
  const total = pairing + preference + budget + substitution + timing;
  const strengths = [pairing >= 24 && `works with ${table.dish}`, preference >= 18 && "fits the requested style", budget >= 20 && "stays within budget", substitution >= 13 && substitutionActive && "protects the substitution"].filter(Boolean);
  const tradeoff = budget < 20 ? "It stretches the budget." : preference < 18 ? "The style is a compromise." : pairing < 18 ? "The food match is less direct." : direct ? "The request lands cleanly." : alternate ? "A thoughtful substitute keeps service moving." : "The tradeoffs stay controlled.";
  return Object.freeze({ total, pairing, preference, budget, substitution, timing, explanation: `${strengths.slice(0, 2).join(" and ") || "A workable alternative"}. ${tradeoff}` });
}

export function togglePause(round) { return round.status === "active" ? freezeRound({ ...round, paused: !round.paused }) : round; }
export function getRoundSummary(round) {
  const served = round.tables.filter((table) => table.status === "served"); const missed = round.tables.filter((table) => table.status === "missed").length;
  const percent = Math.round((round.score / (round.tables.length * 100)) * 100);
  const grade = percent >= 85 ? "Graceful service" : percent >= 68 ? "Strong recovery" : percent >= 50 ? "Service held together" : "A learning round";
  const best = served.slice().sort((a, b) => b.result.total - a.result.total)[0];
  return Object.freeze({ served: served.length, missed, score: round.score, percent, grade, best: best ? `${best.label} · ${best.result.total}` : "No table served" });
}
export function nextSeed(seed) { return `${seed}-encore`; }
export function getScenario(id) { return SCENARIOS.find((scenario) => scenario.id === id); }
function hashSeed(seed) { let value = 2166136261; for (const char of String(seed)) { value ^= char.charCodeAt(0); value = Math.imul(value, 16777619); } return value >>> 0; }
function freezeRound(round) { return Object.freeze({ ...round,
  tables: Object.freeze(round.tables.map((table) => Object.freeze({ ...table, idealWineIds: Object.freeze([...table.idealWineIds]), alternateWineIds: Object.freeze([...table.alternateWineIds]) }))),
  inventory: Object.freeze(round.inventory.map((wine) => Object.freeze({ ...wine, pairings: Object.freeze([...wine.pairings]) }))), events: Object.freeze({ ...round.events }), receipts: Object.freeze(round.receipts.map((receipt) => Object.freeze({ ...receipt }))) }); }
