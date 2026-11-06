(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const title=s=>String(s||'').toLowerCase().replace(/(^|[\s'-])\S/g,m=>m.toUpperCase());
  const placeLabel=p=>p===1?'Geoff landed it':p===2||p===3?'In the money':'Off track';
  const outcomeClass=p=>p===1?'win':p===2||p===3?'place':'miss';
  const table=(rows,kind)=>`<table class="roundup-table"><thead><tr><th>${kind}</th><th>Wins</th><th>Placings</th><th>${kind==='Jockey'?'Rides':'Runners'}</th><th>Win SR</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td><b>${i+1}. ${esc(title(r.name))}</b>${r.starts===1?'<small>one start</small>':''}</td><td>${r.wins}</td><td>${r.places}</td><td>${r.starts}</td><td>${Math.round(r.wins/r.starts*100)}%</td></tr>`).join('')}</tbody></table>`;
  function addStat(map,name,placing){if(!name)return;const key=norm(name);if(!map.has(key))map.set(key,{name,wins:0,places:0,starts:0});const x=map.get(key);x.starts++;if(placing===1)x.wins++;if(placing>0&&placing<=3)x.places++;}
  function sortStats(map){return [...map.values()].sort((a,b)=>b.wins-a.wins||b.places-a.places||b.starts-a.starts||a.name.localeCompare(b.name)).slice(0,6)}
  function findHorse(form,raceNo,runner){const r=form.races.find(x=>x.number===raceNo);return r?.horses.find(h=>h.number===runner.number)||r?.horses.find(h=>norm(h.name)===norm(runner.name));}
  function renderMeetingRoundup(mail,form,editorial){
    if(mail?.date!==form?.date||!editorial)return;
    const races=(mail.meeting?.races||[]).filter(r=>r.status==='official'&&r.winners?.length);
    const completed=races.filter(r=>r.winners?.length).length;
    const panel=document.getElementById('resultsPanel'),roundup=document.getElementById('dayRoundup');
    panel?.append(roundup);
    const loading=document.getElementById('resultsLoading'),label=document.getElementById('resultsTabLabel');
    if(label)label.textContent='Results';
    if(!races.length){roundup.hidden=true;if(loading){loading.hidden=false;loading.innerHTML='<span>STAKES DAY</span><h2>The scorecard starts after Race 1.</h2><p>Official results will collect here. <a href="oaks-review.html">See the Oaks Day archive ↗</a></p>'}return}
    if(loading)loading.hidden=true;
    document.getElementById('meetingProgress').textContent=`${races.length} of ${form.races.length} races official`;
    roundup.hidden=false;
    document.getElementById('roundupResultGrid').innerHTML=races.map(r=>{
      const sel=mail.selections?.[String(r.number)]||{};const tip=sel.revisedTip||sel.baselineTip;
      const winner=r.runners.find(x=>x.placing===1)||r.winners?.[0];const tipped=r.runners.find(x=>norm(x.name)===norm(tip?.name));const p=tipped?.placing||0;
      return `<a class="roundup-result ${outcomeClass(p)}" href="#/race-${r.number}"><span>R${r.number}</span><div><b>${esc(title(winner?.name||'Result pending'))}</b><small>Geoff: ${esc(tip?.display||tip?.name||'No saved tip')} · ${p?`${p}${p===1?'st':p===2?'nd':'rd'}`:'unplaced'}</small></div><em>${placeLabel(p)}</em></a>`;
    }).join('');
    const jockeys=new Map(),trainers=new Map();
    races.forEach(r=>r.runners.filter(x=>!x.scratched).forEach(x=>{addStat(jockeys,x.jockey,x.placing);addStat(trainers,findHorse(form,r.number,x)?.trainer,x.placing)}));
    document.getElementById('jockeyLeaderboard').innerHTML=table(sortStats(jockeys),'Jockey');
    document.getElementById('trainerLeaderboard').innerHTML=table(sortStats(trainers),'Trainer');
    const scorePicks=(label,detail,picks,date)=>{let wins=0,top=0,starts=0,scratched=0,noTip=0;races.forEach(r=>{const picked=picks?.[String(r.number)];if(!picked){noTip++;return}const horse=r.runners.find(x=>norm(x.name)===norm(picked));if(!horse){noTip++;return}if(horse.scratched){scratched++;return}starts++;if(horse.placing===1)wins++;if(horse.placing>0&&horse.placing<=3)top++;});return{label,detail,date,wins,top,starts,scratched,noTip}};
    const geoffPicks=mode=>Object.fromEntries(races.map(r=>{const s=mail.selections?.[String(r.number)]||{};const tip=mode==='baseline'?s.baselineTip:s.revisedTip;return[String(r.number),tip?.name]}));
    const scores=[
      scorePicks('Geoff · original baseline','Geoffs Guide',geoffPicks('baseline'),form.retrieved?.slice(0,10)),
      scorePicks('Geoff · firm revised','Geoffs Guide',geoffPicks('final'),mail.updated?.slice(0,10)),
      ...(editorial.sources||[]).map(s=>scorePicks(s.name,s.outlet,s.picks,s.date))
    ].sort((a,b)=>b.wins-a.wins||b.top-a.top||b.starts-a.starts||a.label.localeCompare(b.label));
    document.getElementById('tipsterScoreboard').innerHTML=`<table class="roundup-table tipster"><thead><tr><th>Rank · published tipster</th><th>Winner hits</th><th>Top-three hits</th><th>Winner rate</th><th>Top-three rate</th><th>Excluded</th></tr></thead><tbody>${scores.map((s,i)=>`<tr><td><b>${i+1}. ${esc(s.label)}</b><small>${esc(s.detail)} · ${esc(s.date||'date unavailable')} · ${s.starts} counted</small></td><td>${s.wins}/${s.starts}</td><td>${s.top}/${s.starts}</td><td>${s.starts?Math.round(s.wins/s.starts*100):0}%</td><td>${s.starts?Math.round(s.top/s.starts*100):0}%</td><td>${s.scratched?`${s.scratched} scratched`:''}${s.scratched&&s.noTip?' · ':''}${s.noTip?`${s.noTip} no tip`:''}${!s.scratched&&!s.noTip?'—':''}</td></tr>`).join('')}</tbody></table>`;
    document.querySelectorAll('[data-roundup-target]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.roundupTarget==='results'?'roundupResults':'roundupLeaderboards').scrollIntoView({behavior:'smooth'}));
  }
  window.renderMeetingRoundup=renderMeetingRoundup;
})();
