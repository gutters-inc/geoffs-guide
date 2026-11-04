let editorial=null,valueEstimates={};
try{const saved=JSON.parse(localStorage.getItem('geoffs-value-v1')||'{}');if(saved&&typeof saved==='object')valueEstimates=saved}catch{}
const horseKey=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const findRunner=n=>race.horses.find(h=>horseKey(h.name)===horseKey(n));
const sourceById=id=>editorial?.sources?.find(s=>s.id===id);
const money=n=>Number.isFinite(n)?'$'+n.toFixed(2):'No price';
function snapshotTime(){return new Date(race.oddsTimestamp||data.retrieved).toLocaleString('en-AU',{timeZone:'Australia/Melbourne',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})+' AEDT'}
function valueMath(odds,chance){
  if(!Number.isFinite(odds)||odds<=1||odds>1001||!Number.isFinite(chance)||chance<=0||chance>=100)return null;
  const p=chance/100;return {fairOdds:1/p,breakEven:100/odds,roi:(p*odds-1)*100};
}
function renderValueSummary(){
  if(!race)return;const leader=active()[0],market=active().filter(h=>h.odds>1).sort((a,b)=>a.odds-b.odds)[0];
  document.getElementById('valueRaceSummary').innerHTML=`<div class="value-summary-grid"><div><span>FORM LEADER${scenarioActive()?' · YOUR SCENARIO':''}</span><b>${esc(leader?.display||'No leader')}</b><small>${leader?.score.toFixed(1)||'—'} form rating · not a win chance</small></div><div><span>SHORTEST TABTOUCH PRICE</span><b>${esc(market?.display||'Unavailable')}</b><small>${market?money(market.odds)+' · '+(100/market.odds).toFixed(1)+'% break-even':'Check the bookmaker’s current market'}</small></div></div><p class="value-small">TABtouch win-price snapshot: ${esc(snapshotTime())}. <a href="${esc(race.source)}" target="_blank" rel="noopener">Check current form &amp; prices ↗</a></p>`;
}
function renderValue(){
  if(!race)return;renderValueSummary();
  document.getElementById('editorialChecked').textContent=editorial?`Research checked ${new Date(editorial.checked).toLocaleString('en-AU',{timeZone:'Australia/Melbourne',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})} AEDT · snapshots, not live feeds`:'Research unavailable. The price calculator still works with your own inputs.';
  document.getElementById('valueHorse').innerHTML=active().map(h=>`<option value="${esc(h.name)}">${h.number}. ${esc(h.display)}</option>`).join('');
  const featured=editorial?.watchlist?.find(w=>w.race===race.number&&findRunner(w.horse)&&!findRunner(w.horse).scratched&&!findRunner(w.horse).emergency);
  document.getElementById('valueHorse').value=featured?findRunner(featured.horse).name:active()[0]?.name||'';
  loadValueInputs();renderWatchlist();renderPublishedTips();renderOffers();
}
function loadValueInputs(){
  const h=findRunner(document.getElementById('valueHorse').value);if(!h)return;
  const saved=valueEstimates[h.name]||{};
  document.getElementById('offeredOdds').value=Number.isFinite(saved.odds)?String(saved.odds):h.odds?String(h.odds):'';
  document.getElementById('fairChance').value=Number.isFinite(saved.chance)?String(saved.chance):'';
  document.getElementById('chanceSlider').value=String(Number.isFinite(saved.chance)?saved.chance:h.odds?Math.max(.5,Math.min(99.5,100/h.odds)):25);
  document.getElementById('oddsHint').textContent=Number.isFinite(saved.odds)?'Your entered price. Update it to match the offer you actually see.':h.odds?`Prefilled from TABtouch: ${money(h.odds)} at ${snapshotTime()}. Replace it with your actual price.`:'No usable price in the snapshot. Enter the decimal odds you actually see.';
  calculateValue(false);
}
function calculateValue(save=true){
  const oddsInput=document.getElementById('offeredOdds'),chanceInput=document.getElementById('fairChance'),odds=Number(oddsInput.value),chance=Number(chanceInput.value);
  const result=document.getElementById('valueCalculation');
  oddsInput.removeAttribute('aria-invalid');chanceInput.removeAttribute('aria-invalid');
  if(chanceInput.value.trim()===''){
    result.innerHTML=`<div class="value-assessment neutral"><span>NO ASSESSMENT YET</span><h4>What chance do you give this horse?</h4><p>${odds>1?`${money(odds)} needs a win chance above ${(100/odds).toFixed(1)}% to offer positive expected value.`:'Enter an offered price, then your own win chance.'}</p><small>No win probability is inferred from the guide’s rating.</small></div>`;return;
  }
  const math=valueMath(odds,chance);
  oddsInput.setAttribute('aria-invalid',String(!Number.isFinite(odds)||odds<=1||odds>1001));chanceInput.setAttribute('aria-invalid',String(!Number.isFinite(chance)||chance<=0||chance>=100));
  if(!math){result.innerHTML='<div class="value-assessment neutral"><h4>Check your inputs</h4><p>Enter decimal odds above 1 and up to 1001, and a win chance above 0% and below 100%.</p></div>';return}
  if(save){valueEstimates[document.getElementById('valueHorse').value]={odds,chance};try{localStorage.setItem('geoffs-value-v1',JSON.stringify(valueEstimates))}catch{}}
  const positive=math.roi>.05,negative=math.roi<-.05;
  result.innerHTML=`<div class="value-assessment ${positive?'has-edge':negative?'no-edge':'neutral'}"><span>UNDER YOUR ${chance.toFixed(1)}% ESTIMATE</span><h4>${positive?'Value at this price':negative?'The price is too short':'At your fair price'}</h4><div class="value-math-grid"><div><small>Your fair odds</small><b>${money(math.fairOdds)}</b></div><div><small>Offered odds</small><b>${money(odds)}</b></div><div><small>Expected return / $1</small><b>${math.roi>=0?'+':'−'}${Math.abs(math.roi/100).toFixed(3)}</b></div><div><small>Expected ROI</small><b>${math.roi>=0?'+':''}${math.roi.toFixed(1)}%</b></div></div><p>Market break-even: ${math.breakEven.toFixed(1)}%. ${positive?'The offered odds exceed your assessed fair odds.':'You need a better price or a higher justified win chance.'}</p><small>This is a calculation from your opinion, not a calibrated forecast or a guaranteed return.</small></div>`;
}
function renderWatchlist(){
  const ideas=editorial?.watchlist?.filter(w=>w.race===race.number)||[];
  document.getElementById('watchCards').innerHTML=ideas.length?ideas.map(w=>{
    const h=findRunner(w.horse),s=sourceById(w.source),excluded=!h||h.scratched||h.emergency;
    return `<article class="watch-card ${excluded?'excluded':''}"><div class="watch-top"><span>${esc(w.type)}</span><b>${h?.odds&&!excluded?money(h.odds):'Check price'}</b></div><div class="watch-runner">${h?silk(h,'large'):''}<h4>${esc(h?.display||M.title(w.horse))}</h4></div><p>${esc(w.reason)}</p><small>Published reference: ${money(w.quotedOdds)} · ${esc(s?.name||'Published source')}. This is not a current best-price comparison.</small>${excluded?'<p class="excluded-note">Excluded: scratched, emergency or absent from this field snapshot.</p>':`<button data-test-price="${esc(h.name)}">Test this price against your view <span>↗</span></button>`}<a href="${esc(s?.url||race.source)}" target="_blank" rel="noopener">Read the published case ↗</a></article>`;
  }).join(''):'<div class="value-empty">No dedicated value selection verified for this race. Choose any runner in the calculator; don’t force a bet because it has a big price.</div>';
  document.querySelectorAll('[data-test-price]').forEach(b=>b.onclick=()=>{document.getElementById('valueHorse').value=b.dataset.testPrice;loadValueInputs();document.getElementById('priceCheck').scrollIntoView?.({behavior:'smooth',block:'start'});document.getElementById('fairChance').focus?.()});
}
function renderPublishedTips(){
  const sources=editorial?.sources||[],relevant=sources.filter(s=>s.picks[String(race.number)]),counts=new Map();
  for(const s of relevant){const h=findRunner(s.picks[String(race.number)]);if(h&&!h.scratched&&!h.emergency)counts.set(h.name,(counts.get(h.name)||0)+1)}
  const consensus=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
  document.getElementById('tipConsensus').innerHTML=consensus.length?`<div class="tip-consensus">${consensus.map(([n,count])=>`<span><b>${esc(display(n))}</b> ${count} ${count===1?'column':'columns'}</span>`).join('')}<small>Active selections only; this is source agreement, not a win probability.</small></div>`:'';
  document.getElementById('tipCards').innerHTML=relevant.length?relevant.map(s=>{
    const h=findRunner(s.picks[String(race.number)]),excluded=!h||h.scratched||h.emergency;
    return `<article class="tip-card"><div><span>${esc(s.name)}</span><small>${esc(s.outlet)} · ${s.date}</small></div><b class="${excluded?'scratch':''}">${h?`${h.number}. ${esc(h.display)}`:esc(M.title(s.picks[String(race.number)]))}</b>${excluded?'<span class="excluded-note">Published selection · now excluded from active tips</span>':''}${s.note?`<p>${esc(s.note)}</p>`:''}<a href="${esc(s.url)}" target="_blank" rel="noopener">Original selections ↗</a></article>`;
  }).join(''):'<div class="value-empty">No verified published column in this research sample covers this race.</div>';
  const quotes=sources.filter(s=>s.quote&&s.quoteRace===race.number);
  document.getElementById('quoteCards').innerHTML=quotes.map(s=>`<figure class="published-quote"><span class="quote-mark">“</span><blockquote>${esc(s.quote)}</blockquote><figcaption><b>${esc(s.name)}</b><span>${esc(s.quoteType)}</span><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.outlet)} · ${s.date} ↗</a></figcaption></figure>`).join('');
  document.getElementById('socialCoverage').textContent=editorial?.socialNote||'Published source coverage unavailable.';
  document.getElementById('staleTipNotes').innerHTML=sources.filter(s=>s.id==='gately').map(s=>`<p class="value-copy">${esc(s.note)} <a href="${esc(s.url)}" target="_blank" rel="noopener">Published report ↗</a></p>`).join('');
}
function renderOffers(){
  document.getElementById('offerStatus').textContent=editorial?.offerNote||'No verified offer research available.';
  document.getElementById('offerCards').innerHTML=(editorial?.offers||[]).map(o=>`<article class="offer-card"><div class="offer-header"><span>${esc(o.book)}</span><small>${esc(o.kind)}</small></div><h4>${esc(o.name)}</h4><span class="offer-badge">${esc(o.status)}</span><p>${esc(o.summary)}</p><details><summary>Eligibility, limits &amp; expiry <span>+</span></summary><ul>${o.terms.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><a href="${esc(o.source)}" target="_blank" rel="noopener">Official terms ↗</a></details><a class="offer-check" href="${esc(o.destination)}" target="_blank" rel="noopener">Check your own offers ↗</a></article>`).join('');
  document.getElementById('otherBookmakers').innerHTML=`<div class="value-small">Ladbrokes and Neds: no current Oaks-specific terms verified. ${(editorial?.otherBooks||[]).map(b=>`<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.name)} ↗</a>`).join(' · ')}</div>`;
  updateRegion();
}
function updateRegion(){const region=document.getElementById('offerRegion').value;document.getElementById('regionNote').textContent=region==='Outside Australia'?'These are Australian product references. Availability and legality in your location have not been verified.':`${region} · availability still depends on your bookmaker account and offer terms. No promotion is confirmed as allocated to you.`}
document.getElementById('valueHorse').onchange=loadValueInputs;
for(const id of ['offeredOdds','fairChance'])document.getElementById(id).oninput=()=>{if(id==='fairChance'&&Number(document.getElementById(id).value)>0)document.getElementById('chanceSlider').value=document.getElementById(id).value;calculateValue()};
document.getElementById('chanceSlider').oninput=e=>{document.getElementById('fairChance').value=e.target.value;calculateValue()};
document.getElementById('offerRegion').onchange=updateRegion;
document.querySelectorAll('.value-jumps a').forEach(a=>a.onclick=e=>{e.preventDefault();document.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView?.({behavior:'smooth',block:'start'})});
