export function searchPeople(people, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return [];
  return people.filter((person) => `${person.name} ${person.location}`.toLowerCase().includes(needle));
}

export function shortestRelationshipPath(people, relationships, fromId, toId) {
  if (!people.some((person) => person.id === fromId) || !people.some((person) => person.id === toId)) return [];
  if (fromId === toId) return [fromId];
  const adjacency = new Map(people.map((person) => [person.id, []]));
  for (const edge of relationships) { adjacency.get(edge.from)?.push(edge.to); adjacency.get(edge.to)?.push(edge.from); }
  const queue = [[fromId]];
  const seen = new Set([fromId]);
  while (queue.length) {
    const path = queue.shift();
    for (const id of adjacency.get(path.at(-1)) || []) {
      if (seen.has(id)) continue;
      const next = [...path, id];
      if (id === toId) return next;
      seen.add(id);
      queue.push(next);
    }
  }
  return [];
}

export function visiblePeople(people, relationships, collapsedIds) {
  const hidden = new Set();
  const collapsed = new Set(collapsedIds);
  const children = new Map();
  for (const edge of relationships.filter((edge) => edge.type === "parent")) {
    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from).push(edge.to);
  }
  function hideDescendants(id) { for (const child of children.get(id) || []) { hidden.add(child); hideDescendants(child); } }
  for (const id of collapsed) hideDescendants(id);
  return people.filter((person) => !hidden.has(person.id));
}

export function toggleCollapsedBranch(collapsedIds, id) {
  const next = new Set(collapsedIds);
  if (next.has(id)) next.delete(id); else next.add(id);
  return Object.freeze([...next]);
}

export function familyStats(people, relationships) {
  return Object.freeze({
    people: people.length,
    generations: new Set(people.map((person) => person.generation)).size,
    partnerships: relationships.filter((edge) => edge.type === "partner").length,
    locations: new Set(people.map((person) => person.location)).size,
  });
}

export function clampView(view) {
  return Object.freeze({ x: Math.max(-600, Math.min(600, Number(view.x) || 0)), y: Math.max(-400, Math.min(400, Number(view.y) || 0)), zoom: Math.max(.65, Math.min(1.6, Number(view.zoom) || 1)) });
}
