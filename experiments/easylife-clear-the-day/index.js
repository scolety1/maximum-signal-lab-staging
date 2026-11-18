import { BUCKETS } from "./fixtures.js";
import { advanceDayTime, bucketCounts, captureThought, chooseStart, createDay, organizeItem, reflectOnDay, restartDay, setPace, skipCapture } from "./simulation.js";
import { EASYLIFE_SNAPSHOT } from "../../data/public-snapshot-fallbacks.js";
import { loadPublicSnapshot } from "../../shared/public-snapshots.js";
import { attachSnapshotStatus } from "../../shared/snapshot-status.js";

export async function mount(container,{seed,onOutcome}={}) {
  let state=createDay(seed||"clear-day-portfolio");
  container.innerHTML=`<section class="clear-day" data-clear-the-day aria-labelledby="clear-day-title"></section>`;
  const root=container.querySelector("[data-clear-the-day]");
  let timer=null;
  const detachSnapshot=attachSnapshotStatus(container,loadPublicSnapshot({kind:"easylife",url:new URL("../../data/examples/easylife-portfolio-snapshot.json",import.meta.url).href,fallback:EASYLIFE_SNAPSHOT}),{describe:data=>`${data.phase} · publicData false`});

  function render(focus=null){
    const counts=bucketCounts(state);
    root.dataset.stage=state.stage;
    root.innerHTML=`<header class="clear-header"><div><p>Fictional morning / ${state.pace==="untimed"?"untimed by default":"optional Quick Round"}</p><h2 id="clear-day-title">Clear the Day</h2><p>Capture anything now, clarify it later, and turn a noisy day into one understandable next action.</p></div><div class="morning-card"><span>Morning</span><strong>${escapeText(state.title)}</strong><p>${escapeText(state.summary)}</p></div></header>
      <nav class="clear-flow" aria-label="Clear the Day philosophy">${["Capture","Inbox","Organize","Plan","Act"].map((label,index)=>`<span class="${flowIndex()>=index?"is-reached":""}">${index+1}. ${label}</span>`).join("")}</nav>
      <section class="pace-choice" aria-labelledby="pace-title"><div><h3 id="pace-title">Choose your pace</h3><p>There is no penalty for taking time. Quick Round adds gentle urgency, not a different answer.</p><span data-easy-time aria-live="off">${paceStatus()}</span><span class="visually-hidden" data-easy-expiry role="status" aria-live="polite"></span></div><div><button type="button" data-pace="untimed" aria-pressed="${state.pace==="untimed"}">Untimed</button><button type="button" data-pace="quick" aria-pressed="${state.pace==="quick"}">Quick Round</button></div></section>
      ${state.stage==="capture"?captureMarkup():boardMarkup(counts)}
      <p class="clear-status" data-clear-status role="status" tabindex="-1">${statusCopy(counts)}</p>`;
    syncTimer();
    if(focus)queueMicrotask(()=>root.querySelector(focus)?.focus({preventScroll:true}));
  }

  function captureMarkup(){return `<section class="capture-step" aria-labelledby="capture-title"><div><p>Step 1</p><h3 id="capture-title">What just came to mind?</h3><p>Put it in the Inbox without deciding what it means yet. This field stays in this browser tab.</p></div><form data-capture><label>Unclassified thought<input name="thought" required maxlength="80" autocomplete="off" placeholder="Example: bring the library book"></label><button type="submit">Capture to Inbox</button><button type="button" data-skip-capture>Use the sample morning</button></form></section>`;}

  function boardMarkup(counts){
    if(state.stage==="complete")return receiptMarkup();
    const pending=state.items.filter(item=>!item.processed).length;
    return `<section class="organize-step" aria-labelledby="organize-title"><header><div><p>Steps 2-3</p><h3 id="organize-title">Clarify the Inbox</h3><p>Several homes may be defensible. Keeping uncertainty in the Inbox is a valid choice.</p></div><strong>${pending} to process</strong></header>
      <div class="clear-board"><section class="inbox-column" aria-labelledby="inbox-title"><h4 id="inbox-title">Inbox <span>${counts.inbox}</span></h4>${state.items.filter(item=>item.bucket==="inbox").map(inboxItemMarkup).join("")||`<p class="empty-bucket">Inbox clear.</p>`}</section>
      <div class="bucket-grid">${BUCKETS.filter(bucket=>bucket.id!=="inbox").map(bucketMarkup).join("")}</div></div>
      ${planMarkup()}
    </section>`;
  }

  function inboxItemMarkup(item){if(item.processed)return `<article class="thought-card is-settled" data-thought="${item.id}"><div><strong>${escapeText(item.text)}</strong><small>Intentionally kept uncertain</small></div><button type="button" data-return-inbox="${item.id}">Reconsider</button></article>`;const options=BUCKETS.map(bucket=>`<option value="${bucket.id}">${bucket.label}</option>`).join("");return `<article class="thought-card" data-thought="${item.id}"><div><strong>${escapeText(item.text)}</strong><small>${item.duration} / ${item.energy} energy${item.custom?" / captured now":""}</small></div><label>Choose a home<select data-bucket-choice="${item.id}">${options}</select></label><button type="button" data-organize="${item.id}">Settle this thought</button></article>`;}

  function bucketMarkup(bucket){const items=state.items.filter(item=>item.bucket===bucket.id);return `<section class="day-bucket" data-bucket="${bucket.id}" aria-labelledby="bucket-${bucket.id}"><header><h4 id="bucket-${bucket.id}">${bucket.label}</h4><span>${items.length}</span></header><p>${bucket.description}</p>${items.map(item=>`<div class="bucket-item"><strong>${escapeText(item.text)}</strong><small>${item.duration}</small>${bucket.id==="do-now"?`<button type="button" data-start="${item.id}" aria-pressed="${state.startId===item.id}">${state.startId===item.id?"Starting here":"Start here"}</button>`:""}<button type="button" data-return-inbox="${item.id}">Reconsider</button></div>`).join("")||`<p class="empty-bucket">Nothing here yet.</p>`}</section>`;}

  function planMarkup(){const ready=state.items.every(item=>item.processed);return `${dayTreeMarkup()}<section class="plan-step" aria-labelledby="plan-title"><div><p>Steps 4-5</p><h3 id="plan-title">Choose one place to start</h3><p>${ready?"Every thought has a home, including any uncertainty you kept. Pick a Do now action.":"Process the remaining thoughts, then pick a Do now action."}</p></div><button type="button" data-reflect ${!ready||!state.startId?"disabled":""}>Act on this plan</button></section>`;}

  function receiptMarkup(){const reflection=state.reflection;return `<section class="clear-receipt" aria-labelledby="receipt-title"><p>Morning reflection / no score</p><h3 id="receipt-title">A clear next move</h3><div class="start-receipt"><span>Start here</span><strong>${escapeText(reflection.start.text)}</strong><small>${reflection.start.duration} / ${reflection.start.energy} energy</small></div>${dayTreeMarkup()}<ul>${reflection.observations.map(item=>`<li>${escapeText(item)}</li>`).join("")}</ul><blockquote>${escapeText(reflection.tradeoff)}</blockquote><p>${escapeText(reflection.principle)}</p><p>A different bundled morning will load next.</p><button type="button" data-replay>Try a different morning</button></section>`;}

  function dayTreeMarkup(){const settled=BUCKETS.map(bucket=>({bucket,items:state.items.filter(item=>item.processed&&item.bucket===bucket.id)}));return `<figure class="day-tree" aria-labelledby="day-tree-title"><figcaption id="day-tree-title">Your morning, transformed</figcaption><div class="tree-root"><span>Start here</span><strong>${state.startId?escapeText(state.items.find(item=>item.id===state.startId).text):"Choose a Do now action"}</strong></div><div class="tree-branches">${settled.map(({bucket,items})=>`<div><span>${bucket.label}</span><strong>${items.length}</strong></div>`).join("")}</div></figure>`;}

  function statusCopy(){if(state.stage==="capture")return "Ready to capture without classification.";if(state.stage==="complete")return `Plan complete. Start with ${state.reflection.start.text}.`;const pending=state.items.filter(item=>!item.processed).length;if(pending)return `${pending} thought${pending===1?" remains":"s remain"} to process.`;if(!state.startId)return "Every thought has a home. Choose a Do now item as the place to start.";return `Starting point selected: ${state.items.find(item=>item.id===state.startId).text}.`;}
  function paceStatus(){if(state.pace!=="quick")return "Untimed — take the time you need.";if(state.quickExpired)return "Quick Round ended — keep organizing without penalty.";return `Quick Round: ${state.secondsRemaining}s remaining.`;}
  function flowIndex(){return {capture:0,organize:2,plan:3,act:4,complete:4}[state.stage]??0;}

  function syncTimer(){if(timer){clearInterval(timer);timer=null;}if(state.pace!=="quick"||state.stage==="complete"||state.quickExpired)return;timer=setInterval(()=>{state=advanceDayTime(state,1);const output=root.querySelector("[data-easy-time]");if(output)output.textContent=paceStatus();if(state.quickExpired){const announcement=root.querySelector("[data-easy-expiry]");if(announcement)announcement.textContent="Quick Round ended. Keep organizing without penalty.";clearInterval(timer);timer=null;}},1000);}

  function onSubmit(event){if(!event.target.matches("[data-capture]"))return;event.preventDefault();state=captureThought(state,event.target.elements.thought.value);render("[data-bucket-choice]");}
  function onClick(event){
    const pace=event.target.closest("[data-pace]")?.dataset.pace;if(pace){state=setPace(state,pace);render(`[data-pace="${pace}"]`);return;}
    if(event.target.closest("[data-skip-capture]")){state=skipCapture(state);render("[data-bucket-choice]");return;}
    const organize=event.target.closest("[data-organize]")?.dataset.organize;if(organize){const select=root.querySelector(`[data-bucket-choice="${organize}"]`);state=organizeItem(state,organize,select.value);render("[data-clear-status]");return;}
    const reconsider=event.target.closest("[data-return-inbox]")?.dataset.returnInbox;if(reconsider){state=freezeMoveToInbox(state,reconsider);render(`[data-bucket-choice="${reconsider}"]`);return;}
    const start=event.target.closest("[data-start]")?.dataset.start;if(start){state=chooseStart(state,start);render(`[data-start="${start}"]`);return;}
    if(event.target.closest("[data-reflect]")){state=reflectOnDay(state);onOutcome?.({type:"easylife-clear-the-day",label:"Fictional morning clarified",fixtureId:state.fixtureId,startId:state.startId});render("[data-replay]");return;}
    if(event.target.closest("[data-replay]")){state=restartDay(state);render("[name=thought]");}
  }

  root.addEventListener("submit",onSubmit);root.addEventListener("click",onClick);render();
  return()=>{detachSnapshot();if(timer)clearInterval(timer);root.removeEventListener("submit",onSubmit);root.removeEventListener("click",onClick);};
}

function freezeMoveToInbox(state,itemId){const items=state.items.map(item=>item.id===itemId?{...item,bucket:"inbox",processed:false}:item);return deepFreeze({...state,stage:"organize",startId:state.startId===itemId?null:state.startId,items,history:[...state.history,{type:"reconsider",itemId}]});}
function escapeText(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function deepFreeze(value){if(!value||typeof value!=="object"||Object.isFrozen(value))return value;Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);return value;}
