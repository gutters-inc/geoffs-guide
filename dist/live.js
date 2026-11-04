let liveMeeting=null,liveWeather=null,liveBusy=false,liveError='',weatherError='',liveTimer=null;
let livePrefs={followTrack:scenario.going==='all',learnDraw:false};
try{livePrefs={...livePrefs,...JSON.parse(localStorage.getItem('geoffs-live-v1')||'{}')}}catch{}
const liveFresh=r=>r&&Number.isFinite(Date.parse(r.checked))&&Math.abs(Date.now()-Date.parse(r.checked))<10*60*1000;
const liveTime=t=>t?new Date(t).toLocaleString('en-AU',{timeZone:'Australia/Melbourne',dateStyle:'short',timeStyle:'short'}):'not checked';
function saveLivePrefs(){try{localStorage.setItem('geoffs-live-v1',JSON.stringify(livePrefs))}catch{}}
function liveRace(){return liveMeeting?.races.find(r=>r.number===race?.number)}
function syncLiveForRace(){
 if(!race)return;
 const current=liveRace();
 if(livePrefs.followTrack&&liveFresh(current)){const g=LiveForm.ground(current.condition);if(g)scenario.going=g}
 if(livePrefs.learnDraw){const evidence=LiveForm.signals(liveMeeting,{...race,condition:current?.condition||race.going});scenario.drawBias=liveFresh(current)&&current.status==='pending'?evidence.drawBias:0}
}
function liveRunnerHTML(h){
 if(experience==='form'||!liveMeeting||!race)return '';
 const evidence=LiveForm.signals(liveMeeting,{...race,condition:liveRace()?.condition||race.going}),j=evidence.jockeys.get(LiveForm.key(h.jockey)),g=LiveForm.ground(liveRace()?.condition),runs=g?h.history.filter(r=>LiveForm.ground(r.going)===g):[];
 if(!j&&!g)return '';
 return `<div class="runner-live"><b>Race-day context</b>${g?`<p>${esc(g)} going: ${runs.length} available past ${runs.length===1?'run':'runs'} · ${runs.filter(r=>r.pos===1).length} wins · ${runs.filter(r=>r.pos<=3).length} top-three finishes.</p>`:''}${j?`<p>${esc(M.title(j.name))}: ${Number.isInteger(j.wins)?j.wins:j.wins.toFixed(1)} wins from ${j.rides} earlier rides today.</p>`:''}<small>Recent starts only. Jockey wins don’t add rating points.${!liveFresh(liveRace())?' Last checked data; refresh required.':''}</small></div>`;
}
function renderLive(){
 if(!race)return;
 const current=liveRace(),fresh=liveFresh(current),evidence=LiveForm.signals(liveMeeting,{...race,condition:current?.condition||race.going});
 document.querySelectorAll('[data-ground-preset]').forEach(b=>{const on=b.dataset.groundPreset===scenario.going;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});document.querySelectorAll('[data-draw-preset]').forEach(b=>{const on=Number(b.dataset.drawPreset)===scenario.drawBias;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
 $('liveState').textContent=liveBusy?'Checking the meeting…':fresh?'Track checked':liveError?'Original form is ready · manual controls available':'Awaiting confirmed updates';
 $('refreshLive').disabled=liveBusy;$('refreshLive').textContent=liveBusy?'Checking…':'↻ Refresh';
 $('followTrack').checked=livePrefs.followTrack;$('followTrack').closest('label').hidden=!current?.condition;$('learnDraw').checked=livePrefs.learnDraw;
 $('liveTrack').hidden=!current?.condition;
 $('liveWeather').hidden=!liveWeather;
 $('liveCells').hidden=!current?.condition&&!liveWeather;
 $('liveEmpty').hidden=!!current?.condition&&!!liveWeather;
 $('liveEmpty').textContent=!current?.condition&&!liveWeather?(liveBusy?'Checking for confirmed track and weather updates…':'Live conditions are not confirmed yet. Start with the original form or set an assumption below.'):!current?.condition?'Track rating not confirmed. Weather alone won’t change the going.':!liveWeather?'Weather is not connected yet. The reported track rating is shown above.':'';
 $('liveTrack').innerHTML=current?`<b>${esc(current.condition||'Going not reported')}</b><span>${fresh?'Reported by TABtouch':'Last checked · not fresh'} · R${race.number}</span><small>Checked ${esc(liveTime(current.checked))} AEDT${current.sourceUpdated?` · source ${esc(liveTime(current.sourceUpdated))}`:''}</small>`:'<b>Track rating unavailable</b><span>Your form settings remain available.</span>';
 const w=liveWeather,wFresh=w&&Math.abs(Date.now()-Date.parse(w.checked))<30*60*1000;
 $('liveWeather').innerHTML=w?`<b>${w.temperature??'—'}°C <span>· wind ${w.wind??'—'}km/h</span></b><span>${w.rain??'—'}mm precipitation in the current interval</span><small>${wFresh?'Modelled conditions':'Last checked weather'} · ${esc(w.time?.replace('T',' ')||'')} AEDT</small>${w.raceDay?`<p>Oaks Day forecast: ${w.raceDay.rain??'—'}mm · ${w.raceDay.chance??'—'}% rain chance.</p>`:'<p>Oaks Day is outside the current forecast window.</p>'}`:`<b>Weather ${weatherError?'unavailable':'loading…'}</b><span>Weather never determines the official going.</span>`;
 $('liveTrackMode').textContent=livePrefs.followTrack?(fresh&&LiveForm.ground(current?.condition)?`Following ${current.condition}. This reweights each horse’s historical ground form.`:`Waiting for a fresh, recognised rating. Current form setting: ${scenario.going}.` ):'Manual mode. Your selected ground stays in place.';
 $('liveResults').innerHTML=liveMeeting?liveMeeting.races.filter(r=>r.status==='official'||r.status==='provisional'||r.status==='abandoned').map(r=>`<a href="${esc(r.source)}" target="_blank" rel="noopener"><b>R${r.number}</b><span>${r.status==='official'?r.winners.map(w=>esc(M.title(w.name))).join(' / '):r.status==='abandoned'?'Abandoned':'Provisional · waiting for official dividends'}<small>${r.status==='official'?r.winners.map(w=>esc(M.title(w.jockey))).join(' / ')+' · '+esc(r.condition):'Not used in the learning signal'}</small></span><em>${r.status==='official'?'Official ↗':'↗'}</em></a>`).join('')||'<p class="quiet-pending">No official winners yet. The original form remains the starting point.</p>':'<p class="quiet-pending">No confirmed results yet. No result-based adjustments are being made.</p>';
 const jockeys=[...evidence.jockeys.values()].filter(j=>j.wins>0).sort((a,b)=>b.wins-a.wins);
 $('meetingPattern').hidden=!evidence.completed.length;$('learnDraw').closest('label').hidden=evidence.comparable<3;
 $('meetingPattern').innerHTML=`<p>${evidence.completed.length} earlier official ${evidence.completed.length===1?'race':'races'} · ${evidence.comparable} comparable for this course and going.</p>${jockeys.length?`<p>Winning jockeys: ${jockeys.map(j=>`${esc(M.title(j.name))} ${Number.isInteger(j.wins)?j.wins:j.wins.toFixed(1)}/${j.rides}`).join(' · ')} (wins/rides).</p>`:''}<p>${current?.status==='official'?'This race has finished; today’s learning adjustment is not applied.':evidence.comparable<3?'Too few comparable races to adjust the draw.':`Gate trend suggests ${evidence.drawBias<0?'inside':evidence.drawBias>0?'outside':'no'} support${evidence.drawBias?` · ${Math.abs(evidence.drawBias).toFixed(2)}L at the favoured end`:''}. ${livePrefs.learnDraw?'Applied while the race is pending and the feed is fresh.':'Switch on below to test it.'}`}</p>`;
 $('liveErrors').textContent=[liveError,weatherError,liveMeeting?.errors?.length?`${liveMeeting.errors.length} race feed(s) unavailable; their earlier checked data may be shown.`:''].filter(Boolean).join(' ');
 $('liveChecked').textContent=liveMeeting?`Meeting last requested ${liveTime(liveMeeting.checked)} AEDT. Refreshes on opening and every 3 minutes while visible; racing checks may be cached for 90 seconds.`:'Live sources are checked when you open the guide.';
 $('liveResultBanner').innerHTML=current?.status==='official'?`<b>R${race.number} · RESULT OFFICIAL</b><span>${current.winners.map(w=>esc(M.title(w.name))).join(' / ')} won.</span><small>The form order below is an analysis, not a new tip for this completed race.</small>`:current?.status==='abandoned'?'<b>Race abandoned</b><span>No selection for this race.</span>':'';
 $('liveResultBanner').hidden=!['official','abandoned'].includes(current?.status);
}
function acceptLiveMeeting(feed){
 if(feed?.date!==data.date||!Array.isArray(feed.races))throw Error('Wrong meeting returned');
 const previous=liveMeeting?.races||[],incoming=feed.races.filter(r=>r.number>=1&&r.number<=9&&Array.isArray(r.runners));
 liveMeeting={...feed,races:[...previous.filter(p=>!incoming.some(r=>r.number===p.number)),...incoming].sort((a,b)=>a.number-b.number)};
 for(const result of incoming){if(!liveFresh(result))continue;const target=data.races.find(r=>r.number===result.number);if(!target)continue;
  for(const h of target.horses){const update=result.runners.find(x=>x.number===h.number&&LiveForm.key(x.name)===LiveForm.key(h.name));if(!update)continue;h.scratched=update.scratched;if(update.jockey)h.jockey=M.title(update.jockey);if(Number.isFinite(update.weight)&&update.weight>=45&&update.weight<=75)h.weight=update.weight;if(Number.isFinite(update.barrier)&&update.barrier>0)h.barrier=update.barrier;/* Emergency promotion requires a confirmed final field, not absence of a marker. */}
 }
 syncLiveForRace();baseline=M.rate(graph,originalData.races.find(r=>r.number===race.number));selected=selected&&race.horses.some(h=>h.name===selected)?selected:race.horses[0]?.name;ranked=M.rate(graph,race,scenario);renderScenarioControls();applyScenario();renderTips();if(typeof renderRaceFacts==='function')renderRaceFacts();renderLive();
}
async function refreshLive(){
 if(liveBusy||!race)return;liveBusy=true;renderLive();
 await Promise.allSettled([
  fetch('/api/meeting').then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{acceptLiveMeeting(d);liveError=''}).catch(()=>{liveError='Track and results could not be refreshed. Last checked information is labelled; no new automatic adjustment was made.'}),
  fetch('/api/weather').then(r=>{if(!r.ok)throw Error();return r.json()}).catch(()=>fetchWeatherDirect()).then(w=>{if(!w.checked||!w.time)throw Error();liveWeather=w;weatherError=''}).catch(()=>{weatherError='Weather could not be refreshed.'})
 ]);liveBusy=false;renderLive();
}
function initLive(){
 $('refreshLive').onclick=refreshLive;
 $('followTrack').onchange=e=>{livePrefs.followTrack=e.target.checked;saveLivePrefs();syncLiveForRace();renderScenarioControls();applyScenario();renderLive()};
 $('learnDraw').onchange=e=>{livePrefs.learnDraw=e.target.checked;if(!e.target.checked)scenario.drawBias=0;saveLivePrefs();syncLiveForRace();renderScenarioControls();applyScenario();renderLive()};
 document.querySelectorAll('[data-ground-preset]').forEach(b=>b.onclick=()=>{livePrefs.followTrack=false;saveLivePrefs();scenario.going=b.dataset.groundPreset;renderScenarioControls();applyScenario();renderLive()});
 document.querySelectorAll('[data-draw-preset]').forEach(b=>b.onclick=()=>{livePrefs.learnDraw=false;saveLivePrefs();scenario.drawBias=Number(b.dataset.drawPreset);renderScenarioControls();applyScenario();renderLive()});
 if(experience==='race-day')refreshLive();if(typeof setInterval==='function')liveTimer=setInterval(()=>{if(!document.hidden&&experience==='race-day')refreshLive()},180000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&experience==='race-day')refreshLive()});
}
