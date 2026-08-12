let instanceCount = 0;

export class ProjectGame extends HTMLElement {
  constructor() {
    super();
    this.instanceId = `project-game-${++instanceCount}`;
    this.destroyGame = null;
    this.tabButtons = [];
    this.panels = [];
    this.runtimeErrorHandler = (event) => this.onRuntimeError(event);
  }

  async configure({ entry, gameModule, seed, onOutcome }) {
    this.entry = entry;
    this.gameModule = gameModule;
    this.seed = seed;
    this.onOutcome = onOutcome;
    this.render();
    this.bindTabs();
    window.addEventListener("error", this.runtimeErrorHandler);

    try {
      const destroyGame = await gameModule.mount(
        this.querySelector('[data-panel="play"]'),
        {
          seed,
          entry,
          onOutcome,
          onRequestTab: (tabId) => this.activateTab(tabId, true),
        },
      );
      this.destroyGame = typeof destroyGame === "function" ? destroyGame : null;
      this.dataset.capsuleState = "ready";
    } catch (error) {
      this.dataset.capsuleState = "failed";
      this.renderPlayFailure(error);
      throw error;
    }
  }

  disconnectedCallback() {
    window.removeEventListener("error", this.runtimeErrorHandler);
    try {
      this.destroyGame?.();
    } catch (error) {
      console.error("[Maximum Signal Lab] Isolated capsule cleanup failed.", error);
    } finally {
      this.destroyGame = null;
    }
  }

  onRuntimeError(event) {
    const filename = String(event?.filename || "");
    if (!this.isConnected || !filename.includes(`/experiments/${this.entry?.id}/`)) return;
    event.preventDefault();
    try {
      this.destroyGame?.();
    } catch {
      // The fixed diagnostic below is intentionally independent of cleanup details.
    }
    this.destroyGame = null;
    this.dataset.capsuleState = "failed";
    this.renderPlayFailure();
    console.error("[Maximum Signal Lab] Isolated capsule interaction failed.");
  }

