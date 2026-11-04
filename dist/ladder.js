let ladderExpanded=false;
function rungExplanation(a,b){
  const evidence=M.comparison(graph,a.name,b.name),gap=a.score-b.score;
  const baseA=baseline.find(h=>h.name===a.name),baseB=baseline.find(h=>h.name===b.name);
  const flipped=baseA&&baseB&&baseA.raw<=baseB.raw&&a.raw>b.raw;
  const scenarioNote=flipped?'Your race-day assumptions flip their baseline order.':scenarioActive()?'Your race-day assumptions are included in this order.':'';
  let icon='⚑',label='A provisional step',story='',facts='',tone='uncertain';
  if(evidence.kind==='direct'){
    const e=evidence.latest,r=e.race,winner=evidence.delta>=0?a:b,loser=evidence.delta>=0?b:a;
    icon=evidence.direction==='supports'?'↗':evidence.direction==='opposes'?'↩':'↔';
    label=evidence.direction==='supports'?'The latest meeting backs this step':evidence.direction==='opposes'?'The last result pushes back':'Level at their latest meeting';
    tone=evidence.direction==='supports'?'supported':evidence.direction==='opposes'?'contrary':'mixed';
    story=evidence.delta===0?`${a.display} and ${b.display} recorded level beaten margins.`:`${winner.display} finished ${fmt(Math.abs(evidence.delta))}L ahead of ${loser.display}.`;
    facts=`<div class="rung-race"><span>${esc(r.track)} · ${shortDate(r.date)} ${r.date.slice(0,4)} · ${r.distance}m</span><span>${evidence.ahead} ahead / ${evidence.behind} behind across their meetings</span></div>`;
    if(evidence.reversal)facts+='<p class="rung-warning">They’ve traded places before. One meeting doesn’t settle it.</p>';
    if(evidence.direction==='opposes')facts+=`<p class="rung-warning">${esc(a.display)} is still above on the combined model rating${flipped?' after your changes':''}; the latest head-to-head favours ${esc(b.display)}.</p>`;
  }else if(evidence.kind==='indirect'){
    icon='↔';label=evidence.direction==='supports'?'A common-rival trail':evidence.direction==='opposes'?'The chain pushes back':'Shared rivals, mixed signals';tone=evidence.direction==='supports'?'supported':'mixed';
    story=`They haven’t met in the available starts. A ${evidence.steps.length}-link chain connects them${evidence.direction==='supports'?' and points in this direction':evidence.direction==='opposes'?' but points the other way':', with results in different directions'}.`;
    if(evidence.commonRival){
      const stronger=evidence.marginRead>0?a:evidence.marginRead<0?b:null;
      label=stronger?.name===a.name?'A stronger common-rival margin':stronger?'The shared rival pushes back':'A common rival, level margins';
      tone=stronger?.name===a.name?'supported':'mixed';
      story=stronger?`${stronger.display} recorded a stronger margin against ${display(evidence.commonRival)} in separate races. That is a clue, not a direct head-to-head result.`:`Their recorded margins against ${display(evidence.commonRival)} were level in separate races. This link alone cannot separate them.`;
      if(stronger?.name===b.name)story+=` Other matchups and model weighting still place ${a.display} above overall.`;
    }
    facts=`<div class="rung-chain">${[a.name,...evidence.steps.map(s=>s.to)].map((n,i)=>`<span class="${n===a.name||n===b.name?'':'bridge-name'}">${esc(display(n))}</span>${i<evidence.steps.length?'<i>↓</i>':''}`).join('')}</div><details class="rung-detail"><summary>What happened in each race <span>+</span></summary>${evidence.steps.map(s=>{
      const ahead=s.delta>=0?s.from:s.to,behind=s.delta>=0?s.to:s.from;
      return `<p><b>${esc(display(ahead))}</b> ${s.delta===0?'level with':`${fmt(Math.abs(s.delta))}L ahead of`} <b>${esc(display(behind))}</b><small>${esc(s.edge.race.track)} · ${shortDate(s.edge.race.date)} ${s.edge.race.date.slice(0,4)} · ${s.edge.race.distance}m</small></p>`;
    }).join('')}<p class="rung-warning">Different races aren’t a ruler. These margins cannot be added into a predicted winning margin.</p></details>`;
  }else{
    label=evidence.kind==='disconnected'?'Different form islands':'No short bridge';
    story=evidence.kind==='disconnected'?`No shared-race path joins these horses in the available history. Their relative position is uncertain.`:'They connect somewhere in the wider history, but not within four steps. There is no clear short comparison.';
    facts='<p class="rung-warning">The score sets this display order. It does not prove the horse above is better.</p>';
  }
  return `<div class="rung-explanation ${tone}"><span class="rung-medallion">${icon}</span><div class="rung-caption">WHY ABOVE ${esc(b.display.toUpperCase())}?</div><h4>${esc(label)}</h4><p>${esc(story)}</p>${facts}<div class="rung-model-gap">${Math.abs(gap)<.005?'Essentially level ratings':`${gap.toFixed(1)} model points between them`} · not lengths or win probability</div>${scenarioNote?`<p class="rung-scenario">${esc(scenarioNote)}</p>`:''}<a href="${esc(race.source)}" target="_blank" rel="noopener">Check the published race history ↗</a></div>`;
}
function renderLadder(){
  if(!race)return;
  const field=active(),visible=ladderExpanded?field:field.slice(0,6),islands=new Set(field.map(h=>h.component)).size;
  document.getElementById('ladderStatus').innerHTML=`<span>${scenarioActive()?'YOUR SCENARIO':'BASELINE FORM'}</span><b>${field.length} runners · ${islands>1?`${islands} form groups`:'one connected group'}</b>${islands>1?'<p>Some steps cross disconnected groups. Look for the “form islands” flag.</p>':''}`;
  document.getElementById('formLadder').innerHTML=visible.map((h,i)=>{
    const prev=baseline.filter(x=>x.eligible).findIndex(x=>x.name===h.name),move=prev-i;
    return `<article class="ladder-rung ${i===0?'ladder-leader':''}"><div class="ladder-horse"><span class="ladder-position">${i===0?'♛':String(i+1).padStart(2,'0')}</span>${silk(h,'large')}<div><small>${i===0?'TOP OF THIS FORM LADDER':`RUNG ${i+1}`}</small><h3>${esc(h.display)}</h3><p>No. ${h.number} · ${esc(h.evidence.toLowerCase())} evidence${move?` · ${move>0?'↑':'↓'}${Math.abs(move)} since baseline`:''}</p></div><button data-ladder-horse="${esc(h.name)}" aria-label="Open ${esc(h.display)} form details">↗</button></div>${sentimentHTML(h)}${typeof liveRunnerHTML==='function'?liveRunnerHTML(h):''}${i<visible.length-1?rungExplanation(h,visible[i+1]):`<p class="ladder-rest">${visible.length<field.length?'More rungs below. Expand the field to follow the rest.':'The bottom of this model order is still a contender in the actual race.'}</p>`}</article>`;
  }).join('');
  document.querySelectorAll('[data-ladder-horse]').forEach(b=>b.onclick=()=>inspectRunner(b.dataset.ladderHorse));
  const show=document.getElementById('showFullLadder');show.hidden=field.length<=6;show.setAttribute('aria-expanded',String(ladderExpanded));show.textContent=ladderExpanded?'Show the top six ↑':`Show ${Math.max(0,field.length-6)} more horses ↓`;
}
document.getElementById('showFullLadder').onclick=()=>{ladderExpanded=!ladderExpanded;renderLadder()};
