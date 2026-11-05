let editorial=null;
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
  return `<div class="tip-context"><p>${esc(why||'No supporting explanation published in this sample.')}</p><details class="tip-assumptions"><summary>Track &amp; run assumptions <span>+</span></summary><dl><dt>Track assumption</dt><dd>${esc(note.ground||s.meetingGround||'Not stated in this guide.')}</dd><dt>Run / position</dt><dd>${esc(note.run||'Not stated in this guide.')}</dd></dl><small>As published; check Late mail for changes.</small></details></div>`;
}
function renderTipSummary(){
  if(!race||!editorial)return;
  const guides=editorial.sources.filter(hasRace),votes=new Map();
  for(const s of guides){const h=activeTip(s);if(h){if(!votes.has(h.name))votes.set(h.name,[]);votes.get(h.name).push(s)}}
  const ordered=[...votes].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]));
  document.getElementById('tipsRoundup').innerHTML=ordered.length?`<div class="tip-vote-list">${ordered.map(([name,sources])=>{
    const h=findRunner(name);
    return `<article class="tip-vote"><div class="vote-horse">${silk(h)}<div><b>${h.number}. ${esc(h.display)}</b><span>${sources.length} ${sources.length===1?'guide':'guides'}</span></div><strong>${sources.length}</strong></div><div class="vote-track"><i style="width:${sources.length/Math.max(...ordered.map(x=>x[1].length))*100}%"></i></div><p>${sources.map(s=>esc(s.name)).join(' · ')}</p></article>`;
  }).join('')}</div>`:'<p class="tips-empty">No active first selections in this source sample. “No bet” and excluded runners are shown below.</p>';

}
function renderTips(){
  if(!race)return;
  if(!editorial?.sources){document.getElementById('guideCards').innerHTML='<p class="tips-empty">Published guides are unavailable right now. The form views still work.</p>';return}
  const sources=editorial.sources;
  const total=sources.reduce((n,s)=>n+Object.values(s.picks||{}).filter(Boolean).length,0),covering=sources.filter(hasRace);
  document.getElementById('tipsCoverage').innerHTML=`<span>${covering.length} published guides for this race</span>`;
  const visible=covering;
  document.getElementById('guideCards').innerHTML=visible.map(s=>{
    const covers=hasRace(s),pick=covers?s.picks[String(race.number)]:undefined,h=pick?findRunner(pick):null,excluded=h&&(h.scratched||h.emergency);
    let title=!covers?'No published pick for this race':pick===null?'No bet · Sitting this one out':h?`${h.number}. ${h.display}`:M.title(pick);
    const extra=s.rankings?.[String(race.number)]||s.alternatives?.[String(race.number)]||[];
    return `<article class="guide-card"><header><span class="guide-avatar">${esc(s.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</span><div><b>${esc(s.name)}</b><span>${esc(s.outlet)}</span></div></header><p class="guide-profile">${esc(s.profile||'Published racing column')} · ${esc(guideDate(s))}</p><div class="guide-pick ${excluded?'excluded-pick':''}">${h?silk(h,'large'):pick===null?'<span class="no-bet-icon">Ⅱ</span>':''}<b>${esc(title)}</b></div>${excluded?`<p class="excluded-note">${h.scratched?'Scratched':'Emergency'} · excluded from the tally and active tips.</p>`:''}${s.conditional?.[String(race.number)]?`<p class="guide-note">${esc(s.conditional[String(race.number)])}</p>`:''}${tipContext(s,pick)}${extra.length||s.quote&&s.quoteRace===race.number||s.note?`<details class="guide-more"><summary>More from this guide <span>+</span></summary>${extra.length?`<p class="guide-order-label">${s.rankings?.[String(race.number)]?'Published selection order':'Other published mentions · not a ranked list'}</p><ol class="guide-mentions ${s.rankings?.[String(race.number)]?'ordered':'unranked'}">${extra.map(n=>{const runner=findRunner(n);return `<li class="${runner?.scratched||runner?.emergency?'excluded-mention':''}">${esc(runner?.display||M.title(n))}${runner?.scratched?' · scratched':runner?.emergency?' · emergency':''}</li>`}).join('')}</ol>`:''}${s.quote&&s.quoteRace===race.number?`<figure class="guide-quote"><blockquote>“${esc(s.quote)}”</blockquote><figcaption>${esc(s.quoteType||'Published column')}</figcaption></figure>`:''}${s.note?`<p class="guide-note">${esc(s.note)}</p>`:''}</details>`:''}<a class="guide-source" href="${esc(guideURL(s))}" target="_blank" rel="noopener">Original guide ↗</a></article>`;
  }).join('')||'<p class="tips-empty">No published tips for this race in the current guide sample.</p>';
  document.getElementById('tipsResearchDate').textContent='Research checked '+new Date(editorial.checked).toLocaleString('en-AU',{timeZone:'Australia/Melbourne',dateStyle:'medium',timeStyle:'short'})+' Melbourne time. Selections are dated snapshots.';
  document.getElementById('tipsSourceNote').textContent=editorial.coverageNote;
  document.getElementById('socialCoverage').textContent=editorial.socialNote;
  renderTipSummary();
}
