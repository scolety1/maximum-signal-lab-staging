import { advanceRound, createRound, getRoundSummary, getScenario, nextSeed, serveWine, togglePause } from "./simulation.js";

export async function mount(container, { seed = "sommelier-rush", onOutcome } = {}) {
  let activeSeed = seed;
  let round = createRound(activeSeed);
  let selectedWine = null;
  let lastReceiptCount = 0;
  let timer = setInterval(tick, 1000);
  container.innerHTML = shell();
  const root = container.querySelector(".sommelier-rush");
  const polite = root.querySelector("[data-live]");

  function tick() {
    const previous = round;
    round = advanceRound(round, 1);
    if (selectedWine && !round.inventory.find((item) => item.id === selectedWine)?.available) selectedWine = null;
    if (round !== previous) render();
    if (round.status === "complete") finish();
  }

  function chooseWine(id) {
    const wine = round.inventory.find((item) => item.id === id);
    if (!wine?.available || round.paused || round.status !== "active") return;
    selectedWine = id;
    render();
    announce(`${wine.name} selected. Choose a waiting table.`);
  }

  function serve(tableId, wineId = selectedWine) {
    if (!wineId) { announce("Choose a bottle first."); return; }
    try {
      round = serveWine(round, tableId, wineId);
      const result = round.tables.find((table) => table.id === tableId).result;
      const table = round.tables.find((item) => item.id === tableId);
      selectedWine = null;
      render();
      announce(`${table.label} served. ${result.total} points.`);
      if (round.status === "complete") finish();
    } catch (error) { announce(error.message); }
  }

  function finish() {
    clearInterval(timer); timer = null;
    const summary = getRoundSummary(round);
    onOutcome?.({ status: "complete", score: summary.score, summary: summary.grade, seed: activeSeed });
    render();
    queueMicrotask(() => root.querySelector("[data-replay]")?.focus({ preventScroll: true }));
  }

  function reset(next = activeSeed) {
    clearInterval(timer);
    activeSeed = next;
    round = createRound(activeSeed);
    selectedWine = null; lastReceiptCount = 0;
    timer = setInterval(tick, 1000);
    render();
    queueMicrotask(() => root.querySelector("[data-first-wine]")?.focus({ preventScroll: true }));
  }

  function render() {
    const focusSelector = focusReturnSelector(root.contains(document.activeElement) ? document.activeElement : null);
    const scenario = getScenario(round.scenarioId);
    root.dataset.paused = String(round.paused);
    root.querySelector("[data-scenario]").textContent = scenario.label;
    root.querySelector("[data-clock]").textContent = formatTime(Math.max(0, scenario.duration - round.elapsed));
    root.querySelector("[data-score]").textContent = String(round.score);
    root.querySelector("[data-pause]").textContent = round.paused ? "Resume" : "Pause";
    root.querySelector("[data-pause]").setAttribute("aria-pressed", String(round.paused));
    root.querySelector("[data-rack]").innerHTML = round.inventory.map((wine, index) => wineMarkup(wine, selectedWine === wine.id, index === 0)).join("");
    const selected = round.inventory.find((wine) => wine.id === selectedWine);
    root.querySelector("[data-selection]").textContent = selected ? `${selected.name} selected — now choose a waiting table.` : "No bottle selected yet.";
    root.querySelector("[data-tables]").innerHTML = round.tables.map(tableMarkup).join("");
    const newest = round.receipts.slice(-3);
    root.querySelector("[data-service-log]").innerHTML = newest.length ? newest.map((receipt) => `<li class="is-${receipt.tone}">${escapeHtml(receipt.message)}</li>`).join("") : "<li>Choose a bottle, then serve a table.</li>";
    root.querySelector("[data-result]").innerHTML = round.status === "complete" ? resultMarkup(getRoundSummary(round)) : "";
    root.querySelector("[data-result]").hidden = round.status !== "complete";
    if (round.receipts.length > lastReceiptCount) { announce(round.receipts.at(-1).message); lastReceiptCount = round.receipts.length; }
    if (focusSelector) queueMicrotask(() => root.querySelector(focusSelector)?.focus({ preventScroll: true }));
  }

  function onClick(event) {
    const wine = event.target.closest("[data-wine]"); if (wine) return chooseWine(wine.dataset.wine);
    const serveButton = event.target.closest("[data-serve]"); if (serveButton) return serve(serveButton.dataset.serve);
    if (event.target.closest("[data-pause]")) { round = togglePause(round); render(); return announce(round.paused ? "Service paused." : "Service resumed."); }
    if (event.target.closest("[data-restart]")) return reset();
    if (event.target.closest("[data-replay]")) return reset(nextSeed(activeSeed));
  }
  function onDragStart(event) { const bottle = event.target.closest("[data-wine]"); if (bottle && !bottle.disabled) event.dataTransfer?.setData("text/plain", bottle.dataset.wine); }
  function onDragOver(event) { if (event.target.closest("[data-table][data-waiting='true']")) event.preventDefault(); }
  function onDrop(event) { const table = event.target.closest("[data-table][data-waiting='true']"); if (!table) return; event.preventDefault(); serve(table.dataset.table, event.dataTransfer?.getData("text/plain")); }
  function announce(message) { polite.textContent = ""; requestAnimationFrame(() => { polite.textContent = message; }); }

  root.addEventListener("click", onClick); root.addEventListener("dragstart", onDragStart); root.addEventListener("dragover", onDragOver); root.addEventListener("drop", onDrop);
  render();
  return () => { clearInterval(timer); root.removeEventListener("click", onClick); root.removeEventListener("dragstart", onDragStart); root.removeEventListener("dragover", onDragOver); root.removeEventListener("drop", onDrop); container.innerHTML = ""; };
}

