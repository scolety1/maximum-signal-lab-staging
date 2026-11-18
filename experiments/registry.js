function entry(definition) {
  return Object.freeze({
    status: "experimental",
    maturityLabel: "Lab Preview",
    publicEligible: false,
    telemetry: "none",
    persistence: "session-only",
    input: "Keyboard, pointer, or touch",
    ...definition,
  });
}

const TSF_BUILD_LAB = entry({
  id: "tsf-build-lab",
  title: "TSF Build Lab",
  pitch: "Shape a small digital product, direct visible parallel work, and inspect the verified result.",
  duration: "3–6 minutes",
  trustLabels: Object.freeze(["Runs in this browser", "No live AI or code runner", "No project changes"]),
  styles: Object.freeze(["./capsule-core/capsule-core.css?v=5", "./tsf-build-lab/build-lab.css?v=9"]),
  understand: Object.freeze({
    title: "See how a governed software build moves from brief to working product.",
    paragraphs: Object.freeze([
      "Build Lab is a browser simulation inspired by how Thousand Sunny Fleet keeps software work scoped, visible, tested, and recoverable.",
      "Specialized work lanes follow authored local rules. They are not live agents, a chatbot, or the real TSF runtime.",
    ]),
    proof: Object.freeze([
      "Design, interactions, and content make visible progress in parallel.",
      "Testing and final review wait for the work they depend on.",
      "The finished product opens only after independent checks produce evidence.",
    ]),
  }),
  project: Object.freeze({
    name: "Thousand Sunny Fleet",
    summary: "Local software-routing infrastructure that makes scope, evidence, validation, authority boundaries, receipts, and recovery explicit.",
    repository: "https://github.com/scolety1/Thousand-Sunny-Fleet",
    technologies: Object.freeze(["Node.js platform libraries", "PowerShell wrappers and canonical tools", "HTML, CSS, and JavaScript browser UI", "JSON and JSON Schema contracts", "Loopback-only local process boundaries"]),
    maturity: "Local V1 acceptance candidate; public release status is not asserted.",
    role: "Architecture and implementation work represented through a separate fictional browser build.",
  }),
  capsule: Object.freeze({
    architecture: "Native ES modules, a lifecycle-only Web Component host, immutable simulation transitions, semantic DOM controls, SVG dependencies, project-owned CSS, and on-demand loading.",
    limitations: "Three bounded build recipes; authored options only; no arbitrary generation, live model, task queue, shell, repository write, deployment, approval ledger, or remote service.",
  }),
  load: () => import("./tsf-build-lab/index.js?v=12"),
});

const DRAFT_COMMAND = entry({
  id: "nwr-draft-command",
  title: "Draft Command",
  pitch: "Choose a roster strategy, investigate uncertain evidence, and shape a branching fictional draft plan.",
  duration: "2–4 minutes",
  trustLabels: Object.freeze(["Fictional players and clubs", "League-specific demo", "No private roster data"]),
  styles: Object.freeze(["./capsule-core/capsule-core.css?v=5", "./nwr-draft-command/draft-command.css?v=2"]),
  understand: Object.freeze({
    title: "See how a decision changes when roster goals and evidence quality conflict.",
    paragraphs: Object.freeze([
      "This deterministic browser game draws on Niners War Room decision architecture without using real players, rankings, ownership, or private league data.",
      "Strategy, roster pressure, future capital, and evidence freshness stay visible while several reasonable branches remain possible.",
    ]),
    proof: Object.freeze(["CPU selections create draft pressure.", "Earlier decisions change later branches.", "The debrief compares several dimensions instead of claiming one universal answer."]),
  }),
  project: Object.freeze({
    name: "Niners War Room",
    summary: "A local-first dynasty decision-support system that makes roster construction, evidence, freshness, and uncertainty inspectable.",
    repository: "https://github.com/scolety1/Niners-War-Room",
    technologies: Object.freeze(["JavaScript decision models", "Deterministic simulations", "Local persistence patterns", "Accessible browser interfaces"]),
    maturity: "Source concepts verified locally; this experience is an authored fictional derivative.",
    role: "Product and implementation work represented without real player or private league data.",
  }),
  capsule: Object.freeze({ architecture: "Native ES modules, immutable seeded transitions, semantic controls, and project-owned CSS.", limitations: "Fictional fixtures and simplified strategy logic only; no provider feed, LocalData, private ranking, prediction, account, or network request." }),
  load: () => import("./nwr-draft-command/index.js?v=3"),
});

