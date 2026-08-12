export const SCORE_DIMENSIONS = Object.freeze([
  Object.freeze({ id: "scope", label: "Scope discipline" }),
  Object.freeze({ id: "safety", label: "Safety" }),
  Object.freeze({ id: "evidence", label: "Evidence quality" }),
  Object.freeze({ id: "efficiency", label: "Execution efficiency" }),
  Object.freeze({ id: "recovery", label: "Recovery quality" }),
]);

export const OUTCOME_TYPES = Object.freeze({
  SUCCESS: "success",
  PARTIAL: "partial",
  SAFE_STOP: "safe-stop",
  FAILED_ROUTE: "failed-route",
});

export function createInitialScores(initialValue = 50) {
  return Object.fromEntries(
    SCORE_DIMENSIONS.map(({ id }) => [id, clampScore(initialValue)]),
  );
}

export function applyScoreDelta(scores, delta = {}) {
  const next = {};

  for (const { id } of SCORE_DIMENSIONS) {
    next[id] = clampScore((scores[id] ?? 0) + (delta[id] ?? 0));
  }

  return next;
}

export function averageScore(scores) {
  const total = SCORE_DIMENSIONS.reduce(
    (sum, { id }) => sum + clampScore(scores[id] ?? 0),
    0,
  );

  return Math.round(total / SCORE_DIMENSIONS.length);
}

export function createOutcomeData({
  type,
  seed,
  scenarioId,
  scores,
  decisions,
  summary,
}) {
  if (!Object.values(OUTCOME_TYPES).includes(type)) {
    throw new TypeError(`Unknown outcome type: ${type}`);
  }

  return Object.freeze({
    schemaVersion: 1,
    capsuleId: "tsf-route-relay",
    type,
    seed: String(seed),
    scenarioId: String(scenarioId),
    score: averageScore(scores),
    scores: Object.freeze({ ...scores }),
    decisions: Object.freeze(
      decisions.map((decision) => Object.freeze({ ...decision })),
    ),
    summary: String(summary),
  });
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}
