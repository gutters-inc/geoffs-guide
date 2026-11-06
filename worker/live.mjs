export const DATE='2026-11-07';
const clean=s=>String(s||'').replace(/\s*\((?:[A-Z]{2,3}|EM\d+)\)/gi,'').trim().slice(0,100);
const num=x=>x!==null&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
export function pageModel(html){
  const start=html.search(/var model\s*=\s*/);if(start<0)throw Error('Race source format changed');
  const part=html.slice(start).replace(/^var model\s*=\s*/,'');let depth=0,quoted=false,escape=false;
  for(let i=0;i<part.length;i++){const c=part[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false}else if(c==='"')quoted=true;else if(c==='{'||c==='[')depth++;else if(c==='}'||c===']'){depth--;if(!depth)return JSON.parse(part.slice(0,i+1))}}
  throw Error('Incomplete race source');
}
export function parseRace(html,number,now=new Date().toISOString()){
  if(!/<title>\s*Flemington\s*\|/i.test(html))throw Error('Unexpected meeting');
  const m=pageModel(html),leg=m.pool?.legs?.[0],info=m.raceInfo;
  const sourceDate=String(m.pool?.date||m.meetingDate||'').slice(0,10);
  if(sourceDate!==DATE||leg&&Number(leg.raceNumber)!==number)throw Error('Unexpected meeting date or race');
  const text=html.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
  const raw=leg?.starters||m.allStarters;if(!Array.isArray(raw)||!raw.length)throw Error('No runner data');
  const official=/Dividends official\s*:/i.test(text),abandoned=!!(info?.isRaceAbandoned||m.isAbandoned);
  const declaredGear=number=>{const marker=new RegExp('id=["\']form-starter-'+number+'["\']'),index=html.search(marker);if(index<0)return null;const rest=html.slice(index+1),end=rest.search(/id=["']form-starter-\d+["']/),block=end<0?rest:rest.slice(0,end);const match=block.match(/<dd[^>]*data-form=["']gearChanges["'][^>]*>([\s\S]*?)<\/dd>/i);return match?match[1].replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim().slice(0,350):null};
  const preview=String(info?.previewContent||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '),selectionNumbers=(preview.match(/Selections:\s*([\d, ]+)/i)?.[1]||'').split(',').map(Number).filter(n=>n>0),author=String(info?.previewContent||'').match(/<h3[^>]*>([^<]+)<\/h3>/i)?.[1]||info?.tipsterName||'TABtouch guide';
  const sourceClock=info?.startTime?.match(/^(\d{1,2}):(\d{2})/),startAt=sourceClock?`${DATE}T${sourceClock[1].padStart(2,'0')}:${sourceClock[2]}:00+08:00`:null;
  const resultDividend=(h,label)=>{if(!official||!h.placing||h.placing>3)return null;const name=clean(h.name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),place=`${h.placing}${h.placing===1?'st':h.placing===2?'nd':'rd'}`,slice=text.match(new RegExp(`${place}\\s+${h.number}\\s+${name}([\\s\\S]{0,220}?)(?=\\s+(?:[1-4](?:st|nd|rd|th)\\s+)?\\d+\\s+[A-Z]|$)`,'i'))?.[1]||'';return num(slice.match(new RegExp(`\\b${label}\\s+(\\d+(?:\\.\\d+)?)`,'i'))?.[1])};
  const runners=raw.map(h=>({number:num(h.number),name:clean(h.name).toUpperCase(),jockey:clean(h.rider||h.associatedName),barrier:num(h.barrier),weight:num(h.weight),scratched:!!(h.isScratched||h.isFobScratched||h.isToteOff),emergency:/\(EM\d+\)/i.test(h.name||''),placing:num(h.placing),winDividend:resultDividend(h,'W'),placeDividend:resultDividend(h,'P'),riderChanged:!!(h.isRiderChange||h.isRiderChanged),gear:declaredGear(h.number)}));
  const winners=official?runners.filter(h=>h.placing===1&&!h.scratched):[];
  const status=abandoned?'abandoned':official&&winners.length?'official':runners.some(h=>h.placing>0)?'provisional':'pending';
  const lead=runners.find(h=>h.number===selectionNumbers[0]);
  return {number,checked:now,startAt,latestTip:lead?{number:lead.number,name:lead.name,author:clean(author),checked:now,published:null}:null,source:`https://www.tabtouch.com.au/racing/${DATE}/mr/${number}`,sourceUpdated:info?.timestamp||null,condition:clean(info?.condition||text.match(/Track condition\s+((?:Good|Soft|Heavy|Firm|Synthetic)\s*\d*)/i)?.[1]),weather:clean(info?.weather||text.match(/Weather conditions\s+(.{1,25}?)\s+Track condition/i)?.[1]),distance:num(info?.distance)||num(text.match(/Distance\s+(\d+)m/i)?.[1]),status,winners,runners};
}
export function retryAfterTime(value,now=Date.now()){
 if(!value)return null;const seconds=Number(value);return Number.isFinite(seconds)?now+Math.max(0,seconds)*1000:(Number.isFinite(Date.parse(value))?Date.parse(value):null);
}
async function upstream(url){const r=await fetch(url,{headers:{accept:'text/html,application/json','user-agent':'GeoffsGuide/1.0 (+public race-day companion)'},signal:AbortSignal.timeout(12000)});if(!r.ok){const error=Error('Source unavailable');error.status=r.status;error.retryAt=retryAfterTime(r.headers.get('retry-after'));throw error}return r}
export async function fetchRace(number){if(!Number.isInteger(number)||number<1||number>9)throw Error('Invalid race');return parseRace(await(await upstream(`https://www.tabtouch.com.au/racing/${DATE}/mr/${number}`)).text(),number)}
export async function meeting({numbers=Array.from({length:9},(_,i)=>i+1)}={}){
 const races=[],errors=[];for(const n of numbers){try{races.push(await fetchRace(n))}catch(error){errors.push({number:n,message:'Race source unavailable',status:error.status||null});break}}
 return {date:DATE,checked:new Date().toISOString(),races,errors};
}
export async function weather(){
 const url='https://api.open-meteo.com/v1/forecast?latitude=-37.788&longitude=144.907&current=temperature_2m,precipitation,weather_code,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max&timezone=Australia%2FMelbourne&forecast_days=3';
 const d=await(await upstream(url)).json();if(!d.current||!d.daily)throw Error('Weather format changed');const i=d.daily.time.indexOf(DATE);
 return {checked:new Date().toISOString(),source:'https://open-meteo.com/en/docs',time:d.current.time,temperature:num(d.current.temperature_2m),rain:num(d.current.precipitation),wind:num(d.current.wind_speed_10m),code:num(d.current.weather_code),raceDay:i<0?null:{date:DATE,rain:num(d.daily.precipitation_sum[i]),chance:num(d.daily.precipitation_probability_max[i])}};
}
export async function liveResponse(request,ctx){
 const path=new URL(request.url).pathname;if(!['/api/meeting','/api/weather'].includes(path))return null;
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 try{const body=path==='/api/meeting'?await meeting():await weather(),partial=body.errors?.length>0;
  const response=Response.json(body,{status:path==='/api/meeting'&&!body.races.length?503:200,headers:{'cache-control':`public, max-age=${partial?30:path==='/api/meeting'?90:600}`,'x-content-type-options':'nosniff'}});
  return response;
 }catch{return Response.json({error:'Live source unavailable',checked:new Date().toISOString()},{status:503,headers:{'cache-control':'no-store'}})}
}
