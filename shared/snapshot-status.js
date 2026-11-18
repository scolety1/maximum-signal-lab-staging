export function attachSnapshotStatus(root,snapshotPromise,{classification="Demo data only · Fictional scenario",describe=()=>"Public-safe project metadata"}={}){
  let active=true;const strip=document.createElement("aside");strip.className="public-snapshot-strip";strip.setAttribute("aria-label","Public project snapshot status");strip.setAttribute("aria-live","polite");strip.innerHTML=`<span></span><strong></strong>`;strip.querySelector("span").textContent=classification;strip.querySelector("strong").textContent="Last known project status · loading safe fallback";root.prepend(strip);
  Promise.resolve(snapshotPromise).then(snapshot=>{if(!active)return;strip.querySelector("span").textContent=`${classification} · ${describe(snapshot.data)}`;strip.querySelector("strong").textContent=snapshot.label;}).catch(()=>{if(active)strip.querySelector("strong").textContent="Project status unavailable · playable demo remains local";});
  return()=>{active=false;strip.remove();};
}
