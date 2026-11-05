const MAIL_KEY='late-mail/2026-11-05/latest.json';
const MAIL_PLAN='late-mail/2026-11-05/schedule.json';
const MAIL_ATTEMPT='late-mail/2026-11-05/last-attempt.json';
const mailKey=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const mailText=(s,max=350)=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export function validateMailNotes(notes,now=new Date().toISOString()){
 if(!Array.isArray(notes)||notes.length>30)throw Error('Up to 30 source-backed notes required');
 return notes.map(n=>{const url=new URL(n.url),allowed=['tabtouch.com.au','racing.com','racingvictoria.com.au','vrc.com.au','justhorseracing.com.au','neds.com.au','tab.co.nz','beforeyoubet.com.au','gobet.com.au','thegreattipoff.com','blackbook.com.au','bets.com.au'];if(url.protocol!=='https:'||!allowed.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))throw Error('Unsupported source');if(!Number.isInteger(n.race)||n.race<0||n.race>9)throw Error('Invalid race');if(!['tip','trainer','gear','rider','scratching','track','stewards'].includes(n.type))throw Error('Invalid note type');if(n.published&&(!Number.isFinite(Date.parse(n.published))||Date.parse(n.published)>Date.parse(now)+300000))throw Error('Invalid publication time');if(!n.summary||String(n.summary).length>220)throw Error('Keep notes concise');return {race:n.race,horse:mailText(n.horse,100),type:n.type,summary:mailText(n.summary,220),url:url.href,published:n.published||null,checked:now}});
}
export function buildLateMail({original,editorial,gearBase,feed,weatherData,previous,notes,runKey,now=new Date().toISOString()},M=globalThis.FormModel,LM=globalThis.LiveForm,factors=typeof MANAGED_FACTORS!=='undefined'?MANAGED_FACTORS:{preferRecent:true,recentHalfLifeDays:21,followReportedGoing:true,groundStrength:.7,useComparableResults:true,minimumComparableResults:3,drawCap:.35,crowdMaximum:.05}){
 const graph=M.build(original),oldRaces=previous?.meeting?.races||[],incoming=feed.races||[],races=[...oldRaces.filter(p=>!incoming.some(r=>r.number===p.number)),...incoming].sort((a,b)=>a.number-b.number),mergedFeed={...feed,races},selections={},changes={};
 const pick=h=>h?{name:h.name,display:M.title(h.name),number:h.number,score:+h.score.toFixed(2),evidence:h.evidence,reliable:h.runs>0&&h.relevantRuns>=2&&h.raw>0}:null;
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
  const adjusted=M.rate(graph,field,options),leaders=adjusted.filter(h=>h.eligible&&h.runs>0),baselineLeader=base.find(h=>h.eligible&&h.runs>0),started=current?.startAt&&Date.parse(now)>=Date.parse(current.startAt),previousSelection=previous?.selections?.[String(n)];
  const frozen=started||current?.status==='official'||current?.status==='abandoned';
  const candidate=leaders[0],usable=candidate&&candidate.relevantRuns>=2&&candidate.raw>0&&(options.going==='all'||candidate.goingRuns>0);
  const revision=frozen?(previousSelection?.revisedTip||null):(usable?pick(candidate):null);
  const provisionalLeader=frozen?(previousSelection?.provisionalLeader||null):pick(candidate);
  const revisedAt=frozen?(previousSelection?.revisedAt||null):now;
  selections[n]={number:n,baselineTip:pick(baselineLeader),revisedTip:revision,provisionalLeader,revisedAt,checked:current?.checked||null,status:current?.status||'unavailable',startAt:current?.startAt||null,source:current?.source||originalRace.source,baselineGoing:originalRace.going,reportedGoing:current?.condition||null,latestGuideTip:current?.latestTip||null,topThree:frozen?(previousSelection?.topThree||[]):leaders.slice(0,3).map(pick),frozen,comparableResults:signal.comparable,drawBias:options.drawBias,why:[current?.condition?`Reported ${current.condition}; original snapshot ${originalRace.going}.`:'No refreshed going; no surface rating is invented.',`Recent race evidence uses a ${options.preferRecent?options.recentHalfLifeDays:45}-day half-life.`,factors.useComparableResults&&signal.comparable>=Math.max(3,factors.minimumComparableResults)?`${signal.comparable} comparable earlier official results inform the gate signal.`:'No comparable-result gate adjustment is applied.',factors.crowdMaximum>0?'Published tips are a modest freshness-discounted tie-breaker.':'Published-tip support is off.','Gear and rider notices are flagged, without invented performance bonuses.'],warnings:[!current?'No successful current race check.':null,current&&Date.parse(now)-Date.parse(current.checked)>7200000?'Race facts are more than two hours old.':null,frozen&&!revision?'No reliable saved pre-race tip is available.':!usable?'No reliable revised tip: recent or matching-ground evidence is too thin.':null].filter(Boolean)};
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
export async function lateMailResponse(request,env,ctx,services={meeting,weather}){
 const path=new URL(request.url).pathname;if(!['/api/late-mail','/api/late-mail/refresh','/api/late-mail/status'].includes(path))return null;
 if(path==='/api/late-mail/status')return Response.json({storageConfigured:!!env.BUCKET,writerConfigured:!!env.LATE_MAIL_UPDATER_SHA256},{headers:{'cache-control':'no-store'}});
 if(path==='/api/late-mail'){if(request.method!=='GET')return new Response('Method not allowed',{status:405});const snapshot=await storedMail(env),attempt=await env.BUCKET?.get(MAIL_ATTEMPT),plan=await env.BUCKET?.get(MAIL_PLAN);return Response.json({...snapshot,storageReady:!!env.BUCKET,lastAttempt:attempt?await attempt.json():null,automation:plan?await plan.json():null},{headers:{'cache-control':'no-store'}})}
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 if(!await authorisedMailWriter(request,env))return Response.json({error:'Update authorization required'},{status:401});
 if(!env.BUCKET)return Response.json({error:'Durable snapshot storage is not configured'},{status:503});
 const text=await request.text();if(text.length>40000)return new Response('Payload too large',{status:413});
 let payload,notes;try{payload=text?JSON.parse(text):{};if(!/^2026-11-05-(?:initial|r[1-9]-pre|final)(?:-\d{4})?$/.test(payload.runKey||''))throw Error('Invalid run key');notes=validateMailNotes(payload.notes||[])}catch(e){return Response.json({error:e.message},{status:400})}
 if(payload.automation){const a=payload.automation;if(typeof a.enabled!=='boolean'||!Array.isArray(a.times)||a.times.length>15||a.times.some(t=>!Number.isFinite(Date.parse(t))))return Response.json({error:'Invalid automation plan'},{status:400});await env.BUCKET.put(MAIL_PLAN,JSON.stringify({enabled:a.enabled,times:a.times.slice().sort(),title:mailText(a.title,100),verifiedAt:new Date().toISOString()}))}
 const archiveKey=`late-mail/${payload.runKey}.json`,already=await env.BUCKET.get(archiveKey);if(already){const snap=await already.json();if(snap.complete)return Response.json({updated:snap.updated,runKey:snap.runKey,idempotent:true,complete:true})}
 const now=new Date().toISOString(),previous=await storedMail(env);
 try{
  const [meetingResult,weatherResult]=await Promise.allSettled([services.meeting(),services.weather()]);
  const feed=meetingResult.status==='fulfilled'?meetingResult.value:null;
  if(!feed?.races?.length)throw Error('No race sources could be refreshed. Previous saved update is retained.');
  const snap=buildLateMail({original:mailAsset('/data.json'),editorial:mailAsset('/editorial.json'),gearBase:mailAsset('/gear-baseline.json'),feed,weatherData:weatherResult.status==='fulfilled'?weatherResult.value:null,previous,notes,runKey:payload.runKey,now:new Date().toISOString()});
  await env.BUCKET.put(MAIL_KEY,JSON.stringify(snap),{httpMetadata:{contentType:'application/json'}});
  await env.BUCKET.put(archiveKey,JSON.stringify(snap),{httpMetadata:{contentType:'application/json'}});
  await env.BUCKET.put(MAIL_ATTEMPT,JSON.stringify({at:now,success:true,checkedRaces:feed.races.length,weatherUpdated:weatherResult.status==='fulfilled'}));
  return Response.json({updated:snap.updated,runKey:snap.runKey,complete:snap.complete,checkedRaces:feed.races.length,condition:[...new Set(feed.races.map(r=>r.condition))],revisions:Object.values(snap.selections).map(s=>({race:s.number,baseline:s.baselineTip?.display,revised:s.revisedTip?.display,status:s.status})),readback:'/api/late-mail'},{headers:{'cache-control':'no-store'}});
 }catch(e){await env.BUCKET.put(MAIL_ATTEMPT,JSON.stringify({at:now,success:false,error:mailText(e.message,200)}));return Response.json({error:mailText(e.message,200),previousUpdated:previous?.updated||null},{status:502,headers:{'cache-control':'no-store'}})}
}
