import assert from 'node:assert/strict';import fs from 'node:fs';
import {memoryBucket} from './test-bucket.mjs';
import {POLL_POLICY,acquirePollLease,releasePollLease,pollTargets,sourceBackoff,fetchPollSources} from './worker/polling.mjs';
import {lateMailResponse,buildLateMail} from './worker/late-mail.mjs';
import {createRequire} from 'node:module';import LM from './scripts/test-live-model.mjs';const M=createRequire(import.meta.url)('./dist/model.js');
const read=x=>JSON.parse(fs.readFileSync(x)),seed=read('dist/late-mail.json'),original=read('dist/data.json'),editorial=read('dist/editorial.json'),gearBase=read('dist/gear-baseline.json');
const jump=Date.parse(seed.meeting.races[0].startAt);
assert.equal(pollTargets(seed,'pre',1,jump-601000).numbers.length,0);assert.deepEqual(pollTargets(seed,'pre',1,jump-600000).numbers,[1]);assert.equal(pollTargets(seed,'pre',1,jump).numbers.length,0);
assert.equal(pollTargets(seed,'post',1,jump+179000).numbers.length,0);assert.deepEqual(pollTargets(seed,'post',1,jump+180000).numbers,[1]);assert.equal(pollTargets(seed,'post',1,jump+2700001).numbers.length,0);
const official=structuredClone(seed);official.meeting.races[0].status='official';assert.equal(pollTargets(official,'post',1,jump+600000).numbers.length,0);
const bucket=memoryBucket();const claims=await Promise.all(Array.from({length:20},()=>acquirePollLease(bucket,jump)));assert.equal(claims.filter(x=>!x.deferred).length,1,'Only one concurrent writer may poll');let lease=claims.find(x=>!x.deferred);await releasePollLease(bucket,lease);
assert.equal(sourceBackoff({status:429,retryAt:jump+900000},1,jump),jump+900000);assert(sourceBackoff({},3,jump)>sourceBackoff({},2,jump));assert.equal(sourceBackoff({status:403},1,jump),jump+3600000);
let now=jump+180000,requests=[],weatherCalls=0;lease=await acquirePollLease(bucket,now);
const services={now:()=>now,pause:async ms=>{now+=ms},race:async number=>{requests.push(number);return {...seed.meeting.races.find(r=>r.number===number),checked:new Date(now).toISOString()}},weather:async()=>{weatherCalls++;return {checked:new Date(now).toISOString()}}};
let result=await fetchPollSources({previous:seed,phase:'post',race:1,lease,services,now});assert.deepEqual(requests,[1]);assert.equal(weatherCalls,0);assert.equal(result.feed.races.length,1);
result=await fetchPollSources({previous:seed,phase:'post',race:1,lease,services,now});assert(result.deferred);assert.deepEqual(requests,[1]);await releasePollLease(bucket,lease);
now+=POLL_POLICY.raceCooldownMs;lease=await acquirePollLease(bucket,now);const limited={...services,race:async()=>{const e=Error('429');e.status=429;e.retryAt=now+900000;throw e}};
result=await fetchPollSources({previous:seed,phase:'post',race:1,lease,services:limited,now});assert.equal(result.feed.races.length,0);assert.equal(Date.parse(result.sourceCooldown),now+900000);await releasePollLease(bucket,lease);
lease=await acquirePollLease(bucket,now+1000);result=await fetchPollSources({previous:seed,phase:'post',race:1,lease,services,now:now+1000});assert(result.deferred);assert.equal(requests.length,1);await releasePollLease(bucket,lease);
const budgetLease={state:{races:{},host:{day:new Date(now).toISOString().slice(0,10),dayAttempts:30,attempts:Array(30).fill(now-1000)},weather:{}}};assert((await fetchPollSources({previous:seed,phase:'post',race:1,lease:budgetLease,services,now})).deferred);budgetLease.state.host.attempts=[];budgetLease.state.host.dayAttempts=90;assert((await fetchPollSources({previous:seed,phase:'post',race:1,lease:budgetLease,services,now})).deferred);
// A late release from an expired owner cannot clobber the newer owner's lease.
const b2=memoryBucket(),oldLease=await acquirePollLease(b2,jump),newLease=await acquirePollLease(b2,jump+POLL_POLICY.leaseMs+1);assert(!newLease.deferred);assert.equal(await releasePollLease(b2,oldLease),null);
// Interim placings freeze tips even if the result page has lost the start time.
const pre=buildLateMail({original,editorial,gearBase,feed:seed.meeting,notes:[],runKey:'2026-11-07-r1-pre-1230',now:new Date(jump-600000).toISOString()},M,LM),feed=structuredClone(seed.meeting);feed.races[0].status='provisional';feed.races[0].startAt=null;feed.races[0].runners[0].placing=1;feed.races[0].winners=[];
const interim=buildLateMail({original,editorial,gearBase,feed,previous:pre,notes:[],runKey:'2026-11-07-r1-post-1243',now:new Date(jump+180000).toISOString()},M,LM);assert(interim.selections[1].frozen);assert.deepEqual(interim.selections[1].revisedTip,pre.selections[1].revisedTip);assert(interim.selections[1].startAt);assert.equal(LM.signals(interim.meeting,{number:2,distance:1600,going:'Good4'}).completed.length,0);
// Even the legacy public routes must serve saved data without a source request.
globalThis.assets=Object.fromEntries([['/late-mail.json',seed]].map(([key,obj])=>[key,{body:Buffer.from(JSON.stringify(obj)).toString('base64')}]));for(const path of ['/api/late-mail','/api/meeting','/api/weather']){const r=await lateMailResponse(new Request('https://test'+path),{}, {},{race:()=>{throw Error('Public upstream request')}});assert.equal(r.status,200)}
console.log('PASS: pre/post windows, targeted reads, shared conditional lease, 20 concurrent callers, cooldowns, Retry-After, backoff, final-result stop, interim freeze and public saved-only routes.');
