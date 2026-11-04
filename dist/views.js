let media={},baseline=[],visualMode='lanes',experience='simple',userPhotos={};
const defaults=()=>({going:'all',preferTrack:false,handicap:false,kgFactor:.5,drawBias:0,overrides:{}});
let scenario=defaults();
try{const saved=JSON.parse(localStorage.getItem('oaks-scenario-v1')||'null');if(saved&&typeof saved==='object'){scenario={...defaults(),...saved};scenario.overrides=saved.overrides&&typeof saved.overrides==='object'?saved.overrides:{}}}catch{}
function saveScenario(){try{localStorage.setItem('oaks-scenario-v1',JSON.stringify(scenario))}catch{}}
function scenarioActive(){return scenario.going!=='all'||scenario.preferTrack||scenario.handicap||!!scenario.drawBias||race.horses.some(h=>Number(scenario.overrides[h.name]?.bonus))}
function silk(h,size=''){
  const i=race.horses.findIndex(x=>x.name===h.name);
  return i<0?'':`<span class="race-silk ${size}" role="img" aria-label="${esc(h.display)} race-day silks" style="--sprite:url('assets/silks-r${race.number}.png');--silk-x:${i};--silk-count:${race.horses.length}"></span>`;
}
function svgSilk(h){const i=race.horses.findIndex(x=>x.name===h.name);return `<svg x="-15" y="-18" width="30" height="36.56" viewBox="${i*64} 0 64 78" overflow="hidden"><image href="assets/silks-r${race.number}.png" width="${race.horses.length*64}" height="78"/></svg><circle cx="16" cy="-15" r="8" fill="#fff" stroke="#c3d1b5"/><text x="16" y="-12" text-anchor="middle" fill="#23472f" style="font:8px sans-serif">${h.number}</text>`}
function horsePhoto(h,variant='card'){
  const p=userPhotos[h.name]?{src:userPhotos[h.name],credit:'Your photo · this tab session',source:null}:media[h.name];
  return `<figure class="horse-photo ${variant} ${p?'':'no-photo'}">${p?`<img src="${esc(p.src)}" alt="${esc(h.display)}" loading="lazy" onerror="this.hidden=true;this.parentElement.classList.add('photo-failed')">`:`<div class="photo-placeholder">${silk(h,'hero')}<span>Verified photo unavailable</span></div>`}${p?`<figcaption>${p.source?`<a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.credit)} ↗</a>`:esc(p.credit)}</figcaption>`:''}<span class="image-error">Photo unavailable</span></figure>`;
}
function setExperience(value){experience=value;document.body.classList.toggle('simple-mode',value==='simple');for(const [id,mode] of [['simpleMode','simple'],['exploreMode','explore']]){document.getElementById(id).classList.toggle('active',value===mode);document.getElementById(id).setAttribute('aria-pressed',String(value===mode))}}
function inspectRunner(name){setExperience('explore');selectHorse(name);document.getElementById('horseDetail').scrollIntoView?.({behavior:'smooth',block:'center'})}
function renderScenarioControls(){
  document.getElementById('goingInput').value=scenario.going;document.getElementById('drawInput').value=String(scenario.drawBias);document.getElementById('trackInput').checked=scenario.preferTrack;document.getElementById('handicapInput').checked=scenario.handicap;document.getElementById('kgInput').value=String(scenario.kgFactor);document.getElementById('kgOutput').textContent=Number(scenario.kgFactor).toFixed(2)+'L / kg';
  renderAdjustmentRows();renderScenarioStatus();
}
function renderScenarioStatus(){
  const labels=[];
  if(scenario.going!=='all')labels.push(`${scenario.going} ground preferred`);
  if(scenario.preferTrack)labels.push('Flemington evidence preferred');
  if(scenario.handicap)labels.push(`Weight correction: ${Number(scenario.kgFactor).toFixed(2)}L/kg`);
  if(scenario.drawBias)labels.push(`${scenario.drawBias<0?'Inside':'Outside'} draw edge: ${Math.abs(scenario.drawBias)}L`);
  const adjustments=race.horses.filter(h=>scenario.overrides[h.name]&&(Number(scenario.overrides[h.name].bonus)||scenario.handicap&&Number.isFinite(scenario.overrides[h.name].weight))).length;
  if(adjustments)labels.push(`${adjustments} runner ${adjustments===1?'adjustment':'adjustments'}`);
  document.getElementById('scenarioStatus').innerHTML=labels.length?`<span class="scenario-dot"></span><b>Your scenario is active</b> <span>${esc(labels.join(' · '))}</span>`:'<span class="scenario-dot baseline-dot"></span><b>Baseline form</b><span>No race-day adjustments. Change a control to test your view.</span>';
}
function renderAdjustmentRows(){
  document.getElementById('adjustmentRows').innerHTML=race.horses.map(h=>{
    const o=scenario.overrides[h.name]||{},r=ranked.find(x=>x.name===h.name),disabled=h.scratched||h.emergency;
    return `<tr><td><span class="adjust-runner">${silk(h)}<span>${h.number}. ${esc(h.display)}${disabled?`<small>${h.scratched?'Scratched':'Emergency'} · excluded</small>`:''}</span></span></td><td>${h.weight}kg</td><td><input type="number" min="45" max="75" step="0.5" inputmode="decimal" value="${o.weight??h.weight}" data-weight="${esc(h.name)}" aria-label="${esc(h.display)} scenario weight in kg" ${disabled?'disabled':''}></td><td><input type="number" min="-5" max="5" step="0.25" inputmode="decimal" value="${o.bonus??0}" data-bonus="${esc(h.name)}" aria-label="${esc(h.display)} extra edge in lengths" ${disabled?'disabled':''}></td><td><span class="ground-evidence">${scenario.going==='all'?`${h.history.length} recent starts`:`${r?.goingRuns||0} on ${esc(scenario.going)}`}<small>${h.history.filter(s=>/^flemington$/i.test(s.track)).length} at Flemington</small></span></td></tr>`;
  }).join('');
  for(const kind of ['weight','bonus'])document.querySelectorAll(`[data-${kind}]`).forEach(input=>input.onchange=()=>{
    const n=Number(input.value),min=kind==='weight'?45:-5,max=kind==='weight'?75:5;
    if(input.value.trim()===''||!Number.isFinite(n)||n<min||n>max){input.setAttribute('aria-invalid','true');input.title=`Enter a value from ${min} to ${max}`;return}
    input.removeAttribute('aria-invalid');const name=input.dataset[kind];scenario.overrides[name]={...scenario.overrides[name],[kind]:n};if(kind==='weight'){scenario.handicap=true;document.getElementById('handicapInput').checked=true}applyScenario();
  });
}
function applyScenario(){
  saveScenario();ranked=M.rate(graph,race,scenario);
  renderVerdict();renderRankings();renderDetail();renderPath();renderNewViews();renderScenarioStatus();renderAdjustmentRows();
}
function renderNewViews(){renderSimple();renderFormVisual()}
function renderSimple(){
  const top=active().slice(0,3),leader=top[0];if(!leader)return;
  const insufficient=leader.relevantRuns<2||leader.raw<=0||scenario.going!=='all'&&leader.goingRuns===0;
  document.getElementById('shortlistStatus').textContent=scenarioActive()?'YOUR SCENARIO':'BASELINE FORM';
  document.getElementById('simpleVerdict').innerHTML=`<span class="verdict-icon">${insufficient?'?':'↗'}</span><div><b>${insufficient?'Too little connected evidence for a reliable pick.':`${esc(leader.display)} leads ${scenarioActive()?'under your assumptions':'on available form'}.`}</b><p>${componentCount()>1?'Separate form groups make this a provisional ranking. ':''}${insufficient?'The cards below show the highest provisional scores. ':'The strongest score is an opinion, not a guaranteed winner. '}Open a runner to see the races behind it.</p></div>`;
  const baselineRanks=new Map(baseline.filter(h=>h.eligible).map((h,i)=>[h.name,i+1]));
  document.getElementById('contenderCards').innerHTML=top.map((h,i)=>{
    const b=baseline.find(x=>x.name===h.name),delta=h.score-(b?.score??h.score),wins=M.wins(graph,h.name,race.distance),w=wins[0];
    const explanation=w?`Finished ${fmt(w.delta)}L ahead of ${display(w.other)} at ${w.edge.race.track} (${shortDate(w.edge.race.date)}).`:'Sparse connected form: the available results do not establish a clear advantage.';
    const caveat=scenario.going!=='all'?`${h.goingRuns} available ${scenario.going.toLowerCase()}-ground ${h.goingRuns===1?'start':'starts'}. ${h.goingRuns<2?'Thin evidence for this condition.':''}`:`${h.direct} field ${h.direct===1?'rival':'rivals'} met · ${h.evidence.toLowerCase()} evidence`;
    return `<article class="contender-card ${i===0?'leading':''}"><div class="contender-image">${horsePhoto(h)}<span class="contender-rank">0${i+1} <span>${i===0?'FORM LEADER':'CONTENDER'}</span></span><label class="upload-photo" title="Add your own photo for this tab session">＋ Photo<input type="file" accept="image/jpeg,image/png,image/webp" data-photo="${esc(h.name)}" aria-label="Add photo of ${esc(h.display)}"></label></div><div class="contender-body"><div class="contender-name">${silk(h,'large')}<div><span class="eyebrow">NO. ${h.number} · BARRIER ${h.barrier}</span><h4>${esc(h.display)}</h4></div><div class="contender-score">${h.runs?h.score.toFixed(1):'—'}<small>FORM RATING</small></div></div><div class="scenario-movement ${delta>.05?'up':delta<-.05?'down':''}">${scenarioActive()?`${delta>=0?'+':''}${delta.toFixed(1)} points vs baseline · was #${baselineRanks.get(h.name)||'—'}`:'Baseline · no adjustments applied'}</div><p class="contender-reason">${esc(explanation)}</p><p class="contender-caveat">${esc(caveat)}</p><button class="contender-explore" data-inspect="${esc(h.name)}">Follow the form <span>↗</span></button></div></article>`;
  }).join('');
  document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>inspectRunner(b.dataset.inspect));
  document.querySelectorAll('[data-photo]').forEach(input=>input.onchange=()=>{
    const file=input.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){input.parentElement.title='Choose a JPG, PNG or WebP photo under 8MB';return}
    if(userPhotos[input.dataset.photo])URL.revokeObjectURL(userPhotos[input.dataset.photo]);userPhotos[input.dataset.photo]=URL.createObjectURL(file);renderSimple();renderDetail();
  });
}
function renderFormVisual(){
  if(!race)return;
  document.getElementById('visualTitle').textContent=visualMode==='lanes'?'The form lanes':'Who finished ahead?';
  document.getElementById('visualDescription').textContent=visualMode==='lanes'?'See the field on one scale. Hollow markers show the baseline; silks show your scenario. These are form ratings, not predicted finishing margins.':'Read across a row to see how often that horse finished ahead of each rival. These are observed results, before your scenario adjustments. A dash means no direct meeting in the available history.';
  document.getElementById('visualKey').innerHTML=visualMode==='lanes'?'<span>○ Baseline</span><span>Silks = your scenario</span><span>Higher rating →</span>':'<span class="matrix-green">More wins</span><span class="matrix-red">More losses</span><span>W–L · direct meetings only</span>';
  if(visualMode==='matrix'){renderMatrix();return}
  const runners=active();
  document.getElementById('formVisual').innerHTML=`<div class="lanes-scale"><span>RUNNER</span><div><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div><span>RATING / CHANGE</span></div><div class="form-lanes">${runners.map((h,i)=>{
    const base=baseline.find(x=>x.name===h.name),delta=h.score-(base?.score??h.score),x=h.score,bx=base?.score??h.score;
    return `<button class="form-lane ${h.name===selected?'selected':''}" data-lane="${esc(h.name)}" aria-label="Inspect ${esc(h.display)}: rating ${h.score.toFixed(1)}, change ${delta.toFixed(1)}"><span class="lane-name"><small>${String(i+1).padStart(2,'0')}</small><b>${h.number}. ${esc(h.display)}</b></span><span class="lane-track"><i class="lane-connector ${delta<0?'negative':''}" style="left:${Math.min(x,bx)}%;width:${Math.abs(delta)}%"></i><i class="baseline-marker" style="left:${bx}%" title="Baseline ${bx.toFixed(1)}"></i><span class="scenario-marker" style="left:${x}%">${silk(h)}</span></span><span class="lane-value"><b>${h.runs?h.score.toFixed(1):'—'}</b><small class="${delta>.05?'positive':delta<-.05?'negative':''}">${scenarioActive()?`${delta>=0?'+':''}${delta.toFixed(1)}`:'—'}</small></span></button>`;
  }).join('')}</div><p class="path-note">${componentCount()>1?'Disconnected network groups are shown on the same scale for exploration; cross-group rankings remain uncertain. ':''}Scratchings and emergencies are excluded from this visual.</p>`;
  document.querySelectorAll('[data-lane]').forEach(b=>b.onclick=()=>inspectRunner(b.dataset.lane));
}
function renderMatrix(){
  const horses=active().slice().sort((a,b)=>a.number-b.number);
  document.getElementById('formVisual').innerHTML=`<div class="matrix-scroll"><table class="h2h-matrix"><thead><tr><th>ROW HORSE ↓ / RIVAL →</th>${horses.map(h=>`<th title="${esc(h.display)}">${silk(h)}<span>${h.number}</span></th>`).join('')}</tr></thead><tbody>${horses.map(h=>`<tr><th><button data-matrix-runner="${esc(h.name)}">${silk(h)}<span>${h.number}. ${esc(h.display)}</span></button></th>${horses.map(o=>{
    if(h.name===o.name)return '<td class="matrix-self">·</td>';
    const edges=graph.adjacency.get(h.name)?.get(o.name)||[],wins=edges.filter(e=>(e.a===h.name?e.delta:-e.delta)>0).length,losses=edges.filter(e=>(e.a===h.name?e.delta:-e.delta)<0).length,ties=edges.length-wins-losses;
    return `<td><button data-match-a="${esc(h.name)}" data-match-b="${esc(o.name)}" class="matrix-cell ${!edges.length?'empty':wins>losses?'win':wins<losses?'loss':'even'}" aria-label="${esc(h.display)} versus ${esc(o.display)}: ${edges.length?`${wins} ahead, ${losses} behind, ${ties} level`:'no direct meeting'}" title="${edges.length?`${edges.length} shared races${ties?`, ${ties} level`:''}`:'No direct meeting'}">${edges.length?`${wins}–${losses}`:'—'}</button></td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
  document.querySelectorAll('[data-matrix-runner]').forEach(b=>b.onclick=()=>inspectRunner(b.dataset.matrixRunner));
  document.querySelectorAll('[data-match-a]').forEach(b=>b.onclick=()=>{setExperience('explore');document.getElementById('horseA').value=b.dataset.matchA;document.getElementById('horseB').value=b.dataset.matchB;selected=b.dataset.matchA;renderDetail();renderRankings();renderPath();document.getElementById('pathResult').scrollIntoView?.({behavior:'smooth',block:'center'})});
}
document.getElementById('simpleMode').onclick=()=>setExperience('simple');document.getElementById('exploreMode').onclick=()=>setExperience('explore');
for(const [id,key] of [['goingInput','going'],['drawInput','drawBias'],['trackInput','preferTrack'],['handicapInput','handicap'],['kgInput','kgFactor']])document.getElementById(id).onchange=e=>{
  const el=e.target;scenario[key]=el.type==='checkbox'?el.checked:['drawBias','kgFactor'].includes(key)?Number(el.value):el.value;document.getElementById('kgOutput').textContent=Number(scenario.kgFactor).toFixed(2)+'L / kg';applyScenario();
};
document.getElementById('resetScenario').onclick=()=>{scenario=defaults();saveScenario();renderScenarioControls();applyScenario()};
for(const [id,value] of [['lanesView','lanes'],['matrixView','matrix']])document.getElementById(id).onclick=()=>{visualMode=value;document.getElementById('lanesView').classList.toggle('active',value==='lanes');document.getElementById('matrixView').classList.toggle('active',value==='matrix');renderFormVisual()};
