function syncMobileRace(){
  document.getElementById('mobileRaceSelect').innerHTML=data.races.map(r=>`<option value="${r.number}">R${r.number} · ${esc(r.name)} · ${r.time}</option>`).join('');
  document.getElementById('mobileRaceSelect').value=String(race.number);
  document.getElementById('previousRace').disabled=race.number===1;
  document.getElementById('nextRace').disabled=race.number===data.races.length;
}
function compareMobile(a,b){
  setExperience('connections');ensureComparisonOption(a);document.getElementById('horseA').value=a;document.getElementById('horseB').value=b;document.getElementById('maxHops').value='3';selected=a;renderPath();renderDetail();renderRankings();document.getElementById('ladderProof').open=true;document.getElementById('pathResult').scrollIntoView?.({behavior:'smooth',block:'center'});
}
document.getElementById('mobileRaceSelect').onchange=e=>chooseRace(Number(e.target.value));
document.getElementById('previousRace').onclick=()=>{if(race.number>1)chooseRace(race.number-1)};
document.getElementById('nextRace').onclick=()=>{if(race.number<data.races.length)chooseRace(race.number+1)};
