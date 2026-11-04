(function(root){
 const key=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const ground=s=>/heavy/i.test(s)?'Heavy':/soft/i.test(s)?'Soft':/good|firm/i.test(s)?'Good':null;
 const straight=r=>Number(r.distance)<=1200;
 function signals(feed,target){
  const completed=(feed?.races||[]).filter(r=>r.status==='official'&&r.number<target.number&&r.winners?.length);
  const jockeys=new Map();for(const r of completed){for(const h of r.runners.filter(x=>!x.scratched&&!x.emergency)){const k=key(h.jockey);if(!k)continue;if(!jockeys.has(k))jockeys.set(k,{name:h.jockey,rides:0,wins:0});const j=jockeys.get(k);j.rides++;if(r.winners.some(w=>w.number===h.number))j.wins+=1/r.winners.length}}
  const condition=ground(target.condition||target.going),comparable=completed.filter(r=>straight(r)===straight(target)&&ground(r.condition)===condition&&condition);
  let excess=0,n=0;
  for(const r of comparable){const field=r.runners.filter(h=>!h.scratched&&!h.emergency&&Number.isFinite(h.barrier)),sorted=[...field].sort((a,b)=>a.barrier-b.barrier);if(sorted.length<4)continue;const inside=new Set(sorted.slice(0,Math.floor(sorted.length/2)).map(h=>h.number));excess+=r.winners.reduce((a,w)=>a+(inside.has(w.number)?1:0)/r.winners.length,0)-inside.size/field.length;n++}
  const drawBias=n>=3?Math.max(-.35,Math.min(.35,-excess/(n+8))):0;
  return {completed,jockeys,comparable:n,drawBias,condition};
 }
 root.LiveForm={key,ground,signals};
 if(typeof module!=='undefined')module.exports=root.LiveForm;
})(typeof window!=='undefined'?window:globalThis);