const SOMMELIER_RUSH = entry({
  id: "wine-sommelier-rush",
  title: "Sommelier Rush",
  pitch: "Serve several fictional tables by balancing pairing, preference, budget, substitution, and patience.",
  duration: "2–4 minutes",
  trustLabels: Object.freeze(["Fictional menu and guests", "No live inventory", "No guest data or analytics"]),
  styles: Object.freeze(["./capsule-core/capsule-core.css?v=5", "./wine-sommelier-rush/sommelier-rush.css?v=2"]),
  understand: Object.freeze({
    title: "Practice explaining a useful compromise while the dining room changes.",
    paragraphs: Object.freeze(["This local game borrows transparent recommendation patterns from Urban Kitchen Wine List, but every bottle, table, price, dish, and outcome is fictional.", "A strong service balances five legible dimensions rather than pretending there is one objectively correct bottle."]),
    proof: Object.freeze(["Seeded service patterns vary the room.", "Unavailable bottles and changed requests require visible substitutions.", "Every service returns concise reasons and partial credit."]),
  }),
  project: Object.freeze({
    name: "Urban Kitchen Wine List",
    summary: "A browsable wine-list concept with explicit filters, pairing context, and recommendation reasons.",
    repository: "https://github.com/scolety1/Urban-Kitchen-Wine-List",
    technologies: Object.freeze(["Structured catalog data", "Deterministic recommendation", "Accessible browser controls"]),
    maturity: "Source patterns verified locally; prices, availability, and expert approval are not asserted.",
    role: "Product and implementation work represented through fictional service scenarios.",
  }),
  capsule: Object.freeze({ architecture: "Native ES modules, deterministic fixtures, immutable scoring transitions, semantic buttons, and project-owned CSS.", limitations: "No AI, restaurant integration, Toast connection, live inventory, expert advice, analytics, or current menu claim." }),
  load: () => import("./wine-sommelier-rush/index.js?v=3"),
});

const FAMILY_TREE = entry({
  id: "family-tree-explorer",
  title: "Interactive Example Tree",
  pitch: "Search, focus, and trace relationships across a warm, read-only fictional family tree.",
  duration: "1–3 minutes",
  trustLabels: Object.freeze(["Fictional example tree", "Read-only", "No private family data"]),
  styles: Object.freeze(["./capsule-core/capsule-core.css?v=5", "./family-tree-explorer/family-tree.css?v=4"]),
  understand: Object.freeze({
    title: "Explore a relationship graph without changing it.",
    paragraphs: Object.freeze(["This public example uses a wholly fictional family to demonstrate fast search, focus, profiles, and relationship paths.", "Private trees use role-aware permissions; this portfolio experience is read-only and never loads a real family record."]),
    proof: Object.freeze(["People are nodes and family relationships are edges.", "Relationship paths are derived with graph traversal.", "Tree and list views keep the same fictional graph usable from desktop through mobile."]),
  }),
  project: Object.freeze({
    name: "Family Tree",
    summary: "A relationship graph with derived family connections, search, focus, and navigable structure.",
    repository: "https://github.com/scolety1/Tree",
    technologies: Object.freeze(["JavaScript", "Firebase Authentication", "Firestore", "Firebase Storage", "Firebase Hosting", "Graph traversal", "Role-aware editing"]),
    maturity: "Public concepts represented with a separate fictional example tree.",
    role: "Product and implementation work represented without private family content.",
  }),
  capsule: Object.freeze({ architecture: "Native ES modules, a deterministic fictional graph, breadth-first relationship traversal, semantic controls, SVG, and project-owned CSS.", limitations: "Read-only fictional example only; no authentication, Firebase connection, private records, editing, invitation, upload, or persistence." }),
  load: () => import("./family-tree-explorer/index.js?v=3"),
});

