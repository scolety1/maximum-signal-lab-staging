import { FAMILY_LABEL, PEOPLE, RELATIONSHIPS } from "./fixtures.js";
import { clampView, familyStats, searchPeople, shortestRelationshipPath, toggleCollapsedBranch, visiblePeople } from "./model.js";

export async function mount(container, { onOutcome }) {
  let selectedId = "iris-rowan";
  let collapsedIds = Object.freeze([]);
  let relationship = Object.freeze(["mina-patel", "avery-rowan"]);
  let path = shortestRelationshipPath(PEOPLE, RELATIONSHIPS, ...relationship);
  let view = clampView({ x: 0, y: 0, zoom: 1 });
  let mode = globalThis.matchMedia?.("(max-width: 560px)").matches ? "list" : "tree";
  let drag = null;
  let branchNotice = "";
  const stats = familyStats(PEOPLE, RELATIONSHIPS);

  container.innerHTML = `<section class="family-explorer" data-family-tree-explorer aria-labelledby="family-explorer-title"></section>`;
  const root = container.querySelector("[data-family-tree-explorer]");

  function render(focusSelector = null) {
    const people = visiblePeople(PEOPLE, RELATIONSHIPS, collapsedIds);
    root.dataset.mode = mode;
    root.innerHTML = `<header class="family-header"><div><p>Fictional · read-only example tree</p><h2 id="family-explorer-title">Interactive Example Tree</h2><p>Find a relative, focus their profile, or trace a relationship across ${stats.generations} generations.</p></div><dl data-family-stats><div><dt>People</dt><dd>${stats.people}</dd></div><div><dt>Generations</dt><dd>${stats.generations}</dd></div><div><dt>Places</dt><dd>${stats.locations}</dd></div></dl></header>
      <div class="family-toolbar"><label>Search the example family<input type="search" data-family-search aria-controls="family-search-results" autocomplete="off" placeholder="Try Mina or Port Sterling"></label><div class="view-switch" aria-label="Explorer view"><button type="button" data-view-mode="tree" aria-pressed="${mode === "tree"}">Tree view</button><button type="button" data-view-mode="list" aria-pressed="${mode === "list"}">List view</button></div></div>
      <div class="family-search-results" id="family-search-results" data-search-results role="status" aria-live="polite"></div>
      <div class="family-layout"><main>${mode === "tree" ? treeMarkup(people) : listMarkup(people)}</main>${profileMarkup()}</div>
      ${relationshipMarkup()}
      <p class="family-status" data-family-status role="status" tabindex="-1">${statusCopy()}</p>`;
    if (focusSelector) queueMicrotask(() => root.querySelector(focusSelector)?.focus({ preventScroll: true }));
  }

  function treeMarkup(people) {
    const visibleIds = new Set(people.map((person) => person.id));
    const edges = RELATIONSHIPS.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to));
    return `<section class="tree-workspace" aria-labelledby="tree-title"><header><div><h3 id="tree-title">${FAMILY_LABEL}</h3><p>Pan with the direction controls or pointer. Zoom never changes the data.</p></div><div class="zoom-controls"><button type="button" data-zoom-out aria-label="Zoom out">−</button><output aria-label="Tree zoom">${Math.round(view.zoom * 100)}%</output><button type="button" data-zoom-in aria-label="Zoom in">+</button><button type="button" data-reset-view>Reset view</button></div></header>
      <div class="pan-controls" aria-label="Pan tree"><button type="button" data-pan="left">← <span>Pan left</span></button><button type="button" data-pan="up">↑ <span>Pan up</span></button><button type="button" data-pan="down">↓ <span>Pan down</span></button><button type="button" data-pan="right">→ <span>Pan right</span></button></div>
      <div class="tree-viewport" data-tree-viewport tabindex="0" aria-label="Pannable fictional family tree"><div class="tree-canvas" data-family-tree style="--tree-x:${view.x}px;--tree-y:${view.y}px;--tree-zoom:${view.zoom}">
        <svg viewBox="0 0 920 540" aria-hidden="true">${edges.map(edgeLine).join("")}</svg>
        ${people.map(nodeMarkup).join("")}
      </div></div></section>`;
  }

  function edgeLine(edge) {
    const from = PEOPLE.find((person) => person.id === edge.from);
    const to = PEOPLE.find((person) => person.id === edge.to);
    const active = path.includes(edge.from) && path.includes(edge.to);
    return `<line x1="${from.x + 60}" y1="${from.y + 40}" x2="${to.x + 60}" y2="${to.y + 40}" class="edge-${edge.type} ${active ? "is-path" : ""}"></line>`;
  }

  function nodeMarkup(person) {
    return `<button type="button" class="person-node ${selectedId === person.id ? "is-selected" : ""} ${path.includes(person.id) ? "is-path" : ""}" style="--node-x:${person.x}px;--node-y:${person.y}px" data-tree-node="${person.id}" aria-pressed="${selectedId === person.id}"><span>${person.initials}</span><strong>${person.name}</strong><small>${person.birthYear} · ${person.location}</small></button>`;
  }

  function listMarkup(people) {
    return `<section class="family-list" aria-labelledby="list-title"><h3 id="list-title">Family by generation</h3>${[0,1,2].map((generation) => `<section><h4>Generation ${generation + 1}</h4><ul>${people.filter((person) => person.generation === generation).map((person) => `<li><button type="button" data-tree-node="${person.id}" aria-pressed="${selectedId === person.id}"><span>${person.initials}</span><strong>${person.name}</strong><small>${person.location}</small></button></li>`).join("")}</ul></section>`).join("")}</section>`;
  }

  function profileMarkup() {
    const person = PEOPLE.find((item) => item.id === selectedId);
    const childCount = RELATIONSHIPS.filter((edge) => edge.type === "parent" && edge.from === person.id).length;
    const parentCount = RELATIONSHIPS.filter((edge) => edge.type === "parent" && edge.to === person.id).length;
    return `<aside class="person-profile" data-person-profile tabindex="-1"><p>Fictional profile</p><div class="profile-avatar">${person.initials}</div><h3>${person.name}</h3><p>${person.summary}</p><dl><div><dt>Born</dt><dd>${person.birthYear}</dd></div><div><dt>Place</dt><dd>${person.location}</dd></div><div><dt>Parents in tree</dt><dd>${parentCount}</dd></div><div><dt>Children in tree</dt><dd>${childCount}</dd></div></dl>${childCount ? `<button type="button" data-toggle-branch="${person.id}" aria-pressed="${collapsedIds.includes(person.id)}">${collapsedIds.includes(person.id) ? "Expand" : "Collapse"} this branch</button>` : ""}<p class="read-only-note">Read-only example · no edits or invitations</p></aside>`;
  }

  function relationshipMarkup() {
    const options = PEOPLE.map((person) => `<option value="${person.id}">${person.name}</option>`).join("");
    const pathNames = path.map((id) => PEOPLE.find((person) => person.id === id)?.name).filter(Boolean);
    const pathMarkup = pathNames.length ? `<ol class="relationship-path" aria-label="Shortest relationship path">${pathNames.map((name, index) => `<li><span>${index + 1}</span><strong>${name}</strong></li>`).join("")}</ol>` : "No connected path in this example.";
    return `<section class="relationship-finder" aria-labelledby="relationship-title"><div><p>Graph traversal</p><h3 id="relationship-title">Trace a relationship</h3><p>Select two fictional people. The explorer shows the shortest connected path without inventing a kinship label.</p></div><div class="relationship-controls"><label>Person A<select data-relationship-a>${options}</select></label><label>Person B<select data-relationship-b>${options}</select></label><button type="button" data-find-relationship>Trace relationship</button></div><div data-relationship-result role="status" tabindex="-1">${pathMarkup}</div></section>`;
  }

  function syncRelationshipSelects() {
    const a = root.querySelector("[data-relationship-a]");
    const b = root.querySelector("[data-relationship-b]");
    if (a) a.value = relationship[0];
    if (b) b.value = relationship[1];
  }

  function statusCopy() {
    const person = PEOPLE.find((item) => item.id === selectedId);
    return `${branchNotice ? `${branchNotice} ` : ""}${person.name} focused. ${path.length ? `Relationship path has ${path.length} people.` : "No relationship path selected."}`;
  }

  function onClick(event) {
    const personId = event.target.closest("[data-tree-node]")?.dataset.treeNode;
    if (personId) { selectedId = personId; centerOn(personId); render("[data-person-profile]"); syncRelationshipSelects(); return; }
    const resultId = event.target.closest("[data-search-person]")?.dataset.searchPerson;
    if (resultId) { selectedId = resultId; centerOn(resultId); render(`[data-tree-node="${resultId}"]`); syncRelationshipSelects(); return; }
    const modeId = event.target.closest("[data-view-mode]")?.dataset.viewMode;
    if (modeId) { mode = modeId; render(`[data-view-mode="${modeId}"]`); syncRelationshipSelects(); return; }
    const pan = event.target.closest("[data-pan]")?.dataset.pan;
    if (pan) { const delta = { left:[80,0], right:[-80,0], up:[0,70], down:[0,-70] }[pan]; view = clampView({ ...view, x:view.x+delta[0], y:view.y+delta[1] }); render(`[data-pan="${pan}"]`); syncRelationshipSelects(); return; }
    if (event.target.closest("[data-zoom-in]")) { view = clampView({ ...view, zoom:view.zoom+.15 }); render("[data-zoom-in]"); syncRelationshipSelects(); return; }
    if (event.target.closest("[data-zoom-out]")) { view = clampView({ ...view, zoom:view.zoom-.15 }); render("[data-zoom-out]"); syncRelationshipSelects(); return; }
    if (event.target.closest("[data-reset-view]")) { view = clampView({ x:0,y:0,zoom:1 }); render("[data-reset-view]"); syncRelationshipSelects(); return; }
    const branchId = event.target.closest("[data-toggle-branch]")?.dataset.toggleBranch;
    if (branchId) {
      const wasCollapsed = collapsedIds.includes(branchId);
      const before = visiblePeople(PEOPLE, RELATIONSHIPS, collapsedIds).length;
      collapsedIds = toggleCollapsedBranch(collapsedIds, branchId);
      const after = visiblePeople(PEOPLE, RELATIONSHIPS, collapsedIds).length;
      const person = PEOPLE.find((item) => item.id === branchId);
      branchNotice = wasCollapsed ? `${person.name}'s branch expanded.` : `${person.name}'s branch collapsed; ${Math.max(0, before - after)} descendant${before - after === 1 ? "" : "s"} hidden.`;
      render("[data-person-profile]"); syncRelationshipSelects(); return;
    }
    if (event.target.closest("[data-find-relationship]")) {
      relationship = Object.freeze([root.querySelector("[data-relationship-a]").value, root.querySelector("[data-relationship-b]").value]);
      path = shortestRelationshipPath(PEOPLE, RELATIONSHIPS, ...relationship);
      branchNotice = "";
      render("[data-relationship-result]"); syncRelationshipSelects();
      onOutcome?.({ type:"family-tree-explorer", label:"Relationship path traced", path });
    }
  }

  function onInput(event) {
    if (!event.target.matches("[data-family-search]")) return;
    const results = searchPeople(PEOPLE, event.target.value).slice(0, 5);
    const region = root.querySelector("[data-search-results]");
    region.innerHTML = results.length ? `<p>${results.length} match${results.length === 1 ? "" : "es"} in this example</p>${results.map((person) => `<button type="button" data-search-person="${person.id}">${person.name}<small>${person.location}</small></button>`).join("")}` : '<p role="status">No match in this example family. Try another name.</p>';
  }

  function centerOn(id) {
    const person = PEOPLE.find((item) => item.id === id);
    view = clampView({ ...view, x:360-person.x, y:220-person.y });
  }

  function onPointerDown(event) {
    const viewport = event.target.closest("[data-tree-viewport]");
    if (!viewport || event.target.closest("button")) return;
    drag = { id:event.pointerId, x:event.clientX, y:event.clientY, startX:view.x, startY:view.y };
    viewport.setPointerCapture?.(event.pointerId);
  }
  function onPointerMove(event) { if (!drag || event.pointerId !== drag.id) return; view = clampView({ ...view, x:drag.startX+event.clientX-drag.x, y:drag.startY+event.clientY-drag.y }); const canvas=root.querySelector("[data-family-tree]"); if(canvas){canvas.style.setProperty("--tree-x",`${view.x}px`);canvas.style.setProperty("--tree-y",`${view.y}px`);} }
  function onPointerUp(event) { if (drag?.id === event.pointerId) drag = null; }

  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerUp);
  render(); syncRelationshipSelects();
  return () => { root.removeEventListener("click", onClick); root.removeEventListener("input", onInput); root.removeEventListener("pointerdown", onPointerDown); root.removeEventListener("pointermove", onPointerMove); root.removeEventListener("pointerup", onPointerUp); root.removeEventListener("pointercancel", onPointerUp); };
}
