import { BUILD_TYPES, COMPLEXITIES, LANE_DEFINITIONS, STYLES } from "./catalog.js?v=6";
import { createLocalSeed } from "../capsule-core/seeded-random.js";
import { createChoiceMap } from "./choice-map.js?v=2";
import { BUILD_COPY, WORKER_COPY } from "./visitor-copy.js?v=3";
import { advanceMission, createMission, launchMission, MISSION_STAGES, resolveAmbiguity, resolveProposal } from "./simulation.js?v=5";
import { TSF_STATUS } from "../../data/public-snapshot-fallbacks.js";
import { loadPublicSnapshot } from "../../shared/public-snapshots.js";
import { attachSnapshotStatus } from "../../shared/snapshot-status.js";

const STATE_LABELS = Object.freeze({ waiting: "Waiting", running: "Building", revising: "Fixing", passed: "Done", failed: "Needs a fix" });
const INTERVENTION_STAGES = new Set([MISSION_STAGES.AMBIGUITY, MISSION_STAGES.REVIEW]);
const BUILD_TICK_MS = Object.freeze({ normal: 300, quick: 110 });
const ARCHITECTURE_FLOW = Object.freeze([
  "You",
  "HQ Dispatch",
  "Translator",
  "Project Coordinator",
  "Mission Queue",
  "Permissions and Preflight",
  "Isolated Build / Research / Audit Lanes",
  "AI Worker",
  "Independent Verifier",
  "Evidence and Final Check",
  "Accepted / Your Approval Needed / Safely Stopped",
]);
const ARTIFACT_LOADERS = Object.freeze({
  landing: async () => (await import("./artifacts/landing-page.js?v=7")).mountLandingPage,
  game: async () => (await import("./artifacts/browser-game.js?v=7")).mountBrowserGame,
  dashboard: async () => (await import("./artifacts/dashboard.js?v=7")).mountDashboard,
});

