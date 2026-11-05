let lateMail=null,mailReadError='',mailBusy=false;
const mailDate=t=>t&&Number.isFinite(Date.parse(t))?new Date(t).toLocaleString('en-AU',{timeZone:'Australia/Melbourne',dateStyle:'medium',timeStyle:'short'})+' AEDT':'not yet saved';
const mailClock=t=>new Date(t).toLocaleTimeString('en-AU',{timeZone:'Australia/Melbourne',hour:'numeric',minute:'2-digit',hour12:true})+' AEDT';
const placingLabel=n=>Number.isFinite(n)?`${n}${n%100>=11&&n%100<=13?'th':n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}`:'placing not reported';
const reportedPlacings=report=>(report?.runners||[]).filter(h=>Number(h.placing)>0&&!h.scratched).sort((a,b)=>a.placing-b.placing);
function finishLabel(report,runner){
 if(Number(runner?.placing)>0)return placingLabel(Number(runner.placing));
 const count=reportedPlacings(report).length;
 return count?`outside the reported first ${count}`:'finish not supplied';
}
function renderFormResult(){
 const box=$('formResultReview');if(!box||!race)return;
 const report=lateMail?.meeting?.races?.find(r=>r.number===race.number),s=lateMail?.selections?.[String(race.number)];
 if(!report||report.status!=='official'||!s){box.innerHTML='';return}
 const placed=reportedPlacings(report),winner=placed[0]||report.winners?.[0],saved=s.revisedTip||s.baselineTip;
 const savedRunner=saved&&report.runners?.find(h=>horseKey(h.name)===horseKey(saved.name)),pickWon=!!winner&&!!saved&&horseKey(winner.name)===horseKey(saved.name);
 const eligible=baseline.filter(h=>h.eligible),winnerRank=winner?eligible.findIndex(h=>horseKey(h.name)===horseKey(winner.name))+1:0;
 const savedTop=(s.topThree||[]).findIndex(h=>winner&&horseKey(h.name)===horseKey(winner.name))+1;
 const winnerNote=(lateMail.notes||[]).find(n=>n.race===race.number&&winner&&horseKey(n.horse)===horseKey(winner.name)&&['tip','trainer'].includes(n.type));
 const miss=pickWon?'The saved pre-race selection won.':!s.revisedTip?
  `No reliable revised selection was published. ${savedTop>0?`The winner was No. ${savedTop} in the saved top three.`:winnerRank>0?`The winner ranked No. ${winnerRank} in the original form.`:'The winner was not supported by the saved shortlist.'}`:
  `The saved tip ${esc(saved.display)} finished ${finishLabel(report,savedRunner)}; the winner ranked ${winnerRank>0?`No. ${winnerRank} in the original form`:'outside the original eligible order'}.`;
 const going=s.baselineGoing&&s.reportedGoing&&s.baselineGoing!==s.reportedGoing?`Going moved from ${esc(s.baselineGoing)} to ${esc(s.reportedGoing)}.`:`Going stayed at ${esc(s.reportedGoing||s.baselineGoing||'the saved rating')}.`;
 const caveat=winnerNote?`A saved ${esc(winnerNote.type)} note did mention the winner: ${esc(winnerNote.summary)}`:'No saved high-profile late-mail note selected the winner.';
 box.innerHTML=`<article class="form-result-card"><header><span>OFFICIAL RESULT · RACE ${report.number}</span><strong>${winner?`#${winner.number} ${esc(M.title(winner.name))}`:'Winner unavailable'}</strong></header><ol class="form-finish">${placed.map(h=>`<li><b>${placingLabel(h.placing)}</b><span>#${h.number} ${esc(M.title(h.name))}</span><small>${esc(M.title(h.jockey||''))}</small></li>`).join('')}</ol><p class="finish-limit">${placed.length?`The official feed currently supplies the first ${placed.length} placings; the remaining order is not published here.`:'The finishing order has not been supplied.'}</p><section class="miss-review"><span>${pickWon?'WHAT WORKED':'WHAT WE MISSED'}</span><p>${miss}</p><ul><li>${going}</li><li>${caveat}</li></ul><small>This is an audit of the saved evidence, not a claimed post-race cause. Sectionals or stewards’ comments are needed for that.</small></section><a href="${esc(s.source)}" target="_blank" rel="noopener">Official race source ↗</a></article>`;
}
let alertTimer=null;
const alertStorageKey=n=>`gg-alert-${lateMail?.runKey||'edition'}-r${n}`;
async function alertRegistration(){
 if(typeof navigator==='undefined'||!navigator.serviceWorker)return null;
 try{return await navigator.serviceWorker.register('/sw.js')}catch{return null}
}
function updateAlertStatus(message){const el=$('raceAlertStatus');if(el)el.textContent=message||''}
async function showRaceAlert(n){
 if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
 try{if(localStorage.getItem(alertStorageKey(n)))return}catch{}
 const s=lateMail?.selections?.[String(n)],report=lateMail?.meeting?.races?.find(r=>r.number===n);
 if(!s||!report||report.status!=='pending')return;
 const pick=s.revisedTip?.display||'No firm revised pick',changes=(lateMail.changes?.[String(n)]||[]).filter(c=>['scratching','rider','track'].includes(c.type)).length;
 const options={body:`${report.condition||'Going not confirmed'} · ${pick} · ${changes} key change${changes===1?'':'s'}. Tap for sourced late mail.`,tag:`geoffs-guide-r${n}`,renotify:true,data:{url:`/#race-${n}/race-day`}};
 const reg=await alertRegistration();if(reg)await reg.showNotification(`Race ${n} late mail is ready`,options);else new Notification(`Race ${n} late mail is ready`,options);
 try{localStorage.setItem(alertStorageKey(n),new Date().toISOString())}catch{}
}
function scheduleRaceAlert(){
 clearTimeout(alertTimer);if(typeof Notification==='undefined'||Notification.permission!=='granted'||!lateMail)return;
 const match=String(lateMail.runKey||'').match(/-r([1-9])-pre-/),n=Number(match?.[1]);if(n){showRaceAlert(n);return}
 const upcoming=lateMail.meeting?.races?.filter(r=>r.status==='pending'&&r.startAt).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt))[0];
 if(!upcoming)return;const wait=Date.parse(upcoming.startAt)-Date.now()-600000;
 if(wait<=0&&wait>-900000)showRaceAlert(upcoming.number);else if(wait>0&&wait<21600000)alertTimer=setTimeout(()=>showRaceAlert(upcoming.number),wait);
}
function renderLateMail(){
 if(!race)return;
 const home=$('homeLastUpdated'),s=lateMail?.selections?.[String(race.number)];
 home.querySelector('b').textContent=lateMail?mailDate(lateMail.updated):'Original form available';home.querySelector('span').textContent=lateMail?'LAST UPDATED':'AWAITING UPDATE';
 if(!lateMail||!s){$('lateMailStamp').textContent=lateMail?'No saved check for this race yet.':'No saved check available yet.';$('lateMailSchedule').textContent='The original guide and published tips are still available.';$('lateMailBadge').textContent='AWAITING UPDATE';$('savedConditions').innerHTML='';$('lateMailComparison').innerHTML='<p class="mail-quiet">Late mail will appear after a saved race check.</p>';for(const id of ['lateMailFactors','lateMailGear','lateMailOpinions','lateMailResults'])$(id).innerHTML='';renderFormResult();return}
 const report=lateMail.meeting.races.find(r=>r.number===race.number),winner=report?.status==='official'?report.winners:[],before=s.baselineTip,after=s.revisedTip?.reliable===false?null:s.revisedTip,changed=!!after&&before?.name!==after.name;
 const savedPick=after||before,pickRunner=savedPick&&report?.runners?.find(h=>horseKey(h.name)===horseKey(savedPick.name)),pickWon=!!savedPick&&winner.some(w=>horseKey(w.name)===horseKey(savedPick.name));
 const officialResult=winner.length?`<section class="official-race-result" aria-label="Official race result"><span>OFFICIAL RESULT · RACE ${report.number}</span><div><small>Winner:</small><strong>${winner.map(w=>`${w.number?`#${w.number} `:''}${esc(M.title(w.name))}`).join(' / ')}</strong></div><p><b>Saved pre-race tip:</b> ${savedPick?`${esc(savedPick.display)} · ${pickWon?'won':placingLabel(pickRunner?.placing)}`:'No reliable saved tip'}</p><p class="result-verdict ${pickWon?'result-hit':'result-miss'}">${pickWon?'✓ The saved tip won.':'The winner differed from the saved tip.'}</p></section>`:'';
 $('lateMailStamp').textContent=`Updated ${mailDate(lateMail.updated)}${mailReadError?(mailReadError==='fallback'?' · showing the saved fallback':' · showing the earlier verified edition'):lateMail.lastAttempt?.success===false?' · latest check failed; prior edition kept':''}`;
 const next=lateMail.automation?.times?.find(t=>Date.parse(t)>Date.now());$('lateMailSchedule').textContent=lateMail.automation?.enabled?(next?`Next check ${mailClock(next)}.`:'Today’s scheduled checks are complete.'):'Saved morning edition. Next check time is not confirmed.';
 $('lateMailBadge').textContent=winner.length?'RESULT OFFICIAL':s.status==='abandoned'?'ABANDONED':lateMail.runKey?.includes('final')?'RESULTS':lateMail.runKey?.includes('initial')?'MORNING CHECK':'PRE-RACE CHECK';
 const weather=lateMail.weather;$('savedConditions').innerHTML=`${report?.condition?`<span>${esc(report.condition)} going</span>`:'<span>Going not confirmed</span>'}${weather&&Number.isFinite(weather.temperature)?`<span>${weather.temperature}°C · saved weather</span>`:''}`;
 $('lateMailComparison').innerHTML=`${officialResult}<div class="mail-picks"><div><span>ORIGINAL</span><b>${before?esc(before.display):'No original leader'}</b></div><i>→</i><div class="${changed?'mail-revised':''}"><span>${s.frozen?'SAVED PRE-RACE TIP':'LATEST VIEW'}</span><b>${after?esc(after.display):'No clear pick'}</b><small>${after?(changed?'Changed from original':'Unchanged'):'Thin recent or ground evidence.'}</small></div></div>${confidenceMarkup(after,{live:true,checked:s.checked})}${!after&&s.provisionalLeader?`<p class="mail-quiet">${esc(s.provisionalLeader.display)} is provisional. No firm recommendation.</p>`:''}<p class="mail-caveat">Saved before the race. Form-based opinion, not a guarantee.</p>`;
 const factors=(lateMail.changes?.[String(race.number)]||[]).filter(c=>c.type!=='gear');
 const factor=c=>`<div class="mail-factor"><span>${esc({track:'GOING',rider:'RIDER',scratching:'SCRATCHED',weight:'WEIGHT',barrier:'BARRIER'}[c.type]||c.type)}</span><p>${c.horse?`<b>${esc(M.title(c.horse))}</b><br>`:''}${c.from!==undefined?`${esc(c.from)} → `:''}${esc(c.to)}</p></div>`;
 $('lateMailFactors').innerHTML=`<h4>What changed?</h4>${factors.length?factors.slice(0,3).map(factor).join(''):'<p class="mail-quiet">No changed runner or track facts in this saved check.</p>'}${factors.length>3?`<details class="mail-details"><summary>${factors.length-3} more changes <span>+</span></summary>${factors.slice(3).map(factor).join('')}</details>`:''}${!lateMail.complete?'<p class="mail-quiet">Some checks were unavailable. Earlier verified reports have been kept.</p>':''}<a class="plain-source" href="${esc(s.source)}" target="_blank" rel="noopener">Race source ↗</a><small class="source-check">${s.checked?`Race report checked ${mailDate(s.checked)}`:'Race report not confirmed'}</small>`;
 const gear=(lateMail.changes?.[String(race.number)]||[]).filter(c=>c.type==='gear');$('lateMailGear').innerHTML=gear.length?gear.map(g=>`<article class="mail-gear"><b>${esc(M.title(g.horse))}${g.scratched?' · scratched':''}</b><span>${esc(g.to)}</span><small>${g.newSinceBaseline?'Updated declaration':'Already declared in original form'}</small></article>`).join(''):'<p class="mail-quiet">No gear declaration in this saved check.</p>';
 const notes=(lateMail.notes||[]).filter(n=>n.race===race.number||n.race===0),guide=s.latestGuideTip,g=guide&&report?.runners.find(h=>h.number===guide.number);
 $('lateMailOpinions').innerHTML=`${guide?`<article class="mail-opinion"><b>${esc(guide.author)} · ${esc(M.title(guide.name))}${g?.scratched?' · scratched':g?.emergency?' · emergency':''}</b><small>Fetched guide selection; publication time not supplied. <a href="${esc(s.source)}" target="_blank" rel="noopener">Source ↗</a></small></article>`:'<p class="mail-quiet">No updated guide selection verified.</p>'}${notes.map(n=>`<article class="mail-opinion"><span>${esc(n.type.toUpperCase())}${n.horse?' · '+esc(M.title(n.horse)):''}</span><p>${esc(n.summary)}</p><small>${n.published?'Published '+mailDate(n.published):'Publication time not supplied'} · <a href="${esc(n.url)}" target="_blank" rel="noopener">Source ↗</a></small></article>`).join('')}`;
 $('lateMailResults').innerHTML=lateMail.meeting.races.map(r=>{const official=r.status==='official',names=official?r.winners.map(w=>`${w.number?`#${w.number} `:''}${esc(M.title(w.name))}`).join(' / '):'';return `<div class="mail-result ${official?'mail-result-official':''}"><b>R${r.number}</b><span><em>${official?'OFFICIAL':r.status==='provisional'?'PROVISIONAL':r.status==='abandoned'?'ABANDONED':'PENDING'}</em>${official?`<strong>Winner: ${names}</strong>`:r.status==='abandoned'?'Race abandoned':r.status==='provisional'?'Result awaiting official confirmation':'Awaiting result'}<small>${esc(r.condition||'Going not confirmed')} going</small></span></div>`}).join('');
 renderFormResult();scheduleRaceAlert();
}
function acceptSavedMail(saved){
 if(saved?.date!==data.date||!Number.isFinite(Date.parse(saved.updated))||!saved.selections||(!Array.isArray(saved.meeting?.races)||saved.meeting.races.length===0))throw Error('Invalid saved edition');for(const s of Object.values(saved.selections))for(const key of ['baselineTip','revisedTip','provisionalLeader'])if(s[key]?.name)s[key].display=M.title(s[key].name);lateMail=saved;
 for(const report of saved.meeting.races){const field=data.races.find(r=>r.number===report.number);if(!field||!Array.isArray(report.runners))continue;if(report.startAt)field.time=new Date(report.startAt).toLocaleTimeString('en-AU',{timeZone:'Australia/Melbourne',hour:'2-digit',minute:'2-digit',hour12:false});for(const h of field.horses){const r=report.runners.find(r=>r.number===h.number&&horseKey(r.name)===horseKey(h.name));if(!r)continue;h.scratched=!!r.scratched;if(r.jockey)h.jockey=M.title(r.jockey)}}
 $('raceMeta').textContent=`RACE ${race.number} · ${race.time} AEDT`;renderRaceFacts();renderSimple();renderRankings();renderDetail();renderTips();renderLateMail();syncMobileRace();
}
async function loadSavedMail(){
 if(mailBusy||!race)return;mailBusy=true;
 try{let saved;try{const r=await fetch('/api/late-mail',{cache:'no-store'});if(!r.ok)throw Error();saved=await r.json();mailReadError='';acceptSavedMail(saved)}catch{const r=await fetch('late-mail.json');if(!r.ok)throw Error();saved=await r.json();mailReadError='fallback';acceptSavedMail(saved)}}catch{mailReadError='unavailable';renderLateMail()}mailBusy=false;
}
function initSavedMail(){loadSavedMail();if(typeof setInterval==='function')setInterval(()=>{if(!document.hidden&&experience==='race-day')loadSavedMail()},180000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadSavedMail()})}
document.getElementById('openLateMail').onclick=()=>{setExperience('race-day');document.getElementById('lateMailPanel').scrollIntoView?.({behavior:'smooth',block:'start'})};
document.getElementById('enableRaceAlerts').onclick=async()=>{
 if(typeof Notification==='undefined'){updateAlertStatus('Browser alerts are unavailable on this device.');return}
 const permission=await Notification.requestPermission();
 if(permission!=='granted'){updateAlertStatus('Alerts were not enabled. You can change notification permission in browser settings.');return}
 await alertRegistration();updateAlertStatus('Alerts enabled while this Site is open or running in the background.');scheduleRaceAlert();
};
