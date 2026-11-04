let dayExpanded=false;
async function fetchWeatherDirect(){
 const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=-37.788&longitude=144.907&current=temperature_2m,precipitation,weather_code,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max&timezone=Australia%2FMelbourne&forecast_days=3');
 if(!r.ok)throw Error('Weather unavailable');const d=await r.json();if(!d.current||!d.daily)throw Error('Weather unavailable');const i=d.daily.time.indexOf('2026-11-05');return {checked:new Date().toISOString(),source:'https://open-meteo.com/en/docs',time:d.current.time,temperature:d.current.temperature_2m,rain:d.current.precipitation,wind:d.current.wind_speed_10m,code:d.current.weather_code,raceDay:i<0?null:{date:'2026-11-05',rain:d.daily.precipitation_sum[i],chance:d.daily.precipitation_probability_max[i]}};
}
function renderRaceDay(){
 if(!race)return;
 const before=ratingMap(baseline),now=ratingMap(ranked),ordered=ranked.filter(h=>h.eligible),moved=ordered.filter(h=>before.get(h.name)?.rank!==now.get(h.name)?.rank).length;
 const fresh=typeof liveRace==='function'&&liveFresh(liveRace()),hasManual=scenarioActive();
 $('movesCount').textContent=`${moved} moved`;
 $('movesSummary').textContent=fresh?`Compared with the original form snapshot. ${livePrefs.followTrack?'Reported going is included.':'Your ground assumption is in use.'}`:hasManual?'Showing the effect of your assumptions. Live conditions are not confirmed.':moved?'Using last checked runner changes. Live conditions are not currently confirmed.':'Same as the original form. No confirmed update or manual assumption is changing the ratings.';
 const rows=[...ordered,...ranked.filter(h=>!h.eligible)];
 const shown=dayExpanded?rows:rows.slice(0,3);
 $('showDayField').hidden=rows.length<=3;$('showDayField').textContent=dayExpanded?'Show the leading three ↑':`Show all ${rows.length} runners ↓`;$('showDayField').setAttribute('aria-expanded',String(dayExpanded));
 const movers=ordered.map(h=>({h,move:(before.get(h.name)?.rank??now.get(h.name)?.rank)-now.get(h.name)?.rank})).sort((a,b)=>Math.abs(b.move)-Math.abs(a.move));
 const biggest=movers[0];$('dayFeedback').innerHTML=`<span>${biggest?.move?`${esc(biggest.h.display)} ${biggest.move>0?'↑':'↓'}${Math.abs(biggest.move)} places`:'No rank movement yet'}<small>Against the original form order</small></span><button id="backToMoves">View moves ↑</button>`;$('backToMoves').onclick=()=>$('movesTitle').scrollIntoView?.({behavior:'smooth',block:'start'});
 $('raceDayMoves').innerHTML=shown.map(h=>{
  const b=before.get(h.name),rank=now.get(h.name)?.rank,move=b&&rank?b.rank-rank:0,delta=h.score-(b?.score??h.score),excluded=!h.eligible;
  const insufficient=!h.runs||scenario.going!=='all'&&scenario.groundStrength===1&&h.goingRuns===0;
  const direction=excluded?'out':!b?'new':move>0?'up':move<0?'down':'same';
  const change=excluded?h.scratched?'Scratched':'Emergency':insufficient?'Insufficient form':!b?'Now included':move?`${move>0?'↑':'↓'} ${Math.abs(move)} ${Math.abs(move)===1?'place':'places'}`:'No rank change';
  const causes=[];
  if(excluded)causes.push('Excluded from the adjusted selection.');
  else if(insufficient)causes.push('Not enough usable evidence for these conditions. No average rating is substituted.');
  else{
   if(scenario.going!=='all'&&scenario.groundStrength>0)causes.push(`${scenario.going} form preferred · ${h.goingRuns} matching ${h.goingRuns===1?'start':'starts'}${h.goingRuns<2?' (thin evidence)':''}`);
   if(scenario.preferTrack)causes.push('Flemington history preferred');
   if(scenario.handicap)causes.push(`Weight assumption: ${h.scenarioWeight??h.weight}kg`);
   if(h.drawBonus)causes.push(`${signedChange(h.drawBonus)}L gate assumption`);
   if(h.crowdBonus){const support=currentCrowd().support[h.name];causes.push(`+${h.crowdBonus.toFixed(2)}L crowd boost · ${support?.guides.join(', ')||'published first picks'}`)}
   if(h.manualBonus)causes.push(`${signedChange(h.manualBonus)}L personal adjustment`);
   if(b&&h.jockey!==b.jockey)causes.push(`Jockey changed to ${h.jockey} · no automatic bonus`);
   if(!causes.length)causes.push(Math.abs(delta)>.005?'Updated field changes the connected comparison.':'No rating adjustment applied.');
   if(move&&Math.abs(delta)<.005)causes.push('Movement comes from changes elsewhere in the field.');
  }
  return `<article class="move-card ${direction}"><header>${silk(h)}<div><b>${h.number}. ${esc(h.display)}</b><small>${esc(h.jockey)}</small></div><button data-day-inspect="${esc(h.name)}" aria-label="Inspect ${esc(h.display)}">↗</button></header><div class="move-ranks"><div><span>ORIGINAL</span><b>${b&&h.runs?'#'+b.rank:'—'}</b></div><i>→</i><div><span>ADJUSTED</span><b>${rank&&!insufficient?'#'+rank:'—'}</b></div><strong>${esc(change)}<small>${!excluded&&!insufficient&&b?`${signedChange(delta)} rating points`:'Not rated as average'}</small></strong></div><p>${causes.map(esc).join(' · ')}</p></article>`;
 }).join('');
 document.querySelectorAll('[data-day-inspect]').forEach(b=>b.onclick=()=>inspectRunner(b.dataset.dayInspect));
}
document.getElementById('openRaceDay').onclick=()=>setExperience('race-day');

document.getElementById('showDayField').onclick=()=>{dayExpanded=!dayExpanded;renderRaceDay()};
function renderRaceFacts(){
 if(!race||!originalData)return;
 const original=originalData.races.find(r=>r.number===race.number),form=experience==='form',rows=form?baseline:ranked,going=form?original.going:(typeof liveRace==='function'?liveRace()?.condition:null)||'Unconfirmed';
 $('raceFacts').innerHTML=`<div class="fact"><b>${race.distance.toLocaleString()}m</b><span>DISTANCE</span></div><div class="fact"><b>${rows.filter(h=>h.eligible).length} + ${rows.filter(h=>h.emergency&&!h.scratched).length} EM</b><span>${form?'ORIGINAL FIELD':'LATEST FIELD'}</span></div><div class="fact"><b>${esc(going)}</b><span>${form?'SNAPSHOT GOING':'LIVE GOING'}</span></div>`;
}