export async function mount(container, { seed, onRequestTab, onOutcome }) {
  let viewState = "choose";
  let configuration = null;
  let mission = null;
  let inspectedLane = null;
  let dragFeature = null;
  let timer = null;
  let productCleanup = null;
  let activeIntervention = null;
  let interventionScrollY = null;
  let politeTimer = null;
  let assertiveTimer = null;
  let lastAnnouncedStage = null;
  let resultLoading = false;
  let disposed = false;

  container.innerHTML = shellMarkup();
  const root = container.querySelector(".build-lab");
  const detachSnapshot = attachSnapshotStatus(container, loadPublicSnapshot({ kind: "tsf", url: new URL("../../data/examples/tsf-portfolio-status.json", import.meta.url).href, fallback: TSF_STATUS }), { describe: (data) => `${data.display_version} · ${data.public_stage}` });
  const interventionHost = document.createElement("div");
  interventionHost.className = "build-intervention-host";
  interventionHost.dataset.interventionHost = "";
  interventionHost.hidden = true;
  interventionHost.setAttribute("aria-hidden", "true");
  document.body.append(interventionHost);
  const elements = collectElements(root, interventionHost);
  const competingLiveRegions = collectCompetingLiveRegions(root);

  function announce(region, message, timerName) {
    const timer = timerName === "assertive" ? assertiveTimer : politeTimer;
    clearTimeout(timer);
    region.textContent = "";
    const next = setTimeout(() => { region.textContent = message; }, 30);
    if (timerName === "assertive") assertiveTimer = next;
    else politeTimer = next;
  }

  const announcePolite = (message) => announce(elements.politeLive, message, "polite");
  const announceAssertive = (message) => announce(elements.assertiveLive, message, "assertive");

  function setView(nextView, { focus = null, scroll = false } = {}) {
    viewState = nextView;
    root.dataset.buildPhase = nextView;
    document.documentElement.classList.toggle("build-lab-orchestrating", nextView === "orchestrate");
    for (const panel of elements.panels) panel.hidden = panel.dataset.buildPanel !== nextView;
    updateHeader();
    updateProgress();
    if (scroll) elements.panels.find((panel) => panel.dataset.buildPanel === nextView)?.scrollIntoView({ block: "start", behavior: "instant" });
    if (focus) queueMicrotask(() => root.querySelector(focus)?.focus({ preventScroll: true }));
  }

  function updateHeader() {
    elements.phaseLabel.textContent = BUILD_COPY.phaseLabels[viewState];
    if (viewState === "choose") elements.status.textContent = BUILD_COPY.status.choose;
    if (viewState === "configure") elements.status.textContent = BUILD_COPY.status.configure;
    if (viewState === "orchestrate" && mission) elements.status.textContent = missionStatus(mission);
    if (viewState === "result") elements.status.textContent = BUILD_COPY.status.complete;
  }

  function updateProgress() {
    const active = flowStep();
    elements.progressItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === active);
      item.classList.toggle("is-complete", index < active);
      if (index === active) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    elements.progressSummary.textContent = `${BUILD_COPY.phases[active]} · Step ${active + 1} of 4`;
    elements.brief.hidden = !configuration;
    if (configuration) updateBrief();
  }

  function updateBrief() {
    const type = BUILD_TYPES[configuration.type];
    const values = {
      type: type.label,
      audience: labelFor(type.audiences, configuration.audience),
      feature: labelFor(type.features, configuration.feature),
      detail: labelFor(COMPLEXITIES, configuration.complexity),
      pace: configuration.pace === "quick" ? "Quick build" : "Full build",
    };
    for (const [key, value] of Object.entries(values)) elements.brief.querySelector(`[data-brief-value="${key}"]`).textContent = value;
    elements.briefLabel.textContent = `${values.type} · ${values.feature}`;
  }

  function flowStep() {
    if (viewState === "choose" || viewState === "configure") return 0;
    if (viewState === "result") return 3;
    if (!mission) return 1;
    const testing = mission.lanes.testing.state !== "waiting" || mission.validation.status !== "pending" || mission.stage === MISSION_STAGES.INTEGRATING;
    return testing ? 2 : 1;
  }

  function chooseType(typeId) {
    const type = BUILD_TYPES[typeId];
    configuration = {
      type: typeId,
      name: "",
      audience: type.audiences[0].id,
      style: STYLES[0].id,
      feature: typeId === "game" ? "beacon" : type.features[0].id,
      complexity: COMPLEXITIES[1].id,
      interaction: type.interactions[0].id,
      constraint: type.constraints[0].id,
      pace: "normal",
    };
    mountConfiguration();
    setView("configure", { focus: "[data-config-title]", scroll: true });
    announcePolite(`Set up your ${type.label.toLowerCase()}.`);
  }

  function mountConfiguration() {
    const type = BUILD_TYPES[configuration.type];
    elements.configure.innerHTML = configurationMarkup(type, configuration);
    syncConfiguration();
  }

  function syncConfiguration() {
    const type = BUILD_TYPES[configuration.type];
    const style = STYLES.find((item) => item.id === configuration.style);
    const complexityIndex = COMPLEXITIES.findIndex((item) => item.id === configuration.complexity);
    const panel = elements.configure;
    panel.style.setProperty("--build-accent", style.accent);
    panel.style.setProperty("--build-accent2", style.accent2);

    for (const input of panel.querySelectorAll("input[type=radio]")) input.checked = configuration[input.name] === input.value;
    for (const button of panel.querySelectorAll("[data-feature]")) button.setAttribute("aria-pressed", String(button.dataset.feature === configuration.feature));

    const range = panel.querySelector('input[name="complexity"]');
    range.value = String(complexityIndex);
    range.setAttribute("aria-valuetext", COMPLEXITIES[complexityIndex].label);
    panel.querySelector("[data-complexity-output]").textContent = COMPLEXITIES[complexityIndex].label;

    const preview = panel.querySelector("[data-recipe-canvas]");
    preview.className = `recipe-canvas recipe-canvas--${type.id} recipe-canvas--${configuration.complexity}`;
    panel.querySelector("[data-preview-audience]").textContent = labelFor(type.audiences, configuration.audience);
    const previewTitle = configuration.name || type.label;
    const previewName = panel.querySelector("[data-preview-name]");
    previewName.textContent = previewTitle;
    previewName.title = previewTitle;
    panel.querySelector("[data-preview-feature]").textContent = labelFor(type.features, configuration.feature);
    panel.querySelector("[data-preview-details]").textContent = `${labelFor(type.interactions, configuration.interaction)} · ${labelFor(type.constraints, configuration.constraint)}`;
    panel.querySelector("[data-preview-type]").textContent = type.label;
    panel.querySelector("[data-preview-detail-level]").textContent = COMPLEXITIES[complexityIndex].label;
    panel.querySelector("[data-preview-pace]").textContent = configuration.pace === "quick" ? "Quick build" : "Full build";
    panel.querySelector("[data-feature-slot-value]").textContent = labelFor(type.features, configuration.feature);
    updateBrief();
  }

  function updateConfiguration(target) {
    if (target.name === "name") configuration = { ...configuration, name: target.value.trim() };
    if (["audience", "style", "interaction", "constraint", "pace"].includes(target.name)) configuration = { ...configuration, [target.name]: target.value };
    if (target.name === "complexity") configuration = { ...configuration, complexity: COMPLEXITIES[Number(target.value)].id };
    syncConfiguration();
  }

  function launch({ quick = false } = {}) {
    stopTimer();
    productCleanup?.();
    productCleanup = null;
    configuration = { ...configuration, pace: quick ? "quick" : configuration.pace };
    mission = launchMission(createMission(configuration, seed || createLocalSeed("tsf-build-lab")));
    inspectedLane = null;
    activeIntervention = null;
    lastAnnouncedStage = mission.stage;
    resetBuildView();
    updateBuildView();
    setView("orchestrate", { focus: "[data-build-context-title]", scroll: true });
    announcePolite(BUILD_COPY.announcements.buildStarted);
    startTimer();
  }

  function resetBuildView() {
    elements.inspectorBody.innerHTML = inspectorEmptyMarkup();
    elements.historyList.replaceChildren();
    elements.history.open = false;
    elements.integration.classList.remove("is-active");
    elements.integration.setAttribute("aria-hidden", "true");
    elements.repairTrace.hidden = true;
    hideIntervention({ restoreFocus: false });
  }

  function startTimer() {
    stopTimer();
    if (!mission || ![MISSION_STAGES.RUNNING, MISSION_STAGES.VALIDATION, MISSION_STAGES.INTEGRATING].includes(mission.stage)) return;
    const delay = BUILD_TICK_MS[mission.configuration.pace];
    timer = setInterval(() => { if (!document.hidden) advanceOneStep(); }, delay);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function advanceOneStep() {
    if (!mission || ![MISSION_STAGES.RUNNING, MISSION_STAGES.VALIDATION, MISSION_STAGES.INTEGRATING].includes(mission.stage)) return;
    const previousStage = mission.stage;
    const previousValidation = mission.validation.status;
    mission = advanceMission(mission);

    if (mission.stage === MISSION_STAGES.COMPLETE) {
      stopTimer();
      void revealResult();
      return;
    }

    updateBuildView();
    if (previousStage === MISSION_STAGES.VALIDATION && mission.validation.status === "repairing") announcePolite(BUILD_COPY.announcements.repairStarted);
    if (previousValidation === "repairing" && mission.validation.status === "passed") announcePolite(BUILD_COPY.announcements.repairPassed);
    if (mission.stage !== previousStage) announceStage(mission.stage);
    if (INTERVENTION_STAGES.has(mission.stage)) stopTimer();
  }

  function announceStage(stage) {
    if (lastAnnouncedStage === stage) return;
    lastAnnouncedStage = stage;
    if (stage === MISSION_STAGES.AMBIGUITY) announceAssertive(BUILD_COPY.announcements.priorityNeeded);
    if (stage === MISSION_STAGES.REVIEW) announceAssertive(BUILD_COPY.announcements.directionNeeded);
    if (stage === MISSION_STAGES.VALIDATION) announcePolite(BUILD_COPY.announcements.validationNeeded);
    if (stage === MISSION_STAGES.INTEGRATING) announcePolite("Testing passed. Putting it together.");
  }

  function updateBuildView({ preserveScrollY = window.scrollY } = {}) {
    const type = BUILD_TYPES[mission.configuration.type];
    elements.buildType.textContent = type.label;
    elements.buildName.textContent = mission.configuration.name || type.label;
    elements.buildStep.textContent = `Step ${String(mission.tick).padStart(2, "0")}`;
    elements.buildStage.textContent = missionStatus(mission);
    elements.status.textContent = missionStatus(mission);

    for (const definition of LANE_DEFINITIONS) updateLane(definition, mission.lanes[definition.id]);
    updateInspector();
    updateRepairTrace();
    updateProgress();
    updateIntegration();
    if (elements.history.open) updateHistory();
    syncIntervention(preserveScrollY);
    // Flush layout before restoring the visitor's exact reading position.
    // Major view changes use setView(..., { scroll: true }) instead.
    void root.offsetHeight;
    window.scrollTo({ top: preserveScrollY, behavior: "instant" });
  }

  function updateLane(definition, lane) {
    const card = elements.build.querySelector(`[data-lane="${definition.id}"]`);
    card.className = `agent-lane is-${lane.state}`;
    card.querySelector("[data-lane-status]").textContent = STATE_LABELS[lane.state];
    card.querySelector("[data-lane-progress]").textContent = `${lane.progress}%`;
    card.querySelector("[data-lane-work]").setAttribute("aria-label", `${WORKER_COPY[definition.id].name} ${lane.progress} percent`);
    const segments = Math.ceil(lane.progress / 20);
    card.querySelectorAll("[data-work-piece]").forEach((piece, index) => piece.classList.toggle("is-built", index < segments));
    card.querySelector("[data-lane-dependency]").textContent = dependencyCopy(definition, lane);
    const inspect = card.querySelector("[data-inspect-lane]");
    const inspectable = lane.progress >= 40 || lane.artifact;
    inspect.hidden = !inspectable;
    inspect.textContent = lane.artifact ? BUILD_COPY.actions.openPreview : BUILD_COPY.actions.openProgress;
    card.querySelector("[data-lane-placeholder]").hidden = inspectable;
  }

  function updateInspector() {
    if (!inspectedLane) return;
    const lane = mission.lanes[inspectedLane];
    const definition = LANE_DEFINITIONS.find((item) => item.id === inspectedLane);
    const copy = WORKER_COPY[inspectedLane];
    elements.inspectorBody.querySelector("[data-inspector-name]").textContent = `${copy.name} · ${STATE_LABELS[lane.state]}`;
    elements.inspectorBody.querySelector("[data-inspector-title]").textContent = copy.preview;
    elements.inspectorBody.querySelector("[data-inspector-copy]").textContent = previewCopy(inspectedLane, mission);
    elements.inspectorBody.querySelector("[data-inspector-task]").textContent = copy.name;
    elements.inspectorBody.querySelector("[data-inspector-needs]").textContent = definition.dependencies.map(workerName).join(", ") || "Your choices";
    elements.inspectorBody.querySelector("[data-inspector-status]").textContent = STATE_LABELS[lane.state];
    elements.inspectorBody.querySelector("[data-inspector-visual]").innerHTML = previewVisual(inspectedLane, mission);
  }

  function inspectLane(id) {
    inspectedLane = id;
    elements.inspectorBody.innerHTML = inspectorMarkup();
    updateInspector();
    announcePolite(`${WORKER_COPY[id].name} preview opened.`);
  }

  function updateHistory() {
    const fragment = document.createDocumentFragment();
    for (const item of mission.eventLog.slice().reverse()) {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = humanize(item.id);
      li.append(span, document.createTextNode(item.message));
      fragment.append(li);
    }
    elements.historyList.replaceChildren(fragment);
  }

  function updateIntegration() {
    const integrating = mission.stage === MISSION_STAGES.INTEGRATING;
    elements.integration.classList.toggle("is-active", integrating);
    elements.integration.setAttribute("aria-hidden", String(!integrating));
    if (!integrating) return;
    elements.integrationBar.style.setProperty("--integration-progress", `${mission.integrationProgress}%`);
    elements.integrationValue.textContent = `${mission.integrationProgress}%`;
  }

  function updateRepairTrace() {
    const outcome = mission.validation.outcome;
    if (!outcome?.requiresRepair) {
      elements.repairTrace.hidden = true;
      return;
    }
    const status = mission.validation.status;
    const workers = outcome.repairLanes.map(workerName).join(" + ");
    elements.repairTrace.hidden = false;
    elements.repairTitle.textContent = status === "passed" ? "Repair verified" : status === "repairing" ? "Repair in progress" : "Problem diagnosed";
    elements.repairCause.textContent = `Testing found: ${visitorOutcomeSummary(outcome)}`;
    elements.repairOwner.textContent = status === "failed" ? `${workers} queued for the bounded fix.` : status === "passed" ? `${workers} completed the bounded fix.` : `${workers} is updating only the affected part.`;
    elements.repairCheck.textContent = status === "passed" ? "The same checks ran again: passed." : "Next: rerun the same controls, result, and protected-rule checks.";
    for (const step of elements.repairSteps) {
      step.classList.toggle("is-complete", step.dataset.repairStep === "diagnose" || status === "passed");
      step.classList.toggle("is-active", status === "repairing" && step.dataset.repairStep === "repair");
    }
  }

  function syncIntervention(stableScrollY = window.scrollY) {
    if (!INTERVENTION_STAGES.has(mission.stage)) {
      if (activeIntervention) hideIntervention({ restoreFocus: true });
      return;
    }
    if (activeIntervention === mission.stage) return;
    activeIntervention = mission.stage;
    interventionScrollY = stableScrollY;
    const openScrollY = stableScrollY;
    elements.intervention.innerHTML = interventionMarkup(mission);
    elements.intervention.hidden = false;
    elements.intervention.setAttribute("aria-hidden", "false");
    queueMicrotask(() => {
      elements.intervention.querySelector("[data-intervention-focus]")?.focus({ preventScroll: true });
      window.scrollTo({ top: openScrollY, behavior: "instant" });
    });
  }

  function hideIntervention({ restoreFocus = true } = {}) {
    const returnScrollY = interventionScrollY;
    elements.intervention.hidden = true;
    elements.intervention.setAttribute("aria-hidden", "true");
    elements.intervention.replaceChildren();
    activeIntervention = null;
    interventionScrollY = null;
    if (returnScrollY !== null) window.scrollTo({ top: returnScrollY, behavior: "instant" });
    if (restoreFocus) queueMicrotask(() => {
      elements.buildContextTitle.focus({ preventScroll: true });
      if (returnScrollY !== null) window.scrollTo({ top: returnScrollY, behavior: "instant" });
    });
  }

  function resolvePriority() {
    const preserveScrollY = interventionScrollY ?? window.scrollY;
    const priority = elements.intervention.querySelector("[data-priority-range]").value === "1" ? "motion" : "speed";
    mission = resolveAmbiguity(mission, priority);
    hideIntervention({ restoreFocus: true });
    updateBuildView({ preserveScrollY });
    announcePolite(BUILD_COPY.announcements.choiceSaved);
    startTimer();
  }

  function resolveDesign(decision) {
    const preserveScrollY = interventionScrollY ?? window.scrollY;
    const direction = proposalLanguage(mission.configuration.type);
    mission = resolveProposal(mission, decision);
    hideIntervention({ restoreFocus: true });
    updateBuildView({ preserveScrollY });
    announcePolite(`${decision === "approve" ? direction.proposed : direction.current} selected. The build is continuing.`);
    startTimer();
  }

  async function revealResult() {
    if (resultLoading || disposed) return;
    resultLoading = true;
    const recipe = mission.recipe;
    const type = BUILD_TYPES[recipe.type];
    productCleanup?.();
    productCleanup = null;

    elements.result.style.setProperty("--build-accent", recipe.accent);
    elements.result.style.setProperty("--build-accent2", recipe.accent2);
    elements.resultTitle.textContent = "Your project is ready";
    elements.resultName.textContent = recipe.title;
    elements.resultSummary.textContent = `Your choices shaped this working ${type.label.toLowerCase()}. ${resultOutcomeCopy(mission)}`;
    elements.resultProductLabel.textContent = `Try your ${type.label.toLowerCase()}`;
    elements.artifactStage.dataset.artifactType = recipe.type;
    elements.artifactMount.innerHTML = `<p class="artifact-loading" role="status">Opening your ${type.label.toLowerCase()}…</p>`;

    try {
      const mountArtifact = await ARTIFACT_LOADERS[recipe.type]();
      if (disposed || mission?.recipe !== recipe) return;
      elements.artifactMount.replaceChildren();
      productCleanup = recipe.type === "game"
        ? mountArtifact(elements.artifactMount, recipe, mission.seed)
        : mountArtifact(elements.artifactMount, recipe);
    } catch {
      if (disposed) return;
      elements.artifactMount.innerHTML = `<div class="artifact-load-error" role="alert"><strong>This preview could not open.</strong><p>Your build choices are still available. Build another project or retry from the launcher.</p></div>`;
    } finally {
      resultLoading = false;
    }

    updateResultDetails();
    setView("result");
    queueMicrotask(() => {
      elements.result.scrollIntoView({ block: "start", behavior: "instant" });
      elements.resultTitle.focus({ preventScroll: true });
    });
    announcePolite(BUILD_COPY.announcements.complete(recipe.title));
    onOutcome?.({ type: "tsf-build-lab", label: "Product ready", recipe });
  }

  function updateResultDetails() {
    const map = createChoiceMap(mission.configuration, mission.decisions, mission.recipe, mission.validation);
    const fragment = document.createDocumentFragment();
    for (const item of map) {
      const li = document.createElement("li");
      const label = document.createElement("span");
      const choice = document.createElement("strong");
      const effect = document.createElement("b");
      label.textContent = item.label;
      choice.textContent = item.choice;
      effect.textContent = item.effect;
      li.append(label, choice, effect);
      fragment.append(li);
    }
    elements.choiceList.replaceChildren(fragment);
    elements.resultStory.textContent = mission.revisionCount
      ? repairResultStory(mission)
      : "Testing passed without a repair. The finished project opened immediately afterward.";
    const protectedRule = labelFor(BUILD_TYPES[mission.configuration.type].constraints, mission.configuration.constraint);
    elements.receiptWorkers.textContent = `Design shaped the ${humanize(mission.configuration.complexity)} layout; Interactions connected ${humanize(mission.configuration.interaction)}; Content wrote for ${humanize(mission.configuration.audience)}.`;
    elements.receiptVerifier.textContent = `Independent Verifier accepted the result after ${mission.revisionCount ? "repair and revalidation" : "a clean final check"}.`;
    elements.receiptEvidence.textContent = `Controls, result, and protected requirement “${protectedRule}” passed.`;
    elements.receiptAuthority.textContent = "You chose the product direction and protected rule. TSF handled bounded technical repair automatically and requested no production authority.";
  }

  function focusArtifact() {
    const target = elements.artifactMount.querySelector("[data-game-start], button, select, input, [tabindex='0']");
    elements.artifactStage.scrollIntoView({ block: "start", behavior: "instant" });
    target?.focus({ preventScroll: true });
  }

  function onClick(event) {
    const typeButton = event.target.closest("[data-build-type]");
    if (typeButton) return chooseType(typeButton.dataset.buildType);

    const feature = event.target.closest("[data-feature]")?.dataset.feature;
    if (feature) {
      configuration = { ...configuration, feature };
      syncConfiguration();
      announcePolite(`${labelFor(BUILD_TYPES[configuration.type].features, feature)} selected.`);
      return;
    }

    const inspect = event.target.closest("[data-inspect-lane]")?.dataset.inspectLane;
    if (inspect) return inspectLane(inspect);

    const proposal = event.target.closest("[data-proposal]")?.dataset.proposal;
    if (proposal) return resolveDesign(proposal);

    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "choose") {
      configuration = null;
      mission = null;
      elements.brief.hidden = true;
      setView("choose", { focus: "[data-choose-title]", scroll: true });
    }
    if (action === "launch") launch();
    if (action === "resolve-priority") resolvePriority();
    if (action === "quick-rebuild") { configuration = { ...configuration, pace: "quick" }; launch({ quick: true }); }
    if (action === "rebuild") { configuration = { ...configuration, pace: "normal" }; launch(); }
    if (action === "reconfigure") setView("configure", { focus: '[data-config-form] input[name="name"]', scroll: true });
    if (action === "new-build") {
      stopTimer();
      configuration = null;
      mission = null;
      elements.brief.hidden = true;
      setView("choose", { focus: "[data-choose-title]", scroll: true });
    }
    if (action === "understand") onRequestTab?.("understand");
    if (action === "try-artifact") focusArtifact();
  }

  function onInput(event) {
    if (event.target.matches("[data-priority-range]")) {
      const copy = priorityLanguage(mission.configuration.type);
      elements.intervention.querySelector("[data-priority-output]").textContent = event.target.value === "1" ? copy.motion : copy.speed;
      return;
    }
    if (event.target.closest("[data-config-form]")) updateConfiguration(event.target);
  }

  function onInterventionKeyDown(event) {
    if (!["Enter", " "].includes(event.key)) return;
    const proposal = event.target.closest("[data-proposal]")?.dataset.proposal;
    if (!proposal) return;
    event.preventDefault();
    resolveDesign(proposal);
  }

  function onDragStart(event) {
    const feature = event.target.closest("[data-feature]")?.dataset.feature;
    if (!feature) return;
    dragFeature = feature;
    event.dataTransfer?.setData("text/plain", feature);
  }

  function onDragOver(event) {
    if (event.target.closest("[data-feature-slot]")) event.preventDefault();
  }

  function onDrop(event) {
    if (!event.target.closest("[data-feature-slot]")) return;
    event.preventDefault();
    const feature = event.dataTransfer?.getData("text/plain") || dragFeature;
    if (feature) {
      configuration = { ...configuration, feature };
      syncConfiguration();
    }
    dragFeature = null;
  }

  function onFocusIn() { muteCompetingLiveRegions(competingLiveRegions, true); }
  function onFocusOut() {
    queueMicrotask(() => {
      if (!root.contains(document.activeElement) && !elements.intervention.contains(document.activeElement)) muteCompetingLiveRegions(competingLiveRegions, false);
    });
  }

  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
  root.addEventListener("dragstart", onDragStart);
  root.addEventListener("dragover", onDragOver);
  root.addEventListener("drop", onDrop);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  elements.intervention.addEventListener("click", onClick);
  elements.intervention.addEventListener("input", onInput);
  elements.intervention.addEventListener("keydown", onInterventionKeyDown);
  elements.intervention.addEventListener("focusin", onFocusIn);
  elements.intervention.addEventListener("focusout", onFocusOut);
  elements.history.addEventListener("toggle", () => { if (elements.history.open && mission) updateHistory(); });

  setView("choose");

  return () => {
    disposed = true;
    detachSnapshot();
    stopTimer();
    clearTimeout(politeTimer);
    clearTimeout(assertiveTimer);
    productCleanup?.();
    muteCompetingLiveRegions(competingLiveRegions, false);
    document.documentElement.classList.remove("build-lab-orchestrating");
    root.removeEventListener("click", onClick);
    root.removeEventListener("input", onInput);
    root.removeEventListener("dragstart", onDragStart);
    root.removeEventListener("dragover", onDragOver);
    root.removeEventListener("drop", onDrop);
    root.removeEventListener("focusin", onFocusIn);
    root.removeEventListener("focusout", onFocusOut);
    elements.intervention.removeEventListener("click", onClick);
    elements.intervention.removeEventListener("input", onInput);
    elements.intervention.removeEventListener("keydown", onInterventionKeyDown);
    elements.intervention.removeEventListener("focusin", onFocusIn);
    elements.intervention.removeEventListener("focusout", onFocusOut);
    elements.intervention.remove();
  };
}

