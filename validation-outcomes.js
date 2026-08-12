const RISKY_CONSTRAINTS = Object.freeze({ landing: "high-contrast", game: "low-motion", dashboard: "calm-alerts" });

export const VALIDATION_OUTCOMES = Object.freeze({
  CLEAN: "clean-pass",
  MINOR_REPAIR: "minor-repair",
  PREVENTED: "prevented-failure",
  VISITOR_CONFLICT: "visitor-caused-conflict",
  MAJOR_REVISION: "major-revision",
});

export function selectValidationOutcome(configuration, decisions, seed = "validation-default") {
  const riskyConstraint = RISKY_CONSTRAINTS[configuration.type];
  const seedBucket = stableHash(`${seed}:${configuration.type}:${configuration.feature}:${configuration.interaction}`) % 5;

  if (configuration.constraint === riskyConstraint && decisions.proposal === "approve") {
    return outcome({
      id: VALIDATION_OUTCOMES.VISITOR_CONFLICT,
      label: "Interaction needs repair",
      summary: "The approved treatment conflicts with a constraint from your brief.",
      reason: conflictReason(configuration),
      requiresRepair: true,
      issueId: configuration.type === "game" ? "motion-safety" : "visual-priority",
      issueLabel: configuration.type === "game" ? "Motion safety" : "Visual priority",
      repairLanes: configuration.type === "game" ? ["logic"] : ["interface"],
      revisionDepth: 1,
      kind: "visitor-conflict",
    });
  }

  if ((configuration.constraint === riskyConstraint && decisions.proposal === "reject") ||
      (configuration.constraint === "fast-load" && decisions.priority === "speed")) {
    return outcome({
      id: VALIDATION_OUTCOMES.PREVENTED,
      label: "Issue prevented",
      summary: "Your earlier decision prevented a likely conflict before testing.",
      reason: decisions.proposal === "reject"
        ? "Keeping the restrained treatment protected the pinned constraint."
        : "Choosing fast response kept the page inside its load budget.",
      requiresRepair: false,
      issueId: null,
      issueLabel: null,
      repairLanes: [],
      revisionDepth: 0,
      kind: "prevented",
    });
  }

  if (configuration.complexity === "dense" && (decisions.proposal === "approve" || seedBucket >= 2)) {
    return outcome({
      id: VALIDATION_OUTCOMES.MAJOR_REVISION,
      label: "Major revision needed",
      summary: "The dense build works in pieces, but the combined controls and layout collide.",
      reason: "The selected density and expressive treatment need a coordinated interface and interaction revision.",
      requiresRepair: true,
      issueId: "combined-complexity",
      issueLabel: "Combined complexity",
      repairLanes: ["interface", "logic"],
      revisionDepth: 2,
      kind: "major",
    });
  }

  if (configuration.complexity === "focused" || seedBucket === 0) {
    return outcome({
      id: VALIDATION_OUTCOMES.CLEAN,
      label: "Clean test pass",
      summary: "The build passed its controls, outcome, and constraint checks without repair.",
      reason: "The focused scope and selected interaction fit without a conflict.",
      requiresRepair: false,
      issueId: null,
      issueLabel: null,
      repairLanes: [],
      revisionDepth: 0,
      kind: "clean",
    });
  }

  return outcome({
    id: VALIDATION_OUTCOMES.MINOR_REPAIR,
    label: "Minor repair needed",
    summary: "One finishing detail does not match the selected audience and control style.",
    reason: "The layered build needs a small content and control-label adjustment before final review.",
    requiresRepair: true,
    issueId: "guidance-fit",
    issueLabel: "Control guidance",
    repairLanes: ["content"],
    revisionDepth: 1,
    kind: "minor",
  });
}

function conflictReason(configuration) {
  if (configuration.type === "landing") return "The kinetic treatment weakens the high-contrast-first requirement you selected.";
  if (configuration.type === "game") return "The moving hazard treatment conflicts with the low-motion-first requirement you selected.";
  return "The prominent warning treatment conflicts with the calm-alert language requirement you selected.";
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function outcome(value) {
  return Object.freeze({ ...value, repairLanes: Object.freeze([...value.repairLanes]) });
}