const EASYLIFE = entry({
  id: "easylife-clear-the-day",
  title: "Clear the Day",
  pitch: "Capture a thought, organize a fictional morning, and choose one coherent place to start.",
  duration: "1–2 minutes",
  trustLabels: Object.freeze(["Fictional mornings", "No account data", "Untimed by default"]),
  styles: Object.freeze(["./capsule-core/capsule-core.css?v=5", "./easylife-clear-the-day/clear-the-day.css?v=3"]),
  understand: Object.freeze({
    title: "Turn a noisy fictional morning into one understandable next action.",
    paragraphs: Object.freeze(["EasyLife follows Capture → Inbox → organize → plan → act: record first, clarify later, and keep uncertainty visible.", "This local experience uses authored fictional mornings and never connects to a private EasyLife account or backend."]),
    proof: Object.freeze(["Capture accepts an unclassified thought first.", "Several organization choices can be defensible.", "The result explains tradeoffs instead of declaring one perfect plan."]),
  }),
  project: Object.freeze({
    name: "EasyLife",
    summary: "A privacy-conscious daily command center for capture, clarification, planning, action, and retrieval.",
    repository: null,
    technologies: Object.freeze(["JavaScript product models", "Privacy-conscious local workflows", "Responsive accessible interfaces"]),
    maturity: "Source concepts represented through a bounded fictional portfolio simulation.",
    role: "Product and implementation work represented without private tasks, notes, contacts, or events.",
  }),
  capsule: Object.freeze({ architecture: "Native ES modules, deterministic fictional morning fixtures, immutable organization transitions, and semantic controls.", limitations: "No account, Firebase, private tasks or notes, calendar, contacts, persistence, AI, or network write." }),
  load: () => import("./easylife-clear-the-day/index.js?v=5"),
});

const HOUSEOS = entry({
  id: "houseos-ready-for-service",
  title: "Ready for Service",
  pitch: "Turn a fictional Manager draft into a Staff-safe service brief without leaking private context.",
  duration: "1–2 minutes",
  trustLabels: Object.freeze(["Juniper & Stone is fictional", "No Supabase writes", "Privacy gate enforced"]),
  styles: Object.freeze(["./capsule-core/capsule-core.css?v=5", "./houseos-ready-for-service/ready-for-service.css?v=3"]),
  understand: Object.freeze({
    title: "See why Preview and Publish are deliberately different states.",
    paragraphs: Object.freeze(["HouseOS turns one Manager update into the Staff-ready view each team member needs while keeping Manager-private context private.", "This portfolio slice uses synthetic Juniper & Stone data and makes no restaurant, Supabase, or production write."]),
    proof: Object.freeze(["Draft changes remain private until Confirm Publish.", "Preview never changes the published revision.", "A deny rule blocks Manager-private information before Staff can see it."]),
  }),
  project: Object.freeze({
    name: "HouseOS",
    summary: "A pre-service operations system with distinct Manager and Staff routes, publication state, and privacy boundaries.",
    repository: "https://github.com/scolety1/Manager-OS",
    technologies: Object.freeze(["React", "TypeScript", "Vite", "Supabase authentication and persistence", "Cloudflare Pages"]),
    maturity: "Hosted synthetic demonstration; not approved for real restaurant data.",
    role: "Product and implementation work represented with fictional restaurant fixtures.",
  }),
  capsule: Object.freeze({ architecture: "Native ES module simulation of Draft → Preview → Confirm Publish → Staff-safe revision with deterministic privacy checks.", limitations: "No live restaurant data, POS integration, Supabase connection or write, authentication, analytics, or external publication." }),
  load: () => import("./houseos-ready-for-service/index.js?v=4"),
});

export const EXPERIMENTS = Object.freeze({
  [TSF_BUILD_LAB.id]: TSF_BUILD_LAB,
  [DRAFT_COMMAND.id]: DRAFT_COMMAND,
  [SOMMELIER_RUSH.id]: SOMMELIER_RUSH,
  [FAMILY_TREE.id]: FAMILY_TREE,
  [EASYLIFE.id]: EASYLIFE,
  [HOUSEOS.id]: HOUSEOS,
});

export const INACTIVE_EXPERIMENTS = Object.freeze({
  "family-lost-branch": Object.freeze({
    id: "family-lost-branch",
    status: "replaced",
    active: false,
    publicEligible: false,
    preservedPath: "./family-lost-branch/",
    reason: "Replaced by the read-only Interactive Example Tree; preserved in Git history.",
  }),
  nytheria: Object.freeze({
    id: "nytheria",
    status: "deferred",
    active: false,
    publicEligible: false,
    reason: "Spencer will provide the initial playable concept later.",
  }),
});

export const REJECTED_EXPERIMENTS = Object.freeze({
  "tsf-route-relay": Object.freeze({
    id: "tsf-route-relay",
    title: "Route Preview Relay",
    status: "rejected",
    publicEligible: false,
    label: "Rejected Gameplay Prototype — Architecture Reference Only",
    preservedPath: "./tsf-route-relay/",
  }),
});

export function getExperiment(id) {
  const active = EXPERIMENTS[id];
  if (!active || active.status !== "experimental" || active.publicEligible !== false) return null;
  return active;
}