function shellMarkup() {
  return `<div class="build-lab" data-build-phase="choose" data-build-shell-version="3">
    <div class="visually-hidden" data-build-assertive role="alert" aria-live="assertive" aria-atomic="true"></div>
    <div class="visually-hidden" data-build-polite role="status" aria-live="polite" aria-atomic="true"></div>
    <header class="build-shell-header">
      <p class="build-phase-label" data-phase-label>${BUILD_COPY.phaseLabels.choose}</p>
      <h4 id="tsf-build-lab-title">${BUILD_COPY.title}</h4>
      <p class="build-premise">${BUILD_COPY.premise}</p>
      <div class="build-shell-status"><span>Status</span><strong data-build-status tabindex="-1">${BUILD_COPY.status.choose}</strong></div>
    </header>
    <div class="build-flow-chrome">
      <ol aria-label="Build progress">${BUILD_COPY.phases.map((label, index) => `<li data-progress-step="${index}"><span>0${index + 1}</span><b>${label}</b></li>`).join("")}</ol>
      <div class="build-progress-mobile" data-progress-summary>Choose · Step 1 of 4</div>
      <details class="build-brief" data-build-brief hidden>
        <summary><span>View choices</span><strong data-brief-label></strong></summary>
        <div class="mission-brief-strip"><span>Project <b data-brief-value="type"></b></span><span>For <b data-brief-value="audience"></b></span><span>Focus <b data-brief-value="feature"></b></span><span>Detail <b data-brief-value="detail"></b></span><span>Speed <b data-brief-value="pace"></b></span></div>
      </details>
    </div>
    <div class="build-stage">
      <section class="build-select" data-build-panel="choose" aria-labelledby="build-choose-title">
        <div class="build-select-copy"><p class="build-state">Start here</p><h5 id="build-choose-title" data-choose-title tabindex="-1">Choose what to build</h5><p>Pick one small project. You will make a few choices, watch the work come together, and try the finished result.</p><div class="build-boundary" role="note"><strong>${BUILD_COPY.boundaryTitle}</strong><span>${BUILD_COPY.boundary}</span></div></div>
        <div class="build-type-deck" aria-label="Build types">${Object.values(BUILD_TYPES).map((type, index) => `<button type="button" data-build-type="${type.id}"><span class="build-type-index">0${index + 1}</span><i aria-hidden="true">${type.icon}</i><strong>${type.label}</strong><small>${type.description}</small><b>${BUILD_COPY.actions.buildThis} <span aria-hidden="true">→</span></b></button>`).join("")}</div>
      </section>
      <section class="build-config" data-build-panel="configure" hidden></section>
      <section class="orchestration" data-build-panel="orchestrate" aria-labelledby="build-context-title" hidden>
        <header class="orchestration-head"><div><p class="build-state">Your build team</p><h5 id="build-context-title" data-build-context-title tabindex="-1"><span data-build-name>Project</span></h5><p data-build-type-label>Project</p></div><div class="mission-status"><span data-build-step>Step 00</span><strong data-build-stage>Getting started</strong></div></header>
        <div class="build-team-intro"><span>Build lead</span><strong>Breaks the project into tasks and brings the results together.</strong><small>Scripted demo running in this browser</small></div>
        <ol class="agent-lanes" aria-label="Build tasks">${LANE_DEFINITIONS.map(laneShellMarkup).join("")}</ol>
        <aside class="artifact-inspector" aria-label="Work in progress"><div data-inspector-body>${inspectorEmptyMarkup()}</div></aside>
        <div class="automatic-repair" data-repair-trace hidden aria-label="Automatic repair progress"><header><span>Automatic repair</span><strong data-repair-title>Problem diagnosed</strong></header><ol><li data-repair-step="diagnose"><b>1</b><span data-repair-cause></span></li><li data-repair-step="repair"><b>2</b><span data-repair-owner></span></li><li data-repair-step="verify"><b>3</b><span data-repair-check></span></li></ol></div>
        <div class="integration-stage" data-integration aria-hidden="true"><div class="integration-bar" data-integration-bar><i></i></div><div><p>Putting it together…</p><strong data-integration-value>0%</strong></div></div>
        <details class="orchestration-log" data-build-history><summary>See build history</summary><ol data-history-list></ol></details>
      </section>
      <section class="build-result" data-build-panel="result" aria-labelledby="build-result-title" hidden>
        <header class="result-intro"><div><p class="build-state">Ready to try</p><h5 id="build-result-title" data-result-title tabindex="-1">Your project is ready</h5><strong data-result-name></strong><p data-result-summary></p></div><div class="result-primary-actions"><button type="button" class="build-primary" data-action="try-artifact">${BUILD_COPY.actions.tryIt}</button><button type="button" data-action="quick-rebuild">${BUILD_COPY.actions.buildQuickly}</button></div></header>
        <div class="artifact-stage" data-artifact-stage><div class="artifact-stage-bar"><span data-result-product-label>Try your project</span><span>Runs only in this Lab preview</span></div><div data-artifact-mount></div></div>
        <div class="result-inspection">
          <details open><summary>See how your choices shaped it</summary><ol class="choice-result" data-choice-list></ol></details>
          <details data-governance-receipt><summary>Inspect the governed mission receipt</summary>
            <p data-result-story></p>
            <ol class="architecture-flow" data-architecture-flow aria-label="Thousand Sunny Fleet architecture">${ARCHITECTURE_FLOW.map((label) => `<li>${label}</li>`).join("")}</ol>
            <dl class="evidence-receipt">
              <div><dt>Worker output</dt><dd data-receipt-workers></dd></div>
              <div><dt>Independent verifier</dt><dd data-receipt-verifier></dd></div>
              <div><dt>Evidence</dt><dd data-receipt-evidence></dd></div>
              <div><dt>Human authority</dt><dd data-receipt-authority></dd></div>
              <div><dt>Safe stopping</dt><dd>High-risk authority stops at Your Approval Needed. Safely Stopped preserves prior evidence.</dd></div>
            </dl>
            <p>This scripted demo assembled a working result from prewritten browser components. It did not call live AI or change another project.</p>
          </details>
        </div>
        <div class="result-actions"><button type="button" class="build-primary" data-action="rebuild">${BUILD_COPY.actions.buildAgain}</button><button type="button" data-action="reconfigure">${BUILD_COPY.actions.changeChoices}</button><button type="button" data-action="new-build">${BUILD_COPY.actions.buildAnother}</button><button type="button" class="build-text-button" data-action="understand">${BUILD_COPY.actions.howItWorks}</button></div>
      </section>
    </div>
  </div>`;
}

