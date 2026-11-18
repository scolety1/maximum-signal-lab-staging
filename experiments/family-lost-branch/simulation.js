import { EDGE_TYPES, getSeed } from './fixtures.js?v=2';
const key = ({ from, to, type }) => type === 'spouse' ? `${type}:${[from, to].sort().join(':')}` : `${type}:${from}:${to}`;
const snapshot = (state) => ({ placed: [...state.placed], positions: { ...state.positions }, edges: state.edges.map((e) => ({ ...e })) });
export function createGame(seedId = 'cedar') { const seed = getSeed(seedId); return Object.freeze({ seedId, placed: Object.freeze([]), positions: Object.freeze({}), edges: Object.freeze([]), history: Object.freeze([]), message: seed.story, replay: Object.freeze([]) }); }
function commit(state, patch, action, message) { return Object.freeze({ ...state, ...patch, history: Object.freeze([...state.history, snapshot(state)]), replay: Object.freeze([...state.replay, action]), message }); }
export function placePerson(state, personId, x, y) {
  const seed = getSeed(state.seedId); if (!seed.people.some((p) => p.id === personId)) return { state, error: 'Unknown person.' };
  const already = state.placed.includes(personId), positions = Object.freeze({ ...state.positions, [personId]: Object.freeze([Number(x), Number(y)]) });
  return { state: commit(state, { positions, placed: already ? state.placed : Object.freeze([...state.placed, personId]) }, { kind: already ? 'move' : 'place', personId, x: Number(x), y: Number(y) }, `${personId} ${already ? 'moved' : 'placed'}.`) };
}
function descendants(edges, start) { const seen = new Set(), queue = [start]; while (queue.length) { const current = queue.shift(); for (const e of edges) if (e.type === 'parent' && e.from === current && !seen.has(e.to)) { seen.add(e.to); queue.push(e.to); } } return seen; }
export function contradiction(state, edge) {
  const seed = getSeed(state.seedId);
  if (!EDGE_TYPES.includes(edge.type)) return 'Choose a valid relationship type.';
  if (edge.from === edge.to) return 'A person cannot connect to themself.';
  if (!seed.people.some((p) => p.id === edge.from) || !seed.people.some((p) => p.id === edge.to)) return 'Both people must exist.';
  if (!state.placed.includes(edge.from) || !state.placed.includes(edge.to)) return 'Place both people before connecting them.';
  if (state.edges.some((item) => key(item) === key(edge))) return 'That relationship already exists.';
  if (edge.type === 'parent' && descendants(state.edges, edge.to).has(edge.from)) return 'Contradiction: this relationship creates an ancestry cycle.';
  return '';
}
export function connectPeople(state, from, to, type) { const edge = { from, to, type }, error = contradiction(state, edge); return error ? { state: Object.freeze({ ...state, message: error }), error } : { state: commit(state, { edges: Object.freeze([...state.edges, Object.freeze(edge)]) }, { kind: 'connect', ...edge }, `${type} relationship added.`) }; }
export function undo(state) { if (!state.history.length) return state; const previous = state.history.at(-1); return Object.freeze({ ...state, ...previous, placed: Object.freeze(previous.placed), positions: Object.freeze(previous.positions), edges: Object.freeze(previous.edges), history: Object.freeze(state.history.slice(0, -1)), replay: Object.freeze(state.replay.slice(0, -1)), message: 'Last move undone.' }); }
export const reset = (state) => createGame(state.seedId);
export function hint(state) { const seed = getSeed(state.seedId), person = seed.people.find((p) => !state.placed.includes(p.id)); if (person) return { kind: 'place', personId: person.id, target: person.target, text: `Place ${person.name} near the highlighted slot.` }; const present = new Set(state.edges.map(key)), edge = seed.edges.find((e) => !present.has(key(e))); return edge ? { kind: 'connect', ...edge, text: `Try a ${edge.type} line from ${edge.from} to ${edge.to}.` } : { kind: 'complete', text: 'Every clue is resolved.' }; }
export function isComplete(state, tolerance = 58) { const seed = getSeed(state.seedId); if (state.placed.length !== seed.people.length) return false; if (!seed.people.every((p) => Math.hypot((state.positions[p.id]?.[0] ?? Infinity) - p.target[0], (state.positions[p.id]?.[1] ?? Infinity) - p.target[1]) <= tolerance)) return false; const expected = new Set(seed.edges.map(key)), actual = new Set(state.edges.map(key)); return actual.size === expected.size && [...expected].every((e) => actual.has(e)); }
export function bfsPath(state, start, finish) { if (start === finish) return [start]; const queue = [[start]], seen = new Set([start]); while (queue.length) { const path = queue.shift(), at = path.at(-1); for (const e of state.edges) { const next = e.from === at ? e.to : e.to === at ? e.from : null; if (!next || seen.has(next)) continue; const nextPath = [...path, next]; if (next === finish) return nextPath; seen.add(next); queue.push(nextPath); } } return []; }
export function replay(state) { let next = createGame(state.seedId); for (const a of state.replay) next = a.kind === 'connect' ? connectPeople(next, a.from, a.to, a.type).state : placePerson(next, a.personId, a.x, a.y).state; return next; }
