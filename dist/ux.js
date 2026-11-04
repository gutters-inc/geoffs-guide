let lastAction='',lastEditRows=null,editKey=null,pendingFrame=null,dialogReturnFocus=null;
const signedChange=n=>Math.abs(n)<.005?'0.00':`${n>0?'+':'−'}${Math.abs(n).toFixed(Math.abs(n)<1?2:1)}`;
const ratingMap=rows=>new Map(rows.filter(h=>h.eligible).map((h,i)=>[h.name,{...h,rank:i+1}]));
function scenarioActive(){return scenario.going!=='all'&&scenario.groundStrength>0||scenario.preferTrack||scenario.handicap||!!scenario.drawBias||!!scenario.crowdEnabled&&typeof currentCrowd==='function'&&currentCrowd().guideCount>0||race.horses.some(h=>Number(scenario.overrides[h.name]?.bonus))}
function syncRoute(){if(race)history.replaceState(null,'',`#race-${race.number}${experience==='form'?'':'/'+experience}`)}
function setExperience(value,sync=true){
  const previous=experience;
  experience=['form','simple'].includes(value)?'form':value==='value'?'value':value==='race-day'?'race-day':'connections';
  document.body.classList.toggle('simple-mode',experience==='form');
  document.getElementById('raceDayPanel').hidden=experience!=='race-day';document.getElementById('formPanel').hidden=experience!=='form';document.getElementById('connectionsPanel').hidden=experience!=='connections';document.getElementById('valuePanel').hidden=experience!=='value';
  for(const [id,tab] of [['simpleMode','form'],['raceDayMode','race-day'],['valueMode','value'],['exploreMode','connections']]){
    const b=document.getElementById(id),on=experience===tab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));b.setAttribute('tabindex',on?'0':'-1');
  }
  if(race){if(typeof renderRaceFacts==='function')renderRaceFacts();renderDetail();if(typeof renderRaceDay==='function')renderRaceDay()}
  if(sync)syncRoute();
  if(race&&experience==='race-day'&&typeof refreshLive==='function'&&!liveFresh(liveRace()))refreshLive();
  if(sync&&previous!==experience&&typeof window.scrollTo==='function')window.scrollTo({top:0,behavior:'instant'});
}
function inspectRunner(name){
  dialogReturnFocus=document.activeElement;ensureComparisonOption(name);selectHorse(name);
  const dialog=document.getElementById('runnerDialog');
  if(!dialog.open){if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','')}
}
function closeRunner(){const d=document.getElementById('runnerDialog');if(typeof d.close==='function')d.close();else d.removeAttribute('open');let target=dialogReturnFocus;if(target&&!target.isConnected){const entries=Object.entries(target.dataset||{});target=[...document.querySelectorAll('[data-horse],[data-lane],[data-ladder-horse]')].find(el=>entries.some(([key,value])=>el.dataset[key]===value))}target?.focus?.()}
function ensureComparisonOption(name){const select=document.getElementById('horseA');if(![...select.options].some(o=>o.value===name)){const option=document.createElement('option');option.value=name;option.textContent=display(name)+' · Common rival';select.appendChild(option)}}
function traceHorse(name){
  closeRunner();setExperience('connections');ensureComparisonOption(name);selectHorse(name);
  const index=active().findIndex(h=>h.name===name);if(index>=6){ladderExpanded=true;renderLadder()}
  const card=[...document.querySelectorAll('[data-ladder-horse]')].find(b=>b.dataset.ladderHorse===name);card?.scrollIntoView?.({behavior:'smooth',block:'center'});
}
function renderConnectionsMeta(){
  const names=new Set(active().map(h=>h.name));let pairs=0;
  for(const a of names)for(const b of graph.adjacency.get(a)?.keys()||[])if(names.has(b)&&a<b)pairs++;
  document.getElementById('connectionsBadge').textContent=`${pairs} direct ${pairs===1?'pair':'pairs'}`;
}
function renderScenarioControls(){
  for(const [id,key] of [['goingInput','going'],['drawInput','drawBias'],['kgInput','kgFactor'],['groundStrength','groundStrength']]){const el=document.getElementById(id),value=String(scenario[key]);if(![...el.options].some(o=>o.value===value)){const option=document.createElement('option');option.value=value;option.textContent=key==='drawBias'?`Current gate assumption · ${Number(value).toFixed(2)}L`: `Saved setting · ${value}`;el.appendChild(option)}el.value=value;}
  document.getElementById('trackInput').checked=scenario.preferTrack;document.getElementById('handicapInput').checked=scenario.handicap;
  editKey=null;lastAction='';lastEditRows=null;renderControlState();renderAdjustmentRows();renderScenarioStatus();renderCrowdControls();
}
function renderControlState(){
  const groundOn=scenario.going!=='all';
  document.getElementById('groundStrength').disabled=!groundOn;document.getElementById('kgInput').disabled=!scenario.handicap;
  document.getElementById('kgOutput').textContent=Number(scenario.kgFactor).toFixed(2)+'L / kg';
  document.getElementById('groundOutput').textContent=Math.round(scenario.groundStrength*100)+'%';
  document.getElementById('groundStrengthHint').textContent=groundOn?`Matching runs count fully. Other ground counts ${Math.round((1-scenario.groundStrength)*100)}%. At 0%, all ground counts equally.`:'Choose Good, Soft or Heavy first. 0% treats all past ground equally; 100% uses only matching ground.';
  const matching=active().filter(h=>h.goingRuns>0).length;
  document.getElementById('groundHint').textContent=groundOn?`${matching} of ${active().length} runners have an available ${scenario.going.toLowerCase()}-ground start.`:'All available ground contributes to the baseline.';
  document.getElementById('weightHint').textContent=scenario.handicap?`A 1kg reduction is worth ${Number(scenario.kgFactor).toFixed(2)}L in your assumption, before model fitting.`:'Off · turn on carried-weight adjustment to enable.';
  document.getElementById('trackHint').textContent=scenario.preferTrack?'Flemington runs: full influence. Other tracks: 50%.':'Off · every track keeps its normal influence.';
  const bias=Number(scenario.drawBias);document.getElementById('drawOutput').textContent=bias?`${bias<0?'Inside':'Outside'} +${Math.abs(bias).toFixed(1)}L`:'Neutral · no draw edge';
  document.getElementById('drawInput').setAttribute('aria-valuetext',document.getElementById('drawOutput').textContent);
  document.getElementById('drawHint').textContent=bias?`${Math.abs(bias).toFixed(1)}L advantage at the ${bias<0?'inside':'outside'} end; the same penalty at the other end.`:'Choose no advantage unless you have a reason to favour inside or outside gates.';
}
function renderScenarioStatus(){
  const labels=[];
  if(scenario.going!=='all')labels.push(`${scenario.going} ground · ${Math.round(scenario.groundStrength*100)}% preference`);
  if(scenario.preferTrack)labels.push('Flemington form preferred');
  if(scenario.handicap)labels.push(`Weights · ${Number(scenario.kgFactor).toFixed(2)}L/kg`);
  if(scenario.drawBias)labels.push(`${scenario.drawBias<0?'Inside':'Outside'} +${Math.abs(scenario.drawBias).toFixed(1)}L`);
  if(scenario.crowdEnabled)labels.push(`Published tips · ${currentCrowd().guideCount} active guides`);
  const n=race.horses.filter(h=>!h.scratched&&!h.emergency&&(Number(scenario.overrides[h.name]?.bonus)||scenario.handicap&&Number.isFinite(scenario.overrides[h.name]?.weight)&&scenario.overrides[h.name].weight!==h.weight)).length;
  if(n)labels.push(`${n} custom runner ${n===1?'adjustment':'adjustments'}`);
  document.getElementById('scenarioStatus').innerHTML=`<span class="scenario-dot ${scenarioActive()?'':'baseline-dot'}"></span><b>${scenarioActive()?'Your scenario is active':'No active assumptions'}</b><span>${esc(labels.length?labels.join(' · '):'No adjustments applied. Start with the ground or carried weight.')}</span>`;
}
function renderAdjustmentRows(){
  document.getElementById('adjustmentRows').innerHTML=race.horses.map(h=>{
    const o=scenario.overrides[h.name]||{},disabled=h.scratched||h.emergency;
    return `<tr><td><span class="adjust-runner">${silk(h)}<span>${h.number}. ${esc(h.display)}${disabled?`<small>${h.scratched?'Scratched':'Emergency'} · excluded</small>`:''}</span></span></td><td>${h.weight}kg</td><td><input type="number" min="45" max="75" step="0.1" inputmode="decimal" value="${o.weight??h.weight}" data-weight="${esc(h.name)}" aria-label="${esc(h.display)} scenario weight in kg" ${disabled?'disabled':''}><small data-weight-note="${esc(h.name)}" class="field-note"></small><small data-weight-error="${esc(h.name)}" class="field-error"></small></td><td><input type="number" min="-5" max="5" step="0.1" inputmode="decimal" value="${o.bonus??0}" data-bonus="${esc(h.name)}" aria-label="${esc(h.display)} extra edge in lengths" ${disabled?'disabled':''}><small data-bonus-error="${esc(h.name)}" class="field-error"></small></td><td><span class="ground-evidence" data-evidence="${esc(h.name)}"></span></td><td><span data-runner-impact="${esc(h.name)}" class="runner-impact"></span></td></tr>`;
  }).join('');
  for(const kind of ['weight','bonus'])document.querySelectorAll(`[data-${kind}]`).forEach(input=>{
    const handler=commit=>{
      const n=Number(input.value),min=kind==='weight'?45:-5,max=kind==='weight'?75:5,name=input.dataset[kind];
      const error=document.querySelector(`[data-${kind}-error="${name.replace(/"/g,'\\"')}"]`);
      if(input.value.trim()===''||!Number.isFinite(n)||n<min||n>max){input.setAttribute('aria-invalid','true');if(error)error.textContent=`Enter ${min} to ${max} ${kind==='weight'?'kg':'lengths'}. Last valid value still applied.`;return}
      input.removeAttribute('aria-invalid');if(error)error.textContent='';beginEdit(kind+name);
      scenario.overrides[name]={...scenario.overrides[name],[kind]:n};
      if(kind==='weight'){scenario.handicap=true;document.getElementById('handicapInput').checked=true}
      updateScenario(`${display(name)} · ${kind==='weight'?'carried weight':'extra edge'}`,commit);
    };
    input.oninput=()=>handler(false);input.onchange=()=>handler(true);
  });
  renderAdjustmentFeedback();
}
function renderAdjustmentFeedback(){
  const before=ratingMap(baseline),after=ratingMap(ranked);
  for(const h of ranked){
    const cells=[...document.querySelectorAll('[data-runner-impact]')],cell=cells.find(c=>c.dataset.runnerImpact===h.name),evidence=[...document.querySelectorAll('[data-evidence]')].find(c=>c.dataset.evidence===h.name),note=[...document.querySelectorAll('[data-weight-note]')].find(c=>c.dataset.weightNote===h.name);
    const delta=h.score-(before.get(h.name)?.score??h.score),rankMove=(before.get(h.name)?.rank||0)-(after.get(h.name)?.rank||0);
    if(cell)cell.innerHTML=h.eligible?`<b class="${delta>.005?'positive':delta<-.005?'negative':''}">${signedChange(delta)} pts</b><small>${rankMove?`${rankMove>0?'↑':'↓'} ${Math.abs(rankMove)} ${Math.abs(rankMove)===1?'place':'places'}`:'Rank unchanged'}</small>`:'<small>Excluded</small>';
    if(evidence)evidence.innerHTML=`${scenario.going==='all'?`${h.history.length} recent starts`:`${h.goingRuns} on ${esc(scenario.going)}`}<small>${h.trackRuns} at Flemington</small>${scenario.going!=='all'&&h.goingRuns<2?'<em>Thin ground evidence</em>':''}`;
    if(note){const kg=(scenario.overrides[h.name]?.weight??h.weight)-h.weight;note.textContent=!kg?'Published weight':`${Math.abs(kg).toFixed(1)}kg ${kg<0?'lighter':'heavier'}${scenario.handicap?' · '+signedChange(-kg*scenario.kgFactor)+'L assumption':' · adjustment is off'}`}
  }
}
function beginEdit(key){if(editKey!==key){editKey=key;lastEditRows=ranked.map(h=>({...h}))}}
function updateScenario(action,commit){
  lastAction=action;
  if(commit||typeof requestAnimationFrame!=='function'){
    if(pendingFrame!==null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(pendingFrame);pendingFrame=null;applyScenario();
    if(commit){document.getElementById('impactAnnouncement').textContent=document.getElementById('lastChange').textContent;editKey=null}
  }else if(pendingFrame===null)pendingFrame=requestAnimationFrame(()=>{pendingFrame=null;applyScenario()});
}
function applyScenario(){
  saveScenario();ranked=M.rate(graph,race,scenarioWithCrowd());
  renderVerdict();renderRankings();renderDetail();renderNewViews();renderScenarioStatus();renderControlState();renderCrowdControls();renderAdjustmentFeedback();renderImpact();renderTipSummary();renderLadder();if(typeof renderLive==='function')renderLive();if(typeof renderRaceDay==='function')renderRaceDay();
}
function renderImpact(){
  const current=ratingMap(ranked),base=ratingMap(baseline),leader=active()[0];if(!leader)return;
  const changes=active().map(h=>({...h,delta:h.score-(base.get(h.name)?.score??h.score)})).sort((a,b)=>b.delta-a.delta),riser=changes[0],faller=changes.at(-1);
  const moved=active().filter(h=>current.get(h.name).rank!==base.get(h.name)?.rank).length;
  const stat=(label,name,value,cls='')=>`<div class="impact-stat"><span>${label}</span><b>${esc(name)}</b><small class="${cls}">${value}</small></div>`;
  document.getElementById('impactSummary').innerHTML=stat('YOUR FORM LEADER',leader.display,base.get(leader.name)?.rank===1?'Leader unchanged':`Up from baseline #${base.get(leader.name)?.rank}`)+stat('RANKS CHANGED',`${moved} of ${active().length}`,scenarioActive()?'Compared with baseline':'Baseline · no adjustments')+stat('BIGGEST GAIN',riser.delta>.005?riser.display:'No material gain',`${signedChange(Math.max(0,riser.delta))} points`,riser.delta>.005?'positive':'')+stat('BIGGEST DROP',faller.delta<-.005?faller.display:'No material drop',`${signedChange(Math.min(0,faller.delta))} points`,faller.delta<-.005?'negative':'');
  const note=document.getElementById('lastChange');
  if(lastAction&&lastEditRows){
    const old=ratingMap(lastEditRows),diffs=active().map(h=>({h,delta:h.score-(old.get(h.name)?.score??h.score)})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)),big=diffs[0];
    const oldLeader=lastEditRows.find(h=>h.eligible),newLeader=oldLeader?.name!==leader.name;
    note.innerHTML=`<span class="live-dot"></span><b>${esc(lastAction)}</b><span>${Math.abs(big.delta)<.005?'No measurable rating change. Try another assumption or a larger adjustment.':`${esc(big.h.display)} ${signedChange(big.delta)} pts from this change. ${newLeader?`${esc(leader.display)} is now the leader.`:'Leader unchanged.'}`}</span>`;
  }else note.innerHTML='<span class="live-dot"></span><b>Live impact</b><span>Choose a setting or tick a signal. See the effect against the original form.</span>';
  if(scenario.going!=='all'&&scenario.groundStrength>0){const missing=active().filter(h=>h.goingRuns===0).length;if(missing)note.innerHTML+=`<small class="impact-evidence">${missing} runners have no available ${esc(scenario.going.toLowerCase())}-ground start. A score moving up can reflect weaker evidence, not proven ground suitability.</small>`}
}
function renderNewViews(){renderSimple();renderFormVisual()}
function renderFormVisual(){
  if(!race)return;
  const runners=active(),focus=document.getElementById('chartRange').value!=='full',values=[...runners,...baseline.filter(h=>h.eligible)].map(h=>h.score);
  let low=0,high=100;
  if(focus){low=Math.max(0,Math.floor((Math.min(...values)-4)/5)*5);high=Math.min(100,Math.ceil((Math.max(...values)+4)/5)*5);if(high-low<20){const mid=(low+high)/2;low=Math.max(0,mid-10);high=Math.min(100,mid+10)}}
  const position=n=>Math.max(0,Math.min(100,(n-low)/(high-low)*100));
  document.getElementById('visualDescription').textContent=`${focus?'Focused on this field':'Full rating scale'} · ${low}–${high} points. Hollow circles show baseline; silks show your scenario. The chart makes small differences visible; scores are unchanged.`;
  document.getElementById('visualKey').innerHTML=`<span>○ Baseline</span><span>Silks = your scenario</span><span>Rating points · ${low}–${high}</span>`;
  const ticks=Array.from({length:5},(_,i)=>low+(high-low)*i/4);
  document.getElementById('formVisual').innerHTML=`<div class="lanes-scale"><span>RUNNER / RANK</span><div>${ticks.map(n=>`<span>${Number.isInteger(n)?n:n.toFixed(1)}</span>`).join('')}</div><span>RATING / CHANGE</span></div><div class="form-lanes">${runners.map((h,i)=>{
    const base=baseline.find(x=>x.name===h.name),delta=h.score-(base?.score??h.score),x=position(h.score),bx=position(base?.score??h.score),oldRank=baseline.filter(x=>x.eligible).findIndex(x=>x.name===h.name)+1,rankMove=oldRank-i-1;
    return `<button class="form-lane ${h.name===selected?'selected':''}" data-lane="${esc(h.name)}" aria-label="Inspect ${esc(h.display)}: rating ${h.score.toFixed(2)}, change ${signedChange(delta)} points"><span class="lane-name"><small>${String(i+1).padStart(2,'0')}</small><b>${h.number}. ${esc(h.display)}${rankMove?`<em class="${rankMove>0?'positive':'negative'}">${rankMove>0?'↑':'↓'}${Math.abs(rankMove)}</em>`:''}</b></span><span class="lane-track"><i class="lane-connector ${delta<0?'negative':''}" style="left:${Math.min(x,bx)}%;width:${Math.abs(x-bx)}%"></i><i class="baseline-marker" style="left:${bx}%" title="Baseline ${base?.score.toFixed(2)}"></i><span class="scenario-marker" style="left:${x}%">${silk(h)}</span></span><span class="lane-value"><b>${h.runs?h.score.toFixed(1):'—'}</b><small class="${delta>.005?'positive':delta<-.005?'negative':''}">${scenarioActive()?signedChange(delta):'—'}</small></span></button>`;
  }).join('')}</div><p class="path-note">${componentCount()>1?'Separate network groups share this chart for exploration; comparisons across groups are uncertain. ':''}These are form ratings, not win probabilities or finishing margins. Scratchings and emergencies are excluded.</p>`;
  document.querySelectorAll('[data-lane]').forEach(b=>b.onclick=()=>inspectRunner(b.dataset.lane));
}
document.getElementById('closeRunner').onclick=closeRunner;
document.getElementById('traceRunner').onclick=()=>traceHorse(selected);
document.getElementById('runnerDialog').addEventListener('click',e=>{if(e.target===document.getElementById('runnerDialog'))closeRunner()});
document.getElementById('runnerDialog').addEventListener('cancel',e=>{e.preventDefault();closeRunner()});
for(const [id,tab] of [['simpleMode','form'],['raceDayMode','race-day'],['valueMode','value'],['exploreMode','connections']]){
  const b=document.getElementById(id);b.onclick=()=>setExperience(tab);
  b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=['form','race-day','value','connections'],target=e.key==='Home'?'form':e.key==='End'?'connections':tabs[(tabs.indexOf(experience)+(e.key==='ArrowRight'?1:3))%4];setExperience(target);document.getElementById({form:'simpleMode','race-day':'raceDayMode',value:'valueMode',connections:'exploreMode'}[target]).focus?.()}};
}
const controlBindings=[['goingInput','going','Ground preference'],['groundStrength','groundStrength','Matching-ground strength'],['drawInput','drawBias','Draw advantage'],['trackInput','preferTrack','Flemington preference'],['handicapInput','handicap','Carried-weight adjustment'],['kgInput','kgFactor','Weight sensitivity'],['crowdInput','crowdEnabled','Published-tip crowd boost'],['crowdStrength','crowdStrength','Crowd influence']];
for(const [id,key,label] of controlBindings){
  const el=document.getElementById(id),read=commit=>{if(typeof livePrefs!=='undefined'){if(key==='going')livePrefs.followTrack=false;if(key==='drawBias')livePrefs.learnDraw=false;saveLivePrefs()}beginEdit(id);scenario[key]=el.type==='checkbox'?el.checked:key==='going'?el.value:Number(el.value);updateScenario(label,commit)};
  el.oninput=()=>read(false);el.onchange=()=>read(true);
}
document.getElementById('chartRange').onchange=renderFormVisual;
document.getElementById('resetScenario').onclick=()=>{if(pendingFrame!==null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(pendingFrame);pendingFrame=null;scenario=defaults();if(typeof livePrefs!=='undefined'){livePrefs.followTrack=false;livePrefs.learnDraw=false;saveLivePrefs()}saveScenario();renderScenarioControls();applyScenario();document.getElementById('impactAnnouncement').textContent='All scenario assumptions reset. Baseline ratings restored.'};