function collectElements(root, interventionHost) {
  return {
    politeLive: root.querySelector("[data-build-polite]"),
    assertiveLive: root.querySelector("[data-build-assertive]"),
    phaseLabel: root.querySelector("[data-phase-label]"),
    status: root.querySelector("[data-build-status]"),
    panels: [...root.querySelectorAll("[data-build-panel]")],
    progressItems: [...root.querySelectorAll("[data-progress-step]")],
    progressSummary: root.querySelector("[data-progress-summary]"),
    brief: root.querySelector("[data-build-brief]"),
    briefLabel: root.querySelector("[data-brief-label]"),
    configure: root.querySelector('[data-build-panel="configure"]'),
    build: root.querySelector('[data-build-panel="orchestrate"]'),
    result: root.querySelector('[data-build-panel="result"]'),
    buildContextTitle: root.querySelector("[data-build-context-title]"),
    buildType: root.querySelector("[data-build-type-label]"),
    buildName: root.querySelector("[data-build-name]"),
    buildStep: root.querySelector("[data-build-step]"),
    buildStage: root.querySelector("[data-build-stage]"),
    inspectorBody: root.querySelector("[data-inspector-body]"),
    integration: root.querySelector("[data-integration]"),
    integrationBar: root.querySelector("[data-integration-bar]"),
    integrationValue: root.querySelector("[data-integration-value]"),
    repairTrace: root.querySelector("[data-repair-trace]"),
    repairTitle: root.querySelector("[data-repair-title]"),
    repairCause: root.querySelector("[data-repair-cause]"),
    repairOwner: root.querySelector("[data-repair-owner]"),
    repairCheck: root.querySelector("[data-repair-check]"),
    repairSteps: [...root.querySelectorAll("[data-repair-step]")],
    history: root.querySelector("[data-build-history]"),
    historyList: root.querySelector("[data-history-list]"),
    intervention: interventionHost,
    resultTitle: root.querySelector("[data-result-title]"),
    resultName: root.querySelector("[data-result-name]"),
    resultSummary: root.querySelector("[data-result-summary]"),
    resultProductLabel: root.querySelector("[data-result-product-label]"),
    artifactStage: root.querySelector("[data-artifact-stage]"),
    artifactMount: root.querySelector("[data-artifact-mount]"),
    choiceList: root.querySelector("[data-choice-list]"),
    resultStory: root.querySelector("[data-result-story]"),
    receiptWorkers: root.querySelector("[data-receipt-workers]"),
    receiptVerifier: root.querySelector("[data-receipt-verifier]"),
    receiptEvidence: root.querySelector("[data-receipt-evidence]"),
    receiptAuthority: root.querySelector("[data-receipt-authority]"),
  };
}

