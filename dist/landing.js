// Pick by the verified clock, not race number. No upstream requests are made here.
function nextRaceLanding(form,saved,now=Date.now()){
 const reports=saved?.date===form.date?saved.meeting?.races||[]:[],selections=saved?.date===form.date?saved.selections||{}:{};
 const rows=form.races.map(r=>{const report=reports.find(p=>p.number===r.number),s=selections[String(r.number)];return {number:r.number,status:report?.status,jump:Date.parse(report?.startAt||s?.startAt||`${form.date}T${r.time}:00+11:00`),frozen:!!s?.frozen}});
 const final=r=>['official','abandoned'].includes(r.status),started=r=>r.frozen||['provisional','running','in_progress'].includes(r.status);
 const next=rows.filter(r=>!final(r)&&!started(r)&&Number.isFinite(r.jump)&&r.jump>now).sort((a,b)=>a.jump-b.jump||a.number-b.number)[0];
 if(next)return {race:next.number,view:'form'};
 if(rows.length&&rows.every(final))return {race:[...rows].sort((a,b)=>b.jump-a.jump||b.number-a.number)[0].number,view:'results'};
 const unsettled=rows.filter(r=>!final(r)&&Number.isFinite(r.jump)&&r.jump<=now).sort((a,b)=>b.jump-a.jump||b.number-a.number)[0];
 if(unsettled)return {race:unsettled.number,view:'race-day'};
 return {race:rows.find(r=>!final(r))?.number||rows.at(-1)?.number||1,view:'form'};
}