  render() {
    const playId = `${this.instanceId}-play`;
    const understandId = `${this.instanceId}-understand`;
    const inspectId = `${this.instanceId}-inspect`;
    const understand = this.entry.understand;
    const capsule = this.entry.capsule;
    const trustLabels = this.entry.trustLabels || ["Local simulation", "No telemetry", "No authority"];
    const repositoryMarkup = this.entry.project.repository ? `<a class="capsule-repository-link" href="${escapeAttribute(this.entry.project.repository)}" target="_blank" rel="noopener noreferrer">Open source repository <span aria-hidden="true">↗</span></a>` : `<span class="capsule-repository-status">Repository not public</span>`;

    this.className = "capsule-shell";
    this.setAttribute("role", "region");
    this.setAttribute("aria-labelledby", `${this.instanceId}-title`);
    this.innerHTML = `
      <header class="capsule-header">
        <div>
          <p class="capsule-overline">Playable Project / ${escapeText(this.entry.maturityLabel)}</p>
          <h3 id="${this.instanceId}-title">${escapeText(this.entry.title)}</h3>
          <p>${escapeText(this.entry.pitch)}</p>
        </div>
        <div class="capsule-trust" aria-label="Runtime boundaries">
          ${trustLabels.map((label) => `<span>${escapeText(label)}</span>`).join("")}
        </div>
      </header>
      <div class="capsule-tabs" role="tablist" aria-label="${escapeText(this.entry.title)} views">
        <button id="${playId}-tab" type="button" role="tab" aria-selected="true" aria-controls="${playId}" data-tab="play">Play</button>
        <button id="${understandId}-tab" type="button" role="tab" aria-selected="false" aria-controls="${understandId}" data-tab="understand" tabindex="-1">Understand</button>
        <button id="${inspectId}-tab" type="button" role="tab" aria-selected="false" aria-controls="${inspectId}" data-tab="inspect" tabindex="-1">Inspect</button>
      </div>
      <section id="${playId}" class="capsule-panel capsule-play-panel" role="tabpanel" aria-labelledby="${playId}-tab" data-panel="play"></section>
      <section id="${understandId}" class="capsule-panel capsule-copy-panel" role="tabpanel" aria-labelledby="${understandId}-tab" data-panel="understand" hidden>
        <div class="capsule-copy-lead">
          <p class="capsule-panel-kicker">This playable demo</p>
          <h4>${escapeText(understand.title)}</h4>
          ${understand.paragraphs.map((paragraph) => `<p>${escapeText(paragraph)}</p>`).join("")}
        </div>
        <div class="capsule-proof-card">
          <p class="capsule-panel-kicker">Proof you can inspect</p>
          <ul class="capsule-proof-list">${understand.proof.map((item) => `<li data-proof-item><span aria-hidden="true">✓</span>${escapeText(item)}</li>`).join("")}</ul>
        </div>
        <div class="capsule-boundary-card" role="note">
          <p class="capsule-panel-kicker">Honesty boundary</p>
          <p>${escapeText(capsule.limitations)}</p>
        </div>
      </section>
      <section id="${inspectId}" class="capsule-panel capsule-copy-panel" role="tabpanel" aria-labelledby="${inspectId}-tab" data-panel="inspect" hidden>
        <div class="capsule-project-card">
          <p class="capsule-panel-kicker">Real project</p>
          <h4>${escapeText(this.entry.project.name)}</h4>
          <p>${escapeText(this.entry.project.summary)}</p>
          <p>${repositoryMarkup}</p>
        </div>
        <div class="capsule-context-card">
          <p class="capsule-panel-kicker">Project evidence</p>
          <ul>${this.entry.project.technologies.map((item) => `<li>${escapeText(item)}</li>`).join("")}</ul>
          <dl class="capsule-project-context"><div><dt>Maturity</dt><dd>${escapeText(this.entry.project.maturity)}</dd></div><div><dt>Spencer’s role</dt><dd>${escapeText(this.entry.project.role)}</dd></div></dl>
        </div>
        <div class="capsule-technical-card">
          <p class="capsule-panel-kicker">How this demo works</p>
          <details class="capsule-details">
            <summary>Inspect architecture and limitations</summary>
            <p><strong>Architecture:</strong> ${escapeText(capsule.architecture)}</p>
            <p><strong>Current limitations:</strong> ${escapeText(capsule.limitations)}</p>
          </details>
        </div>
      </section>
    `;
  }

  bindTabs() {
    this.tabButtons = [...this.querySelectorAll('[role="tab"]')];
    this.panels = [...this.querySelectorAll('[role="tabpanel"]')];

    for (const button of this.tabButtons) {
      button.addEventListener("click", () => this.activateTab(button.dataset.tab));
      button.addEventListener("keydown", (event) => this.onTabKeyDown(event));
    }
  }

  onTabKeyDown(event) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const current = this.tabButtons.indexOf(event.currentTarget);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % this.tabButtons.length;
    if (event.key === "ArrowLeft") next = (current - 1 + this.tabButtons.length) % this.tabButtons.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = this.tabButtons.length - 1;
    this.activateTab(this.tabButtons[next].dataset.tab, true);
  }

  activateTab(tabId, moveFocus = false) {
    for (const button of this.tabButtons) {
      const active = button.dataset.tab === tabId;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && moveFocus) button.focus();
    }
    for (const panel of this.panels) panel.hidden = panel.dataset.panel !== tabId;
  }

  renderPlayFailure(error) {
    const panel = this.querySelector('[data-panel="play"]');
    panel.innerHTML = `
      <div class="capsule-inline-failure" role="alert">
        <strong>The interactive renderer stopped safely.</strong>
        <p>The rest of the Lab and the Understand/Inspect views remain available. No external state was touched.</p>
        <details><summary>Local diagnostic</summary><code>Renderer unavailable in this local session.</code></details>
      </div>
    `;
  }
}

function escapeText(value) {
  const node = document.createElement("span");
  node.textContent = String(value);
  return node.innerHTML;
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

if (!customElements.get("project-game")) {
  customElements.define("project-game", ProjectGame);
}
