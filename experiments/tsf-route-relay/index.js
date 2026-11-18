import { SCORE_DIMENSIONS } from "../capsule-core/outcome.js";
import { bindChoiceInputMap } from "../capsule-core/input-map.js";
import { createLocalSeed } from "../capsule-core/seeded-random.js";
import {
  applyDecision,
  createRun,
  finalizeRun,
  getCurrentGate,
  getOrderedChoices,
  getScenario,
} from "./simulation.js";

const OUTCOME_LABELS = Object.freeze({
  success: "Decision-ready preview",
  partial: "Useful handoff",
  "safe-stop": "Defensible safe stop",
  "failed-route": "Failed route",
});

export async function mount(container, { seed, onRequestTab }) {
  let run = createRun(seed);
  let mode = "intro";
  let pendingFeedback = null;
  let outcome = null;
  let unbindInput = null;
  let announceTimer = null;

  container.innerHTML = `
    <div class="visually-hidden" data-relay-live role="status" aria-live="polite" aria-atomic="true"></div>
    <div data-relay-view></div>
  `;

  const view = container.querySelector("[data-relay-view]");
  const live = container.querySelector("[data-relay-live]");

  function announce(message) {
    clearTimeout(announceTimer);
    live.textContent = "";
    announceTimer = setTimeout(() => {
      live.textContent = message;
    }, 30);
  }

  function reset(nextSeed = run.seed) {
    run = createRun(nextSeed);
    mode = "intro";
    pendingFeedback = null;
    outcome = null;
    render({ focus: true, announcement: `Scenario loaded: ${getScenario(run).title}` });
  }

  function render({ focus = false, announcement = "" } = {}) {
    unbindInput?.();
    unbindInput = null;

    if (mode === "intro") renderIntro();
    if (mode === "play") renderPlay();
    if (mode === "result") renderResult();

    if (mode === "play" && !pendingFeedback) {
      const choiceGroup = view.querySelector("[data-choice-group]");
      if (choiceGroup) unbindInput = bindChoiceInputMap(choiceGroup);
    }

    if (announcement) announce(announcement);
    if (focus) {
      queueMicrotask(() => view.querySelector("[data-focus-target]")?.focus({ preventScroll: true }));
    }
  }

  function renderIntro() {
    const scenario = getScenario(run);
    view.innerHTML = `
      <div class="relay-intro">
        <div class="relay-intro-main">
          <p class="relay-state-label">Intro / Synthetic fixture ${scenario.indexLabel} of 05</p>
          <h4 tabindex="-1" data-focus-target>${escapeText(scenario.title)}</h4>
          <p class="relay-category">${escapeText(scenario.category)}</p>
          <p class="relay-brief">${escapeText(scenario.brief)}</p>
          <div class="relay-disclosure" role="note">
            <strong>Simulation boundary</strong>
            <span>This fictional challenge changes no repository, calls no AI model, and executes no TSF mission or command.</span>
          </div>
          <div class="relay-intro-actions">
            <button class="relay-primary" type="button" data-action="begin">Begin route <span aria-hidden="true">→</span></button>
            <button class="relay-secondary" type="button" data-action="new-seed">Load another fixture</button>
          </div>
          <p class="relay-seed">Replay seed <code>${escapeText(run.seed)}</code></p>
        </div>
        <aside class="relay-briefing" aria-label="Mission briefing">
          <p class="relay-panel-label">Known constraints</p>
          <ul>${scenario.constraints.map((item) => `<li>${escapeText(item)}</li>`).join("")}</ul>
          <div class="relay-duration"><strong>5</strong><span>decisions</span><strong>45–120</strong><span>seconds</span></div>
          <p class="relay-instruction">Choose with click, tap, <kbd>Enter</kbd>, or <kbd>Space</kbd>. Within choices, use arrow keys or number keys 1–3.</p>
        </aside>
      </div>
      ${renderLifecycle(0)}
    `;
  }

  function renderPlay() {
    const scenario = getScenario(run);
    const activeIndex = pendingFeedback ? Math.max(0, run.gateIndex - 1) : run.gateIndex;
    const displayGate = pendingFeedback?.gate || getCurrentGate(run);

    view.innerHTML = `
      <div class="relay-run-head">
        <div>
          <p class="relay-state-label">Play / ${escapeText(scenario.category)}</p>
          <h4>${escapeText(scenario.title)}</h4>
        </div>
        <p>Seed <code>${escapeText(run.seed)}</code></p>
      </div>
      ${renderLifecycle(activeIndex)}
      <div class="relay-workbench">
        <aside class="relay-scenario-card" aria-label="Current synthetic mission">
          <p class="relay-panel-label">Mission state</p>
          <p>${escapeText(scenario.brief)}</p>
          <ul>${scenario.constraints.map((item) => `<li>${escapeText(item)}</li>`).join("")}</ul>
          <p class="relay-boundary">Fixture only · no execution · no authority</p>
        </aside>
        <section class="relay-decision-card" aria-label="Current route decision">
          ${pendingFeedback ? renderFeedback(pendingFeedback) : renderDecision(displayGate)}
        </section>
        <aside class="relay-scoreboard" aria-label="Current route scores">
          <p class="relay-panel-label">Route quality</p>
          ${renderScores(run.scores)}
          <p class="relay-score-note">Caution is not penalized merely for taking longer. Evidence and safe boundaries carry equal weight.</p>
        </aside>
      </div>
    `;
  }

  function renderDecision(gate) {
    const choices = getOrderedChoices(run);
    return `
      <fieldset class="relay-choice-fieldset" data-choice-group>
        <legend>
          <span>Gate ${run.gateIndex + 1} / 5 · ${escapeText(gate.stage)}</span>
          <strong tabindex="-1" data-focus-target>${escapeText(gate.prompt)}</strong>
        </legend>
        <p class="relay-choice-help">Choose one route. Feedback appears before the next gate.</p>
        <div class="relay-choices">
          ${choices.map((choice, index) => `
            <button type="button" data-route-choice data-choice-id="${escapeText(choice.id)}">
              <span class="relay-choice-number">0${index + 1}</span>
              <strong>${escapeText(choice.label)}</strong>
              <span>${escapeText(choice.description)}</span>
            </button>
          `).join("")}
        </div>
      </fieldset>
    `;
  }

  function renderFeedback(feedback) {
    const positive = feedback.choice.recommended;
    return `
      <div class="relay-feedback ${positive ? "is-strong" : "is-risky"}">
        <p class="relay-feedback-mark">${positive ? "Strong route" : "Risk introduced"}</p>
        <h5 tabindex="-1" data-focus-target>${escapeText(feedback.choice.label)}</h5>
        <p class="relay-consequence">${escapeText(feedback.choice.consequence)}</p>
        <div class="relay-deltas" aria-label="Score changes">
          ${renderDeltas(feedback.choice.deltas)}
        </div>
        <div class="relay-teaching">
          <span>What this represents</span>
          <p>${escapeText(feedback.gate.teachingPoint)}</p>
        </div>
        <button class="relay-primary" type="button" data-action="continue">${run.complete ? "View result" : "Continue routing"} <span aria-hidden="true">→</span></button>
      </div>
    `;
  }

  function renderResult() {
    const scenario = getScenario(run);
    const label = OUTCOME_LABELS[outcome.type];
    const strongCount = outcome.decisions.filter((decision) => decision.strong).length;

    view.innerHTML = `
      <div class="relay-result relay-result--${escapeText(outcome.type)}">
        <header class="relay-result-hero">
          <div>
            <p class="relay-state-label">Result / ${escapeText(scenario.category)}</p>
            <span class="relay-outcome-pill">${escapeText(label)}</span>
            <h4 tabindex="-1" data-focus-target>${escapeText(outcome.summary)}</h4>
            <p>You made ${strongCount} strong route choice${strongCount === 1 ? "" : "s"} out of 5. The result assesses decision quality—not speed.</p>
          </div>
          <div class="relay-total-score" aria-label="Overall route quality ${outcome.score} out of 100">
            <strong>${outcome.score}</strong><span>/ 100</span><small>route quality</small>
          </div>
        </header>
        <div class="relay-result-grid">
          <section aria-labelledby="relay-score-title">
            <p class="relay-panel-label" id="relay-score-title">Score profile</p>
            ${renderScores(outcome.scores)}
          </section>
          <section aria-labelledby="relay-log-title">
            <p class="relay-panel-label" id="relay-log-title">Decision receipt</p>
            <ol class="relay-decision-log">
              ${outcome.decisions.map((decision) => `
                <li class="${decision.strong ? "is-strong" : "is-risky"}">
                  <span>${decision.strong ? "Strong" : "Risky"}</span>
                  <div><strong>${escapeText(decision.stage)} · ${escapeText(decision.label)}</strong><p>${escapeText(decision.consequence)}</p></div>
                </li>
              `).join("")}
            </ol>
          </section>
          <section class="relay-proof" aria-labelledby="relay-proof-title">
            <p class="relay-panel-label" id="relay-proof-title">What the real project idea demonstrates</p>
            <h5>Boundaries, state, and evidence can be product behavior.</h5>
            <p>TSF’s verified route-preview posture separates recommendation from execution and authority. Its evidence, stop, admission, and recovery concepts make handoffs inspectable instead of relying on optimistic status text.</p>
            <p>This capsule is deliberately smaller: five synthetic fixtures, local scoring, and no connection to TSF itself.</p>
          </section>
        </div>
        <div class="relay-result-actions">
          <button class="relay-primary" type="button" data-action="replay">Replay same seed</button>
          <button class="relay-secondary" type="button" data-action="new-seed">Try another fixture</button>
          <button class="relay-text-action" type="button" data-action="understand">Understand this system <span aria-hidden="true">→</span></button>
        </div>
        <p class="relay-seed">Replay seed <code>${escapeText(outcome.seed)}</code> · Result stored in this tab only.</p>
      </div>
    `;
  }

  function renderLifecycle(activeIndex) {
    const scenario = getScenario(run);
    return `
      <ol class="relay-lifecycle" aria-label="Simplified capsule decision gates">
        ${scenario.gates.map((gate, index) => {
          const state = index < run.gateIndex ? "complete" : index === activeIndex ? "current" : "pending";
          return `
            <li class="is-${state}" ${state === "current" ? 'aria-current="step"' : ""}>
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeText(gate.stage)}</strong>
              <small>${state}</small>
            </li>
          `;
        }).join("")}
      </ol>
      <p class="relay-lifecycle-note">These five teaching gates are a portfolio simplification, not canonical TSF command or runtime state names.</p>
    `;
  }

  function renderScores(scores) {
    return `
      <div class="relay-scores">
        ${SCORE_DIMENSIONS.map(({ id, label }) => `
          <div>
            <span><b>${escapeText(label)}</b><output>${scores[id]}</output></span>
            <div class="relay-meter" role="meter" aria-label="${escapeText(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${scores[id]}">
              <i style="--score: ${scores[id]}%"></i>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderDeltas(deltas) {
    const visible = SCORE_DIMENSIONS
      .map(({ id, label }) => ({ label, value: deltas[id] || 0 }))
      .filter(({ value }) => value !== 0);

    return visible.map(({ label, value }) => `
      <span class="${value > 0 ? "is-positive" : "is-negative"}">
        ${escapeText(label)} ${value > 0 ? "+" : ""}${value}
      </span>
    `).join("");
  }

  function onClick(event) {
    const choiceButton = event.target.closest("[data-route-choice]");
    const actionButton = event.target.closest("[data-action]");

    if (choiceButton && mode === "play" && !pendingFeedback) {
      const gate = getCurrentGate(run);
      const choice = gate.choices.find((candidate) => candidate.id === choiceButton.dataset.choiceId);
      run = applyDecision(run, choice.id);
      pendingFeedback = { gate, choice };
      render({
        focus: true,
        announcement: `${choice.recommended ? "Strong route." : "Risk introduced."} ${choice.consequence}`,
      });
      return;
    }

    if (!actionButton) return;

    if (actionButton.dataset.action === "begin") {
      mode = "play";
      render({ focus: true, announcement: "Route started. Gate one: Discover." });
    } else if (actionButton.dataset.action === "continue") {
      if (run.complete) {
        outcome = finalizeRun(run);
        persistOutcome(outcome);
        mode = "result";
        pendingFeedback = null;
        render({ focus: true, announcement: `Result: ${OUTCOME_LABELS[outcome.type]}. Score ${outcome.score} out of 100.` });
      } else {
        pendingFeedback = null;
        render({ focus: true, announcement: `Gate ${run.gateIndex + 1}: ${getCurrentGate(run).stage}.` });
      }
    } else if (actionButton.dataset.action === "replay") {
      reset(run.seed);
    } else if (actionButton.dataset.action === "new-seed") {
      reset(createLocalSeed());
    } else if (actionButton.dataset.action === "understand") {
      onRequestTab?.("understand");
    }
  }

  function onKeyDown(event) {
    const target = event.target.closest?.("button");
    const isSpace = event.key === " " || event.key === "Spacebar" || event.code === "Space";
    const isEnter = event.key === "Enter";

    if (target && (isSpace || isEnter)) {
      event.preventDefault();
      target.click();
    }
  }

  view.addEventListener("click", onClick);
  view.addEventListener("keydown", onKeyDown);
  render();

  return () => {
    clearTimeout(announceTimer);
    unbindInput?.();
    view.removeEventListener("click", onClick);
    view.removeEventListener("keydown", onKeyDown);
  };
}

function persistOutcome(outcome) {
  try {
    sessionStorage.setItem(
      "maximum-signal-lab:tsf-route-relay:last-outcome:v1",
      JSON.stringify(outcome),
    );
  } catch {
    // Storage is optional. The current result remains fully usable in memory.
  }
}

function escapeText(value) {
  const span = document.createElement("span");
  span.textContent = String(value);
  return span.innerHTML;
}
