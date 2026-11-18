import { BRANCHES, LEAGUE_FORMAT, PROSPECTS, STRATEGIES, VETERANS } from "./fixtures.js";

export const DECISION_COUNT = 4;

export function createCommand(seed = "draft-command") {
  const board = seededOrder(PROSPECTS, seed);
  return freeze({
    seed: String(seed),
    phase: "strategy",
    strategy: null,
    turn: 0,
    league: LEAGUE_FORMAT,
    board,
    veterans: seededOrder(VETERANS, `${seed}-veterans`),
    roster: [Object.freeze({ publicId: "roster-qb", name: "Kai North", position: "QB", age: 26, kind: "roster" })],
    needs: ["WR", "RB", "TE"],
    capital: { current: 2, later: 2, future: 2 },
    decisions: [],
    roomPicks: [],
    consequences: [],
    scarcity: {},
    paused: false,
    untimed: true,
  });
}

export function selectStrategy(state, strategyId) {
  requirePhase(state, "strategy");
  if (!STRATEGIES.some((item) => item.id === strategyId)) throw new RangeError("Choose Contender, Balanced, or Rebuild.");
  return update(state, { phase: "decision", strategy: strategyId, consequences: [`${labelStrategy(strategyId)} strategy set the decision lens.`] });
}

export function getDecisionOptions(state) {
  if (!state.strategy) return [];
  const tradedDown = state.decisions.some((decision) => decision.branchId === "trade-down");
  const usedExtra = state.decisions.some((decision) => decision.branchId === "extra-pick");
  const drafted = state.decisions.filter((decision) => ["draft", "extra-pick"].includes(decision.branchId));
  return BRANCHES.map((branch) => {
    let available = true;
    let reason = "Available under the current roster and capital state.";
    if (branch.id === "draft" && (!state.board.length || state.capital.current < 1)) { available = false; reason = "No current pick remains."; }
    if (branch.id === "trade-down" && state.capital.current < 1) { available = false; reason = "A current pick is required to trade down."; }
    if (branch.id === "veteran" && state.capital.later < 1) { available = false; reason = "Later capital was already spent."; }
    if (branch.id === "future" && state.turn === DECISION_COUNT - 1 && state.capital.future >= 4) { available = false; reason = "Future flexibility is already the strongest roster asset."; }
    if (branch.id === "extra-pick" && (!tradedDown || usedExtra || !state.board.length)) { available = false; reason = tradedDown ? "The added pick was already used." : "Trade down earlier to unlock this branch."; }
    if (branch.id === "draft" && drafted.length >= 2 && state.needs.length === 0) { available = false; reason = "The authored roster needs are already covered."; }
    return Object.freeze({ ...branch, available, reason });
  });
}

export function commitDecision(state, branchId, targetId = null) {
  requirePhase(state, "decision");
  if (state.paused) throw new Error("Resume Draft Command before choosing a branch.");
  const options = getDecisionOptions(state);
  const option = options.find((item) => item.id === branchId);
  if (!option) throw new RangeError("Unknown Draft Command branch.");
  if (!option.available) throw new Error(option.reason);

  let board = [...state.board];
  let roster = [...state.roster];
  let veterans = [...state.veterans];
  let needs = [...state.needs];
  let capital = { ...state.capital };
  let roomPicks = [...state.roomPicks];
  let scarcity = { ...state.scarcity };
  let selected = null;
  let consequence = "";

  if (["draft", "extra-pick"].includes(branchId)) {
    selected = chooseTarget(board, targetId);
    board = board.filter((item) => item.publicId !== selected.publicId);
    roster.push(selected);
    needs = needs.filter((position) => position !== selected.position);
    if (branchId === "draft") capital.current -= 1;
    else capital.later -= 1;
    consequence = `${selected.name} joined the roster; ${selected.position} scarcity moved.`;
  }

  if (branchId === "trade-down") {
    capital.current -= 1;
    capital.later += 2;
    capital.future += 1;
    consequence = "The room took two prospects, but an added later pick and future pick opened a new branch.";
  }

  if (branchId === "veteran") {
    selected = chooseTarget(veterans, targetId);
    veterans = veterans.filter((item) => item.publicId !== selected.publicId);
    roster.push(selected);
    needs = needs.filter((position) => position !== selected.position);
    capital.later -= 1;
    consequence = `${selected.name} raised immediate competitiveness and age/decline exposure.`;
  }

  if (branchId === "future") {
    capital.future += 1;
    consequence = "No player was added; future flexibility grew while current roster pressure remained.";
  }

  const cpuCount = branchId === "trade-down" ? 3 : 2;
  for (let index = 0; index < cpuCount && board.length; index += 1) {
    const pick = board.shift();
    roomPicks.push(pick);
    scarcity[pick.position] = (scarcity[pick.position] || 0) + 1;
  }

  const decision = Object.freeze({
    turn: state.turn + 1,
    branchId,
    label: option.label,
    target: selected ? Object.freeze({ publicId: selected.publicId, name: selected.name, position: selected.position }) : null,
    options: Object.freeze(options.map((item) => Object.freeze({ id: item.id, label: item.label, available: item.available, reason: item.reason }))),
    consequence,
  });
  const turn = state.turn + 1;
  return update(state, {
    phase: turn === DECISION_COUNT ? "debrief" : "decision",
    turn,
    board,
    veterans,
    roster,
    needs,
    capital,
    roomPicks,
    scarcity,
    decisions: [...state.decisions, decision],
    consequences: [...state.consequences, consequence],
  });
}

