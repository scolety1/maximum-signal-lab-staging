import { BUILD_TYPES, COMPLEXITIES, LANE_DEFINITIONS, STYLES } from "./catalog.js";
import { assembleArtifactRecipe } from "./artifact-recipes.js";
import { selectValidationOutcome } from "./validation-outcomes.js";

export const MISSION_STAGES = Object.freeze({
  CONFIGURED: "configured",
  RUNNING: "running",
  AMBIGUITY: "ambiguity",
  REVIEW: "review",
  VALIDATION: "validation",
  INTEGRATING: "integrating",
  COMPLETE: "complete",
});

export function createMission(configuration, seed = "build-lab-default") {
  validateConfiguration(configuration);
  return freezeMission({
    schemaVersion: 3,
    seed: String(seed),
    stage: MISSION_STAGES.CONFIGURED,
    tick: 0,
    configuration: { pace: "normal", ...configuration },
    decisions: { priority: null, proposal: null },
    lanes: createLanes(),
    validation: { status: "pending", outcome: null },
    revisionCount: 0,
    integrationProgress: 0,
    recipe: null,
    eventLog: [event("brief-ready", "The build brief is ready in this browser.")],
  });
}

export function launchMission(mission) {
  requireStage(mission, MISSION_STAGES.CONFIGURED);
  const lanes = mapLanes(mission.lanes, (lane) => lane.dependencies.length === 0 ? { ...lane, state: "running" } : lane);
  return update(mission, {
    stage: MISSION_STAGES.RUNNING,
    lanes,
    eventLog: addEvent(mission, "team-started", "The lead builder split the brief across five workers."),
  });
}

export function advanceMission(mission) {
  if (mission.stage === MISSION_STAGES.VALIDATION) return beginAutomaticRepair(mission);
  if (mission.stage === MISSION_STAGES.INTEGRATING) return advanceIntegration(mission);
  requireStage(mission, MISSION_STAGES.RUNNING);

  const tick = mission.tick + 1;
  let lanes = mapLanes(mission.lanes, (lane) => advanceLane(lane));

  if (!mission.decisions.priority && tick >= 2) {
    return update(mission, {
      tick,
      lanes,
      stage: MISSION_STAGES.AMBIGUITY,
      eventLog: addEvent(mission, "question", "The build team needs one product priority."),
    });
  }

  if (mission.decisions.priority && !mission.decisions.proposal && tick >= 5) {
    return update(mission, {
      tick,
      lanes,
      stage: MISSION_STAGES.REVIEW,
      eventLog: addEvent(mission, "option-ready", "The Interface worker prepared two visual options for review."),
    });
  }

  lanes = activateReadyLanes(lanes);
  let validation = mission.validation;
  let eventLog = mission.eventLog;

  if (lanes.testing.state === "passed" && validation.status === "pending") {
    const outcome = selectValidationOutcome(mission.configuration, mission.decisions, mission.seed);
    validation = { status: outcome.requiresRepair ? "failed" : "passed", outcome };
    lanes = {
      ...lanes,
      testing: { ...lanes.testing, state: outcome.requiresRepair ? "failed" : "passed", artifact: productPart("test-result", outcome.label, outcome.requiresRepair ? "failed" : "passed") },
      review: outcome.requiresRepair ? { ...lanes.review, state: "waiting", progress: 0, artifact: null } : lanes.review,
    };
    eventLog = addEvent(mission, outcome.id, `${outcome.label}. ${outcome.reason}`);
    if (outcome.requiresRepair) return update(mission, { tick, lanes, validation, stage: MISSION_STAGES.VALIDATION, eventLog });
    lanes = activateReadyLanes(lanes);
  } else if (lanes.testing.state === "passed" && validation.status === "repairing") {
    validation = { ...validation, status: "passed" };
    lanes = { ...lanes, testing: { ...lanes.testing, artifact: productPart("test-result", "Repair passed", "passed") } };
    lanes = activateReadyLanes(lanes);
    eventLog = addEvent(mission, "repair-passed", "The repaired build passed testing and moved to Final Review.");
  }

  if (lanes.review.state === "passed") {
    return update(mission, {
      tick,
      lanes,
      validation,
      stage: MISSION_STAGES.INTEGRATING,
      integrationProgress: 0,
      eventLog: addEvent({ ...mission, eventLog }, "final-build", "Approved parts are joining into the finished product."),
    });
  }

  return update(mission, { tick, lanes, validation, eventLog });
}

export function resolveAmbiguity(mission, priority) {
  requireStage(mission, MISSION_STAGES.AMBIGUITY);
  if (!["motion", "speed"].includes(priority)) throw new RangeError("Priority must be motion or speed.");
  return update(mission, {
    stage: MISSION_STAGES.RUNNING,
    decisions: { ...mission.decisions, priority },
    eventLog: addEvent(mission, "question-answered", `${priority === "motion" ? "Expressive feedback" : "Fast response"} became the product priority.`),
  });
}

export function resolveProposal(mission, decision) {
  requireStage(mission, MISSION_STAGES.REVIEW);
  if (!["approve", "reject"].includes(decision)) throw new RangeError("Proposal decision must be approve or reject.");
  return update(mission, {
    stage: MISSION_STAGES.RUNNING,
    decisions: { ...mission.decisions, proposal: decision },
    eventLog: addEvent(mission, "option-chosen", `The expressive option was ${decision === "approve" ? "selected" : "declined"}.`),
  });
}

