let editorial=null,trustedSource='',showTrustedOnly=false;
try{trustedSource=localStorage.getItem('geoffs-trusted-guide-v1')||''}catch{}
const horseKey=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const findRunner=n=>race.horses.find(h=>horseKey(h.name)===horseKey(n));
const hasRace=s=>Object.prototype.hasOwnProperty.call(s.picks||{},String(race.number));
const guideURL=s=>s.perRaceSource?race.source:s.sourceUrls?.[String(race.number)]||s.url;
const guideDate=s=>s.sourceDates?.[String(race.number)]||s.date;
const activeTip=s=>{const h=findRunner(s.picks?.[String(race.number)]);return h&&!h.scratched&&!h.emergency?h:null};
function runnerSentiment(h){
  const sources=(editorial?.sources||[]).filter(hasRace),first=[],other=[];
  for(const source of sources){
    if(horseKey(source.picks?.[String(race.number)])===horseKey(h.name))first.push(source);
    else if([...(source.rankings?.[String(race.number)]||[]),...(source.alternatives?.[String(race.number)]||[])].some(n=>horseKey(n)===horseKey(h.name)))other.push(source);
  }
  return {first,other,total:sources.length};
}
function sentimentHTML(h){
  const {first,other,total}=runnerSentiment(h),excluded=h.scratched||h.emergency;
  const title=first.length?`${first.length} first ${first.length===1?'pick':'picks'}${other.length?` · ${other.length} other mentions`:''}`:other.length?`${other.length} other ${other.length===1?'mention':'mentions'} · no first picks`:'No published selection in this sample';
  const lead=first.find(s=>s.tipNotes?.[String(race.number)]?.why||s.rationale?.[String(race.number)]),note=lead?.tipNotes?.[String(race.number)],reason=note?.why||lead?.rationale?.[String(race.number)];
  const names=first.length?first.map(s=>s.name).join(' · '):other.map(s=>s.name).join(' · ');
  return `<div class="runner-sentiment"><span>GUIDE SENTIMENT · ${total} GUIDES</span><b>${esc(title)}</b>${names?`<p>${esc(names)}</p>`:''}${reason?`<p class="sentiment-case"><a href="${esc(guideURL(lead))}" target="_blank" rel="noopener">${esc(lead.name)} ↗</a>: ${esc(reason)}${note?.run?` Run: ${esc(note.run)}`:''}</p>`:''}<small>${excluded?'Published mentions only; excluded from active tips.':first.length?'First-choice support in this sample; not a win forecast.':other.length?'Included as an alternative or ordered selection.':'No mention does not mean a negative view.'}</small></div>`;
}
function tipContext(s,pick){
  if(!hasRace(s))return '';
  if(pick===null)return '<div class="tip-context"><b>The call</b><p>No bet. This is an abstention, not a tip against any runner.</p></div>';
  const note=s.tipNotes?.[String(race.number)]||{},why=note.why||s.rationale?.[String(race.number)];
  return `<div class="tip-context"><b>Why this tip</b><p>${esc(why||'Selection published without a supporting explanation in our sample.')}</p><dl><dt>Track assumption</dt><dd>${esc(note.ground||s.meetingGround||'Not stated in this guide.')}</dd><dt>Run / position</dt><dd>${esc(note.run||'Not stated in this guide.')}</dd></dl><small>Author’s view when published; not confirmed race-day conditions.</small></div>`;
}
function chooseTrusted(id){
  trustedSource=trustedSource===id?'':id;if(!trustedSource)showTrustedOnly=false;
  try{localStorage.setItem('geoffs-trusted-guide-v1',trustedSource)}catch{}
  renderTips();document.querySelector(`[data-trust="${id}"]`)?.focus?.();
}
function renderTipSummary(){
  if(!race||!editorial)return;
  const guides=editorial.sources.filter(hasRace),votes=new Map();
  for(const s of guides){const h=activeTip(s);if(h){if(!votes.has(h.name))votes.set(h.name,[]);votes.get(h.name).push(s)}}
  const ordered=[...votes].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]));
  document.getElementById('tipsRoundup').innerHTML=ordered.length?`<div class="tip-vote-list">${ordered.map(([name,sources])=>{
    const h=findRunner(name),trusted=sources.some(s=>s.id===trustedSource);
    return `<article class="tip-vote ${trusted?'trusted-vote':''}"><div class="vote-horse">${silk(h)}<div><b>${h.number}. ${esc(h.display)}</b><span>${sources.length} ${sources.length===1?'guide':'guides'}${trusted?' · Your go-to is here':''}</span></div><strong>${sources.length}</strong></div><div class="vote-track"><i style="width:${sources.length/Math.max(...ordered.map(x=>x[1].length))*100}%"></i></div><p>${sources.map(s=>esc(s.name)).join(' · ')}</p></article>`;
  }).join('')}</div>`:'<p class="tips-empty">No active first selections in this source sample. “No bet” and excluded runners are shown below.</p>';
  const chosen=editorial.sources.find(s=>s.id===trustedSource);
  const pinned=document.getElementById('trustedPick');
  if(!chosen){pinned.innerHTML='<div class="trust-prompt">Your call, Geoff. Pick a guide above—or tap “Make my go-to” on a card below.</div>';return}
  const h=activeTip(chosen),published=findRunner(chosen.picks?.[String(race.number)]);
  pinned.innerHTML=`<div class="pinned-guide"><span>YOUR GO-TO · ${esc(chosen.name)}</span>${h?`<div>${silk(h,'large')}<b>${h.number}. ${esc(h.display)}</b></div>`:hasRace(chosen)&&chosen.picks[String(race.number)]===null?'<b>Sitting this race out · No bet</b>':published?`<b>${esc(published.display)} is ${published.scratched?'scratched':'an emergency'}.</b><p>The published tip is excluded. No substitute is assumed.</p>`:'<b>No published tip for this race in our sample.</b>'}<a href="${esc(guideURL(chosen))}" target="_blank" rel="noopener">Read their guide ↗</a></div>`;
}
function renderTips(){
  if(!race)return;
  if(!editorial?.sources){document.getElementById('guideCards').innerHTML='<p class="tips-empty">Published guides are unavailable right now. The form views still work.</p>';return}
  const sources=editorial.sources;
  if(trustedSource&&!sources.some(s=>s.id===trustedSource))trustedSource='';
  const total=sources.reduce((n,s)=>n+Object.values(s.picks||{}).filter(Boolean).length,0),covering=sources.filter(hasRace);
  document.getElementById('tipsCoverage').innerHTML=`<span>${sources.length} guide identities</span><span>${total} published lead selections</span><span>${covering.length} cover this race</span>`;
  document.getElementById('trustedGuide').innerHTML='<option value="">I’m still deciding…</option>'+sources.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.outlet)} · ${Object.keys(s.picks).length} ${Object.keys(s.picks).length===1?'race':'races'}</option>`).join('');
  document.getElementById('trustedGuide').value=trustedSource;
  const filter=document.getElementById('trustedOnly');filter.disabled=!trustedSource;filter.setAttribute('aria-pressed',String(showTrustedOnly));filter.textContent=showTrustedOnly?'Show all guides':'My go-to only';
  const visible=showTrustedOnly?sources.filter(s=>s.id===trustedSource):covering.slice().sort((a,b)=>Number(b.id===trustedSource)-Number(a.id===trustedSource));
  document.getElementById('guideCards').innerHTML=visible.map(s=>{
    const covers=hasRace(s),pick=covers?s.picks[String(race.number)]:undefined,h=pick?findRunner(pick):null,isTrusted=s.id===trustedSource,excluded=h&&(h.scratched||h.emergency);
    let title=!covers?'No published pick for this race':pick===null?'No bet · Sitting this one out':h?`${h.number}. ${h.display}`:M.title(pick);
    const extra=s.rankings?.[String(race.number)]||s.alternatives?.[String(race.number)]||[];
    return `<article class="guide-card ${isTrusted?'chosen-guide':''}"><header><span class="guide-avatar">${esc(s.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</span><div><b>${esc(s.name)}</b><span>${esc(s.outlet)}</span></div>${isTrusted?'<em>Your go-to</em>':''}</header><p class="guide-profile">${esc(s.profile||'Published racing column')} · ${esc(guideDate(s))}</p><div class="guide-pick ${excluded?'excluded-pick':''}">${h?silk(h,'large'):pick===null?'<span class="no-bet-icon">Ⅱ</span>':''}<b>${esc(title)}</b></div>${excluded?`<p class="excluded-note">${h.scratched?'Scratched':'Emergency'} · excluded from the tally and active tips.</p>`:''}${s.conditional?.[String(race.number)]?`<p class="guide-note">${esc(s.conditional[String(race.number)])}</p>`:''}${tipContext(s,pick)}<button class="trust-button" data-trust="${esc(s.id)}" aria-pressed="${isTrusted}">${isTrusted?'✓ My go-to · tap to clear':'Make my go-to'}<span>↗</span></button>${extra.length||s.quote&&s.quoteRace===race.number||s.note?`<details class="guide-more"><summary>More from this guide <span>+</span></summary>${extra.length?`<p class="guide-order-label">${s.rankings?.[String(race.number)]?'Published selection order':'Other published mentions · not a ranked list'}</p><ol class="guide-mentions ${s.rankings?.[String(race.number)]?'ordered':'unranked'}">${extra.map(n=>{const runner=findRunner(n);return `<li class="${runner?.scratched||runner?.emergency?'excluded-mention':''}">${esc(runner?.display||M.title(n))}${runner?.scratched?' · scratched':runner?.emergency?' · emergency':''}</li>`}).join('')}</ol>`:''}${s.quote&&s.quoteRace===race.number?`<figure class="guide-quote"><blockquote>“${esc(s.quote)}”</blockquote><figcaption>${esc(s.quoteType||'Published column')}</figcaption></figure>`:''}${s.note?`<p class="guide-note">${esc(s.note)}</p>`:''}</details>`:''}<a class="guide-source" href="${esc(guideURL(s))}" target="_blank" rel="noopener">Original guide ↗</a></article>`;
  }).join('')||'<p class="tips-empty">Your chosen guide does not cover this race. Switch off “My go-to only” to compare the other guides.</p>';
  document.querySelectorAll('[data-trust]').forEach(b=>b.onclick=()=>chooseTrusted(b.dataset.trust));
  document.getElementById('tipsResearchDate').textContent='Research checked '+new Date(editorial.checked).toLocaleString('en-AU',{timeZone:'Australia/Melbourne',dateStyle:'medium',timeStyle:'short'})+' Melbourne time. Selections are dated snapshots.';
  document.getElementById('tipsSourceNote').textContent=editorial.coverageNote;
  document.getElementById('socialCoverage').textContent=editorial.socialNote;
  renderTipSummary();renderOffers();
}
document.getElementById('trustedGuide').onchange=e=>{trustedSource=e.target.value;showTrustedOnly=false;try{localStorage.setItem('geoffs-trusted-guide-v1',trustedSource)}catch{}renderTips()};
document.getElementById('trustedOnly').onclick=()=>{if(trustedSource){showTrustedOnly=!showTrustedOnly;renderTips()}};
function renderOffers(){
  document.getElementById('offerStatus').textContent=editorial?.offerNote||'No verified offer research available.';
  document.getElementById('offerCards').innerHTML=(editorial?.offers||[]).map(o=>`<article class="offer-card"><div class="offer-header"><span>${esc(o.book)}</span><small>${esc(o.kind)}</small></div><h4>${esc(o.name)}</h4><span class="offer-badge">${esc(o.status)}</span><p>${esc(o.summary)}</p><details><summary>Eligibility, limits &amp; expiry <span>+</span></summary><ul>${o.terms.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><a href="${esc(o.source)}" target="_blank" rel="noopener">Official terms ↗</a></details><a class="offer-check" href="${esc(o.destination)}" target="_blank" rel="noopener">Check your own offers ↗</a></article>`).join('');
  document.getElementById('otherBookmakers').innerHTML=`<div class="value-small">Ladbrokes and Neds: no current Oaks-specific terms verified. ${(editorial?.otherBooks||[]).map(b=>`<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.name)} ↗</a>`).join(' · ')}</div>`;
  updateRegion();
}
function updateRegion(){const region=document.getElementById('offerRegion').value;document.getElementById('regionNote').textContent=region==='Outside Australia'?'These are Australian product references. Availability and legality in your location have not been verified.':`${region} · availability still depends on your bookmaker account and offer terms. No promotion is confirmed as allocated to you.`}
document.getElementById('offerRegion').onchange=updateRegion;
