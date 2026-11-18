/* Aurora Nexus — UI only. Navigation always delegates to existing visible nav buttons. */
(()=>{
"use strict";
const root=document.documentElement, ws=document.getElementById("workspace");
const nav=document.getElementById("nav"), content=document.getElementById("page-content");
const crumb=document.getElementById("crumb");
if(!ws||!nav||!content||!crumb)return;
const icons={
 overview:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 agents:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
 coaching:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5 2 2 4-4"/>',
 "ic-logs":'<path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h4"/><path d="M2 7h4m-4 10h4"/>',
 "quick-links":'<path d="M10 13a4 4 0 0 0 6 .5l4-4a4 4 0 0 0-5.7-5.7l-2.1 2.1M14 11a4 4 0 0 0-6-.5l-4 4a4 4 0 0 0 5.7 5.7l2.1-2.1"/>',
 "bc-ai":'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6a9 9 0 0 1 0 12.8m12.8-12.8a9 9 0 0 0 0 12.8"/>',
 "bc-ai-comment-template":'<path d="M4 5h16v12H9l-5 4zM8 9h8m-8 4h5"/>',
 "work-requests":'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m6-16v16M6 8h1m5 4h1m5-4h1"/>',
 "team-requests":'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
 search:'<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>',
 focus:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="3"/>',
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
 switch:'<path d="M3 8h18m-5-5 5 5-5 5M21 16H3m5-5-5 5 5 5"/>',
 logout:'<path d="M10 4H4v16h6m5-12 4 4-4 4m-7-4h11"/>'
};
const descriptions={
 overview:["Overview","Your workspace at a glance","#68f5c1"],
 agents:["Agents","Find team members and profiles","#a9e780"],
 coaching:["Coaching","Schedules and meeting links","#c3a6ff"],
 "ic-logs":["IC Logs","Review records and interactions","#78d9ff"],
 "quick-links":["Quick Links","Your team’s useful resources","#ffcc85"],
 "bc-ai":["BC AI Photo Court","Shoot, upload and browse photos","#ffab75"],
 "bc-ai-comment-template":["Comment Templates","Find and copy team templates","#ffa0c9"],
 "work-requests":["Work Requests","Follow requests from start to finish","#a3afff"],
 "team-requests":["Team requests","Review team membership requests","#7ee3d6"]
};
function element(tag,className,text){
 const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;
}
function glyph(name,className="nexus-icon"){
 const span=element("span",className);span.setAttribute("aria-hidden","true");
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
 svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.75");svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");
 // This is a fixed, local icon dictionary; no team or user content enters markup.
 svg.innerHTML=icons[name]||icons.arrow;span.append(svg);return span;
}
function button(className,label,icon){
 const b=element("button",className);b.type="button";if(icon)b.append(glyph(icon));b.append(element("span","",label));return b;
}
function workspaceOpen(){return !ws.classList.contains("hidden")&&ws.style.display!=="none"}
function navButtons(){return [...nav.querySelectorAll("button[data-page]")].filter(b=>!b.classList.contains("hidden")&&!b.disabled&&!b.hidden&&b.getAttribute("aria-hidden")!=="true"&&getComputedStyle(b).display!=="none")}
function allowed(page){return navButtons().find(b=>b.dataset.page===page)}
function go(page){
 if(!workspaceOpen())return false;
 const b=allowed(page);if(!b)return false;
 if(!b.classList.contains("active"))b.click();
 if(window.matchMedia("(max-width: 760px)").matches)window.scrollTo({top:0,behavior:"instant"});
 return true;
}
for(const b of [...nav.querySelectorAll("button[data-page]"),document.getElementById("back-teams"),document.getElementById("back-login")].filter(Boolean)){
 const label=b.querySelector("span");if(!label)continue;
 const key=b.dataset.page||(b.id==="back-teams"?"switch":"logout");
 for(const n of [...b.childNodes])if(n.nodeType===Node.TEXT_NODE)n.remove();
 b.prepend(glyph(key,"nexus-nav-icon"));
}
function syncNav(){
 for(const b of nav.querySelectorAll("button[data-page]")){
  if(b.classList.contains("active"))b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
 }
 const marker=ws.querySelector(".nexus-section-marker");const page=crumb.dataset.page||"overview";
 if(marker&&marker.dataset.page!==page){marker.dataset.page=page;marker.replaceChildren(glyph(page),element("span","",({overview:"01 / Command center",agents:"02 / People hub",coaching:"03 / Schedule studio","ic-logs":"04 / Record center","quick-links":"05 / Resource library","bc-ai":"06 / Photo arena","bc-ai-comment-template":"07 / Template studio","work-requests":"08 / Request board","team-requests":"09 / Membership desk"})[page]||"Team workspace"))}
}
const title=document.getElementById("page-title");
if(title){const marker=element("div","nexus-section-marker");title.before(marker)}
const tools=document.getElementById("nexus-tools");
const commandButton=button("nexus-tool","Find","search");
commandButton.id="nexus-command-open";commandButton.setAttribute("aria-haspopup","dialog");commandButton.title="Find a workspace section (Ctrl or Command + K)";
commandButton.append(element("kbd","","Ctrl K"));
const focusButton=button("nexus-tool","Focus","focus");focusButton.id="nexus-focus-toggle";focusButton.setAttribute("aria-pressed","false");focusButton.title="Hide decorative backgrounds and animations";
if(tools)tools.prepend(commandButton,focusButton);
let focusMode=false;
try{focusMode=localStorage.getItem("teamBcNexusFocus")==="on"}catch{}
function syncFocus(){
 const on=focusMode&&workspaceOpen();root.dataset.nexusFocus=on?"on":"off";
 focusButton.setAttribute("aria-pressed",String(focusMode));
 focusButton.title=focusMode?"Return to immersive workspace":"Hide decorative backgrounds and animations";
 // aurora-motion.js owns actual playback; it observes this attribute.
}
focusButton.addEventListener("click",()=>{focusMode=!focusMode;try{localStorage.setItem("teamBcNexusFocus",focusMode?"on":"off")}catch{}syncFocus()});
const dialog=element("dialog");dialog.id="nexus-command-dialog";dialog.setAttribute("aria-labelledby","nexus-command-title");
const dh=element("div","nexus-command-header"),dt=element("h2","","Jump to a workspace");
dt.id="nexus-command-title";const close=button("","×");close.setAttribute("aria-label","Close command launcher");dh.append(dt,close);
const label=element("label","nexus-command-search","Search available sections");
const search=element("input");search.type="search";search.placeholder="Try coaching, photos, templates…";search.autocomplete="off";search.id="nexus-command-search";label.htmlFor=search.id;label.append(search);
const list=element("div","nexus-command-list");
const count=element("div","nexus-command-foot");count.setAttribute("role","status");
dialog.append(dh,label,list,count);document.body.append(dialog);
let lastFocus=null;
function drawCommands(){
 const focusedIndex=[...list.querySelectorAll("button")].indexOf(document.activeElement);
 const q=search.value.trim().toLocaleLowerCase();
 const results=navButtons().filter(b=>{
  const d=descriptions[b.dataset.page]||[b.textContent,""];
  return (d.join(" ")+" "+b.textContent).toLocaleLowerCase().includes(q);
 });
 list.replaceChildren();
 for(const b of results){
  const page=b.dataset.page,[name,detail,color]=descriptions[page]||[b.textContent,"","#78d9ff"];
  const row=element("button","nexus-command-item");row.type="button";row.style.setProperty("--tile",color);
  const text=element("span","",name);text.append(element("small","",detail));row.append(glyph(page),text,element("span","",b.classList.contains("active")?"Current":"↗"));
  row.addEventListener("click",()=>{if(!allowed(page)){drawCommands();return}dialog.close();go(page)});
  list.append(row);
 }
 if(!results.length)list.append(element("p","nexus-command-empty","No matching sections. Try a different search."));
 if(focusedIndex>=0)list.querySelectorAll("button")[Math.min(focusedIndex,results.length-1)]?.focus();
 count.textContent=results.length+" available "+(results.length===1?"section":"sections")+" · ↑ ↓ to move · Enter to open · Esc to close";
}
function openCommand(){
 if(!workspaceOpen()||dialog.open)return;
 lastFocus=document.activeElement;search.value="";drawCommands();
 if(typeof dialog.showModal!=="function")return;dialog.showModal();search.focus();
}
commandButton.addEventListener("click",openCommand);
close.addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close()}});
dialog.addEventListener("close",()=>{if(lastFocus?.isConnected&&workspaceOpen())lastFocus.focus();lastFocus=null});
search.addEventListener("input",drawCommands);
dialog.addEventListener("keydown",e=>{
 const rows=[...list.querySelectorAll("button")];const index=rows.indexOf(document.activeElement);
 if(e.key==="ArrowDown"||e.key==="ArrowUp"){if(!rows.length)return;e.preventDefault();const next=e.key==="ArrowDown"?(index+1)%rows.length:index<0?rows.length-1:(index-1+rows.length)%rows.length;rows[next].focus()}
 if(e.key==="Enter"&&document.activeElement===search&&rows.length){e.preventDefault();rows[0].click()}
});
document.addEventListener("keydown",e=>{
 if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==="k"&&workspaceOpen()){e.preventDefault();if(dialog.open)dialog.close();else openCommand()}
});
let noticeTimer;
function notify(text){
 let notice=ws.querySelector(".nexus-notice");if(!notice){notice=element("div","nexus-notice");notice.setAttribute("role","status");ws.append(notice)}
 notice.textContent=text;notice.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{notice.hidden=true},2500);
}
function addOverview(){
 const overview=content.querySelector(".bc-overview");if(!overview||overview.dataset.nexusReady)return;
 overview.dataset.nexusReady="true";
 const hero=overview.querySelector(".bc-overview-heading"),copy=hero?.firstElementChild;
 if(hero&&copy){
  copy.classList.add("nexus-hero-copy");
  const actions=element("div","nexus-hero-actions");
  const launch=button("","Explore workspace","search");launch.addEventListener("click",openCommand);
  const court=button("","Photo court","bc-ai");court.addEventListener("click",()=>go("bc-ai"));
  if(allowed("bc-ai"))actions.append(launch,court);else actions.append(launch);
  copy.append(actions);
  const orbit=element("div","nexus-orbit");orbit.setAttribute("aria-hidden","true");
  orbit.append(element("div","nexus-ring"),element("div","nexus-ring"),element("div","nexus-sphere"),element("i","nexus-satellite"),element("i","nexus-satellite"));hero.append(orbit);
 }
 const pages=["agents","coaching","ic-logs","quick-links"];
 for(const [index,card] of [...overview.querySelectorAll(".bc-overview-kpi")].entries()){
  const page=pages[index];if(!page||!allowed(page))continue;
  const link=button("nexus-kpi-link","Open "+descriptions[page][0]);link.append(glyph("arrow"));link.addEventListener("click",()=>go(page));card.append(link);
 }
 const kpis=overview.querySelector(".bc-overview-kpis");
 if(kpis){
  const launchpad=element("section","nexus-launchpad"),head=element("div","nexus-launch-head"),heading=element("div");
  heading.append(element("h3","","Mission launchpad"),element("p","","Jump into the tools that keep your shift moving."));
  head.append(heading);const grid=element("div","nexus-launch-grid");
  for(const page of ["coaching","bc-ai","bc-ai-comment-template","work-requests"]){
   if(!allowed(page))continue;
   const [name,detail,color]=descriptions[page];const tile=element("button","nexus-tile");tile.type="button";tile.style.setProperty("--tile",color);
   tile.append(glyph(page),element("span","",name),element("small","",detail));tile.addEventListener("click",()=>go(page));grid.append(tile);
  }
  if(grid.childElementCount){launchpad.append(head,grid);kpis.after(launchpad)}
 }
 const quote=overview.querySelector(".bc-overview-quote blockquote");
 if(quote){
  const copyQuote=button("nexus-quote-action","Copy quote");
  copyQuote.addEventListener("click",async()=>{
   const text=quote.textContent.trim();try{await navigator.clipboard.writeText(text);notify("Quote copied.")}catch{notify("Could not copy. You can select the quote and copy it manually.")}
  });quote.parentElement.append(copyQuote);
 }
}
function refresh(){
 syncNav();
 if(workspaceOpen())addOverview();
 else if(dialog.open)dialog.close();
}
new MutationObserver(refresh).observe(content,{childList:true});
new MutationObserver(refresh).observe(crumb,{attributes:true,attributeFilter:["data-page"]});
new MutationObserver(()=>{syncFocus();refresh()}).observe(ws,{attributes:true,attributeFilter:["class","style"]});
new MutationObserver(()=>{syncNav();if(dialog.open)drawCommands()}).observe(nav,{subtree:true,attributes:true,attributeFilter:["class","hidden","disabled","aria-hidden"]});
syncFocus();refresh();
})();
