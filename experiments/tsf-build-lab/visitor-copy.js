export const BUILD_COPY = deepFreeze({
  title: "TSF Build Lab",
  premise: "Choose a project, shape it, watch the work come together, then try the result.",
  boundaryTitle: "Runs locally in this portfolio",
  boundary: "This scripted demo runs in your browser. It does not call live AI or change a real project.",
  phases: ["Choose", "Build", "Test", "Try it"],
  phaseLabels: {
    choose: "Choose what to build",
    configure: "Set up your project",
    orchestrate: "Your build team",
    result: "Your project is ready",
  },
  status: {
    choose: "Pick one small project to begin.",
    configure: "Your choices will shape the finished result.",
    configured: "Your choices are ready.",
    running: "Three tasks are running together.",
    ambiguity: "One choice is waiting for you.",
    review: "Choose a visual direction.",
    validation: "Testing found a bounded problem. TSF is diagnosing it.",
    repairing: "TSF routed the safe fix and is running the checks again.",
    integrating: "Putting it together…",
    complete: "Try what you built.",
  },
  actions: {
    buildThis: "Build this",
    changeType: "Change project type",
    start: "Start build",
    choosePriority: "Choose this",
    keepOriginal: "Keep the original",
    chooseBold: "Use the bolder version",
    openProgress: "See progress",
    openPreview: "Open preview",
    buildQuickly: "Rebuild these choices — quick",
    buildAgain: "Rebuild these choices",
    changeChoices: "Change choices",
    buildAnother: "Build something else",
    howItWorks: "How it works",
    tryIt: "Try it",
  },
  announcements: {
    buildStarted: "Build started. Three tasks are running together.",
    priorityNeeded: "One choice is waiting for you.",
    directionNeeded: "Choose a visual direction.",
    validationNeeded: "Testing found a bounded problem. TSF is diagnosing it automatically.",
    choiceSaved: "Choice saved. The build is continuing.",
    repairStarted: "TSF routed the safe fix and is running the checks again.",
    repairPassed: "The updated version passed.",
    complete: (title) => `${title} is ready to try.`,
  },
});

export const WORKER_COPY = deepFreeze({
  interface: {
    name: "Design",
    task: "Shapes the layout, hierarchy, and mobile view",
    preview: "Responsive layout",
  },
  logic: {
    name: "Interactions",
    task: "Connects the controls and interaction rules",
    preview: "Working controls",
  },
  content: {
    name: "Content",
    task: "Writes the labels and helpful guidance",
    preview: "Audience-ready content",
  },
  testing: {
    name: "Testing",
    task: "Tests the controls, result, and rule you chose",
    preview: "Test results",
  },
  review: {
    name: "Independent Verifier",
    task: "Checks evidence and protected requirements independently of worker output",
    preview: "Evidence and final check",
  },
});

export const ARTIFACT_COPY = deepFreeze({
  landing: {
    audience: {
      customers: {
        eyebrow: "Make the first choice easier",
        headline: "See the value. Try the proof.",
        subhead: "See the main benefit, then try it for yourself.",
      },
      recruiters: {
        eyebrow: "Show the work",
        headline: "Work you can inspect.",
        subhead: "See the decisions, the implementation, and a working result.",
      },
      community: {
        eyebrow: "Made to explore together",
        headline: "Find the signal. Share the idea.",
        subhead: "An inviting page that makes the central idea easy to explore and share.",
      },
    },
    actions: {
      "theme-shift": "Switch theme",
      "section-jump": "Show next section",
      "signal-launch": "Try the proof",
    },
  },
  dashboard: {
    title: "Working dashboard",
    purposes: {
      operators: "Today's work and next steps",
      founders: "Progress and risk",
      analysts: "Trends and supporting data",
    },
    panels: {
      "kpi-grid": "Key metrics",
      "trend-chart": "Delivery trend",
      "activity-feed": "Recent activity",
    },
    chart: {
      spark: "Activity trend",
      bars: "Delivery trend",
      pulse: "Work pulse",
    },
  },
  game: {
    label: "Mini-game",
    objectives: {
      collect: "Collect every signal before each round ends",
      survive: "Survive every hazard wave",
      beacon: "Activate every beacon before each round ends",
    },
  },
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) deepFreeze(item);
  return value;
}
