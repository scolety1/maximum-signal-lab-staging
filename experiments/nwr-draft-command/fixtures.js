export const LEAGUE_FORMAT = Object.freeze({
  teams: 10,
  qbFormat: "1QB",
  scoring: "non-PPR with first-down bonuses",
  starters: "1 QB · 2 RB · 3 WR · 1 TE · 2 Flex",
});

export const STRATEGIES = freeze([
  { id: "contender", label: "Contender", summary: "Protect this season with role certainty and immediate production." },
  { id: "balanced", label: "Balanced", summary: "Blend roster fit, flexible capital, and measured risk." },
  { id: "rebuild", label: "Rebuild", summary: "Favor youth, upside, and future optionality." },
]);

export const PROSPECTS = freeze([
  player("p-aria-vale", "Aria Vale", "WR", 21, "Canyon Foxes", 1, "Cornerstone", "current", "high", "2026-07-18", "Role is clear; landing spot remains fictional."),
  player("p-milo-kent", "Milo Kent", "RB", 22, "Harbor Owls", 2, "Early starter", "partial", "medium", "2026-07-15", "Workload projection has a wider range."),
  player("p-noor-ellis", "Noor Ellis", "WR", 20, "Mesa Comets", 3, "Ascending", "conflicting", "medium", "2026-07-12", "Two fictional sources disagree on early route volume."),
  player("p-eli-stone", "Eli Stone", "TE", 22, "Copper Pines", 1, "Scarce position", "current", "high", "2026-07-19", "Strong role evidence; development curve is uncertain."),
  player("p-ren-cho", "Ren Cho", "QB", 23, "Summit Waves", 2, "Developmental", "stale", "low", "2026-06-04", "Last role note is older than the other demo evidence."),
  player("p-sage-brooks", "Sage Brooks", "RB", 21, "Juniper Kings", 4, "Upside", "partial", "medium", "2026-07-10", "Explosive profile with incomplete receiving evidence."),
  player("p-ian-cross", "Ian Cross", "WR", 22, "Northline Gold", 5, "Floor play", "current", "high", "2026-07-18", "Stable fictional depth role with modest ceiling."),
  player("p-zuri-lake", "Zuri Lake", "TE", 21, "Redwood Sparks", 3, "Long view", "conflicting", "low", "2026-07-09", "Athletic traits are clear; usage evidence conflicts."),
]);

export const VETERANS = freeze([
  player("v-tessa-reed", "Tessa Reed", "WR", 29, "Granite City", 18, "Veteran starter", "current", "high", "2026-07-19", "Immediate role is stable; age curve carries downside."),
  player("v-cal-morrow", "Cal Morrow", "RB", 28, "Lake Union", 16, "Short-window producer", "partial", "medium", "2026-07-16", "Useful current role with workload uncertainty."),
  player("v-omar-west", "Omar West", "TE", 27, "Desert Bloom", 9, "Reliable veteran", "current", "high", "2026-07-18", "Clear role and limited long-term appreciation."),
]);

export const EVIDENCE_UPDATED = [...PROSPECTS, ...VETERANS].map((player) => player.evidence.asOf).sort().at(-1);

export const BRANCHES = freeze([
  { id: "draft", label: "Draft a prospect", summary: "Spend the current pick on the best available roster fit.", immediate: "Add one prospect", later: "Less current capital; position supply moves" },
  { id: "trade-down", label: "Trade down", summary: "Let the room move and turn one pick into later and future capital.", immediate: "Add no player; CPU takes three", later: "Unlock an extra-pick branch" },
  { id: "veteran", label: "Acquire a veteran", summary: "Spend later capital for immediate production and accept age exposure.", immediate: "Add one veteran", later: "Less later capital; more age risk" },
  { id: "future", label: "Preserve future flexibility", summary: "Pass current value to keep more options open later.", immediate: "Add no player", later: "Gain one future asset" },
  { id: "extra-pick", label: "Use the added later pick", summary: "A prior trade-down created this extra branch.", immediate: "Add one prospect", later: "Consume the branch trade-down unlocked" },
]);

export function isFixtureDataFictional() {
  return [...PROSPECTS, ...VETERANS].every((item) => item.team !== "SF" && item.publicId.startsWith(item.kind === "prospect" ? "p-" : "v-"));
}

function player(publicId, name, position, age, team, positionRank, tier, evidenceState, confidence, asOf, uncertainty) {
  return {
    publicId,
    kind: publicId.startsWith("v-") ? "veteran" : "prospect",
    name,
    position,
    age,
    team,
    positionRank,
    tier,
    evidence: { state: evidenceState, confidence, asOf, uncertainty, basis: "Authored fictional portfolio scenario" },
  };
}

function freeze(items) {
  return Object.freeze(items.map((item) => Object.freeze({
    ...item,
    evidence: item.evidence ? Object.freeze({ ...item.evidence }) : item.evidence,
  })));
}
