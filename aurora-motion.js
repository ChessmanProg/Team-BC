/* Motion is cosmetic, stored only on this browser. No auth or record access. */
(()=>{"use strict";
const root=document.documentElement, button=document.getElementById("bc-motion-toggle"),video=document.querySelector(".ocean-video"), content=document.getElementById("page-content"),crumb=document.getElementById("crumb");
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
let preference="on";
try{if(localStorage.getItem("teamBcAmbientMotion")==="off")preference="off"}catch{}
function enabled(){return preference==="on"&&!reduced.matches}
function syncMotion(){
const on=enabled();root.dataset.bcMotion=on?"on":"off";
if(button){button.setAttribute("aria-pressed",String(on));button.querySelector(".bc-motion-text").textContent=reduced.matches?"Motion off (system)":on?"Motion on":"Motion off";button.disabled=reduced.matches;button.title=reduced.matches?"Reduced motion is enabled in your device settings":"Toggle decorative motion and video backgrounds"}
if(video){if(!on)video.pause();else{const p=video.play();p?.catch(()=>{})}}
}
button?.addEventListener("click",()=>{preference=preference==="on"?"off":"on";try{localStorage.setItem("teamBcAmbientMotion",preference)}catch{}syncMotion()});
video?.addEventListener("play",()=>{if(!enabled())video.pause()});
if(reduced.addEventListener)reduced.addEventListener("change",syncMotion);else reduced.addListener(syncMotion);
syncMotion();
let lastPage="", pending=true;
const cards=".bc-overview-kpi,.bc-overview-panel,.bc-overview-welcome,.bc-agent-card,.bc-coaching-session-card,.bc-coaching-resource-card,.bc-ic-stat,.bc-quicklink-card,.bc-template-card,.bc-work-card";
function reveal(){
if(!content||!crumb)return;
const page=crumb.dataset.page||"overview";
if(page!==lastPage){lastPage=page;pending=true}
const section=content.firstElementChild;
if(!section)return;
if(section.textContent.trim()==="Loading…"){pending=true;section.classList.add("bc-load-in");return}
if(!pending)return;
pending=false;
if(!enabled())return;
section.classList.add("bc-reveal");
Array.from(section.querySelectorAll(cards)).slice(0,16).forEach((el,i)=>{el.style.setProperty("--bc-delay",Math.min(i*45,250)+"ms");el.classList.add("bc-reveal-card")});
}
if(content)new MutationObserver(reveal).observe(content,{childList:true});
if(crumb)new MutationObserver(reveal).observe(crumb,{attributes:true,attributeFilter:["data-page"]});
reveal();
})();