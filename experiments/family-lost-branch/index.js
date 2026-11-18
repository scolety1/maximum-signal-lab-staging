import { EDGE_TYPES, SEEDS, getSeed } from './fixtures.js?v=2';
import { bfsPath, connectPeople, createGame, hint, isComplete, placePerson, replay, reset, undo } from './simulation.js?v=2';

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const seedIdFor = (seed) => typeof seed === 'string' && SEEDS.some((item) => item.id === seed)
  ? seed : SEEDS[Math.abs(Number(seed) || 0) % SEEDS.length].id;

export async function mount(container, context = {}) {
  const controller = new AbortController();
  const { signal } = controller;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('./styles.css?v=2', import.meta.url).href;
  style.dataset.lostBranchStyle = '';
  document.head.append(style);
  container.innerHTML = '<div class="lost-branch-game" data-lost-branch></div>';
  const root = container.querySelector('[data-lost-branch]');
  let state = createGame(seedIdFor(context.seed));
  let selected = null, edgeType = 'parent', pathEnds = [];
  const person = (id) => getSeed(state.seedId).people.find((p) => p.id === id);

  function line(edge) {
    const [x1, y1] = state.positions[edge.from], [x2, y2] = state.positions[edge.to];
    return `<line class="lost-edge ${edge.type}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><title>${esc(edge.type)} relationship</title></line>`;
  }
  function render() {
    const seed = getSeed(state.seedId), complete = isComplete(state), path = pathEnds.length === 2 ? bfsPath(state, ...pathEnds) : [];
    root.innerHTML = `<header class="lost-header"><p class="lost-eyebrow">Offline fiction · relationship logic lab</p><h4>The Lost Branch</h4><p>${esc(seed.story)}</p></header>
      <section class="lost-toolbar" aria-label="Puzzle controls"><label>Puzzle <select data-seed>${SEEDS.map((s) => `<option value="${s.id}" ${s.id === seed.id ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select></label><label>Line <select data-type>${EDGE_TYPES.map((t) => `<option ${t === edgeType ? 'selected' : ''}>${t}</option>`).join('')}</select></label><button data-act="undo">Undo</button><button data-act="reset">Reset</button><button data-act="hint">Hint</button><button data-act="replay">Replay</button></section>
      <div class="lost-workspace"><aside><h5>People</h5><p>Drag, tap, or press Enter to place. Select two placed cards to connect.</p><div class="lost-roster">${seed.people.map((p) => `<button class="lost-person ${selected === p.id ? 'selected' : ''}" draggable="true" data-person="${p.id}" aria-pressed="${selected === p.id}">${esc(p.name)}<small>${state.placed.includes(p.id) ? 'placed' : 'unplaced'}</small></button>`).join('')}</div></aside>
      <section class="lost-board-wrap"><svg data-board viewBox="0 0 480 420" role="application" aria-label="Family tree board">${seed.people.map((p) => `<rect class="lost-target" x="${p.target[0] - 55}" y="${p.target[1] - 26}" width="110" height="52" rx="12" aria-hidden="true"/>`).join('')}${state.edges.map(line).join('')}${state.placed.map((id) => { const [x,y]=state.positions[id], p=person(id); return `<g class="lost-node ${path.includes(id) ? 'path' : ''}" tabindex="0" data-node="${id}" transform="translate(${x} ${y})"><rect x="-55" y="-26" width="110" height="52" rx="12"/><text text-anchor="middle" y="5">${esc(p.name)}</text></g>`; }).join('')}</svg></section>
      <aside><h5>Edge-list mirror</h5><ol class="lost-edges">${state.edges.map((e) => `<li><button data-path="${e.from}">${esc(person(e.from).name)}</button> <strong>${e.type}</strong> <button data-path="${e.to}">${esc(person(e.to).name)}</button></li>`).join('') || '<li>No relationships yet.</li>'}</ol><p>Path finder: choose two names. ${path.length ? `<mark>${path.map((id) => esc(person(id).name)).join(' → ')}</mark>` : ''}</p></aside></div>
      <footer class="lost-footer"><p role="status">${complete ? 'Complete! The lost branch is restored.' : esc(state.message)}</p></footer>`;
  }
  function choose(id) {
    if (!state.placed.includes(id)) state = placePerson(state, id, ...person(id).target).state;
    else if (!selected) selected = id;
    else if (selected === id) selected = null;
    else { state = connectPeople(state, selected, id, edgeType).state; selected = null; }
    render();
  }
  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-seed]')) { state = createGame(event.target.value); selected = null; pathEnds = []; render(); }
    if (event.target.matches('[data-type]')) edgeType = event.target.value;
  }, { signal });
  root.addEventListener('click', (event) => {
    const personButton = event.target.closest('[data-person],[data-node]'); if (personButton) { choose(personButton.dataset.person || personButton.dataset.node); return; }
    const pathButton = event.target.closest('[data-path]'); if (pathButton) { const id=pathButton.dataset.path; pathEnds=pathEnds.includes(id)?pathEnds.filter((x)=>x!==id):[...pathEnds.slice(-1),id]; render(); return; }
    const action = event.target.closest('[data-act]')?.dataset.act; if (!action) return;
    if (action==='undo') state=undo(state); if (action==='reset') state=reset(state); if (action==='replay') state=replay(state); if (action==='hint') state=Object.freeze({...state,message:hint(state).text}); render();
  }, { signal });
  root.addEventListener('keydown', (event) => {
    const node=event.target.closest('[data-node]'); if (!node) return;
    if (event.key==='Enter'||event.key===' ') { event.preventDefault(); choose(node.dataset.node); return; }
    const step=event.shiftKey?20:8, delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key]; if (!delta) return;
    event.preventDefault(); const [x,y]=state.positions[node.dataset.node]; state=placePerson(state,node.dataset.node,x+delta[0],y+delta[1]).state; render();
  }, { signal });
  root.addEventListener('dragstart', (event) => { const button=event.target.closest('[data-person]'); if (button) event.dataTransfer.setData('text/plain',button.dataset.person); }, { signal });
  root.addEventListener('dragover', (event) => { if (event.target.closest('[data-board]')) event.preventDefault(); }, { signal });
  root.addEventListener('drop', (event) => { const board=event.target.closest('[data-board]'); if (!board) return; event.preventDefault(); const id=event.dataTransfer.getData('text/plain'), point=board.createSVGPoint(); point.x=event.clientX; point.y=event.clientY; const local=point.matrixTransform(board.getScreenCTM().inverse()); state=placePerson(state,id,local.x,local.y).state; render(); }, { signal });
  render();
  return () => { controller.abort(); root.replaceChildren(); style.remove(); container.replaceChildren(); };
}
