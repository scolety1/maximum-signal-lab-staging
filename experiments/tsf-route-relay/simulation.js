import {
  OUTCOME_TYPES,
  applyScoreDelta,
  averageScore,
  createInitialScores,
  createOutcomeData,
} from "../capsule-core/outcome.js";
import {
  createLocalSeed,
  hashSeed,
  shuffleWithSeed,
} from "../capsule-core/seeded-random.js";
import { SCENARIOS, getScenarioById } from "./scenarios.js";

export function createRun(seed = createLocalSeed()) {
  const normalizedSeed = String(seed);
  const scenario = resolveScenario(normalizedSeed);

  return {
    seed: normalizedSeed,
    scenarioId: scenario.id,
    gateIndex: 0,
    scores: createInitialScores(),
    decisions: [],
    violations: 0,
    terminalHint: null,
    complete: false,
  };
}

export function getScenario(run) {
  const scenario = getScenarioById(run.scenarioId);
  if (!scenario) throw new Error(`Unknown scenario: ${run.scenarioId}`);
  return scenario;
}

export function getCurrentGate(run) {
  if (run.complete) return null;
  return getScenario(run).gates[run.gateIndex] || null;
}

export function getOrderedChoices(run) {
  const gate = getCurrentGate(run);
  if (!gate) return [];
  return shuffleWithSeed(gate.choices, `${run.seed}:${gate.id}:choices`);
}

export function applyDecision(run, choiceId) {
  if (run.complete) {
    throw new Error("Cannot apply a decision to a completed run.");
  }

  const scenario = getScenario(run);
  const gate = getCurrentGate(run);
  const choice = gate?.choices.find((candidate) => candidate.id === choiceId);

  if (!gate || !choice) {
    throw new RangeError(`Choice "${choiceId}" is not valid for the current gate.`);
  }

  const nextIndex = run.gateIndex + 1;
  const complete = nextIndex >= scenario.gates.length;
  const effect = choice.effect || {};

  return {
    ...run,
    gateIndex: nextIndex,
    scores: applyScoreDelta(run.scores, choice.deltas),
    decisions: [
      ...run.decisions,
      {
        gateId: gate.id,
        stage: gate.stage,
        choiceId: choice.id,
        label: choice.label,
        consequence: choice.consequence,
        strong: choice.recommended,
      },
    ],
    violations: run.violations + (effect.violation || 0),
    terminalHint: effect.terminal || run.terminalHint,
    complete,
  };
}

export function finalizeRun(run) {
  if (!run.complete) {
    throw new Error("Cannot finalize an incomplete run.");
  }

  const score = averageScore(run.scores);
  let type = OUTCOME_TYPES.PARTIAL;

  if (run.violations >= 2 || run.terminalHint === "failed" || score < 40) {
    type = OUTCOME_TYPES.FAILED_ROUTE;
  } else if (run.terminalHint === "safe-stop") {
    type = OUTCOME_TYPES.SAFE_STOP;
  } else if (run.terminalHint === "success" && score >= 70 && run.violations === 0) {
    type = OUTCOME_TYPES.SUCCESS;
  }

  return createOutcomeData({
    type,
    seed: run.seed,
    scenarioId: run.scenarioId,
    scores: run.scores,
    decisions: run.decisions,
    summary: outcomeSummary(type),
  });
}

export function getRecommendedChoice(run) {
  return getCurrentGate(run)?.choices.find((choice) => choice.recommended) || null;
}

function resolveScenario(seed) {
  if (seed.startsWith("scenario:")) {
    const explicit = getScenarioById(seed.slice("scenario:".length));
    if (explicit) return explicit;
  }

  return SCENARIOS[hashSeed(seed) % SCENARIOS.length];
}

function outcomeSummary(type) {
  const summaries = {
    [OUTCOME_TYPES.SUCCESS]: "Decision-ready preview: the route is bounded and evidenced without claiming execution.",
    [OUTCOME_TYPES.PARTIAL]: "Useful handoff: the route preserved evidence and identified the next authority or recovery decision.",
    [OUTCOME_TYPES.SAFE_STOP]: "Defensible safe stop: risk or conflict was contained while a future revision path remained visible.",
    [OUTCOME_TYPES.FAILED_ROUTE]: "Failed route: one or more choices crossed scope, evidence, or authority boundaries.",
  };

  return summaries[type];
}
