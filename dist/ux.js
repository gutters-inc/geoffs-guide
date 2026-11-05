let dialogReturnFocus=null;
const signedChange=n=>Math.abs(n)<.005?'0.00':`${n>0?'+':'−'}${Math.abs(n).toFixed(2)}`;
function scenarioActive(){return false}
function syncRoute(){if(race)history.replaceState(null,'',`#race-${race.number}${experience==='form'?'':'/'+experience}`)}
function setExperience(value,sync=true){
 const previous=experience;experience=['form','simple'].includes(value)?'form':['late-mail','race-day'].includes(value)?'race-day':['tips','value'].includes(value)?'value':'connections';
 document.body.classList.toggle('simple-mode',experience==='form');
 for(const [id,tab,panel] of [['simpleMode','form','formPanel'],['raceDayMode','race-day','raceDayPanel'],['valueMode','value','valuePanel'],['exploreMode','connections','connectionsPanel']]){
  document.getElementById(panel).hidden=experience!==tab;const b=document.getElementById(id);b.classList.toggle('active',experience===tab);b.setAttribute('aria-selected',String(experience===tab));b.setAttribute('tabindex',experience===tab?'0':'-1');
 }
 if(race){renderRaceFacts();renderDetail();renderLateMail()}
 if(sync)syncRoute();if(sync&&previous!==experience)document.getElementById('raceStart')?.scrollIntoView?.({block:'start',behavior:'instant'});
}
function inspectRunner(name){dialogReturnFocus=document.activeElement;selected=name;renderDetail();const d=document.getElementById('runnerDialog');if(!d.open){if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','')}}
function closeRunner(){const d=document.getElementById('runnerDialog');if(typeof d.close==='function')d.close();else d.removeAttribute('open');let target=dialogReturnFocus;if(target&&!target.isConnected){const name=target.dataset?.inspect||target.dataset?.horse||target.dataset?.ladderHorse;target=[...document.querySelectorAll('[data-inspect],[data-horse],[data-ladder-horse]')].find(b=>(b.dataset.inspect||b.dataset.horse||b.dataset.ladderHorse)===name)}target?.focus?.()}
function traceHorse(name){closeRunner();setExperience('connections');const index=baseline.filter(h=>h.eligible).findIndex(h=>h.name===name);if(index>=4){ladderExpanded=true;renderLadder()}const button=[...document.querySelectorAll('[data-ladder-horse]')].find(b=>b.dataset.ladderHorse===name);button?.scrollIntoView?.({behavior:'smooth',block:'center'});button?.focus?.()}
document.getElementById('closeRunner').onclick=closeRunner;document.getElementById('traceRunner').onclick=()=>traceHorse(selected);
document.getElementById('runnerDialog').addEventListener('click',e=>{if(e.target===document.getElementById('runnerDialog'))closeRunner()});
document.getElementById('runnerDialog').addEventListener('cancel',e=>{e.preventDefault();closeRunner()});
for(const [id,tab] of [['simpleMode','form'],['raceDayMode','race-day'],['valueMode','value'],['exploreMode','connections']]){
 const b=document.getElementById(id);b.onclick=()=>setExperience(tab);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=['form','race-day','value','connections'],target=e.key==='Home'?'form':e.key==='End'?'connections':tabs[(tabs.indexOf(experience)+(e.key==='ArrowRight'?1:3))%4];setExperience(target);document.getElementById({form:'simpleMode','race-day':'raceDayMode',value:'valueMode',connections:'exploreMode'}[target]).focus?.()};
}
