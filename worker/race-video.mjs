const RACE_VIDEO_INDEX='race-videos/2026-11-07/index.json';
const rvJSON=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
export async function raceVideoIndex(env){const o=await env.BUCKET?.get(RACE_VIDEO_INDEX);return o?await o.json():{videos:{}}}
export async function raceVideoResponse(request,env,ctx,services={}){
 const url=new URL(request.url),path=url.pathname;if(!path.startsWith('/api/race-videos')&&!path.startsWith('/race-videos/'))return null;
 if(!env.BUCKET)return rvJSON({error:'Video storage unavailable'},503);
 const bucket=env.BUCKET,now=services.now?.()??Date.now();
 if(path==='/api/race-videos'&&request.method==='GET')return rvJSON(await raceVideoIndex(env));
 const media=path.match(/^\/race-videos\/([1-9])\.(mp4|vtt)$/);
 if(media){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const key=`race-videos/2026-11-07/${media[1]}.${media[2]}`,head=await bucket.head(key);if(!head)return new Response('Not found',{status:404});
  const headers={'content-type':media[2]==='mp4'?'video/mp4':'text/vtt; charset=utf-8','cache-control':'public, max-age=60','content-length':String(head.size),'accept-ranges':'bytes'};let range;
  if(media[2]==='mp4'&&request.headers.has('range')){const m=request.headers.get('range').match(/^bytes=(\d*)-(\d*)$/);let start=Number(m?.[1]||0),end=m?.[2]?Number(m[2]):head.size-1;if(m&&!m[1]&&m[2]){start=Math.max(0,head.size-Number(m[2]));end=head.size-1}if(!m||!m[1]&&!m[2]||start>=head.size||end<start)return new Response(null,{status:416,headers:{...headers,'content-range':`bytes */${head.size}`}});end=Math.min(end,head.size-1);range={offset:start,length:end-start+1};headers['content-length']=String(range.length);headers['content-range']=`bytes ${start}-${end}/${head.size}`}
  if(request.method==='HEAD')return new Response(null,{status:range?206:200,headers});const object=await bucket.get(key,range?{range}:undefined);return new Response(object.body,{status:range?206:200,headers});
 }
 if(request.method!=='POST')return rvJSON({error:'Method not allowed'},405);
 if(!await authorisedMailWriter(request,env))return rvJSON({error:'Owner authorization required'},401);
 if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return rvJSON({error:'Same-origin required'},403);
 const text=await request.text();if(text.length>12000000)return rvJSON({error:'Payload too large'},413);let p;try{p=JSON.parse(text)}catch{return rvJSON({error:'Invalid JSON'},400)}
 if(p.action==='verify'){await bucket.put('race-videos/writer-verification.json',JSON.stringify({verifiedAt:new Date(now).toISOString()}));return rvJSON({writerVerified:true,verification:await (await bucket.get('race-videos/writer-verification.json')).json()})}
 const n=Number(p.race);if(!Number.isInteger(n)||n<1||n>9)return rvJSON({error:'Invalid race'},400);
 const ledgerKey=`race-videos/2026-11-07/r${n}-job.json`,existing=await bucket.get(ledgerKey);
 if(p.action==='status')return rvJSON(existing?await existing.json():{state:'not-started'});
 const snap=await storedMail(env),preview=snap.previews?.[String(n)],jump=Date.parse(preview?.jumpAt||''),prepared=Date.parse(preview?.preparedAt||'');
 if(!preview||!(prepared>=jump-600000&&prepared<jump))return rvJSON({error:'A valid saved ten-minute preview is required'},409);
 if(p.action==='claim'){
  if(existing)return rvJSON({claimed:false,job:await existing.json()});
  if(now<prepared||now>=jump||snap.meeting.races.find(r=>r.number===n)?.status!=='pending')return rvJSON({error:'Generation can only start before jump from the saved preview'},409);
  const job={race:n,state:'claimed',id:crypto.randomUUID(),preparedAt:preview.preparedAt,claimedAt:new Date(now).toISOString(),voiceId:'fokq7YjnEjprXL6oclZl',speechCreditCap:1000,videoCreditCap:16000};
  const written=await bucket.put(ledgerKey,JSON.stringify(job),{onlyIf:{etagDoesNotMatch:'*'}});return rvJSON(written?{claimed:true,job,preview}:{claimed:false,reason:'Another run already claimed this race'});
 }
 if(!existing)return rvJSON({error:'Claim this race first'},409);const job=await existing.json();if(job.id!==p.id)return rvJSON({error:'Wrong job ID'},409);if(job.state==='published')return rvJSON({published:true,idempotent:true});
 if(p.action==='progress'||p.action==='failed'){
  const update={...job,state:p.action==='failed'?'failed':String(p.state||'working').slice(0,40),updatedAt:new Date(now).toISOString()};for(const k of ['flowId','speechNodeId','videoNodeId','speechSessionId','videoSessionId','error'])if(p[k])update[k]=String(p[k]).slice(0,k==='error'?250:100);await bucket.put(ledgerKey,JSON.stringify(update));return rvJSON(update);
 }
 if(p.action!=='publish')return rvJSON({error:'Invalid action'},400);
 if(job.preparedAt!==preview.preparedAt||!['claimed','working','speech','video','finishing'].includes(job.state))return rvJSON({error:'Job is no longer publishable'},409);
 const duration=Number(p.duration);if(!Number.isFinite(duration)||duration<10||duration>45)return rvJSON({error:'Video must be10–45 seconds'},400);
 let bytes;try{bytes=Uint8Array.from(atob(p.videoBase64||''),c=>c.charCodeAt(0))}catch{return rvJSON({error:'Invalid video bytes'},400)}
 if(bytes.length<1000||bytes.length>8000000||String.fromCharCode(...bytes.slice(4,8))!=='ftyp')return rvJSON({error:'MP4 video required (8 MB maximum)'},400);
 const captions=String(p.captions||'');if(captions.length>30000||captions&&!captions.startsWith('WEBVTT'))return rvJSON({error:'Invalid captions'},400);
 await bucket.put(`race-videos/2026-11-07/${n}.mp4`,bytes,{httpMetadata:{contentType:'video/mp4'}});if(captions)await bucket.put(`race-videos/2026-11-07/${n}.vtt`,captions,{httpMetadata:{contentType:'text/vtt'}});
 // Merge concurrent publications using conditional retries rather than overwriting another race.
 const info={race:n,preparedAt:job.preparedAt,publishedAt:new Date(now).toISOString(),duration,video:`/race-videos/${n}.mp4`,...(captions?{captions:`/race-videos/${n}.vtt`}:{}),presenter:'Geoff',voice:{lang:'en-NZ',kind:'synthetic',recorded:true,embeddedAudio:true,engine:'ElevenLabs',voiceId:job.voiceId}};
 let saved=false;for(let attempt=0;attempt<5;attempt++){const obj=await bucket.get(RACE_VIDEO_INDEX),index=obj?await obj.json():{videos:{}};index.videos[String(n)]=info;const w=await bucket.put(RACE_VIDEO_INDEX,JSON.stringify(index),{onlyIf:obj?{etagMatches:obj.etag}:{etagDoesNotMatch:'*'}});if(w){saved=true;break}}
 if(!saved)return rvJSON({error:'Video saved but index busy; retry publication without regeneration'},503);
 await bucket.put(ledgerKey,JSON.stringify({...job,state:'published',publishedAt:info.publishedAt}));return rvJSON({published:true,info});
}
