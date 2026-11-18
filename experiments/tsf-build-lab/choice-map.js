import { BUILD_TYPES, COMPLEXITIES } from "./catalog.js";

export function createChoiceMap(configuration, decisions, recipe, validation) {
  const type = BUILD_TYPES[configuration.type];
  const complexity = COMPLEXITIES.find((item) => item.id === configuration.complexity);
  return Object.freeze([
    connection("Build type", type.label, outputFor(recipe)),
    connection("Main feature", labelFor(type.features, configuration.feature), featureEffect(recipe)),
    connection("Amount of detail", complexity.label, complexityEffect(recipe)),
    connection("How it works", labelFor(type.interactions, configuration.interaction), interactionEffect(recipe)),
    connection("Visual direction", decisions.proposal === "approve" ? "Bolder option" : "Original option", proposalEffect(recipe)),
    connection("Testing", validationChoice(validation), validationEffect(validation)),
  ]);
}

function outputFor(recipe) {
  if (recipe.type === "landing") return `${landingLayoutLabel(recipe.layout)} page layout`;
  if (recipe.type === "game") return `${humanize(recipe.objective)} arena`;
  return `${densityLabel(recipe.density)} dashboard layout`;
}

function featureEffect(recipe) {
  if (recipe.type === "landing") return `${recipe.sectionCount} interactive story sections`;
  if (recipe.type === "game") return `${recipe.rounds} rounds built around ${humanize(recipe.objective)}`;
  return `${dashboardPanelLabel(recipe.feature)} leads the main workspace`;
}

function complexityEffect(recipe) {
  if (recipe.type === "game") return `${humanize(recipe.arenaLayout)} arena, ${recipe.hazardCount} hazards`;
  if (recipe.type === "landing") return `${recipe.sectionCount} sections with ${humanize(recipe.contentTone)} copy`;
  return `${recipe.kpiCount} connected metrics and an activity trend`;
}

function interactionEffect(recipe) {
  if (recipe.type === "game") return `${humanize(recipe.movement)} plus keyboard and touch`;
  if (recipe.type === "landing") return `${landingInteractionLabel(recipe.interaction)} changes visible page state`;
  return `${dashboardInteractionLabel(recipe.filters)} is the primary dashboard control`;
}

function proposalEffect(recipe) {
  if (recipe.type === "landing") return `${humanize(recipe.hero)} hero treatment`;
  if (recipe.type === "game") return `${humanize(recipe.hazardMode)} hazard behavior`;
  return `${warningLabel(recipe.alerts)} warning treatment`;
}

function validationEffect(validation) {
  if (!validation?.outcome) return "Controls, result, and protected rule checked";
  if (validation.outcome.requiresRepair) return `${validation.outcome.revisionDepth} focused ${validation.outcome.revisionDepth === 1 ? "fix" : "fixes"} completed`;
  return validation.outcome.reason;
}

function validationChoice(validation) {
  const outcome = validation?.outcome;
  if (!outcome) return "Everything passed";
  if (outcome.id === "major-revision") return "Two connected fixes completed";
  if (outcome.id === "visitor-caused-conflict") return "Interaction fixed";
  if (outcome.id === "minor-repair") return "Small fix completed";
  if (outcome.id === "prevented-failure") return "Earlier choice avoided a problem";
  return "Everything passed";
}

function landingLayoutLabel(value) { return ({ "hero-first": "focused hero", "split-story": "split story", "modular-grid": "modular" })[value] || humanize(value); }
function densityLabel(value) { return ({ focused: "focused", layered: "layered", dense: "packed", compact: "compact" })[value] || humanize(value); }
function dashboardPanelLabel(value) { return ({ "kpi-grid": "key metrics", "trend-chart": "the trend", "activity-feed": "recent activity" })[value] || humanize(value); }
function landingInteractionLabel(value) { return ({ "theme-shift": "switching the theme", "section-jump": "highlighting sections", "signal-launch": "activating the proof" })[value] || humanize(value); }
function dashboardInteractionLabel(value) { return ({ "time-filter": "time filters", "category-filter": "group filters", "alert-toggle": "warning controls" })[value] || humanize(value); }
function warningLabel(value) { return ({ calm: "calm", prominent: "prominent", standard: "standard" })[value] || humanize(value); }

function connection(label, choice, effect) { return Object.freeze({ label, choice, effect }); }
function labelFor(options, id) { return options.find((item) => item.id === id)?.label || humanize(id); }
function humanize(value) { return String(value).replaceAll("-", " "); }