export function togglePause(state) {
  if (!["decision", "debrief"].includes(state.phase)) throw new Error("Draft Command has not started.");
  return update(state, { paused: !state.paused });
}

export function setUntimed(state, untimed) {
  return update(state, { untimed: Boolean(untimed) });
}

export function buildDebrief(state) {
  requirePhase(state, "debrief");
  const prospects = state.roster.filter((item) => item.kind === "prospect");
  const veterans = state.roster.filter((item) => item.kind === "veteran");
  const staleOrConflicting = state.roster.filter((item) => ["stale", "conflicting"].includes(item.evidence?.state));
  const traded = state.decisions.some((item) => item.branchId === "trade-down");
  const preserved = state.decisions.filter((item) => item.branchId === "future").length;
  const dimensions = {
    rosterFit: dimension(state.needs.length <= 1 ? "Strong" : "Open", `${state.needs.length || "No"} authored need${state.needs.length === 1 ? " remains" : "s remain"}.`),
    immediateCompetitiveness: dimension(veterans.length ? "Raised" : prospects.length >= 2 ? "Developing" : "Patient", veterans.length ? "A veteran adds a current role with age exposure." : "The plan relies on fictional prospect development."),
    longTermFlexibility: dimension(state.capital.future >= 3 ? "Strong" : "Committed", `${state.capital.future} future capital units remain in this authored scenario.`),
    positionalScarcity: dimension(Object.keys(state.scarcity).length >= 3 ? "Pressured" : "Contained", "CPU selections changed the supply visible on the board."),
    ageDeclineExposure: dimension(veterans.length ? "Present" : "Low", veterans.length ? "Immediate help carries a shorter value window." : "The roster added no veteran decline exposure."),
    evidenceQuality: dimension(staleOrConflicting.length ? "Mixed" : "Current", staleOrConflicting.length ? "At least one chosen player carries stale or conflicting fictional evidence." : "Chosen player evidence is current or partial."),
    riskManagement: dimension(traded || preserved ? "Flexible" : "Concentrated", traded || preserved ? "Capital preserved another reasonable route." : "The plan concentrated value in players on the board."),
  };
  const strategyCopy = {
    contender: veterans.length ? "The immediate-production move fits a Contender lens." : "A Contender could reasonably have acquired a veteran sooner.",
    balanced: state.capital.future >= 2 && state.roster.length >= 2 ? "The path kept both roster help and optionality in view." : "A Balanced lens would protect one more side of the roster/capital tradeoff.",
    rebuild: prospects.length >= 2 || state.capital.future >= 4 ? "Youth and future flexibility align with the Rebuild lens." : "A Rebuild could reasonably have passed on more immediate value.",
  }[state.strategy];
  return deepFreeze({
    dimensions,
    bestValue: traded ? "The trade-down branch created two later choices from one pressured moment." : state.decisions[0]?.consequence,
    largestRisk: veterans.length ? "Veteran age and role durability." : staleOrConflicting.length ? "Conflicting or stale role evidence." : "Too much value depends on development.",
    strategicConsistency: strategyCopy,
    strongestRosterArea: state.roster.at(-1)?.position || "Quarterback",
    weakestRosterArea: state.needs[0] || "Depth remains the open question",
    modelHumanDisagreement: "The model values visible flexibility; a human manager may prefer the player they trust most.",
    reasonableAlternative: alternateStrategy(state.strategy),
  });
}

export function scarcity(state, position) {
  const count = state.scarcity[position] || 0;
  return count >= 3 ? "thin" : count >= 1 ? "moving" : "deep";
}

function chooseTarget(items, targetId) {
  const selected = targetId ? items.find((item) => item.publicId === targetId) : items[0];
  if (!selected) throw new RangeError("That fictional player is no longer available.");
  return selected;
}

function seededOrder(items, seed) {
  return [...items].sort((a, b) => hash(`${seed}-${a.publicId}`) - hash(`${seed}-${b.publicId}`));
}

function hash(value) {
  let total = 2166136261;
  for (const character of value) total = Math.imul(total ^ character.charCodeAt(0), 16777619);
  return total >>> 0;
}

function dimension(band, reason) { return Object.freeze({ band, reason }); }
function labelStrategy(id) { return STRATEGIES.find((item) => item.id === id).label; }
function alternateStrategy(strategy) {
  if (strategy === "contender") return "A reasonable Rebuild would keep more future capital and accept a weaker current lineup.";
  if (strategy === "rebuild") return "A reasonable Contender would spend flexibility on a stable veteran role.";
  return "A reasonable specialist plan could lean harder toward either immediate contention or a longer rebuild.";
}
function requirePhase(state, phase) { if (state.phase !== phase) throw new Error(`Expected ${phase}; received ${state.phase}.`); }
function update(state, patch) { return freeze({ ...state, ...patch }); }
function freeze(state) {
  return Object.freeze({
    ...state,
    board: Object.freeze([...state.board]),
    veterans: Object.freeze([...state.veterans]),
    roster: Object.freeze([...state.roster]),
    needs: Object.freeze([...state.needs]),
    capital: Object.freeze({ ...state.capital }),
    decisions: Object.freeze([...state.decisions]),
    roomPicks: Object.freeze([...state.roomPicks]),
    consequences: Object.freeze([...state.consequences]),
    scarcity: Object.freeze({ ...state.scarcity }),
  });
}
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) deepFreeze(item);
  return value;
}
