const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

function safeStorage(name) {
  try {
    const storage = window[name];
    const probe = "__maximum_signal_storage_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return {
      available: true,
      get: (key) => { try { return storage.getItem(key); } catch { return null; } },
      set: (key, value) => { try { storage.setItem(key, value); } catch {} },
      remove: (key) => { try { storage.removeItem(key); } catch {} },
    };
  } catch {
    return { available: false, get: () => null, set: () => {}, remove: () => {} };
  }
}

const localPreferences = safeStorage("localStorage");
const sessionPreferences = safeStorage("sessionStorage");
const savedInteractionCount = Number(sessionPreferences.get("interactionCount"));
let interactionCount = Number.isFinite(savedInteractionCount) && savedInteractionCount >= 0 ? savedInteractionCount : 0;
let toastTimer;

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2200);
}

function logEvent(type, detail = "") {
  interactionCount += 1;
  sessionPreferences.set("interactionCount", interactionCount);
  $("#interaction-count").textContent = interactionCount;
  const stream = $("#event-stream");
  if (!stream) return;
  const line = document.createElement("p");
  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString([], { hour12: false });
  const label = document.createElement("b");
  label.textContent = String(type);
  line.append(time, label, document.createTextNode(` ${String(detail)}`));
  stream.prepend(line);
  while (stream.children.length > 16) stream.lastElementChild.remove();
}

