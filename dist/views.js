let media={},baseline=[],experience='form',userPhotos={};
const defaults=()=>({going:'all',groundStrength:.7,preferTrack:false,handicap:false,kgFactor:.5,drawBias:0,overrides:{}});
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
function renderSimple(){
  const top=active().slice(0,3),leader=top[0];if(!leader)return;
  const insufficient=leader.relevantRuns<2||leader.raw<=0||scenario.going!=='all'&&scenario.groundStrength>0&&leader.goingRuns===0;
  document.getElementById('shortlistStatus').textContent=scenarioActive()?'YOUR SCENARIO':'BASELINE FORM';
  document.getElementById('simpleVerdict').innerHTML=`<span class="verdict-icon">${insufficient?'?':'↗'}</span><div><b>${insufficient?'Too little connected evidence for a reliable pick.':`${esc(leader.display)} leads ${scenarioActive()?'under your assumptions':'on available form'}.`}</b><p>${componentCount()>1?'Separate form groups make this a provisional ranking. ':''}${insufficient?'The cards below show the highest provisional scores. ':'The strongest score is an opinion, not a guaranteed winner. '}Open a runner to see the races behind it.</p></div>`;
  const baselineRanks=new Map(baseline.filter(h=>h.eligible).map((h,i)=>[h.name,i+1]));
  document.getElementById('contenderCards').innerHTML=top.map((h,i)=>{
    const b=baseline.find(x=>x.name===h.name),delta=h.score-(b?.score??h.score),wins=M.wins(graph,h.name,race.distance),w=wins[0];
    const explanation=w?`Finished ${fmt(w.delta)}L ahead of ${display(w.other)} at ${w.edge.race.track} (${shortDate(w.edge.race.date)}).`:'Sparse connected form: the available results do not establish a clear advantage.';
    const caveat=scenario.going!=='all'?`${h.goingRuns} available ${scenario.going.toLowerCase()}-ground ${h.goingRuns===1?'start':'starts'}. ${h.goingRuns<2?'Thin evidence for this condition.':''}`:`${h.direct} field ${h.direct===1?'rival':'rivals'} met · ${h.evidence.toLowerCase()} evidence`;
    return `<article class="contender-card ${i===0?'leading':''}"><div class="contender-image">${horsePhoto(h)}<span class="contender-rank">0${i+1} <span>${i===0?'FORM LEADER':'CONTENDER'}</span></span><label class="upload-photo" title="Add your own photo for this tab session">＋ Photo<input type="file" accept="image/jpeg,image/png,image/webp" data-photo="${esc(h.name)}" aria-label="Add photo of ${esc(h.display)}"></label></div><div class="contender-body"><div class="contender-name">${silk(h,'large')}<div><span class="eyebrow">NO. ${h.number} · BARRIER ${h.barrier}</span><h4>${esc(h.display)}</h4></div><div class="contender-score">${h.runs?h.score.toFixed(1):'—'}<small>FORM RATING</small></div></div><div class="scenario-movement ${delta>.05?'up':delta<-.05?'down':''}">${scenarioActive()?`${signedChange(delta)} points vs baseline · was #${baselineRanks.get(h.name)||'—'}`:'Baseline · no adjustments applied'}</div><p class="contender-reason">${esc(explanation)}</p><p class="contender-caveat">${esc(caveat)}</p><button class="contender-explore" data-inspect="${esc(h.name)}">Runner details <span>↗</span></button><button class="card-trace" data-trace="${esc(h.name)}">See connections →</button></div></article>`;
  }).join('');
  document.querySelectorAll('[data-trace]').forEach(b=>b.onclick=()=>traceHorse(b.dataset.trace));
  document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>inspectRunner(b.dataset.inspect));
  document.querySelectorAll('[data-photo]').forEach(input=>input.onchange=()=>{
    const file=input.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){input.parentElement.title='Choose a JPG, PNG or WebP photo under 8MB';return}
    if(userPhotos[input.dataset.photo])URL.revokeObjectURL(userPhotos[input.dataset.photo]);userPhotos[input.dataset.photo]=URL.createObjectURL(file);renderSimple();renderDetail();
  });
}
function renderMatrix(){
  const horses=active().slice().sort((a,b)=>a.number-b.number);
  document.getElementById('matrixVisual').innerHTML=`<div class="matrix-scroll"><table class="h2h-matrix"><thead><tr><th>ROW HORSE ↓ / RIVAL →</th>${horses.map(h=>`<th title="${esc(h.display)}">${silk(h)}<span>${h.number}</span></th>`).join('')}</tr></thead><tbody>${horses.map(h=>`<tr><th><button data-matrix-runner="${esc(h.name)}">${silk(h)}<span>${h.number}. ${esc(h.display)}</span></button></th>${horses.map(o=>{
    if(h.name===o.name)return '<td class="matrix-self">·</td>';
    const edges=graph.adjacency.get(h.name)?.get(o.name)||[],wins=edges.filter(e=>(e.a===h.name?e.delta:-e.delta)>0).length,losses=edges.filter(e=>(e.a===h.name?e.delta:-e.delta)<0).length,ties=edges.length-wins-losses;
    return `<td><button data-match-a="${esc(h.name)}" data-match-b="${esc(o.name)}" class="matrix-cell ${!edges.length?'empty':wins>losses?'win':wins<losses?'loss':'even'}" aria-label="${esc(h.display)} versus ${esc(o.display)}: ${edges.length?`${wins} ahead, ${losses} behind, ${ties} level`:'no direct meeting'}" title="${edges.length?`${edges.length} shared races${ties?`, ${ties} level`:''}`:'No direct meeting'}">${edges.length?`${wins}–${losses}`:'—'}</button></td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
  document.querySelectorAll('[data-matrix-runner]').forEach(b=>b.onclick=()=>inspectRunner(b.dataset.matrixRunner));
  document.querySelectorAll('[data-match-a]').forEach(b=>b.onclick=()=>{setExperience('connections');document.getElementById('horseA').value=b.dataset.matchA;document.getElementById('horseB').value=b.dataset.matchB;selected=b.dataset.matchA;renderDetail();renderRankings();renderPath();document.getElementById('pathResult').scrollIntoView?.({behavior:'smooth',block:'center'})});
}
