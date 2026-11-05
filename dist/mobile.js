function syncMobileRace(){document.getElementById('mobileRaceSelect').innerHTML=data.races.map(r=>`<option value="${r.number}">R${r.number} · ${esc(r.name)} · ${r.time}</option>`).join('');document.getElementById('mobileRaceSelect').value=String(race.number);document.getElementById('previousRace').disabled=race.number===1;document.getElementById('nextRace').disabled=race.number===data.races.length}
document.getElementById('mobileRaceSelect').onchange=e=>chooseRace(Number(e.target.value));
document.getElementById('previousRace').onclick=()=>{if(race.number>1)chooseRace(race.number-1)};
document.getElementById('nextRace').onclick=()=>{if(race.number<data.races.length)chooseRace(race.number+1)};
