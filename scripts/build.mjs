import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),dir=path.join(root,'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const files={};function walk(folder){for(const ent of fs.readdirSync(folder,{withFileTypes:true})){if(['server','.openai'].includes(ent.name))continue;const full=path.join(folder,ent.name);if(ent.isDirectory())walk(full);else{const key='/'+path.relative(dir,full).split(path.sep).join('/');files[key]={type:mime[path.extname(full)]||'application/octet-stream',body:fs.readFileSync(full).toString('base64')}}}}walk(dir);
const live=fs.readFileSync(path.join(root,'worker/live.mjs'),'utf8').replaceAll('export ','');
const core=fs.readFileSync(path.join(dir,'model.js'),'utf8')+'\n'+fs.readFileSync(path.join(dir,'live-model.js'),'utf8');
const mail=fs.readFileSync(path.join(root,'worker/late-mail.mjs'),'utf8').replaceAll('export ','');
const factors=JSON.parse(fs.readFileSync(path.join(root,'config/factors.json'),'utf8'));
for(const k of ['preferRecent','followReportedGoing','useComparableResults'])if(typeof factors[k]!=='boolean')throw Error('Invalid managed factor: '+k);
for(const [k,min,max] of [['recentHalfLifeDays',7,90],['groundStrength',0,1],['minimumComparableResults',3,9],['drawCap',0,.35],['crowdMaximum',0,.15]])if(!Number.isFinite(factors[k])||factors[k]<min||factors[k]>max)throw Error('Invalid managed factor: '+k);

const source='const MANAGED_FACTORS='+JSON.stringify(factors)+';\n'+core+'\n'+live+'\n'+mail+'\nconst assets='+JSON.stringify(files)+`;\nexport default {async fetch(request,env,ctx){const saved=await lateMailResponse(request,env,ctx);if(saved)return saved;const api=await liveResponse(request,ctx);if(api)return api;const url=new URL(request.url),file=assets[url.pathname==='/'?'/index.html':url.pathname];if(!file)return new Response('Not found',{status:404});if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(file.body),c=>c.charCodeAt(0)),{headers:{'content-type':file.type,'cache-control':url.pathname.startsWith('/assets/')?'public, max-age=86400':'public, max-age=0, must-revalidate','x-content-type-options':'nosniff'}})}};`;
fs.mkdirSync(path.join(dir,'server'),{recursive:true});fs.writeFileSync(path.join(dir,'server/index.js'),source);fs.mkdirSync(path.join(dir,'.openai'),{recursive:true});fs.copyFileSync(path.join(root,'.openai/hosting.json'),path.join(dir,'.openai/hosting.json'));
console.log('Built self-contained Worker with '+Object.keys(files).length+' embedded assets');
