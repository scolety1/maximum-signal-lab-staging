export const WINES = Object.freeze([
  wine("ember-vale", "Ember Vale", "red", "bold", "savory", 54, ["beef", "mushroom"], "Dark fruit, pepper, and a savory finish."),
  wine("lantern-pinot", "Lantern Hill Pinot", "red", "light", "familiar", 46, ["duck", "mushroom", "salmon"], "Bright cherry and gentle earthiness."),
  wine("golden-hour", "Golden Hour White", "white", "medium", "familiar", 38, ["chicken", "pasta"], "Round orchard fruit with a clean finish."),
  wine("coastline", "Coastline Blanc", "white", "light", "crisp", 36, ["seafood", "salad"], "Citrus, herbs, and brisk acidity."),
  wine("brass-bubble", "Brass Bell Brut", "sparkling", "light", "adventurous", 48, ["fried", "seafood", "salad"], "Dry bubbles with lemon and toast."),
  wine("orchard-rose", "Orchard Gate Rosé", "rose", "light", "crisp", 34, ["salad", "salmon", "pasta"], "Dry strawberry, citrus, and herbs."),
  wine("night-market", "Night Market Red", "red", "medium", "adventurous", 42, ["pasta", "duck", "beef"], "Juicy red fruit with lively spice."),
  wine("quiet-river", "Quiet River Riesling", "white", "light", "adventurous", 40, ["spicy", "fried", "seafood"], "Aromatic lime with a softly off-dry finish."),
]);

export const SCENARIOS = Object.freeze([
  scenario("dinner-rush", "Dinner rush", 105, [
    table("t1", "Table 4", "pepper steak", "beef", "bold", "familiar", 58, 68, ["ember-vale"], ["night-market"]),
    table("t2", "Table 7", "seared salmon", "salmon", "light", "crisp", 44, 82, ["lantern-pinot", "orchard-rose"], ["coastline"]),
    table("t3", "Table 2", "crispy cauliflower", "fried", "light", "adventurous", 50, 58, ["brass-bubble", "quiet-river"], ["orchard-rose"]),
  ], { at: 12, wineId: "brass-bubble" }, { at: 27, tableId: "t2", dish: "lemon herb salad", pairing: "salad", idealWineIds: ["coastline", "orchard-rose"] }),
  scenario("patio-wave", "Patio wave", 110, [
    table("t1", "Table 1", "wild mushroom pasta", "mushroom", "medium", "adventurous", 48, 72, ["night-market", "lantern-pinot"], ["golden-hour"]),
    table("t2", "Table 5", "shrimp toast", "seafood", "light", "crisp", 42, 55, ["coastline", "brass-bubble"], ["quiet-river"]),
    table("t3", "Table 8", "roast chicken", "chicken", "medium", "familiar", 45, 88, ["golden-hour"], ["orchard-rose"]),
    table("t4", "Table 3", "spiced noodles", "spicy", "light", "adventurous", 42, 64, ["quiet-river"], ["brass-bubble"]),
  ], { at: 14, wineId: "coastline" }, { at: 31, tableId: "t1", dish: "roasted mushrooms", pairing: "mushroom", idealWineIds: ["lantern-pinot", "ember-vale"] }),
  scenario("late-seating", "Late seating", 100, [
    table("t1", "Table 6", "duck breast", "duck", "medium", "adventurous", 52, 60, ["lantern-pinot", "night-market"], ["ember-vale"]),
    table("t2", "Table 9", "garden salad", "salad", "light", "crisp", 38, 78, ["coastline", "orchard-rose"], ["brass-bubble"]),
    table("t3", "Table 10", "fried oyster mushrooms", "fried", "light", "familiar", 46, 70, ["brass-bubble"], ["quiet-river"]),
    table("t4", "Table 11", "tomato pasta", "pasta", "medium", "familiar", 44, 90, ["night-market", "golden-hour"], ["orchard-rose"]),
    table("t5", "Table 12", "grilled prawns", "seafood", "light", "adventurous", 45, 84, ["coastline", "quiet-river"], ["orchard-rose"]),
  ], { at: 11, wineId: "brass-bubble" }, { at: 25, tableId: "t4", dish: "creamy pasta", pairing: "pasta", idealWineIds: ["golden-hour", "lantern-pinot"] }),
]);

function wine(id, name, type, body, style, price, pairings, note) { return Object.freeze({ id, name, type, body, style, price, pairings: Object.freeze(pairings), note }); }
function table(id, label, dish, pairing, body, preference, budget, patience, idealWineIds, alternateWineIds) { return Object.freeze({ id, label, dish, pairing, body, preference, budget, patience, idealWineIds: Object.freeze(idealWineIds), alternateWineIds: Object.freeze(alternateWineIds) }); }
function scenario(id, label, duration, tables, unavailable, change) { return Object.freeze({ id, label, duration, tables: Object.freeze(tables), unavailable: Object.freeze(unavailable), change: Object.freeze(change) }); }
