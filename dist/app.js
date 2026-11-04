const $=id=>document.getElementById(id), M=FormModel;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
const shortDate=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});
let data,graph,race,ranked,selected,mode='all',chain=null;
const display=n=>graph.nodes.get(n)?.display||M.title(n);
const active=()=>ranked.filter(h=>h.eligible);
const componentCount=()=>new Set(active().map(h=>h.component)).size;
function openMethod(){ $('method').open=true;$('method').scrollIntoView({behavior:'smooth',block:'start'}) }
$('methodButton').onclick=openMethod;$('ratingHelp').onclick=openMethod;
function chooseRace(n){
  race=data.races.find(r=>r.number===n);ranked=M.rate(graph,race);selected=active()[0]?.name||ranked[0]?.name;
  $('raceTabs').innerHTML=data.races.map(r=>`<button class="race-tab ${r.number===n?'active':''}" aria-pressed="${r.number===n}" data-race="${r.number}"><span class="tab-number">R${r.number} ${r.number===n?'<span>↗</span>':''}</span><span class="tab-name">${esc(r.name)}</span><span class="tab-time">${r.time} AEDT</span></button>`).join('');
  document.querySelectorAll('[data-race]').forEach(b=>b.onclick=()=>chooseRace(+b.dataset.race));
  $('raceMeta').textContent=`RACE ${n.toString().padStart(2,'0')} / ${race.time} AEDT`;$('raceName').textContent=race.name;
  $('raceFacts').innerHTML=`<div class="fact"><b>${race.distance.toLocaleString()}m</b><span>DISTANCE</span></div><div class="fact"><b>${active().length} + ${ranked.filter(h=>h.emergency&&!h.scratched).length} EM</b><span>LISTED FIELD</span></div><div class="fact"><b>${esc(race.going)}</b><span>SOURCE GOING</span></div>`;
  $('sourceLink').href=race.source;
  const options=ranked.map(h=>`<option value="${esc(h.name)}">${h.number}. ${esc(h.display)}${h.scratched?' · SCR':h.emergency?' · Emergency':''}</option>`).join('');
  $('horseA').innerHTML=options;$('horseB').innerHTML=options;
  $('horseA').value=selected;$('horseB').value=active()[1]?.name||selected;
  renderVerdict();renderRankings();renderDetail();renderPath();
  history.replaceState(null,'',`#race-${n}`);
}
function renderVerdict(){
  const h=active()[0];
  if(!h){$('verdict').innerHTML='<h3>No confirmed runners</h3>';$('pickReasons').textContent='Check the published field.';return}
  const disconnected=componentCount()>1;
  const noData=h.runs===0;
  const weak=h.relevantRuns<2||h.raw<=0;
  $('verdict').innerHTML=`<span class="pick-tag">${noData?'NO USABLE EVIDENCE':weak?'NO RELIABLE PICK':disconnected?'PROVISIONAL FORM LEADER':'TOP ON CONNECTION FORM'} ↗</span><h3>${weak?'Too little to call':esc(h.display)}</h3><div class="pick-subtitle">${weak?`Highest provisional score: ${esc(h.display)}<br>`:''}No. ${h.number} · Barrier ${h.barrier} · ${h.weight}kg<br>${esc(h.jockey)} / ${esc(h.trainer)}</div><div class="rating-row"><strong>${h.runs?h.score.toFixed(1):'—'}</strong><span>/ 95<br>FORM RATING</span></div><div class="evidence-tag">${h.evidence.toUpperCase()} EVIDENCE · ${h.relevantRuns} relevant connected runs</div>${disconnected?'<p class="group-warning">The field spans separate network groups. Scores between those groups are not directly comparable.</p>':''}`;
  const wins=M.wins(graph,h.name,race.distance), reasons=[];
  const used=new Set();
  for(const w of wins){if(used.has(w.edge.race.key))continue;used.add(w.edge.race.key);
    reasons.push(`<div class="reason"><span>0${reasons.length+1}</span><div>Finished ${fmt(w.delta)}L ahead of <b>${esc(display(w.other))}</b>.<small>${esc(w.edge.race.track)} · ${shortDate(w.edge.race.date)} · ${w.edge.race.distance}m</small></div></div>`);if(reasons.length===2)break;
  }
  const challenger=active()[1];
  if(challenger){const p=M.path(graph,h.name,challenger.name,3);
    reasons.push(`<div class="reason"><span>0${reasons.length+1}</span><div>${p?`Connected to ${esc(challenger.display)} in ${p.length} ${p.length===1?'step':'steps'}.`:`No chain of up to 3 links to ${esc(challenger.display)}.`}<small>${p?'Explore the chain below; each result is evidence, not proof.':'Treat the comparison as uncertain.'}</small></div></div>`);
  }
  if(!wins.length)reasons.unshift('<div class="reason"><span>01</span><div>No positive head-to-head margin found in the available history.<small>A neutral score does not establish winning form.</small></div></div>');
  $('pickReasons').innerHTML=reasons.join('');
}
function renderRankings(){
  let rank=0;
  $('rankings').innerHTML=ranked.map(h=>`<tr class="${h.name===selected?'selected ':''}${h.eligible&&rank===0?'top':''}"><td>${h.eligible?String(++rank).padStart(2,'0'):'—'}</td><td><button class="horse-link ${h.scratched?'scratch':''}" data-horse="${esc(h.name)}">${h.number}. ${esc(h.display)}</button><small>${h.scratched?'SCRATCHED':h.emergency?'EMERGENCY · excluded from verdict':`Barrier ${h.barrier} · ${h.weight}kg · ${esc(h.form||'—')}`}</small></td><td><div class="rating-cell"><b>${h.runs?h.score.toFixed(1):'—'}</b><span class="rating-track"><i style="width:${h.runs?h.score:0}%"></i></span></div></td><td>${h.direct} / ${Math.max(0,active().length-(h.eligible?1:0))}</td><td><span class="badge ${h.evidence==='Sparse'?'sparse':''}">${h.evidence}</span></td></tr>`).join('');
  document.querySelectorAll('[data-horse]').forEach(b=>b.onclick=()=>selectHorse(b.dataset.horse));
  $('rankingNote').innerHTML=`${componentCount()>1?`<div class="group-warning">${componentCount()} separate network groups in this field. Ranking across groups is provisional; a disconnected horse is not proven inferior.</div>`:''}Each rival is counted once, even if they met repeatedly. Emergencies and scratchings are excluded from the verdict. Click any runner to inspect its history.`;
}
function selectHorse(n){selected=n;if([...$('horseA').options].some(o=>o.value===n)){$('horseA').value=n;if($('horseB').value===n)$('horseB').value=active().find(h=>h.name!==n)?.name||n}renderRankings();renderDetail();renderPath()}
function renderDetail(){
  const h=ranked.find(h=>h.name===selected)||graph.nodes.get(selected)?.horse;
  if(!h){$('horseDetail').innerHTML=`<h3>${esc(display(selected))}</h3><p class="section-description">Historical common rival. Only results evidenced by today’s runners’ form are included.</p>`;return}
  $('horseDetail').innerHTML=`<span class="silk">${h.number}</span><h3>${esc(h.display)}</h3>${h.emergency?'<span class="status-tag">EMERGENCY · NOT IN VERDICT</span>':''}${h.scratched?'<span class="status-tag">SCRATCHED</span>':''}<div class="horse-detail-grid"><div><span>JOCKEY</span><b>${esc(h.jockey)}</b></div><div><span>TRAINER</span><b>${esc(h.trainer)}</b></div><div><span>BARRIER / WEIGHT</span><b>${h.barrier} / ${h.weight}kg</b></div><div><span>RECENT FORM</span><b>${esc(h.form||'—')}</b></div></div><div class="history-title">AVAILABLE RECENT STARTS</div>${h.history.length?h.history.map(r=>`<div class="history-item"><span class="history-pos">${r.pos}<small>/${r.total}</small></span><div><strong>${esc(r.track)} · ${r.distance}m</strong><small>${shortDate(r.date)} 2026 · ${esc(r.going)} · ${esc(r.grade)}</small><span class="deficit">${r.pos===1?`Won${r.winMargin?' by '+fmt(r.winMargin)+'L':''}`:`${fmt(r.margin)}L behind ${esc(M.title(r.winner))}`}</span></div></div>`).join(''):'<p class="section-description">No usable recent race starts in the source. Trials are excluded.</p>'}`;
}
function renderPath(){
  const a=$('horseA').value,b=$('horseB').value,max=+$('maxHops').value;
  chain=M.path(graph,a,b,max);
  if(a===b){$('pathResult').innerHTML='<div class="no-path">Choose two different horses to explore their connection.</div>';renderGraph();return}
  if(!chain){$('pathResult').innerHTML=`<div class="no-path">No connection within ${max} ${max===1?'link':'links'} in the available history.<br>${graph.components.get(a)!==graph.components.get(b)?'These horses sit in separate network groups.':'Try allowing more links.'} Missing connections do not mean the horses have never met.</div>`;renderGraph();return}
  const names=[a,...chain.map(s=>s.to)], allForward=chain.every(s=>s.delta>0),allReverse=chain.every(s=>s.delta<0);
  const readings=allForward?`The results in this chain favour ${display(a)} over ${display(b)}.`:allReverse?`The results in this chain favour ${display(b)} over ${display(a)}.`:'This chain has mixed directions. It connects the horses but does not establish a consistent form advantage.';
  $('pathResult').innerHTML=`<div class="path-summary"><b>${chain.length} ${chain.length===1?'degree':'degrees'} of separation.</b> ${esc(readings)}</div><div class="path-chain">${names.map((name,i)=>{
    const node=`<div class="path-horse"><strong>${esc(display(name))}</strong><span>${race.horses.some(h=>h.name===name)?'IN THIS FIELD':'COMMON RIVAL'}</span></div>`;
    if(i===chain.length)return node;
    const s=chain[i],r=s.edge.race;
    const ahead=s.delta>0?name:s.to,behind=s.delta>0?s.to:name;
    const otherEdges=graph.adjacency.get(name)?.get(s.to)||[],reversal=otherEdges.some(e=>(e.a===name?e.delta:-e.delta)*s.delta<0);
    return node+`<div class="path-step"><strong>${s.delta===0?'Dead heat / level margin':`${esc(display(ahead))} ahead of ${esc(display(behind))}<br>by ${fmt(Math.abs(s.delta))}L`}</strong><span class="arrow">→</span><small>${esc(r.track)} · ${shortDate(r.date)} · ${r.distance}m</small><small>${s.edge.a===name?s.edge.aPos:s.edge.bPos}${ordinal(s.edge.a===name?s.edge.aPos:s.edge.bPos)} vs ${s.edge.a===name?s.edge.bPos:s.edge.aPos}${ordinal(s.edge.a===name?s.edge.bPos:s.edge.aPos)}${reversal?' · Result reversed in another meeting':''}</small></div>`;
  }).join('')}</div><p class="path-note">Shortest available chain; most recent race shown for each link. Margins are the difference in beaten margins. ${allForward||allReverse?'This is a form inference, not a guarantee. ':''}Different trips, weights and conditions limit comparisons. The rating uses all available matchups, including reversals.</p>`;
  renderGraph();
}
function ordinal(n){return n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th')}
function renderGraph(){
  const field=new Set(race.horses.map(h=>h.name)),bridges=new Set();
  // Show current field plus rivals who provide a meaningful bridge between field runners.
  for(const [name,edges] of graph.adjacency)if(!field.has(name)&&[...edges.keys()].filter(k=>field.has(k)).length>=2)bridges.add(name);
  let bridgeList=[...bridges].sort((a,b)=>[...graph.adjacency.get(b).keys()].filter(k=>field.has(k)).length-[...graph.adjacency.get(a).keys()].filter(k=>field.has(k)).length).slice(0,10);
  if(chain)for(const s of chain)for(const n of [s.from,s.to])if(!field.has(n)&&!bridgeList.includes(n))bridgeList.push(n);
  const visibleField=race.horses,names=[...visibleField.map(h=>h.name),...bridgeList],positions=new Map();
  visibleField.forEach((h,i)=>{const t=-Math.PI/2+i*2*Math.PI/visibleField.length;positions.set(h.name,{x:425+Math.cos(t)*260,y:325+Math.sin(t)*245})});
  bridgeList.forEach((name,i)=>{const t=-Math.PI/2+i*2*Math.PI/bridgeList.length;positions.set(name,{x:425+Math.cos(t)*132,y:325+Math.sin(t)*114})});
  const pathEdges=new Set((chain||[]).map(s=>[s.from,s.to].sort().join('|'))),pathNames=new Set((chain||[]).flatMap(s=>[s.from,s.to]));
  let edgeCount=0,lines='';
  for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){
    const a=names[i],b=names[j],edges=graph.adjacency.get(a)?.get(b);if(!edges)continue;
    const isPath=pathEdges.has([a,b].sort().join('|')),focus=a===selected||b===selected;
    if(mode==='focus'&&!focus&&!isPath)continue;
    const p=positions.get(a),q=positions.get(b);edgeCount++;
    lines+=`<line class="graph-edge ${isPath?'path':focus?'focus':''} ${mode==='all'&&pathEdges.size&&!isPath&&!focus?'dim':''}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"><title>${esc(display(a))} / ${esc(display(b))} · ${edges.length} shared ${edges.length===1?'race':'races'}</title></line>`;
  }
  const nodeSvg=names.map(name=>{
    const p=positions.get(name),h=race.horses.find(h=>h.name===name),isField=!!h,isSelected=name===selected,isPath=pathNames.has(name),isFocus=graph.adjacency.get(selected)?.has(name);
    const dim=mode==='focus'&&!isSelected&&!isFocus&&!isPath;
    const label=display(name),r=isField?20:13;
    // Labels sit outside the field ring; bridge labels sit beside their node.
    let x=0,y=0,anchor='middle';
    if(isField){const dx=p.x-425,dy=p.y-325;if(Math.abs(dx)>150){x=dx>0?29:-29;y=4;anchor=dx>0?'start':'end'}else{y=dy>0?37:-31}}
    else{y=27}
    const words=label.split(' ');let labelSvg;
    if(label.length>18&&words.length>1){const mid=Math.ceil(words.length/2);labelSvg=`<text class="node-name" x="${x}" y="${y}" text-anchor="${anchor}"><tspan x="${x}">${esc(words.slice(0,mid).join(' '))}</tspan><tspan x="${x}" dy="13">${esc(words.slice(mid).join(' '))}</tspan></text>`}else labelSvg=`<text class="node-name" x="${x}" y="${y}" text-anchor="${anchor}">${esc(label)}</text>`;
    return `<g class="node ${isField?'runner':'bridge'} ${isSelected?'selected':''} ${dim?'dim':''}" transform="translate(${p.x} ${p.y})" role="button" tabindex="0" data-node="${esc(name)}" aria-label="Inspect ${esc(label)}"><title>${esc(label)}${h?` · No. ${h.number}${h.emergency?' · Emergency':''}`:' · Common rival'}</title><circle r="${r}" fill="${isSelected?'#173e30':isField?'#e7efda':'#fff'}" stroke="${isSelected||isPath?'#91b454':isField?'#b9cba3':'#cdd7c5'}" stroke-width="${isSelected||isPath?2:1}" ${h?.emergency?'stroke-dasharray="3 2"':''}/><text class="node-num" y="4" text-anchor="middle">${isField?h.number:'·'}</text>${labelSvg}</g>`;
  }).join('');
  $('graph').innerHTML=`<defs><radialGradient id="wash"><stop offset="0" stop-color="#f6f8f0"/><stop offset="1" stop-color="#fff"/></radialGradient></defs><circle cx="425" cy="325" r="250" fill="url(#wash)"/><ellipse cx="425" cy="325" rx="295" ry="252" fill="none" stroke="#f0f3e9" stroke-dasharray="2 6"/>${lines}${nodeSvg}`;
  $('graphCount').textContent=`${names.length} horses · ${edgeCount} links`;
  $('graphEmpty').hidden=edgeCount>0;
  document.querySelectorAll('[data-node]').forEach(el=>{const choose=()=>selectHorse(el.dataset.node);el.onclick=choose;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}}});
}
$('horseA').onchange=()=>{selected=$('horseA').value;renderDetail();renderRankings();renderPath()};$('horseB').onchange=renderPath;$('maxHops').onchange=renderPath;
$('swap').onclick=()=>{const a=$('horseA').value;$('horseA').value=$('horseB').value;$('horseB').value=a;selected=$('horseA').value;renderDetail();renderRankings();renderPath()};
for(const [id,value] of [['allView','all'],['focusView','focus']])$(id).onclick=()=>{mode=value;$('allView').classList.toggle('active',mode==='all');$('focusView').classList.toggle('active',mode==='focus');renderGraph()};
fetch('data.json').then(r=>{if(!r.ok)throw Error('Could not load form data');return r.json()}).then(d=>{
  data=d;graph=M.build(data);$('dataTimestamp').textContent=`Retrieved ${new Date(d.retrieved).toLocaleString('en-AU',{timeZone:'Australia/Melbourne',dateStyle:'long',timeStyle:'short'})} Melbourne time. This is a fixed snapshot; verify late scratchings and conditions with the published form.`;
  const n=+(location.hash.match(/race-(\d)/)?.[1]||8);chooseRace(n>=1&&n<=9?n:8);$('loading').hidden=true;
}).catch(e=>{$('loading').innerHTML=`<div>Unable to load the form guide.<br><br><button onclick="location.reload()">Try again</button><p>${esc(e.message)}</p></div>`});