function shell() { return `<section class="sommelier-rush" aria-labelledby="sommelier-title">
  <header class="sommelier-head"><div><p class="sommelier-kicker">Urban Kitchen · fictional service simulation</p><h2 id="sommelier-title">Sommelier Rush</h2><p>Match a bottle to each table before patience runs out. Meaningful substitutes still earn partial credit.</p></div><div class="sommelier-controls"><button type="button" data-pause>Pause</button><button type="button" data-restart>Restart this service</button></div></header>
  <div class="sommelier-scoreboard" aria-label="Round status"><span><b data-scenario></b> · Service wave</span><span>Time <b data-clock>0:00</b></span><span>Score <b data-score>0</b></span></div>
  <p class="sommelier-instruction">Choose a bottle, then choose <b>Serve here</b>. Dragging is optional.</p><p class="sommelier-selection" data-selection>No bottle selected yet.</p>
  <div class="sommelier-floor"><section aria-labelledby="rack-title"><h3 id="rack-title">Wine rack</h3><div class="wine-rack" data-rack></div></section><section aria-labelledby="tables-title"><h3 id="tables-title">Dining room</h3><div class="table-grid" data-tables></div></section></div>
  <aside class="service-log"><h3>Service notes</h3><ul data-service-log></ul></aside><section class="round-result" data-result hidden></section>
  <p class="sommelier-disclosure">Every bottle, table, price, pairing, and availability change in this game is fictional. It uses no AI, live inventory, restaurant integration, or guest data.</p><p class="sr-only" aria-live="polite" aria-atomic="true" data-live></p>
</section>`; }

function wineMarkup(wine, selected, first) { return `<button class="wine-card${selected ? " is-selected" : ""}" type="button" data-wine="${wine.id}" ${first ? "data-first-wine" : ""} ${wine.available ? `draggable="true" aria-pressed="${selected}"` : "disabled"}><span class="wine-bottle" aria-hidden="true"></span><span><b>${escapeHtml(wine.name)}</b><small>${wine.type} · ${wine.body} · ${wine.style}</small><small>$${wine.price} fictional bottle</small><small>${escapeHtml(wine.note)}</small></span>${wine.available ? "" : "<em>Unavailable</em>"}</button>`; }
function tableMarkup(table) { const waiting = table.status === "waiting"; const percent = Math.round((table.patienceLeft / table.patience) * 100); return `<article class="dining-table is-${table.status}" data-table="${table.id}" data-waiting="${waiting}"><div class="table-top"><h4>${table.label}</h4><span>${table.requestChanged ? "Order changed" : table.status}</span></div><p class="dish">${escapeHtml(table.dish)}</p><dl><div><dt>Style</dt><dd>${table.body}, ${table.preference}</dd></div><div><dt>Budget</dt><dd>$${table.budget}</dd></div></dl><div class="patience"><span>Patience</span><meter min="0" max="100" value="${percent}">${percent}%</meter></div>${waiting ? `<button type="button" data-serve="${table.id}">Serve here</button>` : table.result ? `<p class="table-result"><b>${table.result.total} points</b> ${escapeHtml(table.result.explanation)}</p>` : `<p class="table-result">Table left before service.</p>`}</article>`; }
function resultMarkup(summary) { return `<p class="sommelier-kicker">Service complete</p><h3>${summary.grade}</h3><div class="result-grid"><span><b>${summary.percent}%</b> satisfaction</span><span><b>${summary.served}</b> served</span><span><b>${summary.missed}</b> missed</span><span><b>${summary.best}</b> best table</span></div><p>Pairing, preference, budget, substitution, and timing each shaped the receipt.</p><button type="button" data-replay>Play a different service</button>`; }
function formatTime(seconds) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function focusReturnSelector(element) {
  if (!element) return null;
  for (const key of ["wine", "serve", "pause", "restart", "replay"]) {
    if (!element.hasAttribute(`data-${key}`)) continue;
    const value = element.getAttribute(`data-${key}`);
    return value ? `[data-${key}="${value}"]` : `[data-${key}]`;
  }
  return null;
}
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]); }