export function beginAutomaticRepair(mission) {
  requireStage(mission, MISSION_STAGES.VALIDATION);
  const repairLanes = new Set(mission.validation.outcome.repairLanes);
  const lanes = mapLanes(mission.lanes, (lane) => repairLanes.has(lane.id)
    ? { ...lane, state: "revising", progress: 52, artifact: productPart(`${lane.id}-revision`, `${lane.label} revision`, "revising") }
    : lane);
  const resetLanes = {
    ...lanes,
    testing: { ...lanes.testing, state: "waiting", progress: 0, artifact: null },
    review: { ...lanes.review, state: "waiting", progress: 0, artifact: null },
  };
  return update(mission, {
    stage: MISSION_STAGES.RUNNING,
    lanes: resetLanes,
    validation: { ...mission.validation, status: "repairing" },
    revisionCount: mission.revisionCount + mission.validation.outcome.revisionDepth,
    eventLog: Object.freeze([
      ...mission.eventLog,
      event("defect-diagnosed", `TSF matched the failed evidence to ${mission.validation.outcome.issueLabel.toLowerCase()}.`),
      event("repair-started", `${mission.validation.outcome.issueLabel} returned to ${workerList(mission.validation.outcome.repairLanes)} for a bounded repair.`),
    ]),
  });
}

export function validateConfiguration(configuration) {
  const type = BUILD_TYPES[configuration?.type];
  if (!type) throw new TypeError("Choose a valid build type.");
  if (!type.audiences.some((item) => item.id === configuration.audience)) throw new TypeError("Choose a valid audience.");
  if (!STYLES.some((item) => item.id === configuration.style)) throw new TypeError("Choose a valid visual style.");
  if (!type.features.some((item) => item.id === configuration.feature)) throw new TypeError("Choose a valid primary feature.");
  if (!COMPLEXITIES.some((item) => item.id === configuration.complexity)) throw new TypeError("Choose a valid complexity.");
  if (!type.interactions.some((item) => item.id === configuration.interaction)) throw new TypeError("Choose a valid interaction.");
  if (!type.constraints.some((item) => item.id === configuration.constraint)) throw new TypeError("Choose a valid constraint.");
  if (configuration.pace && !["normal", "quick"].includes(configuration.pace)) throw new TypeError("Choose normal or Quick Build pace.");
  return true;
}

function advanceIntegration(mission) {
  const step = mission.configuration.pace === "quick" ? 50 : 25;
  const integrationProgress = Math.min(100, mission.integrationProgress + step);
  if (integrationProgress < 100) return update(mission, { integrationProgress });
  const recipe = assembleArtifactRecipe(mission.configuration, mission.decisions, mission.validation.outcome);
  return update(mission, {
    stage: MISSION_STAGES.COMPLETE,
    integrationProgress,
    recipe,
    eventLog: addEvent(mission, "build-complete", "Build complete. The product is ready to use."),
  });
}

function advanceLane(lane) {
  if (!["running", "revising"].includes(lane.state)) return lane;
  const progress = Math.min(100, lane.progress + lane.speed);
  if (progress < 100) return { ...lane, progress };
  return { ...lane, progress, state: "passed", artifact: productPart(`${lane.id}-preview`, `${lane.label} preview`, "passed") };
}

function activateReadyLanes(lanes) {
  let next = { ...lanes };
  for (const definition of LANE_DEFINITIONS) {
    const lane = next[definition.id];
    if (lane.state !== "waiting") continue;
    if (definition.dependencies.every((id) => next[id].state === "passed")) next[definition.id] = { ...lane, state: "running" };
  }
  return next;
}

function createLanes() {
  return Object.freeze(Object.fromEntries(LANE_DEFINITIONS.map((definition) => [definition.id, Object.freeze({ ...definition, state: "waiting", progress: 0, artifact: null })])));
}

function mapLanes(lanes, mapper) { return Object.fromEntries(Object.entries(lanes).map(([id, lane]) => [id, mapper(lane)])); }
function update(mission, patch) { return freezeMission({ ...mission, ...patch }); }
function productPart(id, label, status) { return Object.freeze({ id, label, status }); }
function event(id, message) { return Object.freeze({ id, message }); }
function addEvent(mission, id, message) { return [...mission.eventLog, event(id, message)]; }
function workerList(lanes) { return lanes.map((id) => `${id === "logic" ? "Interaction" : capitalize(id)} worker`).join(" and "); }
function capitalize(value) { return value[0].toUpperCase() + value.slice(1); }

function freezeMission(mission) {
  return Object.freeze({
    ...mission,
    configuration: Object.freeze({ ...mission.configuration }),
    decisions: Object.freeze({ ...mission.decisions }),
    lanes: Object.freeze(Object.fromEntries(Object.entries(mission.lanes).map(([id, lane]) => [id, Object.freeze({ ...lane })]))),
    validation: Object.freeze({ ...mission.validation }),
    eventLog: Object.freeze([...mission.eventLog]),
  });
}

function requireStage(mission, stage) {
  if (mission.stage !== stage) throw new Error(`Expected mission stage ${stage}; received ${mission.stage}.`);
}