function configurationMarkup(type, configuration) {
  return `<header class="build-config-head"><div><p class="build-state">Set up your ${type.label.toLowerCase()}</p><h5 data-config-title tabindex="-1">Pick a starting style</h5><p>Three short groups · every choice has a working default</p></div><button type="button" class="build-text-button" data-action="choose">← ${BUILD_COPY.actions.changeType}</button></header>
    <div class="requirement-board"><form class="requirement-controls" data-config-form>
      <section class="config-cluster"><header><span>01</span><div><strong>Purpose</strong><small>Name it and choose who it should help.</small></div></header><label class="project-name-field"><span>Project name</span><input name="name" maxlength="38" value="${attribute(configuration.name)}" placeholder="Give it a name"></label>${radioGroup("Who is it for?", "audience", type.audiences, configuration.audience)}</section>
      <section class="config-cluster"><header><span>02</span><div><strong>Look and focus</strong><small>Choose the visual direction and the main feature.</small></div></header><fieldset class="requirement-group style-group"><legend>Pick a style</legend><div class="style-swatches">${STYLES.map((item) => `<label style="--swatch-a:${item.accent};--swatch-b:${item.accent2}"><input type="radio" name="style" value="${item.id}" ${configuration.style === item.id ? "checked" : ""}><i aria-hidden="true"></i><span>${item.label}</span></label>`).join("")}</div></fieldset><fieldset class="requirement-group feature-builder"><legend>Choose the main feature</legend><div class="feature-tray">${type.features.map((item) => `<button type="button" draggable="true" data-feature="${item.id}" aria-pressed="${configuration.feature === item.id}">${item.label}</button>`).join("")}</div><div class="feature-slot" data-feature-slot><span>Main feature</span><strong data-feature-slot-value></strong><small>Tap a choice above or drop it here</small></div></fieldset><label class="complexity-control"><span>Amount of detail <output data-complexity-output></output></span><input type="range" name="complexity" min="0" max="2" step="1" aria-label="Amount of detail"><i aria-hidden="true"><b>Focused</b><b>Layered</b><b>Packed</b></i></label></section>
      <section class="config-cluster"><header><span>03</span><div><strong>Behavior and guardrail</strong><small>Choose how it works and one rule to protect.</small></div></header>${radioGroup("How it works", "interaction", type.interactions, configuration.interaction)}${radioGroup("One rule to protect", "constraint", type.constraints, configuration.constraint)}${radioGroup("Build speed", "pace", [{ id: "normal", label: "Watch the full build" }, { id: "quick", label: "Quick build" }], configuration.pace)}</section>
    </form><aside class="live-recipe" aria-label="Project preview"><div class="recipe-browser-bar"><i></i><i></i><i></i><span>Preview</span></div><div class="recipe-canvas" data-recipe-canvas><span>${type.icon}</span><p data-preview-audience></p><h6 data-preview-name></h6><strong data-preview-feature></strong><small data-preview-details></small></div><dl><div><dt>Project</dt><dd data-preview-type></dd></div><div><dt>Detail</dt><dd data-preview-detail-level></dd></div><div><dt>Speed</dt><dd data-preview-pace></dd></div></dl><button type="button" class="build-primary" data-action="launch">${BUILD_COPY.actions.start} <span aria-hidden="true">→</span></button></aside></div>`;
}

