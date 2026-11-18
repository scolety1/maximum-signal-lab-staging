import { WORKER_COPY } from "./visitor-copy.js";

export const BUILD_TYPES = Object.freeze({
  landing: Object.freeze({
    id: "landing",
    label: "Landing page",
    icon: "LP",
    description: "Build a responsive page with navigation and one working interaction.",
    audiences: options(["customers", "Customers"], ["recruiters", "Recruiters"], ["community", "Community"]),
    features: options(["feature-grid", "Feature cards"], ["story-scroll", "Guided story"], ["live-proof", "Interactive proof"]),
    interactions: options(["theme-shift", "Switch theme"], ["section-jump", "Highlight sections"], ["signal-launch", "Activate proof"]),
    constraints: options(["fast-load", "Fast loading"], ["single-screen", "Keep it compact"], ["high-contrast", "High contrast"]),
  }),
  game: Object.freeze({
    id: "game",
    label: "Browser game",
    icon: "GM",
    description: "Build a short arena game with rounds, hazards, shields, and a score.",
    audiences: options(["quick-play", "Quick players"], ["score-chasers", "Score chasers"], ["explorers", "Explorers"]),
    features: options(["beacon", "Activate beacons"], ["collect", "Collect signals"], ["survive", "Survive the wave"]),
    interactions: options(["grid-move", "Direction buttons"], ["target-click", "Tap adjacent tiles"], ["hybrid", "Both"]),
    constraints: options(["no-timer", "No forced timer"], ["one-hand", "One-hand controls"], ["low-motion", "Low-motion first"]),
  }),
  dashboard: Object.freeze({
    id: "dashboard",
    label: "Product dashboard",
    icon: "DB",
    description: "Build a working dashboard with filters, metrics, warnings, and recent activity.",
    audiences: options(["operators", "Operators"], ["founders", "Founders"], ["analysts", "Analysts"]),
    features: options(["kpi-grid", "Key metrics"], ["trend-chart", "Trend chart"], ["activity-feed", "Recent activity"]),
    interactions: options(["time-filter", "Time filters"], ["category-filter", "Category filters"], ["alert-toggle", "Warning controls"]),
    constraints: options(["compact", "Compact layout"], ["calm-alerts", "Calm warnings"], ["table-fallback", "Table view available"]),
  }),
});

export const STYLES = options(
  ["signal", "Electric", "#70e1f5", "#a78bfa"],
  ["editorial", "Editorial", "#ffce68", "#ff7b72"],
  ["playful", "Playful", "#6ee7a8", "#60a5fa"],
);

export const COMPLEXITIES = Object.freeze([
  Object.freeze({ id: "focused", label: "Focused", value: 0 }),
  Object.freeze({ id: "layered", label: "Layered", value: 1 }),
  Object.freeze({ id: "dense", label: "Packed", value: 2 }),
]);

export const LANE_DEFINITIONS = Object.freeze([
  lane("interface", WORKER_COPY.interface.name, WORKER_COPY.interface.task, [], 18),
  lane("logic", WORKER_COPY.logic.name, WORKER_COPY.logic.task, [], 16),
  lane("content", WORKER_COPY.content.name, WORKER_COPY.content.task, [], 20),
  lane("testing", WORKER_COPY.testing.name, WORKER_COPY.testing.task, ["interface", "logic", "content"], 25),
  lane("review", WORKER_COPY.review.name, WORKER_COPY.review.task, ["testing"], 34),
]);

function options(...items) {
  return Object.freeze(items.map(([id, label, accent, accent2]) => Object.freeze({ id, label, accent, accent2 })));
}

function lane(id, label, task, dependencies, speed) {
  return Object.freeze({ id, label, task, dependencies: Object.freeze(dependencies), speed });
}
