function syncMobileRace(){
  document.getElementById('mobileRaceSelect').innerHTML=data.races.map(r=>`<option value="${r.number}">R${r.number} · ${esc(r.name)} · ${r.time}</option>`).join('');
  document.getElementById('mobileRaceSelect').value=String(race.number);
  document.getElementById('previousRace').disabled=race.number===1;
  document.getElementById('nextRace').disabled=race.number===data.races.length;
}
function compareMobile(a,b){
  setExperience('connections');ensureComparisonOption(a);document.getElementById('horseA').value=a;document.getElementById('horseB').value=b;document.getElementById('maxHops').value='3';selected=a;renderPath();renderDetail();renderRankings();document.getElementById('pathResult').scrollIntoView?.({behavior:'smooth',block:'center'});
}
function renderMobileNetwork(){
  if(!race)return;
  const horses=active(),from=horses.some(h=>h.name===selected)?selected:horses[0]?.name;if(!from)return;
  const picker=document.getElementById('networkHorse');picker.innerHTML=horses.map(h=>`<option value="${esc(h.name)}">${h.number}. ${esc(h.display)}</option>`).join('');picker.value=from;
  const rivals=horses.filter(h=>h.name!==from).map(h=>({h,path:M.path(graph,from,h.name,3)})).sort((a,b)=>(a.path?.length??99)-(b.path?.length??99));
  document.getElementById('mobileNetworkList').innerHTML=rivals.map(({h,path})=>{
    let note='No chain within three links in this snapshot.';
    if(path?.length===1){const step=path[0];note=step.delta>0?`${display(from)} finished ${fmt(step.delta)}L ahead.`:step.delta<0?`${h.display} finished ${fmt(-step.delta)}L ahead.`:'Level beaten margins.';note+=` ${shortDate(step.edge.race.date)} · ${step.edge.race.distance}m`;}
    else if(path)note=`Via ${path.slice(0,-1).map(step=>display(step.to)).join(' → ')}`;
    return `<button class="mobile-connection-row" data-mobile-rival="${esc(h.name)}">${silk(h)}<span><b>${h.number}. ${esc(h.display)}</b><small>${esc(note)}</small></span><span class="link-count">${path?`${path.length} ${path.length===1?'link':'links'}`:'No link'}<i>↗</i></span></button>`;
  }).join('');
  document.querySelectorAll('[data-mobile-rival]').forEach(b=>b.onclick=()=>compareMobile(from,b.dataset.mobileRival));
}
function renderMobileMatchups(){
  const from=document.getElementById('matchupHorse').value||active()[0]?.name;if(!from)return;
  document.getElementById('mobileMatchups').innerHTML=active().filter(h=>h.name!==from).map(h=>{
    const edges=graph.adjacency.get(from)?.get(h.name)||[],wins=edges.filter(e=>(e.a===from?e.delta:-e.delta)>0).length,losses=edges.filter(e=>(e.a===from?e.delta:-e.delta)<0).length,ties=edges.length-wins-losses;
    return `<button class="mobile-matchup-row" data-mobile-match="${esc(h.name)}">${silk(h)}<span><b>vs ${h.number}. ${esc(h.display)}</b><small>${edges.length?`${edges.length} ${edges.length===1?'meeting':'meetings'}${ties?` · ${ties} level`:''}`:'No direct meeting in this snapshot'}</small></span><span class="matchup-score ${wins>losses?'positive':wins<losses?'negative':''}">${edges.length?`${wins}W · ${losses}L`:'—'}<small>from selected horse</small></span></button>`;
  }).join('');
  document.querySelectorAll('[data-mobile-match]').forEach(b=>b.onclick=()=>compareMobile(from,b.dataset.mobileMatch));
}
document.getElementById('mobileRaceSelect').onchange=e=>chooseRace(Number(e.target.value));
document.getElementById('previousRace').onclick=()=>{if(race.number>1)chooseRace(race.number-1)};
document.getElementById('nextRace').onclick=()=>{if(race.number<data.races.length)chooseRace(race.number+1)};
document.getElementById('networkHorse').onchange=e=>{selected=e.target.value;renderMobileNetwork();ensureComparisonOption(selected);document.getElementById('horseA').value=selected;renderPath()};