function laneShellMarkup(definition, index) {
  const copy = WORKER_COPY[definition.id];
  return `<li class="agent-lane is-waiting" data-lane="${definition.id}"><header><span>0${index + 1}</span><div><strong>${copy.name}</strong><small>${copy.task}</small></div><b data-lane-status>Waiting</b></header><div class="lane-work" data-lane-work aria-label="${copy.name} 0 percent"><div class="work-pieces" aria-hidden="true">${Array.from({ length: 5 }, () => '<i data-work-piece></i>').join("")}</div><output data-lane-progress>0%</output></div><p data-lane-dependency>${definition.dependencies.length ? "Waiting for earlier tasks" : "Starts now, with the other first tasks"}</p><button type="button" data-inspect-lane="${definition.id}" hidden>${BUILD_COPY.actions.openProgress}</button><span class="artifact-placeholder" data-lane-placeholder>Preview appears as the task develops</span></li>`;
}

function interventionMarkup(mission) {
  if (mission.stage === MISSION_STAGES.AMBIGUITY) {
    const choice = priorityLanguage(mission.configuration.type);
    return `<div class="intervention" role="dialog" aria-modal="true" aria-labelledby="priority-title"><p class="intervention-kicker">One quick choice</p><h5 id="priority-title" tabindex="-1" data-intervention-focus>What should matter more for this build?</h5><p>Your choice changes the feel of the finished project.</p><div class="priority-track"><span>${choice.speed}</span><input type="range" min="0" max="1" step="1" value="0" data-priority-range aria-label="Choose ${choice.speed} or ${choice.motion}"><span>${choice.motion}</span></div><output data-priority-output>${choice.speed}</output><button type="button" class="build-primary" data-action="resolve-priority">${BUILD_COPY.actions.choosePriority}</button></div>`;
  }
  if (mission.stage === MISSION_STAGES.REVIEW) {
    const proposal = proposalLanguage(mission.configuration.type);
    const protectedRule = labelFor(BUILD_TYPES[mission.configuration.type].constraints, mission.configuration.constraint);
    return `<div class="intervention" role="dialog" aria-modal="true" aria-labelledby="review-title"><p class="intervention-kicker">Choose a direction</p><h5 id="review-title" tabindex="-1" data-intervention-focus>Design found another visual direction.</h5><div class="proposal-compare"><article><span>Original</span><button type="button" class="proposal-sample is-current" data-proposal="reject" aria-label="Choose original direction: ${proposal.current}, ${proposal.currentEffect}"><i></i><strong>${proposal.current}</strong><small>${proposal.currentEffect}</small></button></article><article><span>Bolder option</span><button type="button" class="proposal-sample is-proposed" data-proposal="approve" aria-label="Choose bolder direction: ${proposal.proposed}, ${proposal.proposedEffect}"><i></i><strong>${proposal.proposed}</strong><small>${proposal.proposedEffect}</small></button></article></div><p>Your protected rule is “${protectedRule}.” Both directions can work, but Testing will enforce that rule automatically.</p><div class="intervention-actions"><button type="button" data-proposal="reject">${BUILD_COPY.actions.keepOriginal}</button><button type="button" class="build-primary" data-proposal="approve">${BUILD_COPY.actions.chooseBold}</button></div></div>`;
  }
  return "";
}