class SkillMeter extends HTMLElement {
  connectedCallback() {
    const label = this.getAttribute("label") || "Skill";
    const value = Math.max(0, Math.min(100, Number(this.getAttribute("value") || 0)));
    this.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:7px;font:0.55rem var(--mono);text-transform:uppercase;color:var(--muted)"><span>${label}</span><span>${value}</span></div><div role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" style="height:5px;background:var(--line)"><i style="display:block;width:${value}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));box-shadow:0 0 16px color-mix(in srgb,var(--accent) 30%,transparent)"></i></div>`;
  }
}
customElements.define("skill-meter", SkillMeter);

const themes = ["carbon", "paper", "ultraviolet"];
function applyTheme(theme, animate = true) {
  const setTheme = () => {
    document.documentElement.dataset.theme = theme;
    localPreferences.set("portfolioTheme", theme);
    $("#theme-label").textContent = theme.toUpperCase();
    $("meta[name='theme-color']").setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());
  };
  if (animate && document.startViewTransition && !reduceMotion.matches) document.startViewTransition(setTheme).finished.catch(() => {});
  else setTheme();
  logEvent("THEME", theme);
}
function cycleTheme() {
  const current = document.documentElement.dataset.theme;
  applyTheme(themes[(themes.indexOf(current) + 1) % themes.length]);
}
const savedTheme = localPreferences.get("portfolioTheme");
applyTheme(themes.includes(savedTheme) ? savedTheme : "carbon", false);
$("#theme-toggle").addEventListener("click", cycleTheme);

const roles = ["useful systems", "clear decisions", "privacy boundaries", "guarded automation", "software with intent"];
let roleIndex = 0;
let letterIndex = roles[0].length;
let deleting = true;
async function typeRole() {
  if (reduceMotion.matches) return;
  const element = $("#typed-role");
  const phrase = roles[roleIndex];
  if (deleting) {
    letterIndex--;
    element.textContent = phrase.slice(0, Math.max(0, letterIndex));
    if (letterIndex <= 0) { deleting = false; roleIndex = (roleIndex + 1) % roles.length; await sleep(300); }
  } else {
    letterIndex++;
    element.textContent = roles[roleIndex].slice(0, letterIndex);
    if (letterIndex >= roles[roleIndex].length) { deleting = true; await sleep(1600); }
  }
  setTimeout(typeRole, deleting ? 45 : 75);
}
setTimeout(typeRole, 1200);

function updateClock() { $("#clock").textContent = new Date().toLocaleTimeString([], { hour12: false }); }
updateClock();
setInterval(updateClock, 1000);

addEventListener("scroll", () => {
  const total = document.documentElement.scrollHeight - innerHeight;
  $(".scroll-progress i").style.width = `${total ? scrollY / total * 100 : 0}%`;
}, { passive: true });

addEventListener("pointermove", (event) => {
  $(".pointer-light").style.left = `${event.clientX}px`;
  $(".pointer-light").style.top = `${event.clientY}px`;
}, { passive: true });

const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) { entry.target.classList.add("is-visible"); revealObserver.unobserve(entry.target); }
}), { threshold: 0.1 });
$$('.reveal').forEach((element) => revealObserver.observe(element));

const countObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (!entry.isIntersecting) return;
  const target = Number(entry.target.dataset.count);
  let value = 0;
  const timer = setInterval(() => {
    value += 1;
    entry.target.textContent = value;
    if (value >= target) clearInterval(timer);
  }, 55);
  countObserver.unobserve(entry.target);
}));
$$('[data-count]').forEach((element) => countObserver.observe(element));

// Hero particle network
const networkCanvas = $("#network-canvas");
const networkContext = networkCanvas.getContext("2d");
let networkNodes = [];
let pointer = { x: -1000, y: -1000 };
function sizeNetwork() {
  const ratio = devicePixelRatio || 1;
  networkCanvas.width = innerWidth * ratio;
  networkCanvas.height = 900 * ratio;
  networkContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  networkNodes = Array.from({ length: Math.min(70, Math.floor(innerWidth / 18)) }, () => ({ x: Math.random() * innerWidth, y: Math.random() * 900, vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18 }));
}
sizeNetwork();
addEventListener("resize", sizeNetwork);
addEventListener("pointermove", (event) => { pointer = { x: event.clientX, y: event.clientY + scrollY }; }, { passive: true });
function drawNetwork() {
  networkContext.clearRect(0, 0, innerWidth, 900);
  const color = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  networkNodes.forEach((node) => {
    if (!reduceMotion.matches && !document.hidden) { node.x += node.vx; node.y += node.vy; }
    if (node.x < 0 || node.x > innerWidth) node.vx *= -1;
    if (node.y < 0 || node.y > 900) node.vy *= -1;
    const dx = pointer.x - node.x, dy = pointer.y - node.y, distance = Math.hypot(dx, dy);
    if (distance < 170) { node.x -= dx * .0012; node.y -= dy * .0012; }
  });
  networkNodes.forEach((a, index) => networkNodes.slice(index + 1).forEach((b) => {
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (distance < 120) { networkContext.globalAlpha = (1 - distance / 120) * .28; networkContext.strokeStyle = color; networkContext.beginPath(); networkContext.moveTo(a.x, a.y); networkContext.lineTo(b.x, b.y); networkContext.stroke(); }
  }));
  networkContext.globalAlpha = .65;
  networkContext.fillStyle = color;
  networkNodes.forEach((node) => { networkContext.beginPath(); networkContext.arc(node.x, node.y, 1.4, 0, Math.PI * 2); networkContext.fill(); });
  networkContext.globalAlpha = 1;
  requestAnimationFrame(drawNetwork);
}
drawNetwork();

let frames = 0, lastFpsTime = performance.now();
function measureFps(now) { frames++; if (now - lastFpsTime >= 1000) { $("#fps").textContent = frames; frames = 0; lastFpsTime = now; } requestAnimationFrame(measureFps); }
requestAnimationFrame(measureFps);

const projects = {
  houseos:{type:"OPERATIONS SYSTEM",name:"HouseOS",copy:"A role-aware workflow direction that turns operational state into a clear next action.",input:"Operational state",model:"Role × state",output:"Next action",concept:"Finite-state thinking",method:"Information architecture",value:"Clarity before complexity"},
  nwr:{type:"DECISION-SUPPORT SYSTEM",name:"Niners War Room",copy:"A private analysis direction that separates evidence, assumptions, uncertainty, and final judgment.",input:"Mixed evidence",model:"Comparable structure",output:"Defensible choice",concept:"Data structures",method:"Decision architecture",value:"Signal over noise"},
  family:{type:"PRIVACY-MINDED GRAPH",name:"Family Tree",copy:"A relationship archive concept where permissions and consent are part of the data model.",input:"Sensitive relations",model:"Graph + policy",output:"Trusted context",concept:"Graph traversal",method:"Privacy by design",value:"Consent before access"},
  labs:{type:"GUARDED AUTOMATION",name:"ColetyLabs",copy:"Practical software experiments that remove repetition without hiding authority or failure states.",input:"Repeated workflow",model:"Bounded automation",output:"Useful leverage",concept:"Algorithmic thinking",method:"Tool integration",value:"Authority stays human"}
};
const projectFields={type:$("#project-type"),name:$("#project-name"),copy:$("#project-copy"),input:$("#flow-input"),model:$("#flow-model"),output:$("#flow-output"),concept:$("#project-concept"),method:$("#project-method"),value:$("#project-value")};
$$('.project-rail [role="tab"]').forEach((tab) => tab.addEventListener("click", () => {
  $$('.project-rail [role="tab"]').forEach((item) => item.setAttribute("aria-selected", String(item === tab)));
  const project = projects[tab.dataset.project];
  const update = () => Object.entries(projectFields).forEach(([key, element]) => element.textContent = project[key]);
  if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(update).finished.catch(() => {}); else update();
  $("#project-favorite").setAttribute("aria-pressed", String(localPreferences.get(`favorite-${tab.dataset.project}`) === "true"));
  $("#project-favorite").textContent = localPreferences.get(`favorite-${tab.dataset.project}`) === "true" ? "★ Idea saved" : "☆ Save idea";
  $("#project-favorite").dataset.project = tab.dataset.project;
  logEvent("PROJECT", project.name);
}));
$("#project-favorite").dataset.project="houseos";
$("#project-favorite").addEventListener("click", (event) => { const key=`favorite-${event.currentTarget.dataset.project}`; const saved=localPreferences.get(key)!=="true"; localPreferences.set(key,String(saved)); event.currentTarget.setAttribute("aria-pressed",String(saved)); event.currentTarget.textContent=saved?"★ Idea saved":"☆ Save idea"; toast(saved?"Project idea saved locally":"Project idea removed"); logEvent("FAVORITE",event.currentTarget.dataset.project); });

// Sorting lab
let values = [44,72,25,90,57,36,82,18,64,49,95,31,76,53,68,22];
let sorting = false;
function renderBars(active = []) { const root=$("#algorithm-bars"); root.innerHTML=""; values.forEach((value,index)=>{const bar=document.createElement("i");bar.style.setProperty("--height",`${value}%`);bar.classList.toggle("active",active.includes(index));bar.title=String(value);root.append(bar);}); }
function shuffleArray(){ if(sorting)return; values=values.map(()=>Math.floor(Math.random()*82)+14); renderBars(); $("#comparison-count").textContent="0"; $("#swap-count").textContent="0"; logEvent("ALGORITHM","array shuffled"); }
$("#shuffle-array").addEventListener("click",shuffleArray); renderBars();
async function runSort(){ if(sorting)return; sorting=true; let comparisons=0,swaps=0; const delay=reduceMotion.matches?0:55; if($("#algorithm-select").value==="bubble"){ for(let end=values.length-1;end>0;end--){for(let i=0;i<end;i++){comparisons++;renderBars([i,i+1]);if(values[i]>values[i+1]){[values[i],values[i+1]]=[values[i+1],values[i]];swaps++;}$("#comparison-count").textContent=comparisons;$("#swap-count").textContent=swaps;await sleep(delay);}}}else{for(let i=1;i<values.length;i++){let j=i;while(j>0){comparisons++;renderBars([j-1,j]);if(values[j-1]<=values[j])break;[values[j-1],values[j]]=[values[j],values[j-1]];swaps++;j--;$("#comparison-count").textContent=comparisons;$("#swap-count").textContent=swaps;await sleep(delay);}}}renderBars();sorting=false;toast("Array sorted");logEvent("ALGORITHM",`${$("#algorithm-select").value}: ${comparisons} comparisons`);}
$("#run-sort").addEventListener("click",runSort);
$("#algorithm-select").addEventListener("change",event=>{$("#complexity").textContent="O(n²)";logEvent("ALGORITHM",event.target.value)});

// Terminal
const terminalCommands={help:"Commands: help, about, projects, skills, theme, favorites, clear",about:"Spencer Colety — computer science + international business; practical systems builder.",projects:"HouseOS · Niners War Room · Family Tree · ColetyLabs",skills:"Algorithms · data structures · architecture · state · privacy · automation",favorites:()=>Object.keys(projects).filter(key=>localPreferences.get(`favorite-${key}`)==="true").join(" · ")||"No project ideas saved yet."};
function terminalLine(name,text){const line=document.createElement("p");const label=document.createElement("span");label.textContent=String(name);line.append(label,document.createTextNode(` ${String(text)}`));$("#terminal-output").append(line);$("#terminal-output").scrollTop=$("#terminal-output").scrollHeight;}
$("#terminal-form").addEventListener("submit",event=>{event.preventDefault();const input=$("#terminal-input");const command=input.value.trim().toLowerCase();terminalLine("visitor",command);input.value="";if(command==="clear")$("#terminal-output").innerHTML="";else if(command==="theme"){cycleTheme();terminalLine("system","Theme cycled.");}else if(command in terminalCommands){const result=typeof terminalCommands[command]==="function"?terminalCommands[command]():terminalCommands[command];terminalLine("system",result);}else terminalLine("error",`Unknown command: ${command||"(empty)"}`);logEvent("TERMINAL",command)});

// Skill force graph
const graphCanvas=$("#skill-graph"),graphContext=graphCanvas.getContext("2d");let graphNodes=[];const graphLabels=["Algorithms","State","Graphs","Privacy","Testing","UX","Data","Automation","Java","Python","Web","Systems"];
function sizeGraph(){const rect=graphCanvas.getBoundingClientRect(),ratio=devicePixelRatio||1;graphCanvas.width=rect.width*ratio;graphCanvas.height=280*ratio;graphContext.setTransform(ratio,0,0,ratio,0,0);graphNodes=graphLabels.map((label,index)=>({label,x:rect.width/2+Math.cos(index/graphLabels.length*Math.PI*2)*rect.width*.32,y:140+Math.sin(index/graphLabels.length*Math.PI*2)*90,vx:0,vy:0}));}
sizeGraph();addEventListener("resize",sizeGraph);let graphPointer={x:-1000,y:-1000};graphCanvas.addEventListener("pointermove",event=>{const rect=graphCanvas.getBoundingClientRect();graphPointer={x:event.clientX-rect.left,y:event.clientY-rect.top};});
function drawGraph(){const width=graphCanvas.clientWidth;graphContext.clearRect(0,0,width,280);const color=getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();let edges=0;graphNodes.forEach((node,index)=>{const angle=index/graphNodes.length*Math.PI*2,targetX=width/2+Math.cos(angle)*width*.31,targetY=140+Math.sin(angle)*87;node.vx+=(targetX-node.x)*.0007;node.vy+=(targetY-node.y)*.0007;const d=Math.hypot(graphPointer.x-node.x,graphPointer.y-node.y);if(d<100){node.vx+=(graphPointer.x-node.x)*.0009;node.vy+=(graphPointer.y-node.y)*.0009;}node.vx*=.94;node.vy*=.94;if(!reduceMotion.matches&&!document.hidden){node.x+=node.vx;node.y+=node.vy;}});graphNodes.forEach((a,index)=>graphNodes.slice(index+1).forEach(b=>{const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<width*.28){edges++;graphContext.globalAlpha=(1-d/(width*.28))*.35;graphContext.strokeStyle=color;graphContext.beginPath();graphContext.moveTo(a.x,a.y);graphContext.lineTo(b.x,b.y);graphContext.stroke();}}));graphContext.globalAlpha=1;graphNodes.forEach(node=>{graphContext.fillStyle=color;graphContext.beginPath();graphContext.arc(node.x,node.y,3,0,Math.PI*2);graphContext.fill();graphContext.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--muted");graphContext.font="10px Consolas";graphContext.fillText(node.label,node.x+7,node.y+3);});$("#edge-count").textContent=edges;requestAnimationFrame(drawGraph);}drawGraph();

// BFS pathfinding
const rows=8,cols=12,start=0,end=rows*cols-1;let walls=new Set();
function buildGrid(){const root=$("#path-grid");root.innerHTML="";for(let index=0;index<rows*cols;index++){const cell=document.createElement("button");cell.type="button";cell.dataset.index=index;cell.ariaLabel=`Grid cell ${index+1}`;if(index===start)cell.className="start";if(index===end)cell.className="end";if(walls.has(index))cell.classList.add("wall");cell.addEventListener("click",()=>{if(index===start||index===end)return;walls.has(index)?walls.delete(index):walls.add(index);buildGrid();logEvent("PATH",walls.has(index)?"wall added":"wall removed")});root.append(cell);}}
buildGrid();
async function runPath(){buildGrid();const queue=[start],visited=new Set([start]),parent=new Map(),delay=reduceMotion.matches?0:22;while(queue.length){const current=queue.shift();if(current===end)break;const row=Math.floor(current/cols),col=current%cols;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const nr=row+dr,nc=col+dc,next=nr*cols+nc;if(nr<0||nr>=rows||nc<0||nc>=cols||walls.has(next)||visited.has(next))continue;visited.add(next);parent.set(next,current);queue.push(next);const cell=$(`[data-index="${next}"]`,$("#path-grid"));if(next!==end)cell.classList.add("visited");await sleep(delay);}}if(!parent.has(end)){ $("#path-result").textContent="No route";toast("No path found");return;}let path=[],current=end;while(current!==start){path.push(current);current=parent.get(current);}for(const index of path.reverse()){if(index!==end)$(`[data-index="${index}"]`,$("#path-grid")).classList.add("path");await sleep(delay*2);}$("#path-result").textContent=`${path.length} steps · ${visited.size} visited`;logEvent("PATH",`${path.length} steps`);}
$("#run-path").addEventListener("click",runPath);$("#clear-path").addEventListener("click",()=>{walls.clear();buildGrid();$("#path-result").textContent="Ready";logEvent("PATH","grid reset")});

// Code tabs and clipboard
const codeSamples={state:`function transition(state, event) {\n  const next = table[state]?.[event];\n  return next ?? state;\n}`,graph:`function bfs(graph, start) {\n  const queue = [start], seen = new Set(queue);\n  while (queue.length) visit(queue.shift());\n}`,guard:`const allowed = ({ role, action, state }) =>\n  policy[state]?.[role]?.includes(action) ?? false;`};
$$('.code-tabs [role="tab"]').forEach(tab=>tab.addEventListener("click",()=>{$$('.code-tabs [role="tab"]').forEach(item=>item.setAttribute("aria-selected",String(item===tab)));$("#code-output").textContent=codeSamples[tab.dataset.code];logEvent("CODE",tab.dataset.code)}));
$("#copy-code").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#code-output").textContent);toast("Code copied to clipboard");}catch{toast("Clipboard unavailable in this context");}logEvent("COPY","code specimen")});

// Capability probe
const capabilities={"View transitions":!!document.startViewTransition,"Web Components":!!window.customElements,"Dialog element":typeof HTMLDialogElement!=="undefined","Canvas 2D":!!document.createElement("canvas").getContext,"Local storage":localPreferences.available,"Service worker":"serviceWorker" in navigator,"Clipboard API":!!navigator.clipboard,"Intersection observer":"IntersectionObserver" in window};
Object.entries(capabilities).forEach(([name,supported])=>{const item=document.createElement("li");item.innerHTML=`<span>${name}</span><b>${supported?"SUPPORTED":"FALLBACK"}</b>`;$("#capability-list").append(item)});

// Draggable persistent bento layout
const grid=$("#lab-grid");let dragged;
function persistOrder(){localPreferences.set("labOrder",$$('[data-card]',grid).map(card=>card.dataset.card).join(","));}
const savedOrder=(localPreferences.get("labOrder")||"").split(",").filter(Boolean);savedOrder.forEach(id=>{const card=$(`[data-card="${id}"]`,grid);if(card)grid.append(card)});
$$('[data-card]',grid).forEach(card=>{card.addEventListener("dragstart",()=>{dragged=card;card.classList.add("is-dragging")});card.addEventListener("dragend",()=>{card.classList.remove("is-dragging");persistOrder();logEvent("LAYOUT",`${card.dataset.card} moved`)});card.addEventListener("dragover",event=>{event.preventDefault();if(!dragged||dragged===card)return;const rect=card.getBoundingClientRect();grid.insertBefore(dragged,event.clientY<rect.top+rect.height/2?card:card.nextSibling)})});

// Commands and keyboard shortcuts
const palette=$("#command-palette"),search=$("#command-search");
const actions=[
  {label:"Go to projects",hint:"P",run:()=>$("#projects").scrollIntoView()},
  {label:"Go to interactive labs",hint:"L",run:()=>$("#lab").scrollIntoView()},
  {label:"Show feature inventory",hint:"",run:()=>$("#inventory").scrollIntoView()},
  {label:"Cycle color theme",hint:"T",run:cycleTheme},
  {label:"Shuffle algorithm array",hint:"",run:shuffleArray},
  {label:"Run sorting algorithm",hint:"",run:runSort},
  {label:"Run pathfinder",hint:"",run:runPath},
  {label:"Focus portfolio terminal",hint:"",run:()=>$("#terminal-input").focus()},
  {label:"Reset card arrangement",hint:"",run:()=>{localPreferences.remove("labOrder");location.reload()}},
  {label:"Show keyboard shortcuts",hint:"?",run:()=>$("#shortcut-dialog").showModal()}
];
function renderCommands(query=""){const root=$("#command-results");root.innerHTML="";actions.filter(action=>action.label.toLowerCase().includes(query.toLowerCase())).forEach(action=>{const button=document.createElement("button");button.type="button";button.innerHTML=`<span>${action.label}</span><kbd>${action.hint||"↵"}</kbd>`;button.addEventListener("click",()=>{palette.close();action.run();logEvent("COMMAND",action.label)});root.append(button)})}
function openPalette(){renderCommands();palette.showModal();setTimeout(()=>search.focus(),0)}
$("#open-palette").addEventListener("click",openPalette);search.addEventListener("input",()=>renderCommands(search.value));$("#open-shortcuts").addEventListener("click",()=>$("#shortcut-dialog").showModal());
addEventListener("keydown",event=>{const typing=/input|textarea|select/i.test(document.activeElement.tagName);if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();openPalette();return;}if(typing)return;if(event.key.toLowerCase()==="t")cycleTheme();if(event.key.toLowerCase()==="p")$("#projects").scrollIntoView();if(event.key.toLowerCase()==="l")$("#lab").scrollIntoView();if(event.key==="?")$("#shortcut-dialog").showModal()});

$("#randomize-site").addEventListener("click",()=>{cycleTheme();shuffleArray();const cards=$$('[data-card]',grid).sort(()=>Math.random()-.5);cards.forEach(card=>grid.append(card));persistOrder();toast("Interface randomized");logEvent("RANDOMIZE","theme, data, layout")});
$("#clear-events").addEventListener("click",()=>{$("#event-stream").innerHTML="";logEvent("EVENTS","stream cleared")});

document.addEventListener("click",event=>{if(!event.target.closest("#event-stream")&&!event.target.closest("#clear-events")&&!event.target.closest("dialog"))logEvent("CLICK",event.target.closest("button,a")?.textContent.trim().slice(0,32)||event.target.tagName.toLowerCase())});
logEvent("BOOT","Maximum Signal Lab initialized");

if("serviceWorker" in navigator) addEventListener("load",()=>navigator.serviceWorker.register("./sw.js?v=31").then(()=>logEvent("PWA","offline cache ready")).catch(()=>{}));
