import { BUILD_TYPES, COMPLEXITIES, STYLES } from "./catalog.js";

export function assembleArtifactRecipe(configuration, decisions = {}, validationOutcome = null) {
  const type = BUILD_TYPES[configuration.type];
  const style = STYLES.find((item) => item.id === configuration.style);
  const complexity = COMPLEXITIES.find((item) => item.id === configuration.complexity);
  if (!type || !style || !complexity) throw new TypeError("Product configuration is incomplete.");

  const shared = {
    schemaVersion: 2,
    type: type.id,
    title: configuration.name || defaultName(type.id, style.id),
    audience: configuration.audience,
    style: style.id,
    accent: style.accent,
    accent2: style.accent2,
    complexity: complexity.id,
    complexityLevel: complexity.value + 1,
    feature: configuration.feature,
    interaction: configuration.interaction,
    constraint: configuration.constraint,
    priority: decisions.priority || "balance",
    proposal: decisions.proposal || "original",
    validationOutcome: validationOutcome?.id || "not-run",
  };

  if (type.id === "landing") return Object.freeze({
    ...shared,
    layout: complexity.id === "focused" ? "hero-first" : complexity.id === "layered" ? "split-story" : "modular-grid",
    hero: shared.proposal === "approve" ? "kinetic" : "structured",
    sectionCount: 2 + shared.complexityLevel,
    navigation: configuration.constraint === "single-screen" ? "compact-nav" : "section-nav",
    cta: shared.priority === "motion" ? "animated" : "direct",
    contentTone: configuration.audience === "recruiters" ? "evidence-led" : configuration.audience === "community" ? "welcoming" : "benefit-led",
    proofMode: configuration.feature === "live-proof" ? "counter" : configuration.feature === "story-scroll" ? "story-steps" : "feature-cards",
    loadMode: configuration.constraint === "fast-load" ? "lean" : "standard",
  });

  if (type.id === "game") {
    const timerMode = configuration.constraint === "no-timer" ? "turns" : "countdown";
    const hazardMode = configuration.constraint === "low-motion"
      ? "static"
      : shared.proposal === "approve"
        ? (complexity.id === "dense" ? "chase" : "patrol")
        : configuration.feature === "survive" ? "pulse" : "static";
    return Object.freeze({
      ...shared,
      objective: configuration.feature,
      arenaSize: 6 + Math.min(1, complexity.value),
      arenaLayout: complexity.id === "focused" ? "open" : complexity.id === "layered" ? "lanes" : "crossfire",
      hazardCount: 1 + shared.complexityLevel,
      obstacleCount: 1 + shared.complexityLevel,
      targetCount: configuration.feature === "survive" ? 0 : configuration.feature === "collect" ? 2 + shared.complexityLevel : 2,
      movement: configuration.interaction,
      timerMode,
      roundDuration: configuration.audience === "quick-play" ? 30 : configuration.audience === "score-chasers" ? 45 : 36,
      turnLimit: 24 + shared.complexityLevel * 6,
      rounds: complexity.id === "focused" ? 2 : 3,
      hazardMode,
      hazardCadence: configuration.audience === "score-chasers" ? 2 : 3,
      powerUp: "shield",
      startingShields: configuration.audience === "quick-play" ? 2 : 1,
      scoreMultiplier: configuration.audience === "score-chasers" ? 1.5 : 1,
      feedbackMode: shared.priority === "motion" && configuration.constraint !== "low-motion" ? "burst" : "crisp",
      difficulty: configuration.audience === "quick-play" ? "welcoming" : configuration.audience === "score-chasers" ? "sharp" : "exploratory",
    });
  }

  return Object.freeze({
    ...shared,
    density: configuration.constraint === "compact" ? "compact" : complexity.id,
    chart: configuration.feature === "trend-chart" ? "bars" : configuration.feature === "activity-feed" ? "pulse" : "spark",
    filters: configuration.interaction,
    kpiCount: 2 + shared.complexityLevel,
    alerts: configuration.constraint === "calm-alerts" ? "calm" : shared.proposal === "approve" ? "prominent" : "standard",
    feedLength: 3 + shared.complexityLevel,
    primaryPanel: configuration.feature,
    emptyState: configuration.audience === "analysts" ? "data-guidance" : "action-guidance",
    tableFallback: configuration.constraint === "table-fallback",
    updateMode: shared.priority === "speed" ? "instant" : "animated",
  });
}

function defaultName(type, style) {
  const names = {
    landing: { signal: "Signal Launch", editorial: "Field Notes", playful: "Brightside" },
    game: { signal: "Signal Runner", editorial: "Redline", playful: "Beacon Bounce" },
    dashboard: { signal: "Pulse Board", editorial: "Briefing Room", playful: "Project Pop" },
  };
  return names[type][style];
}