function inspectorEmptyMarkup() {
  return `<p class="inspector-empty"><span>Work in progress</span><strong>Open a task to see what is taking shape.</strong></p>`;
}

function inspectorMarkup() {
  return `<div class="worker-preview"><div><span data-inspector-name></span><h6 data-inspector-title></h6><p data-inspector-copy></p></div><div data-inspector-visual></div><dl><div><dt>Task</dt><dd data-inspector-task></dd></div><div><dt>Waiting for</dt><dd data-inspector-needs></dd></div><div><dt>Status</dt><dd data-inspector-status></dd></div></dl></div>`;
}

function previewVisual(id, mission) {
  const type = mission.configuration.type;
  if (id === "interface") return `<div class="mini-preview mini-preview--interface" aria-label="Layout preview"><i></i><b></b><b></b><b></b><span>${type}</span></div>`;
  if (id === "logic") return `<div class="mini-preview mini-preview--logic" aria-label="Interaction preview"><span>Input</span><i>→</i><span>${humanize(mission.configuration.interaction)}</span><i>→</i><span>Feedback</span></div>`;
  if (id === "content") return `<div class="mini-preview mini-preview--content" aria-label="Content preview"><strong>${humanize(mission.configuration.audience)}</strong><span>${humanize(mission.configuration.feature)}</span><small>Clear action · immediate result</small></div>`;
  if (id === "testing") return `<div class="mini-preview mini-preview--testing" aria-label="Testing preview"><span>Controls <b>✓</b></span><span>Result <b>✓</b></span><span>Rule <b>${mission.validation.status === "failed" ? "!" : "…"}</b></span></div>`;
  return `<div class="mini-preview mini-preview--review" aria-label="Review preview"><span>Choices</span><i>+</i><span>Build</span><i>+</i><span>Tests</span><b>Final check</b></div>`;
}

