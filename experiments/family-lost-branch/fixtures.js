export const EDGE_TYPES = Object.freeze(['parent', 'spouse']);
const seed = (id, title, people, edges, story) => Object.freeze({ id, title, story, people: Object.freeze(people.map(Object.freeze)), edges: Object.freeze(edges.map(Object.freeze)) });
export const SEEDS = Object.freeze([
  seed('cedar', 'The Cedar Postcard', [
    { id: 'ada', name: 'Ada Vale', target: [120, 80] }, { id: 'bo', name: 'Bo Vale', target: [360, 80] },
    { id: 'cy', name: 'Cy Vale', target: [120, 230] }, { id: 'dee', name: 'Dee Rowan', target: [360, 230] },
    { id: 'eve', name: 'Eve Rowan', target: [120, 350] }, { id: 'finn', name: 'Finn Vale', target: [360, 350] },
  ], [
    { from: 'ada', to: 'bo', type: 'spouse' }, { from: 'ada', to: 'cy', type: 'parent' },
    { from: 'bo', to: 'cy', type: 'parent' }, { from: 'cy', to: 'dee', type: 'spouse' },
    { from: 'cy', to: 'eve', type: 'parent' }, { from: 'dee', to: 'eve', type: 'parent' },
    { from: 'ada', to: 'finn', type: 'parent' },
  ], 'A fictional postcard says Cy stood between the cedar and the Rowan lantern.'),
  seed('harbor', 'Harbor Lanterns', [
    { id: 'eli', name: 'Eli Moss', target: [110, 70] }, { id: 'fox', name: 'Fox Moss', target: [350, 70] },
    { id: 'gia', name: 'Gia Lake', target: [110, 220] }, { id: 'hal', name: 'Hal Lake', target: [350, 220] },
    { id: 'iona', name: 'Iona Lake', target: [110, 350] }, { id: 'jory', name: 'Jory Moss', target: [350, 350] },
  ], [
    { from: 'eli', to: 'fox', type: 'spouse' }, { from: 'eli', to: 'gia', type: 'parent' },
    { from: 'fox', to: 'gia', type: 'parent' }, { from: 'gia', to: 'hal', type: 'spouse' },
    { from: 'gia', to: 'iona', type: 'parent' }, { from: 'hal', to: 'iona', type: 'parent' },
    { from: 'eli', to: 'jory', type: 'parent' },
  ], 'A fictional harbor log places Gia beneath both Moss lanterns.'),
  seed('orchard', 'The Orchard Ribbon', [
    { id: 'ira', name: 'Ira Finch', target: [95, 65] }, { id: 'june', name: 'June Finch', target: [335, 65] },
    { id: 'kit', name: 'Kit Finch', target: [95, 215] }, { id: 'lou', name: 'Lou Pike', target: [335, 215] },
    { id: 'mara', name: 'Mara Pike', target: [95, 350] }, { id: 'nico', name: 'Nico Pike', target: [335, 350] },
  ], [
    { from: 'ira', to: 'june', type: 'spouse' }, { from: 'ira', to: 'kit', type: 'parent' },
    { from: 'june', to: 'kit', type: 'parent' }, { from: 'kit', to: 'lou', type: 'spouse' },
    { from: 'kit', to: 'mara', type: 'parent' }, { from: 'lou', to: 'mara', type: 'parent' },
    { from: 'kit', to: 'nico', type: 'parent' }, { from: 'lou', to: 'nico', type: 'parent' },
  ], 'A fictional orchard ribbon places Mara beneath the Finch and Pike branches.'),
]);
export function getSeed(id = 'cedar') { const found = SEEDS.find((item) => item.id === id); if (!found) throw new Error(`Unknown seed: ${id}`); return found; }
