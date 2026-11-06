// Standards-based, payload-free Web Push. The service worker reads its private mailbox.
const PUSH_CONFIG='push/config.json',PUSH_CONTROL='push/send-control.json';
const pushJSON=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const pushB64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export async function pushHash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('')}
export function pushEndpoint(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||u.href.length>4096||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].some(h=>u.hostname===h)&&!u.hostname.endsWith('.notify.windows.com'))throw Error('Unsupported push service');return u.href}
export async function vapidHeaders(endpoint,config,now=Date.now()){
 const encoder=new TextEncoder(),header=pushB64(encoder.encode(JSON.stringify({typ:'JWT',alg:'ES256'}))),claims=pushB64(encoder.encode(JSON.stringify({aud:new URL(endpoint).origin,exp:Math.floor(now/1000)+3600,sub:config.subject}))),data=header+'.'+claims;
 const key=await crypto.subtle.importKey('jwk',config.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encoder.encode(data));
 return {Authorization:`vapid t=${data}.${pushB64(sig)}, k=${config.publicKey}`,TTL:'3600',Urgency:'normal','Content-Length':'0'};
}
async function pushConfig(bucket){const o=await bucket.get(PUSH_CONFIG);return o?await o.json():null}
async function pushAdmin(request,config){const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';return !!token&&!!config&&await pushHash(token)===config.adminHash}
export async function sendPushBatch(bucket,config,subs,message,{fetcher=fetch,now=Date.now()}={}){
 const result={accepted:0,expired:0,failed:0,rateLimited:0,total:subs.length};
 for(let i=0;i<subs.length;i+=10)await Promise.all(subs.slice(i,i+10).map(async sub=>{
  try{
   await bucket.put(`push/messages/${sub.id}.json`,JSON.stringify({...message,createdAt:new Date(now).toISOString()}));
   const response=await fetcher(pushEndpoint(sub.endpoint),{method:'POST',headers:await vapidHeaders(sub.endpoint,config,now),redirect:'error',signal:AbortSignal.timeout(12000)});
   if(response.status>=200&&response.status<300)result.accepted++;
   else if([404,410].includes(response.status)){result.expired++;await bucket.delete(`push/subscriptions/${sub.id}.json`);await bucket.delete(`push/messages/${sub.id}.json`)}
   else if(response.status===429){result.rateLimited++;const retry=response.headers.get('retry-after'),seconds=Number(retry),at=Number.isFinite(seconds)&&seconds>0?now+seconds*1000:Date.parse(retry||'');result.retryAt=Math.max(result.retryAt||0,Number.isFinite(at)?at:now+300000)}else result.failed++;
  }catch{result.failed++}
 }));
 return result;
}
export async function pushResponse(request,env,ctx,services={}){
 const url=new URL(request.url),path=url.pathname;if(!path.startsWith('/api/push/'))return null;
 if(!env.BUCKET)return pushJSON({error:'Push storage unavailable'},503);
 const bucket=env.BUCKET,now=services.now?.()??Date.now();let config=await pushConfig(bucket);
 if(path==='/api/push/config'&&request.method==='GET')return pushJSON({enabled:!!config,publicKey:config?.publicKey||null});
 if(path==='/api/push/message'&&request.method==='GET'){
  const id=url.searchParams.get('id');if(!/^[a-f0-9]{64}$/.test(id||''))return pushJSON({error:'Invalid mailbox'},400);
  const o=await bucket.get(`push/messages/${id}.json`);if(!o)return pushJSON({error:'No message'},404);const m=await o.json();if(now-Date.parse(m.createdAt)>3600000)return pushJSON({error:'Message expired'},410);return pushJSON(m);
 }
 if(path==='/api/push/status'&&request.method==='GET'){
  if(!await pushAdmin(request,config))return pushJSON({error:'Sender key required'},401);
  const list=await bucket.list({prefix:'push/subscriptions/',limit:201}),last=await bucket.get('push/last-send.json');return pushJSON({subscribers:list.objects.length,lastSend:last?await last.json():null});
 }
 if(request.method!=='POST')return pushJSON({error:'Method not allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return pushJSON({error:'Same-origin request required'},403);
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))return pushJSON({error:'JSON required'},415);
 const body=await request.text();if(body.length>10000)return pushJSON({error:'Request too large'},413);let input;try{input=JSON.parse(body)}catch{return pushJSON({error:'Invalid JSON'},400)}
 if(path==='/api/push/setup'){
  if(!await authorisedMailWriter(request,env))return pushJSON({error:'Owner authorization required'},401);
  if(config)return pushJSON({configured:true,publicKey:config.publicKey});
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),adminKey=pushB64(crypto.getRandomValues(new Uint8Array(24)));
  config={publicKey:pushB64(await crypto.subtle.exportKey('raw',pair.publicKey)),privateKey:await crypto.subtle.exportKey('jwk',pair.privateKey),adminHash:await pushHash(adminKey),subject:url.origin,createdAt:new Date(now).toISOString()};
  const created=await bucket.put(PUSH_CONFIG,JSON.stringify(config),{onlyIf:{etagDoesNotMatch:'*'}});if(!created)return pushJSON({error:'Already configured'},409);return pushJSON({configured:true,publicKey:config.publicKey,adminKey});
 }
 if(!config)return pushJSON({error:'Push not configured yet'},503);
 if(['/api/push/subscribe','/api/push/unsubscribe','/api/push/test'].includes(path)){
  let endpoint;try{endpoint=pushEndpoint(input.endpoint)}catch{return pushJSON({error:'Invalid subscription endpoint'},400)}const id=await pushHash(endpoint),key=`push/subscriptions/${id}.json`;
  if(path.endsWith('/unsubscribe')){await bucket.delete(key);await bucket.delete(`push/messages/${id}.json`);return pushJSON({removed:true})}
  const existing=await bucket.get(key);
  if(path.endsWith('/subscribe')){
   if(!existing){const list=await bucket.list({prefix:'push/subscriptions/',limit:201});if(list.objects.length>=200)return pushJSON({error:'Subscriber limit reached'},503)}
   await bucket.put(key,JSON.stringify({id,endpoint,createdAt:existing?(await existing.json()).createdAt:new Date(now).toISOString()}));return pushJSON({subscribed:true,id});
  }
  if(!existing)return pushJSON({error:'Subscribe first'},404);
  const sub=await existing.json();if(sub.testAt&&now-sub.testAt<60000)return pushJSON({error:'Wait one minute before another test'},429);
  await bucket.put(key,JSON.stringify({...sub,testAt:now}));const r=await sendPushBatch(bucket,config,[sub],{id:crypto.randomUUID(),title:'Geoffs Guide push test',body:'Server push is connected. You can close the guide and receive Geoff’s updates.',url:'/',tag:'geoffs-guide-test'},{fetcher:services.fetcher||fetch,now});return pushJSON({...r,note:'Accepted by the push service does not confirm device display.'});
 }
 if(path==='/api/push/send'){
  if(!await pushAdmin(request,config))return pushJSON({error:'Sender key required'},401);
  const title=String(input.title||'').trim(),text=String(input.body||'').trim(),race=Number(input.race||0),id=String(input.id||'');
  if(!title||title.length>70||!text||text.length>180||!Number.isInteger(race)||race<0||race>9||!/^[\w-]{16,70}$/.test(id))return pushJSON({error:'Use a title (70 characters), message (180), and valid race'},400);
  const previous=await bucket.get(`push/sends/${id}.json`);if(previous)return pushJSON({...await previous.json(),duplicate:true});
  const control=await bucket.get(PUSH_CONTROL),state=control?await control.json():{};
  if((state.nextAt||0)>now)return pushJSON({error:'Please wait before another send',retryAt:state.nextAt},429);
  const lock=await bucket.put(PUSH_CONTROL,JSON.stringify({nextAt:now+60000}),{onlyIf:control?{etagMatches:control.etag}:{etagDoesNotMatch:'*'}});if(!lock)return pushJSON({error:'Another send is in progress'},409);
  const list=await bucket.list({prefix:'push/subscriptions/',limit:200}),subs=(await Promise.all(list.objects.map(async o=>{const s=await bucket.get(o.key);return s?await s.json():null}))).filter(Boolean),message={id,title,body:text,url:race?`/#race-${race}/race-day`:'/',tag:'geoffs-guide-'+id};
  const result={...await sendPushBatch(bucket,config,subs,message,{fetcher:services.fetcher||fetch,now}),title,at:new Date(now).toISOString(),note:'Accepted means the push service accepted it; device display is not confirmed.'};
  await bucket.put(`push/sends/${id}.json`,JSON.stringify(result));await bucket.put('push/last-send.json',JSON.stringify(result));if(result.retryAt)await bucket.put(PUSH_CONTROL,JSON.stringify({nextAt:Math.max(now+60000,result.retryAt)}),{onlyIf:{etagMatches:lock.etag}});
  return pushJSON(result);
 }
 return pushJSON({error:'Not found'},404);
}
