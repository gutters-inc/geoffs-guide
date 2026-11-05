let media={},baseline=[],experience='form';
function silk(h,size=''){
 const i=race.horses.findIndex(x=>x.name===h.name);return i<0?'':`<span class="race-silk ${size}" role="img" aria-label="${esc(h.display)} silks" style="--sprite:url('assets/silks-r${race.number}.png');--silk-x:${i};--silk-count:${race.horses.length}"></span>`;
}
function horsePhoto(h,variant='card'){
 const p=media[h.name];if(!p)return '<p class="photo-note">Verified photo unavailable</p>';return `<figure class="horse-photo ${variant} ${p?'':'no-photo'}">${p?`<img src="${esc(p.src)}" alt="${esc(h.display)}" loading="lazy" onerror="this.hidden=true;this.parentElement.classList.add('photo-failed')"><figcaption><a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.credit)} ↗</a></figcaption>`:`<div class="photo-placeholder">${silk(h,'hero')}<span>Horse photo unavailable</span></div>`}<span class="image-error">Photo unavailable</span></figure>`;
}
function currentRunner(h){return lateMail?.meeting?.races.find(r=>r.number===race.number)?.runners.find(r=>r.number===h.number)}
function shortSentiment(h){const {first,other}=runnerSentiment(h),current=currentRunner(h);if(current?.scratched&&!h.scratched)return '<p class="short-sentiment late-scratch">Late scratching · see Late mail</p>';return `<p class="short-sentiment">${first.length?`${first.length} ${first.length===1?'guide pick':'guide picks'}${other.length?` · ${other.length} mentions`:''}`:other.length?`${other.length} guide mentions`:'No guide picks in this sample'}</p>`}
function selectionConfidence(h,{live=false,checked=null}={}){
 if(!h)return {level:'withheld',label:'No confident selection',reason:'Too little evidence for a firm pick.'};
 if(live&&(!checked||Date.now()-Date.parse(checked)>7200000||!Number.isFinite(Date.parse(checked))))return {level:'low',label:'Low confidence',reason:'Current race information needs a fresh check.'};
 if(h.evidence==='Supported')return {level:'moderate',label:'Moderate confidence',reason:'Several recent, connected runs support this view.'};
 return {level:'low',label:'Low confidence',reason:h.evidence==='Sparse'?'Sparse recent or matching-condition evidence.':'Some supporting form; the evidence is limited.'};
}
function confidenceMarkup(h,options){const c=selectionConfidence(h,options);return `<div class="selection-confidence ${c.level}"><span><i aria-hidden="true"></i>${c.label}</span><small>${c.reason} Evidence strength, not win probability.</small></div>`}
function renderSimple(){
 const top=baseline.filter(h=>h.eligible).slice(0,3),leader=top[0];document.getElementById('shortlistStatus').textContent='ORIGINAL FORM';
 document.getElementById('simpleVerdict').innerHTML=leader?`<p>${leader.relevantRuns<2||leader.raw<=0?'Provisional shortlist · thin evidence':new Set(baseline.filter(h=>h.eligible).map(h=>h.component)).size>1?'Provisional order · separate form groups':'Ranked on original race history'}</p>`:'<p>No eligible runners in the original snapshot.</p>';
 document.getElementById('contenderCards').innerHTML=top.map((h,i)=>{const w=M.wins(graph,h.name,race.distance)[0],reason=w?`${fmt(w.delta)}L ahead of ${display(w.other)} at ${w.edge.race.track}.`:'Too little connected form for a firm call.';return `<article class="contender-card">${media[h.name]?`<div class="contender-image">${horsePhoto(h)}<span class="contender-rank">${i+1}<span> ORIGINAL FORM</span></span></div>`:''}<div class="contender-body"><div class="contender-name"><span class="rank-flag">${i+1}</span>${silk(h,'large')}<div><span class="eyebrow">NO. ${h.number}</span><h4>${esc(h.display)}</h4></div></div><p class="contender-reason">${esc(reason)}</p>${confidenceMarkup(h)}${shortSentiment(h)}<button class="contender-explore" data-inspect="${esc(h.name)}" aria-label="View ${esc(h.display)}">View runner <span>↗</span></button></div></article>`}).join('');document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>inspectRunner(b.dataset.inspect));
}
