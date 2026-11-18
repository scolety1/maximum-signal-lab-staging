export const BUCKETS = deepFreeze([
  { id:"do-now", label:"Do now", description:"A concrete next action worth doing in this morning." },
  { id:"plan", label:"Plan", description:"Time-specific or larger work to protect for later." },
  { id:"note", label:"Note", description:"Useful information or an idea with no next action." },
  { id:"follow-up", label:"Follow up", description:"Someone else owns the next move, or a reply is needed." },
  { id:"inbox", label:"Keep in Inbox", description:"Still uncertain; preserve it without forcing a decision." },
]);

export const MORNINGS = deepFreeze([
  morning("cedar", "A presentation morning", "A focused morning before a fictional 2 PM review.", [
    item("slides", "Prepare the three review slides", "45 min", "high", ["do-now","plan"]),
    item("book", "Remember the book Maya mentioned", "2 min", "low", ["note","inbox"]),
    item("numbers", "Ask Jordan for the final chart numbers", "5 min", "medium", ["follow-up","do-now"]),
    item("dentist", "Dentist confirmation for Thursday at 9", "2 min", "low", ["plan","note"]),
    item("walk", "Try the new riverside walk", "40 min", "low", ["note","plan"]),
  ]),
  morning("harbor", "A home-office morning", "A flexible fictional day with one maintenance surprise.", [
    item("invoice", "Send the drafted invoice", "10 min", "medium", ["do-now","plan"]),
    item("filter", "Order a replacement water filter", "8 min", "medium", ["do-now","inbox"]),
    item("alex", "Alex is checking the lease question", "1 min", "low", ["follow-up","note"]),
    item("recipe", "Soup recipe from last weekend", "2 min", "low", ["note","inbox"]),
    item("visit", "Plan a Saturday visit", "15 min", "medium", ["plan","inbox"]),
  ]),
  morning("orchard", "A creative morning", "A fictional open block with too many interesting possibilities.", [
    item("sketch", "Sketch the onboarding flow", "35 min", "high", ["do-now","plan"]),
    item("article", "Read the saved accessibility article", "20 min", "low", ["note","inbox"]),
    item("sam", "Ask Sam which photos are approved", "4 min", "medium", ["follow-up","do-now"]),
    item("idea", "Idea: tiny neighborhood field guide", "2 min", "low", ["note","inbox"]),
    item("studio", "Studio reservation Friday at 11", "2 min", "low", ["plan","note"]),
  ]),
  morning("meadow", "A shared-work morning", "A fictional day balancing coordination and one deep task.", [
    item("brief", "Draft the volunteer welcome brief", "50 min", "high", ["do-now","plan"]),
    item("venue", "Venue team owes a capacity answer", "1 min", "medium", ["follow-up","note"]),
    item("call", "Call with Priya tomorrow at 10", "2 min", "low", ["plan","note"]),
    item("playlist", "Community dinner playlist ideas", "10 min", "low", ["note","inbox"]),
    item("labels", "Print name labels", "15 min", "medium", ["do-now","plan"]),
  ]),
]);

function morning(id,title,summary,items){return {id,title,summary,items};}
function item(id,text,duration,energy,defensibleBuckets){return {id,text,duration,energy,defensibleBuckets};}
function deepFreeze(value){if(!value||typeof value!=="object"||Object.isFrozen(value))return value;Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);return value;}
