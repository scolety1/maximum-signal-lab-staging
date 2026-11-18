export const PEOPLE = deepFreeze([
  person("marin-rowan", "Marin Rowan", "MR", 1948, "Port Sterling", "Keeps a notebook of garden sketches.", 0, 130, 60),
  person("sol-rowan", "Sol Rowan", "SR", 1946, "Port Sterling", "Builds small wooden boats in the winter.", 0, 330, 60),
  person("iris-rowan", "Iris Rowan", "IR", 1972, "Meadow Bay", "Archivist and enthusiastic bread baker.", 1, 40, 230),
  person("dev-patel", "Dev Patel", "DP", 1971, "Meadow Bay", "Maps local walking trails.", 1, 210, 230),
  person("cal-rowan", "Cal Rowan", "CR", 1975, "Port Sterling", "Teaches physics and repairs old radios.", 1, 380, 230),
  person("lena-ortiz", "Lena Ortiz", "LO", 1977, "Port Sterling", "Designs community gardens.", 1, 550, 230),
  person("mina-patel", "Mina Patel", "MP", 1998, "Meadow Bay", "Illustrates field guides.", 2, 20, 420),
  person("theo-patel", "Theo Patel", "TP", 2001, "Riverbend", "Studies urban ecology.", 2, 170, 420),
  person("june-rowan", "June Rowan", "JR", 2002, "Port Sterling", "Plays cello in a neighborhood ensemble.", 2, 340, 420),
  person("avery-rowan", "Avery Rowan", "AR", 2005, "Port Sterling", "Collects oral histories for school projects.", 2, 490, 420),
  person("niko-ortiz", "Niko Ortiz", "NO", 1999, "Cedar Point", "Runs a tiny fictional bookshop.", 2, 640, 420),
  person("rae-ortiz", "Rae Ortiz", "RO", 2003, "Cedar Point", "Makes ceramic tableware.", 2, 790, 420),
]);

export const RELATIONSHIPS = deepFreeze([
  edge("marin-rowan", "sol-rowan", "partner"),
  edge("iris-rowan", "dev-patel", "partner"),
  edge("cal-rowan", "lena-ortiz", "partner"),
  edge("marin-rowan", "iris-rowan", "parent"), edge("sol-rowan", "iris-rowan", "parent"),
  edge("marin-rowan", "cal-rowan", "parent"), edge("sol-rowan", "cal-rowan", "parent"),
  edge("iris-rowan", "mina-patel", "parent"), edge("dev-patel", "mina-patel", "parent"),
  edge("iris-rowan", "theo-patel", "parent"), edge("dev-patel", "theo-patel", "parent"),
  edge("cal-rowan", "june-rowan", "parent"), edge("lena-ortiz", "june-rowan", "parent"),
  edge("cal-rowan", "avery-rowan", "parent"), edge("lena-ortiz", "avery-rowan", "parent"),
  edge("lena-ortiz", "niko-ortiz", "parent"), edge("lena-ortiz", "rae-ortiz", "parent"),
]);

export const FAMILY_LABEL = "The fictional Rowan–Patel–Ortiz example family";

function person(id, name, initials, birthYear, location, summary, generation, x, y) { return { id, name, initials, birthYear, location, summary, generation, x, y }; }
function edge(from, to, type) { return { from, to, type }; }
function deepFreeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value; Object.freeze(value); for (const item of Object.values(value)) deepFreeze(item); return value; }
