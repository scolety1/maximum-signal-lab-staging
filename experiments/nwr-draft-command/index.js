import { EVIDENCE_UPDATED, LEAGUE_FORMAT, STRATEGIES } from "./fixtures.js";
import { buildDebrief, commitDecision, createCommand, getDecisionOptions, scarcity, selectStrategy, setUntimed, togglePause } from "./simulation.js";
import { NWR_SNAPSHOT } from "../../data/public-snapshot-fallbacks.js";
import { loadPublicSnapshot } from "../../shared/public-snapshots.js";
import { attachSnapshotStatus } from "../../shared/snapshot-status.js";

export async function mount(container, { seed, onOutcome }) {
  let roomSeed = seed || "draft-command-local";
  let state = createCommand(roomSeed);
  container.innerHTML = `<section class="draft-command" data-draft-command aria-labelledby="draft-command-title"></section>`;
  const root = container.querySelector("[data-draft-command]");
  const detachSnapshot = attachSnapshotStatus(container, loadPublicSnapshot({ kind:"nwr", url:new URL("../../data/examples/nwr-portfolio-snapshot.json",import.meta.url).href, fallback:NWR_SNAPSHOT, maxAgeMs:14*24*60*60*1000 }), { describe:(data)=>`${data.nwr_version} · ${data.league_format.teams}-team ${data.league_format.qb_format}` });

  function render(focusSelector = null) {
    root.innerHTML = `<header class="command-header">
      <div><p>Demo data only · league-specific rankings</p><h2 id="draft-command-title">Draft Command</h2><p>Choose four roster moves. Earlier decisions change the board, capital, and later branches.</p></div>
      <div class="trust-strip" aria-label="Decision trust strip"><span>Fictional scenario</span><span>Bundled fallback</span><span>Evidence through ${EVIDENCE_UPDATED}</span><span>No private roster data</span></div>
    </header>
    ${state.phase === "strategy" ? strategyMarkup() : commandMarkup()}
    <p class="command-status" data-nwr-status role="status" tabindex="-1">${statusCopy()}</p>`;
    if (focusSelector) queueMicrotask(() => root.querySelector(focusSelector)?.focus({ preventScroll: true }));
  }

  function strategyMarkup() {
    return `<section class="strategy-select" aria-labelledby="strategy-title"><div><p>Step 1</p><h3 id="strategy-title">Choose your strategy</h3><p>In a dynasty league, you keep the roster from year to year. Your strategy changes how the debrief reads the same fictional facts.</p></div><div class="strategy-grid">${STRATEGIES.map((strategy) => `<button type="button" data-strategy="${strategy.id}"><strong>${strategy.label}</strong><span>${strategy.summary}</span></button>`).join("")}</div><p class="league-line"><strong>League setup:</strong> ${LEAGUE_FORMAT.teams} teams, ${LEAGUE_FORMAT.qbFormat}, ${LEAGUE_FORMAT.scoring}. Starters: ${LEAGUE_FORMAT.starters}.</p></section>`;
  }

  function commandMarkup() {
    const debrief = state.phase === "debrief" ? buildDebrief(state) : null;
    return `<div class="command-controls"><button type="button" data-pause>${state.paused ? "Resume room" : "Pause room"}</button><label><input type="checkbox" data-untimed ${state.untimed ? "checked" : ""}> Untimed mode</label><span>${labelStrategy(state.strategy)} strategy</span></div>
      <div class="command-layout">
        <main>${debrief ? debriefMarkup(debrief) : decisionMarkup()}</main>
        <aside class="war-room-sidebar">${rosterMarkup()}${capitalMarkup()}</aside>
      </div>
      ${decisionTreeMarkup()}`;
  }

  function decisionMarkup() {
    const options = getDecisionOptions(state);
    return `<section class="decision-window" aria-labelledby="decision-title"><header><p>Decision ${state.turn + 1} of 4</p><h3 id="decision-title">Review the board. Choose a branch.</h3><p>CPU selections move immediately after every choice.</p></header>
      ${boardMarkup()}
      <div class="branch-grid" aria-label="Available strategy branches">${options.map((option) => `<button type="button" data-branch="${option.id}" ${option.available && !state.paused ? "" : "disabled"}><span>${option.available ? "Available" : "Unavailable"}</span><strong>${option.label}</strong><small>${option.available ? option.summary : option.reason}</small>${option.available ? `<dl class="branch-effects"><div><dt>Now</dt><dd>${option.immediate}</dd></div><div><dt>Later</dt><dd>${option.later}</dd></div></dl>` : ""}</button>`).join("")}</div>
    </section>`;
  }

  function boardMarkup() {
    const board = state.board.slice(0, 4);
    return `<section class="draft-board" aria-labelledby="board-title"><div><h4 id="board-title">Fictional board</h4><p>Confidence, freshness, and one uncertainty stay attached to every option.</p></div><div class="prospect-grid">${board.map((player) => playerCard(player)).join("")}</div>${compareMarkup(board)}</section>`;
  }

  function playerCard(player) {
    return `<article data-player="${player.publicId}"><header><span>${player.position}</span><strong>${player.name}</strong><small>${player.team} · age ${player.age}</small></header><dl><div><dt>Tier</dt><dd>${player.tier}</dd></div><div><dt>Supply</dt><dd>${scarcity(state, player.position)}</dd></div><div><dt>Confidence</dt><dd>${player.evidence.confidence}</dd></div><div><dt>Freshness</dt><dd>${player.evidence.state} · ${player.evidence.asOf}</dd></div></dl><details><summary>Check the evidence</summary><p>${player.evidence.uncertainty}</p><small>${player.evidence.basis}</small></details></article>`;
  }

  function compareMarkup(board) {
    const options = board.map((player) => `<option value="${player.publicId}">${player.name} · ${player.position}</option>`).join("");
    return `<div class="compare-strip"><label>Compare A<select data-compare-a>${options}</select></label><label>Compare B<select data-compare-b>${[...board].reverse().map((player) => `<option value="${player.publicId}">${player.name} · ${player.position}</option>`).join("")}</select></label><button type="button" data-compare>Compare evidence</button><p data-comparison role="status" tabindex="-1">Choose two fictional prospects.</p></div>`;
  }

  function rosterMarkup() {
    return `<section><p>Roster pressure</p><h3>Your Club</h3><ul>${state.roster.map((player) => `<li><span>${player.position}</span><strong>${player.name}</strong><small>${player.kind === "veteran" ? `age ${player.age}` : player.kind}</small></li>`).join("")}</ul><p><strong>Open needs:</strong> ${state.needs.join(", ") || "depth only"}</p></section>`;
  }

  function capitalMarkup() {
    return `<section><p>Flexible capital</p><dl class="capital-grid"><div><dt>Current</dt><dd>${state.capital.current}</dd></div><div><dt>Later</dt><dd>${state.capital.later}</dd></div><div><dt>Future</dt><dd>${state.capital.future}</dd></div></dl><p>${state.roomPicks.length} CPU picks have changed the board.</p></section>`;
  }

  function decisionTreeMarkup() {
    const complete = state.decisions.map((decision) => `<li class="is-complete"><p>Decision ${decision.turn}</p><strong>${decision.label}</strong>${decision.target ? `<span>${decision.target.name} · ${decision.target.position}</span>` : ""}<small class="decision-consequence">${decision.consequence}</small><details><summary>See paths considered</summary><ul>${decision.options.map((option) => `<li class="${option.id === decision.branchId ? "is-chosen" : option.available ? "is-passed" : "is-unavailable"}">${option.label}<small>${option.id === decision.branchId ? "Chosen" : option.reason}</small></li>`).join("")}</ul></details></li>`).join("");
    const future = Array.from({ length: Math.max(0, 4 - state.decisions.length) }, (_, index) => `<li class="is-future"><p>Decision ${state.decisions.length + index + 1}</p><strong>Future branch</strong><span>Earlier choices will shape these options.</span></li>`).join("");
    return `<section class="decision-tree" aria-labelledby="tree-title"><header><p>Persistent decision tree</p><h3 id="tree-title">How this strategy unfolded</h3></header><ol>${complete}${future}</ol></section>`;
  }

  function debriefMarkup(debrief) {
    const labels = { rosterFit: "Roster fit", immediateCompetitiveness: "Immediate competitiveness", longTermFlexibility: "Long-term flexibility", positionalScarcity: "Positional scarcity", ageDeclineExposure: "Age / decline exposure", evidenceQuality: "Evidence quality", riskManagement: "Risk management" };
    return `<section class="war-room-debrief" aria-labelledby="debrief-title"><header><p>War Room Debrief</p><h3 id="debrief-title" tabindex="-1">A defensible path, not one magical answer</h3><p>${debrief.strategicConsistency}</p></header><div class="debrief-grid">${Object.entries(debrief.dimensions).map(([id, value]) => `<article><span>${labels[id]}</span><strong>${value.band}</strong><p>${value.reason}</p></article>`).join("")}</div><dl class="debrief-notes"><div><dt>Best value</dt><dd>${debrief.bestValue}</dd></div><div><dt>Largest risk</dt><dd>${debrief.largestRisk}</dd></div><div><dt>Strongest area</dt><dd>${debrief.strongestRosterArea}</dd></div><div><dt>Weakest area</dt><dd>${debrief.weakestRosterArea}</dd></div><div><dt>Model versus human</dt><dd>${debrief.modelHumanDisagreement}</dd></div><div><dt>Another reasonable strategy</dt><dd>${debrief.reasonableAlternative}</dd></div></dl><div class="debrief-actions"><button type="button" data-replay>Replay the same board</button><button type="button" data-new-room>Deal a new fictional board</button></div></section>`;
  }

  function statusCopy() {
    if (state.phase === "strategy") return "Choose Contender, Balanced, or Rebuild.";
    if (state.phase === "debrief") return "Debrief ready. Several reasonable alternatives remain visible.";
    return state.consequences.at(-1) || `Decision ${state.turn + 1} is ready.`;
  }

  function onClick(event) {
    const strategy = event.target.closest("[data-strategy]")?.dataset.strategy;
    if (strategy) { state = selectStrategy(state, strategy); render("[data-nwr-status]"); return; }
    const branch = event.target.closest("[data-branch]")?.dataset.branch;
    if (branch) {
      state = commitDecision(state, branch);
      render(state.phase === "debrief" ? "#debrief-title" : "[data-nwr-status]");
      if (state.phase === "debrief") onOutcome?.({ type: "nwr-draft-command", label: "War Room Debrief ready", debrief: buildDebrief(state) });
      return;
    }
    if (event.target.closest("[data-pause]")) { state = togglePause(state); render("[data-pause]"); return; }
    if (event.target.closest("[data-compare]")) { renderComparison(); return; }
    if (event.target.closest("[data-replay]")) { state = createCommand(roomSeed); render("[data-strategy]"); return; }
    if (event.target.closest("[data-new-room]")) { roomSeed = `${roomSeed}-next`; state = createCommand(roomSeed); render("[data-strategy]"); }
  }

  function onChange(event) {
    if (!event.target.matches("[data-untimed]")) return;
    state = setUntimed(state, event.target.checked);
    render("[data-untimed]");
  }

  function renderComparison() {
    const aId = root.querySelector("[data-compare-a]")?.value;
    const bId = root.querySelector("[data-compare-b]")?.value;
    const a = state.board.find((player) => player.publicId === aId);
    const b = state.board.find((player) => player.publicId === bId);
    const output = root.querySelector("[data-comparison]");
    if (!a || !b) return;
    output.textContent = `${a.name}: ${a.evidence.confidence} confidence, ${a.evidence.state} as of ${a.evidence.asOf}; uncertainty: ${a.evidence.uncertainty} ${b.name}: ${b.evidence.confidence} confidence, ${b.evidence.state} as of ${b.evidence.asOf}; uncertainty: ${b.evidence.uncertainty}`;
    output.focus?.();
  }

  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();
  return () => { detachSnapshot(); root.removeEventListener("click", onClick); root.removeEventListener("change", onChange); };
}

function labelStrategy(id) { return STRATEGIES.find((strategy) => strategy.id === id)?.label || id; }
