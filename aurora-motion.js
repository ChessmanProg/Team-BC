/* Ambient motion controller. Browser preferences only; no auth or record access. */
(()=>{
"use strict";
const root=document.documentElement, button=document.getElementById("bc-motion-toggle"),video=document.querySelector(".ocean-video"),content=document.getElementById("page-content"),crumb=document.getElementById("crumb");
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
let preference="on";
try{if(localStorage.getItem("teamBcAmbientMotion")==="off")preference="off"}catch{}
function enabled(){return preference==="on"&&!reduced.matches}
function ambient(){return enabled()&&root.dataset.nexusFocus!=="on"}
function syncVideo(){
 if(!video)return;
 if(!ambient()||document.hidden){if(!video.paused)video.pause();return}
 if(video.paused){const p=video.play();p?.catch(()=>{})}
}
function syncMotion(){
 const on=enabled();root.dataset.bcMotion=on?"on":"off";
 if(button){
  button.setAttribute("aria-pressed",String(on));
  const label=button.querySelector(".bc-motion-text");
  if(label)label.textContent=reduced.matches?"Motion off (system)":on?"Motion on":"Motion off";
  button.disabled=reduced.matches;
  button.title=reduced.matches?"Reduced motion is enabled in your device settings":"Toggle decorative motion and video backgrounds";
 }
 syncVideo();
}
button?.addEventListener("click",()=>{preference=preference==="on"?"off":"on";try{localStorage.setItem("teamBcAmbientMotion",preference)}catch{}syncMotion()});
video?.addEventListener("play",()=>{if(!ambient()||document.hidden)video.pause()});
document.addEventListener("visibilitychange",syncVideo);
new MutationObserver(syncVideo).observe(root,{attributes:true,attributeFilter:["data-nexus-focus"]});
if(reduced.addEventListener)reduced.addEventListener("change",syncMotion);else reduced.addListener(syncMotion);
syncMotion();
let lastPage="",pending=true;
const cards=".bc-overview-kpi,.bc-overview-panel,.bc-overview-welcome,.bc-agent-card,.bc-coaching-session-card,.bc-coaching-resource-card,.bc-ic-stat,.bc-quicklink-card,.bc-template-card,.bc-work-card";
function reveal(){
 if(!content||!crumb)return;
 const page=crumb.dataset.page||"overview";
 if(page!==lastPage){lastPage=page;pending=true}
 const section=content.firstElementChild;
 if(!section)return;
 if(section.textContent.trim()==="Loading…"){pending=true;if(ambient())section.classList.add("bc-load-in");return}
 if(!pending)return;
 pending=false;
 if(!ambient())return;
 section.classList.add("bc-reveal");
 Array.from(section.querySelectorAll(cards)).slice(0,12).forEach((el,i)=>{
  el.style.setProperty("--bc-delay",Math.min(i*35,200)+"ms");el.classList.add("bc-reveal-card");
 });
}
if(content)new MutationObserver(reveal).observe(content,{childList:true});
if(crumb)new MutationObserver(reveal).observe(crumb,{attributes:true,attributeFilter:["data-page"]});
reveal();
})();
