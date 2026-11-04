export const DATE='2026-11-05';
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
  const runners=raw.map(h=>({number:num(h.number),name:clean(h.name).toUpperCase(),jockey:clean(h.rider||h.associatedName),barrier:num(h.barrier),weight:num(h.weight),scratched:!!(h.isScratched||h.isFobScratched||h.isToteOff),emergency:/\(EM\d+\)/i.test(h.name||''),placing:num(h.placing)}));
  const winners=official?runners.filter(h=>h.placing===1&&!h.scratched):[];
  const status=abandoned?'abandoned':official&&winners.length?'official':runners.some(h=>h.placing>0)?'provisional':'pending';
  return {number,checked:now,source:`https://www.tabtouch.com.au/racing/${DATE}/mr/${number}`,sourceUpdated:info?.timestamp||null,condition:clean(info?.condition||text.match(/Track condition\s+((?:Good|Soft|Heavy|Firm|Synthetic)\s*\d*)/i)?.[1]),weather:clean(info?.weather||text.match(/Weather conditions\s+(.{1,25}?)\s+Track condition/i)?.[1]),distance:num(info?.distance)||num(text.match(/Distance\s+(\d+)m/i)?.[1]),status,winners,runners};
}
async function upstream(url){const r=await fetch(url,{headers:{accept:'text/html,application/json','user-agent':'GeoffsGuide/1.0 (+public race-day companion)'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Source unavailable');return r}
export async function meeting(){
 const races=[],errors=[];let next=1;
 await Promise.all(Array.from({length:3},async()=>{while(next<=9){const n=next++;try{races.push(parseRace(await(await upstream(`https://www.tabtouch.com.au/racing/${DATE}/mr/${n}`)).text(),n))}catch{errors.push({number:n,message:'Race feed unavailable or format changed'})}}}));
 return {date:DATE,checked:new Date().toISOString(),races:races.sort((a,b)=>a.number-b.number),errors};
}
export async function weather(){
 const url='https://api.open-meteo.com/v1/forecast?latitude=-37.788&longitude=144.907&current=temperature_2m,precipitation,weather_code,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max&timezone=Australia%2FMelbourne&forecast_days=3';
 const d=await(await upstream(url)).json();if(!d.current||!d.daily)throw Error('Weather format changed');const i=d.daily.time.indexOf(DATE);
 return {checked:new Date().toISOString(),source:'https://open-meteo.com/en/docs',time:d.current.time,temperature:num(d.current.temperature_2m),rain:num(d.current.precipitation),wind:num(d.current.wind_speed_10m),code:num(d.current.weather_code),raceDay:i<0?null:{date:DATE,rain:num(d.daily.precipitation_sum[i]),chance:num(d.daily.precipitation_probability_max[i])}};
}
export async function liveResponse(request,ctx){
 const path=new URL(request.url).pathname;if(!['/api/meeting','/api/weather'].includes(path))return null;
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 const key=new Request(new URL(path,request.url).href),cache=globalThis.caches?.default;
 const cached=await cache?.match(key);if(cached)return cached;
 try{const body=path==='/api/meeting'?await meeting():await weather(),partial=body.errors?.length>0;
  const response=Response.json(body,{status:path==='/api/meeting'&&!body.races.length?503:200,headers:{'cache-control':`public, max-age=${partial?30:path==='/api/meeting'?90:600}`,'x-content-type-options':'nosniff'}});
  if(response.ok&&cache)ctx?.waitUntil(cache.put(key,response.clone()));return response;
 }catch{return Response.json({error:'Live source unavailable',checked:new Date().toISOString()},{status:503,headers:{'cache-control':'no-store'}})}
}
