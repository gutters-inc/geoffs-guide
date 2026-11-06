export const POLL_POLICY={raceCooldownMs:120000,hostGapMs:3000,manualCooldownMs:600000,weatherCooldownMs:1800000,leaseMs:300000,postOffsetsMinutes:[3,6,10,20],watchLimitMinutes:45,maxRacingRequestsPerHour:30,maxRacingRequestsPerDay:90};
const CONTROL_KEY='late-mail/2026-11-07/poll-control.json';
const iso=t=>new Date(t).toISOString();
export function sourceBackoff(error,failures,now,jitter=0){
 const status=Number(error?.status),base=status===403?3600000:Math.min(1800000,120000*2**Math.min(4,Math.max(0,failures-1)));
 return Math.max(now+base+Math.round(base*Math.max(0,Math.min(.15,jitter))),Number(error?.retryAt)||0);
}
export async function acquirePollLease(bucket,now){
 const object=await bucket.get(CONTROL_KEY),state=object?await object.json():{};
 if(state.leaseUntil>now)return {deferred:true,retryAt:iso(state.leaseUntil),reason:'A shared refresh is already running'};
 const owner=crypto.randomUUID(),next={...state,owner,leaseUntil:now+POLL_POLICY.leaseMs};
 const onlyIf=object?{etagMatches:object.etag}:new Headers({'If-None-Match':'*'});
 const written=await bucket.put(CONTROL_KEY,JSON.stringify(next),{onlyIf});
 if(!written)return {deferred:true,retryAt:iso(now+15000),reason:'Another refresh acquired the shared lease'};
 return {state:next,etag:written.etag};
}
export async function releasePollLease(bucket,lease){
 // A conditional release cannot overwrite a newer owner after an expired lease.
 return bucket.put(CONTROL_KEY,JSON.stringify({...lease.state,leaseUntil:0,owner:null}),{onlyIf:{etagMatches:lease.etag}});
}
export function pollTargets(previous,phase,race,now){
 const reports=previous?.meeting?.races||[];
 if(phase==='pre'||phase==='post'){
  const report=reports.find(r=>r.number===race),selection=previous?.selections?.[String(race)],jump=Date.parse(report?.startAt||selection?.startAt);
  if(!report)return {numbers:[race]};
  if(['official','abandoned'].includes(report.status))return {numbers:[],reason:'Result is final; routine polling stopped'};
  if(!Number.isFinite(jump))return {numbers:[],reason:'No verified jump time; manual review needed'};
  if(phase==='pre'&&now<jump-600000)return {numbers:[],retryAt:iso(jump-600000),reason:'Waiting for the ten-minute pre-race check'};
  if(phase==='pre'&&now>=jump)return {numbers:[],reason:'Pre-race window passed; preserve the saved tip'};
  if(phase==='post'&&now<jump+180000)return {numbers:[],retryAt:iso(jump+180000),reason:'Waiting for the result window'};
  if(phase==='post'&&now>jump+2700000)return {numbers:[],reason:'Bounded result window ended; await a later scheduled check'};
  const previousUnsettled=phase==='pre'?reports.filter(r=>r.number<race&&!['official','abandoned'].includes(r.status)&&Date.parse(r.startAt||previous.selections?.[String(r.number)]?.startAt)+180000<=now).sort((a,b)=>b.number-a.number).slice(0,1).map(r=>r.number):[];
  return {numbers:[race,...previousUnsettled]};
 }
 return {numbers:reports.filter(r=>phase!=='final'||!['official','abandoned'].includes(r.status)).map(r=>r.number)};
}
export async function fetchPollSources({previous,phase,race,lease,services,now}){
 const state=lease.state,selected=pollTargets(previous,phase,race,now);state.races||={};state.host||={};state.weather||={};
 const defer=(reason,retryAt)=>({deferred:true,reason,...(retryAt?{retryAt:iso(retryAt)}:{})});
 if(!selected.numbers.length)return {deferred:true,reason:selected.reason,retryAt:selected.retryAt};
 if(state.host.notBefore>now)return defer('Source cooldown; respecting backoff / Retry-After',state.host.notBefore);
 if(phase==='manual'&&state.manualAfter>now)return defer('Full-meeting refresh is cooling down',state.manualAfter);
 const day=new Date(now).toISOString().slice(0,10);if(state.host.day!==day){state.host.day=day;state.host.dayAttempts=0}state.host.attempts=(state.host.attempts||[]).filter(t=>t>now-3600000);
 if(state.host.dayAttempts>=POLL_POLICY.maxRacingRequestsPerDay)return defer('Daily source-request budget reached',Date.parse(day)+86400000);
 if(state.host.attempts.length>=POLL_POLICY.maxRacingRequestsPerHour)return defer('Hourly source-request budget reached',state.host.attempts[0]+3600000);
 const numbers=selected.numbers.filter(n=>!(state.races[n]?.nextAt>now));
 if(!numbers.length)return defer('Race facts were checked recently',Math.min(...selected.numbers.map(n=>state.races[n].nextAt)));
 if(phase==='manual')state.manualAfter=now+POLL_POLICY.manualCooldownMs;
 let feed,weatherData=null,weatherUpdated=false;
 // Legacy injectable meeting seam keeps the durable writer tests independent of HTTP.
 if(services.meeting&&!services.race){state.host.attempts.push(...numbers.map(()=>now));state.host.dayAttempts+=numbers.length;feed=await services.meeting({numbers});for(const r of feed.races||[])state.races[r.number]={nextAt:now+POLL_POLICY.raceCooldownMs};}
 else{
  const races=[],errors=[],clock=services.now||Date.now,pause=services.pause||(ms=>new Promise(r=>setTimeout(r,ms)));
  for(const number of numbers){
   if(state.host.attempts.length>=POLL_POLICY.maxRacingRequestsPerHour||state.host.dayAttempts>=POLL_POLICY.maxRacingRequestsPerDay){state.host.notBefore=state.host.dayAttempts>=POLL_POLICY.maxRacingRequestsPerDay?Date.parse(day)+86400000:state.host.attempts[0]+3600000;errors.push({number,message:'Shared source-request budget reached'});break}
   const wait=Math.max(0,(state.host.nextAt||0)-clock());if(wait)await pause(wait);
   state.host.attempts.push(clock());state.host.dayAttempts++;
   try{races.push(await services.race(number));state.races[number]={nextAt:clock()+POLL_POLICY.raceCooldownMs};state.host.failures=0;state.host.notBefore=0;}
   catch(error){const failures=(state.host.failures||0)+1;state.host.failures=failures;state.host.notBefore=sourceBackoff(error,failures,clock(),Math.random()*.15);errors.push({number,message:'Source unavailable; cooldown applied',status:Number(error.status)||null});break;}
   finally{state.host.nextAt=clock()+POLL_POLICY.hostGapMs;}
  }
  feed={date:previous.date,checked:iso(clock()),races,errors};
 }
 if(phase!=='post'&&!(state.weather.notBefore>now)&&services.weather){
  try{weatherData=await services.weather();weatherUpdated=true;state.weather={notBefore:now+POLL_POLICY.weatherCooldownMs,failures:0};}
  catch(error){state.weather={notBefore:Math.max(now+POLL_POLICY.weatherCooldownMs,Number(error.retryAt)||0),failures:(state.weather.failures||0)+1};}
 }
 return {feed,weatherData,weatherUpdated,numbers,nextAllowedAt:iso(Math.max(state.host.nextAt||0,state.host.notBefore||0)),sourceCooldown:state.host.notBefore?iso(state.host.notBefore):null};
}
