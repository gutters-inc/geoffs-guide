import {acquirePollLease,releasePollLease,fetchPollSources} from './polling.mjs';
import {fetchRace,weather} from './live.mjs';
const MAIL_KEY='late-mail/2026-11-07/latest.json';
const MAIL_PLAN='late-mail/2026-11-07/schedule.json';
const MAIL_ATTEMPT='late-mail/2026-11-07/last-attempt.json';
const mailKey=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const mailText=(s,max=350)=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export function validateMailNotes(notes,now=new Date().toISOString()){
 if(!Array.isArray(notes)||notes.length>30)throw Error('Up to 30 source-backed notes required');
 return notes.map(n=>{const url=new URL(n.url),allowed=['tabtouch.com.au','racing.com','racingvictoria.com.au','vrc.com.au','justhorseracing.com.au','neds.com.au','tab.co.nz','beforeyoubet.com.au','gobet.com.au','thegreattipoff.com','blackbook.com.au','bets.com.au','sen.com.au'];if(url.protocol!=='https:'||!allowed.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))throw Error('Unsupported source');if(!Number.isInteger(n.race)||n.race<0||n.race>9)throw Error('Invalid race');if(!['tip','trainer','gear','rider','scratching','track','stewards'].includes(n.type))throw Error('Invalid note type');if(n.published&&(!Number.isFinite(Date.parse(n.published))||Date.parse(n.published)>Date.parse(now)+300000))throw Error('Invalid publication time');if(!n.summary||String(n.summary).length>220)throw Error('Keep notes concise');return {race:n.race,horse:mailText(n.horse,100),type:n.type,summary:mailText(n.summary,220),url:url.href,published:n.published||null,checked:now}});
}
export function buildLateMail({original,editorial,gearBase,feed,weatherData,previous,notes,runKey,now=new Date().toISOString()},M=globalThis.FormModel,LM=globalThis.LiveForm,factors=typeof MANAGED_FACTORS!=='undefined'?MANAGED_FACTORS:{preferRecent:true,recentHalfLifeDays:21,followReportedGoing:true,groundStrength:.7,useComparableResults:true,minimumComparableResults:3,drawCap:.35,crowdMaximum:.05}){
 if(previous?.date!==original.date)previous=null;
 const graph=M.build(original),oldRaces=previous?.meeting?.races||[],incoming=(feed.races||[]).map(r=>{const old=oldRaces.find(p=>p.number===r.number);return old?.status==='official'&&r.status!=='official'?old:r}),races=[...oldRaces.filter(p=>!incoming.some(r=>r.number===p.number)),...incoming].sort((a,b)=>a.number-b.number),mergedFeed={...feed,races},selections={},changes={};
 const pick=h=>h?{name:h.name,display:M.title(h.name),number:h.number,score:+h.score.toFixed(2),evidence:h.evidence,ownRecentRuns:h.ownRecentRuns,ownGoingRuns:h.ownGoingRuns,daysSinceRun:h.daysSinceRun,reliable:h.runs>0&&h.relevantRuns>=2&&h.raw>0}:null;
 for(const originalRace of original.races){
  const n=originalRace.number,current=races.find(r=>r.number===n),base=M.rate(graph,originalRace),field=JSON.parse(JSON.stringify(originalRace));changes[n]=[];
  if(current){if(current.condition&&current.condition!==originalRace.going)changes[n].push({type:'track',from:originalRace.going,to:current.condition,source:current.source,checked:current.checked});
   for(const horse of field.horses){const update=current.runners.find(u=>u.number===horse.number&&mailKey(u.name)===mailKey(horse.name));if(!update)continue;
    if(update.scratched&&!horse.scratched)changes[n].push({type:'scratching',horse:horse.display,to:'Scratched',source:current.source,checked:current.checked});
    for(const [key,label] of [['jockey','rider'],['weight','weight'],['barrier','barrier']]){if(update[key]!==null&&update[key]!==undefined&&update[key]!==''&&String(update[key]).toLowerCase()!==String(horse[key]).toLowerCase()){changes[n].push({type:label,horse:horse.display,from:horse[key],to:update[key],source:current.source,checked:current.checked});horse[key]=update[key]}}
    horse.scratched=!!update.scratched;
    if(update.gear&&(update.gear!=='-'||gearBase?.[String(n)]?.[String(horse.number)]&&gearBase[String(n)][String(horse.number)]!=='-'))changes[n].push({type:'gear',horse:horse.display,to:update.gear,newSinceBaseline:gearBase?.[String(n)]?.[String(horse.number)]!==update.gear,source:current.source,checked:current.checked,scratched:horse.scratched});
   }
  }
  const signal=LM.signals(mergedFeed,{...field,condition:current?.condition||originalRace.going}),going=M.ground(current?.condition),options={preferRecent:!!factors.preferRecent,recentHalfLifeDays:factors.recentHalfLifeDays,going:factors.followReportedGoing&&going!=='Unknown'?going:'all',groundStrength:Math.max(0,Math.min(1,factors.groundStrength)),drawBias:factors.useComparableResults&&signal.comparable>=Math.max(3,factors.minimumComparableResults)&&current?.status==='pending'?Math.max(-factors.drawCap,Math.min(factors.drawCap,signal.drawBias)):0};
  // Published opinions are a deliberately small, age-discounted tie-breaker.
  options.crowdBonuses=M.crowd(editorial.sources||[],field,{strength:Math.max(0,Math.min(.15,factors.crowdMaximum)),asOf:now.slice(0,10)}).bonuses;
  const adjusted=M.rate(graph,field,options),leaders=adjusted.filter(h=>h.eligible&&h.runs>0),baselineLeader=base.find(h=>h.eligible&&h.runs>0),effectiveStart=current?.startAt||previous?.selections?.[String(n)]?.startAt||`${original.date}T${originalRace.time}:00+11:00`,started=Number.isFinite(Date.parse(effectiveStart))&&Date.parse(now)>=Date.parse(effectiveStart),previousSelection=previous?.selections?.[String(n)];
  const frozen=!!previousSelection?.frozen||started||['provisional','official','abandoned'].includes(current?.status);
  const scenarioPicks=['Good','Soft','Heavy'].map(ground=>{const lead=M.rate(graph,field,{...options,going:ground}).find(h=>h.eligible&&h.history.length);return {going:ground,tip:pick(lead),confidence:M.confidence(lead,{live:true,checked:current?.checked,asOf:Date.parse(now),going:ground})}});
  const candidate=leaders[0],usable=candidate&&candidate.ownRecentRuns>=2&&candidate.raw>0&&(options.going==='all'||candidate.ownGoingRuns>0);
  const revision=frozen?(previousSelection?.revisedTip||null):(usable?pick(candidate):null);
  const provisionalLeader=frozen?(previousSelection?.provisionalLeader||null):pick(candidate);
  const revisedAt=frozen?(previousSelection?.revisedAt||null):now;
  const frozenConfidence=frozen&&revision&&(!previousSelection?.checked||Date.parse(effectiveStart)-Date.parse(previousSelection.checked)>7200000)?{level:'low',label:'Low confidence',reason:'The saved selection was not checked close to jump.'}:previousSelection?.confidence;
  selections[n]={number:n,confidence:frozen?(frozenConfidence||M.confidence(null)):M.confidence(usable?candidate:null,{live:true,checked:current?.checked,asOf:Date.parse(now),going:options.going,separateGroups:new Set(leaders.map(h=>h.component)).size>1}),scenarioPicks:frozen?(previousSelection?.scenarioPicks||[]):scenarioPicks,baselineTip:pick(baselineLeader),baselineTopThree:base.filter(h=>h.eligible&&h.history.length).slice(0,3).map(pick),revisedTip:revision,provisionalLeader,revisedAt,checked:current?.checked||null,status:current?.status||'unavailable',startAt:effectiveStart,source:current?.source||originalRace.source,baselineGoing:originalRace.going,reportedGoing:current?.condition||null,latestGuideTip:current?.latestTip||null,topThree:frozen?(previousSelection?.topThree||[]):leaders.slice(0,3).map(pick),frozen,comparableResults:signal.comparable,drawBias:options.drawBias,why:[current?.condition?`Reported ${current.condition}; original snapshot ${originalRace.going}.`:'No refreshed going; no surface rating is invented.',`Recent race evidence uses a ${options.preferRecent?options.recentHalfLifeDays:45}-day half-life.`,factors.useComparableResults&&signal.comparable>=Math.max(3,factors.minimumComparableResults)?`${signal.comparable} comparable earlier official results inform the gate signal.`:'No comparable-result gate adjustment is applied.',factors.crowdMaximum>0?'Published tips are a small freshness-discounted tie-breaker.':'Published-tip support is off.','Gear and rider notices are flagged, without invented performance bonuses.'],warnings:[!current?'No successful current race check.':null,current&&Date.parse(now)-Date.parse(current.checked)>7200000?'Race facts are more than two hours old.':null,frozen&&!revision?'No reliable saved pre-race tip is available.':!usable?'No reliable revised tip: recent or matching-ground evidence is too thin.':null].filter(Boolean)};
 }
 const mergedNotes=[...(notes||[]),...(previous?.notes||[])],seen=new Set(),kept=mergedNotes.filter(n=>{const key=[n.race,n.horse,n.url,n.summary].join('|');if(seen.has(key))return false;seen.add(key);return true}).slice(0,40);
 return {schema:1,date:original.date,updated:now,runKey,meeting:mergedFeed,weather:weatherData||previous?.weather||null,selections,changes,notes:kept,complete:incoming.length===original.races.length,history:[{updated:now,runKey,checkedRaces:incoming.length},...(previous?.history||[])].slice(0,15),method:'Saved, evidence-first form revision. Original guide is unchanged. Gear and rider facts do not receive automatic bonuses.'};
}
function mailAsset(path){const a=assets[path];return a?JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(a.body),c=>c.charCodeAt(0)))):null}
async function storedMail(env){const object=await env.BUCKET?.get(MAIL_KEY);return object?object.json():mailAsset('/late-mail.json')}
export async function authorisedMailWriter(request,env){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token||!env.LATE_MAIL_UPDATER_SHA256)return false;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)),hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),expected=String(env.LATE_MAIL_UPDATER_SHA256);if(hash.length!==expected.length)return false;let diff=0;for(let i=0;i<hash.length;i++)diff|=hash.charCodeAt(i)^expected.charCodeAt(i);return diff===0;
}
export async function lateMailResponse(request,env,ctx,services={race:fetchRace,weather}){
 const path=new URL(request.url).pathname,readRoutes=['/api/late-mail','/api/meeting','/api/weather'];
 if(![...readRoutes,'/api/late-mail/refresh','/api/late-mail/status'].includes(path))return null;
 if(path==='/api/late-mail/status')return Response.json({storageConfigured:!!env.BUCKET,writerConfigured:!!env.LATE_MAIL_UPDATER_SHA256},{headers:{'cache-control':'no-store'}});
 if(readRoutes.includes(path)){
  if(request.method!=='GET')return new Response('Method not allowed',{status:405});
  const snapshot=await storedMail(env);
  // Public traffic only reads the shared edition. It never initiates upstream polling.
  if(path==='/api/meeting')return Response.json(snapshot.meeting,{headers:{'cache-control':'public, max-age=30'}});
  if(path==='/api/weather')return Response.json(snapshot.weather||{unavailable:true,checked:null},{headers:{'cache-control':'public, max-age=300'}});
  const attempt=await env.BUCKET?.get(MAIL_ATTEMPT),plan=await env.BUCKET?.get(MAIL_PLAN);
  return Response.json({...snapshot,storageReady:!!env.BUCKET,lastAttempt:attempt?await attempt.json():null,automation:plan?await plan.json():null},{headers:{'cache-control':'no-store'}});
 }
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 if(!await authorisedMailWriter(request,env))return Response.json({error:'Update authorization required'},{status:401});
 if(!env.BUCKET)return Response.json({error:'Durable snapshot storage is not configured'},{status:503});
 const text=await request.text();if(text.length>40000)return new Response('Payload too large',{status:413});
 const clock=services.now||Date.now;let payload,notes,phase,race;
 try{payload=text?JSON.parse(text):{};if(!/^2026-11-07-(?:initial|r[1-9]-(?:pre|post)|final)(?:-\d{4})?$/.test(payload.runKey||''))throw Error('Invalid run key');notes=validateMailNotes(payload.notes||[],new Date(clock()).toISOString());phase=payload.phase||(payload.runKey.includes('-pre')?'pre':payload.runKey.includes('-post')?'post':payload.runKey.includes('-final')?'final':'manual');if(!['pre','post','final','manual'].includes(phase))throw Error('Invalid phase');race=payload.race||Number(payload.runKey.match(/-r([1-9])-/)?.[1]);if(['pre','post'].includes(phase)&&(!Number.isInteger(race)||race<1||race>9))throw Error('Invalid race');if(payload.automation){const a=payload.automation;if(typeof a.enabled!=='boolean'||!Array.isArray(a.times)||a.times.length>15||a.times.some(t=>!Number.isFinite(Date.parse(t))))throw Error('Invalid automation plan')}}catch(e){return Response.json({error:e.message},{status:400})}
 if(payload.planOnly){if(!payload.automation)return Response.json({error:'Automation plan required'},{status:400});const a=payload.automation;await env.BUCKET.put(MAIL_PLAN,JSON.stringify({enabled:a.enabled,times:a.times.slice().sort(),title:mailText(a.title,100),verifiedAt:new Date(clock()).toISOString(),mode:'pre-race check and bounded post-race watch'}));return Response.json({planSaved:true,upstreamRequests:0})}
 const archiveKey=`late-mail/${payload.runKey}.json`,already=await env.BUCKET.get(archiveKey);
 if(already){const snap=await already.json();if(snap.checkComplete||snap.complete)return Response.json({updated:snap.updated,runKey:snap.runKey,idempotent:true,complete:snap.complete})}
 const lease=await acquirePollLease(env.BUCKET,clock());
 if(lease.deferred)return Response.json(lease,{status:202,headers:{'cache-control':'no-store','retry-after':'15'}});
 const previous=await storedMail(env),now=new Date(clock()).toISOString();
 try{
  if(payload.automation){const a=payload.automation;await env.BUCKET.put(MAIL_PLAN,JSON.stringify({enabled:a.enabled,times:a.times.slice().sort(),title:mailText(a.title,100),verifiedAt:now}))}
  const result=await fetchPollSources({previous,phase,race,lease,services,now:clock()});
  if(result.deferred)return Response.json(result,{status:202,headers:{'cache-control':'no-store'}});
  const {feed,weatherData,weatherUpdated,numbers}=result;
  if(!feed?.races?.length)throw Error('No race sources could be refreshed. Previous saved update is retained.');
  const currentLease=await env.BUCKET.get('late-mail/2026-11-07/poll-control.json');if(!currentLease||currentLease.etag!==lease.etag||lease.state.leaseUntil<=clock())throw Error('Refresh lease expired; saved edition was not replaced.');
  const snap=buildLateMail({original:mailAsset('/data.json'),editorial:mailAsset('/editorial.json'),gearBase:mailAsset('/gear-baseline.json'),feed,weatherData,previous,notes,runKey:payload.runKey,now:new Date(clock()).toISOString()});
  snap.complete=feed.races.length===numbers.length&&!feed.errors?.length;snap.checkComplete=snap.complete;
  snap.polling={phase,race:race||null,checkedRaces:feed.races.map(r=>r.number),nextAllowedAt:result.nextAllowedAt,sourceCooldown:result.sourceCooldown||null,interimResultsDoNotAffectLearning:true};
  await env.BUCKET.put(MAIL_KEY,JSON.stringify(snap),{httpMetadata:{contentType:'application/json'}});
  await env.BUCKET.put(archiveKey,JSON.stringify(snap),{httpMetadata:{contentType:'application/json'}});
  await env.BUCKET.put(MAIL_ATTEMPT,JSON.stringify({at:now,success:true,checkedRaces:feed.races.length,weatherUpdated,phase,sourceCooldown:result.sourceCooldown||null}));
  return Response.json({updated:snap.updated,runKey:snap.runKey,complete:snap.complete,checkedRaces:feed.races.length,polling:snap.polling,condition:[...new Set(feed.races.map(r=>r.condition))],revisions:Object.values(snap.selections).map(s=>({race:s.number,baseline:s.baselineTip?.display,revised:s.revisedTip?.display,status:s.status})),readback:'/api/late-mail'},{headers:{'cache-control':'no-store'}});
 }catch(e){await env.BUCKET.put(MAIL_ATTEMPT,JSON.stringify({at:now,success:false,error:mailText(e.message,200),sourceCooldown:lease.state.host?.notBefore?new Date(lease.state.host.notBefore).toISOString():null}));return Response.json({error:mailText(e.message,200),previousUpdated:previous?.updated||null,retryAt:lease.state.host?.notBefore?new Date(lease.state.host.notBefore).toISOString():null},{status:502,headers:{'cache-control':'no-store'}})}
 finally{await releasePollLease(env.BUCKET,lease)}
}
