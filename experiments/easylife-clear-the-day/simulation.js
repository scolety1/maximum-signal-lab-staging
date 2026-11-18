import { BUCKETS, MORNINGS } from "./fixtures.js";

export function createDay(seed="clear-day") {
  const fixture=MORNINGS[hash(seed)%MORNINGS.length];
  return dayFromFixture(seed,fixture);
}

export function setPace(state,pace){guard(state);if(!["untimed","quick"].includes(pace))throw new Error("Unknown pace");const restarting=pace==="quick"&&state.pace!=="quick";return freeze({...state,pace,secondsRemaining:restarting?90:state.secondsRemaining,quickExpired:restarting?false:state.quickExpired,history:[...state.history,{type:"pace",pace}]});}

export function advanceDayTime(state,seconds=1){guard(state);if(state.pace!=="quick"||state.stage==="complete"||state.quickExpired)return state;const secondsRemaining=Math.max(0,state.secondsRemaining-Math.max(0,Number(seconds)||0));return freeze({...state,secondsRemaining,quickExpired:secondsRemaining===0,history:secondsRemaining===0?[...state.history,{type:"quick-expired"}]:state.history});}

export function captureThought(state,text){guard(state);const clean=String(text||"").trim();if(!clean||clean.length>80)throw new Error("Capture must contain 1-80 characters");const id=`captured-${hash(`${state.seed}:${clean}:${state.items.length}`)}`;return freeze({...state,stage:"organize",items:[...state.items,{id,text:clean,duration:"unsized",energy:"unknown",defensibleBuckets:BUCKETS.map((bucket)=>bucket.id),bucket:"inbox",processed:false,custom:true}],history:[...state.history,{type:"capture",id}]});}

export function skipCapture(state){guard(state);return freeze({...state,stage:"organize",history:[...state.history,{type:"capture-skipped"}]});}

export function organizeItem(state,itemId,bucket){guard(state);if(!BUCKETS.some((candidate)=>candidate.id===bucket))throw new Error("Unknown bucket");if(!state.items.some((item)=>item.id===itemId))throw new Error("Unknown item");const items=state.items.map((item)=>item.id===itemId?{...item,bucket,processed:true}:item);return freeze({...state,stage:items.every((item)=>item.processed)?"plan":"organize",items,history:[...state.history,{type:"organize",itemId,bucket}]});}

export function chooseStart(state,itemId){guard(state);const item=state.items.find((candidate)=>candidate.id===itemId);if(!item||item.bucket!=="do-now")throw new Error("Start item must be in Do now");return freeze({...state,startId:itemId,stage:"act",history:[...state.history,{type:"start",itemId}]});}

export function reflectOnDay(state){guard(state);if(!state.startId)throw new Error("Choose a place to start first");const unresolved=state.items.filter((item)=>item.bucket==="inbox").length;const today=state.items.filter((item)=>item.bucket==="do-now");const scheduled=state.items.filter((item)=>item.bucket==="plan");const start=state.items.find((item)=>item.id===state.startId);const observations=[
    unresolved?`${unresolved} thought${unresolved===1?" remains":"s remain"} intentionally open in the Inbox; the plan can still be complete.`:"Every captured thought has an explicit home.",
    today.length>2?`Do now holds ${today.length} commitments; the plan is ambitious.`:`Do now stays bounded at ${today.length} commitment${today.length===1?"":"s"}.`,
    scheduled.length?`${scheduled.length} time-specific item${scheduled.length===1?" is":"s are"} protected by scheduling.`:"Nothing was scheduled; flexible items remain flexible.",
    `You chose a clear home for ${state.items.length-unresolved} of ${state.items.length} thoughts; another reasonable plan could place them differently.`,
  ];
  return freeze({...state,stage:"complete",reflection:{start,observations,tradeoff:tradeoffFor(state),principle:"Capture first, then clarify enough to make one trustworthy next move."},history:[...state.history,{type:"complete"}]});
}

export function restartDay(state){guard(state);const currentIndex=MORNINGS.findIndex((fixture)=>fixture.id===state.fixtureId);const fixture=MORNINGS[(currentIndex+1+MORNINGS.length)%MORNINGS.length];return dayFromFixture(`${state.seed}:replay:${state.history.length}:${fixture.id}`,fixture);}
export function bucketCounts(state){return Object.fromEntries(["inbox",...BUCKETS.map((bucket)=>bucket.id)].map((id)=>[id,state.items.filter((item)=>item.bucket===id).length]));}

function tradeoffFor(state){const today=state.items.filter((item)=>item.bucket==="do-now").length;const waiting=state.items.filter((item)=>item.bucket==="follow-up").length;if(today>=3)return "You favored momentum over breathing room. Another valid plan could schedule one commitment.";if(waiting>=2)return "You protected focus by making dependencies explicit. Another valid plan could send one quick request now.";return "You balanced forward motion with protected future attention. Different placements could still be reasonable.";}
function dayFromFixture(seed,fixture){return freeze({seed:String(seed),fixtureId:fixture.id,title:fixture.title,summary:fixture.summary,pace:"untimed",secondsRemaining:90,quickExpired:false,stage:"capture",items:fixture.items.map((item)=>({...item,bucket:"inbox",processed:false,custom:false})),startId:null,history:[]});}
function guard(state){if(!state||!Array.isArray(state.items)||!Array.isArray(state.history))throw new Error("Invalid day state");}
function hash(value){let result=2166136261;for(const char of String(value)){result^=char.charCodeAt(0);result=Math.imul(result,16777619);}return result>>>0;}
function freeze(value){if(!value||typeof value!=="object"||Object.isFrozen(value))return value;Object.freeze(value);for(const child of Object.values(value))freeze(child);return value;}