function previewCopy(id, mission) {
  const copy = {
    interface: `A ${humanize(mission.configuration.complexity)} ${mission.configuration.type} layout in the ${humanize(mission.configuration.style)} style.`,
    logic: `${humanize(mission.configuration.interaction)} connected to visible feedback and the ${humanize(mission.configuration.constraint)} rule.`,
    content: `Labels and examples written for ${humanize(mission.configuration.audience)}.`,
    testing: mission.validation.outcome ? visitorOutcomeSummary(mission.validation.outcome) : "The controls, result, and protected rule are being tested.",
    review: "The finished project is being checked against your choices before it opens.",
  };
  return copy[id];
}

function dependencyCopy(definition, lane) {
  if (lane.state === "running" || lane.state === "revising") return lane.state === "revising" ? "Updating the part testing identified" : "Active now";
  if (lane.state === "passed") return "Ready for the next task";
  if (!definition.dependencies.length) return "Starts now, with the other first tasks";
  return `Waiting for ${definition.dependencies.map(workerName).join(" + ")}`;
}

function missionStatus(current) {
  if (current.stage === MISSION_STAGES.INTEGRATING) return BUILD_COPY.status.integrating;
  if (current.validation.status === "repairing") return BUILD_COPY.status.repairing;
  return BUILD_COPY.status[current.stage] || BUILD_COPY.status.running;
}

function priorityLanguage(type) {
  return ({ landing: { speed: "Loads quickly", motion: "More visual feedback" }, game: { speed: "Faster response", motion: "More visual feedback" }, dashboard: { speed: "Instant updates", motion: "Animated changes" } })[type];
}

function proposalLanguage(type) {
  return ({
    landing: { current: "Structured hero", currentEffect: "Crisp hierarchy", proposed: "Kinetic hero", proposedEffect: "Angled type and motion" },
    game: { current: "Restrained hazards", currentEffect: "Static or pulsing", proposed: "Active hazards", proposedEffect: "Patrol or chase" },
    dashboard: { current: "Standard warnings", currentEffect: "Quiet status treatment", proposed: "Prominent warnings", proposedEffect: "Stronger attention signal" },
  })[type];
}

function visitorOutcomeSummary(outcome) {
  if (outcome.id === "major-revision") return "The layout and controls need to be adjusted together.";
  if (outcome.id === "visitor-caused-conflict") return "One interaction conflicts with the rule you protected.";
  if (outcome.id === "minor-repair") return "One instruction does not fit the chosen audience.";
  return outcome.summary;
}

function resultOutcomeCopy(current) {
  if (current.validation.outcome.requiresRepair) return "Testing found the problem and the updated version passed.";
  if (current.validation.outcome.id === "prevented-failure") return "An earlier choice avoided a likely problem before testing.";
  return "The controls, result, and protected rule all passed.";
}

function repairResultStory(current) {
  const outcome = current.validation.outcome;
  const workers = outcome.repairLanes.map(workerName).join(" + ");
  return `Testing flagged “${outcome.issueLabel}.” ${workers} repaired only the affected part, Testing reran the same checks, and the Independent Verifier passed the update.`;
}

function radioGroup(legend, name, options, selected) {
  return `<fieldset class="requirement-group"><legend>${legend}</legend><div class="option-pills">${options.map((item) => `<label><input type="radio" name="${name}" value="${item.id}" ${selected === item.id ? "checked" : ""}><span>${item.label}</span></label>`).join("")}</div></fieldset>`;
}

function workerName(id) { return WORKER_COPY[id]?.name || humanize(id); }
function labelFor(options, id) { return options.find((item) => item.id === id)?.label || humanize(id); }
function humanize(value) { return String(value).replaceAll("-", " "); }
function attribute(value) { return escapeText(value).replaceAll("`", "&#96;"); }
function escapeText(value) { const span = document.createElement("span"); span.textContent = String(value ?? ""); return span.innerHTML; }

function collectCompetingLiveRegions(root) {
  return [...document.querySelectorAll(".event-stream[aria-live], .project-view[aria-live]")]
    .filter((element) => !root.contains(element))
    .map((element) => ({ element, original: element.getAttribute("aria-live") }));
}

function muteCompetingLiveRegions(regions, muted) {
  for (const { element, original } of regions) {
    if (!element.isConnected) continue;
    if (muted) element.setAttribute("aria-live", "off");
    else if (original === null) element.removeAttribute("aria-live");
    else element.setAttribute("aria-live", original);
  }
}
