const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{parseHTML}=require('linkedom');
const original=JSON.parse(fs.readFileSync('dist/data.json')),edition=JSON.parse(fs.readFileSync('dist/late-mail.json')),html=fs.readFileSync('dist/index.html','utf8');
const scripts=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]);
async function boot({hash='',failure='',delay=false}={}){
 const {window}=parseHTML(html),document=window.document,requests=[],calls=[];let release;
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this._value??this.options[0]?.value??''},set(v){this._value=String(v)},configurable:true});
 const location={hash},data=structuredClone(original),snapshot=structuredClone(edition);let promise=delay?new Promise(r=>{release=r}):Promise.resolve();
 const context=vm.createContext({window,document,console,location,history:{replaceState(_,__,hash){location.hash=hash}},localStorage:{getItem(){throw Error('Public UI must not use private factor preferences')},setItem(){throw Error('No public factor settings')}},fetch:async(url,options)=>{requests.push({url,options});if(url==='/api/late-mail'){await promise;if(failure)throw Error('Saved store unavailable');return {ok:true,json:async()=>snapshot}}if(url==='late-mail.json'&&failure==='all')throw Error('Fallback unavailable');return {ok:true,json:async()=>url==='data.json'?data:JSON.parse(fs.readFileSync('dist/'+url))}},setTimeout,clearTimeout,Date,Map,Set,Error});
 for(const script of scripts){vm.runInContext(fs.readFileSync('dist/'+script,'utf8'),context);if(script==='model.js')context.FormModel=window.FormModel}
 await new Promise(r=>setTimeout(r,30));return {context,document,location,data,snapshot,requests,release};
}
(async()=>{
 // Pass 1: every race, every tab, field expansion and all listed runner sheets.
 const app=await boot();const {context,document,location}=app;assert(document.getElementById('loading').hidden);assert.equal(document.querySelectorAll('[role="tab"]').length,4);
 assert.equal(document.querySelectorAll('input').length,0);assert.equal(document.querySelectorAll('select').length,1);assert.equal(document.querySelectorAll('.scenario-panel,.impact-dashboard,.moves-panel,.visual-card,.live-panel').length,0);
 assert.equal(document.querySelector('[data-trust]'),null);assert.equal(document.querySelector('.upload-photo'),null);
 assert.equal(document.querySelectorAll('link[rel="stylesheet"]').length,1);assert.match(document.querySelector('link[rel="stylesheet"]').getAttribute('href'),/^results\.css(?:\?v=\d+)?$/);assert.equal(document.querySelector('.intro'),null);assert(fs.readFileSync('dist/ig.css','utf8').includes('#e61e1e'));assert(fs.readFileSync('dist/results.css','utf8').includes('.official-race-result'));
 assert.equal(vm.runInContext("selectionConfidence(null).level",context),'withheld');
 assert.equal(vm.runInContext("selectionConfidence({evidence:'Sparse',score:99}).level",context),'low');
 assert.equal(vm.runInContext("selectionConfidence({evidence:'Supported'}).level",context),'moderate');
 assert.equal(vm.runInContext("selectionConfidence({evidence:'Supported'},{live:true,checked:'2020-01-01'}).level",context),'low');
 assert.equal(document.querySelectorAll('#contenderCards .selection-confidence').length,3);
 assert(document.querySelector('img[alt="Geoff"]'));assert(document.getElementById('homeLastUpdated').textContent.includes('LAST UPDATED'));
 for(let n=1;n<=9;n++){
  vm.runInContext(`chooseRace(${n})`,context);const frozen=vm.runInContext('JSON.stringify(baseline.map(h=>[h.name,h.score]))',context);
  for(const [tab,panel] of [['simpleMode','formPanel'],['raceDayMode','raceDayPanel'],['valueMode','valuePanel'],['exploreMode','connectionsPanel']]){
   document.getElementById(tab).onclick();assert(!document.getElementById(panel).hidden);assert.equal(['formPanel','raceDayPanel','valuePanel','connectionsPanel'].filter(id=>!document.getElementById(id).hidden).length,1);
   assert.equal(document.getElementById(tab).getAttribute('aria-selected'),'true');assert.equal(vm.runInContext('JSON.stringify(baseline.map(h=>[h.name,h.score]))',context),frozen);
  }
  assert.equal(document.querySelectorAll('.contender-card').length,3);assert.equal(document.querySelectorAll('.field-runner').length,original.races[n-1].horses.length);
  assert(document.querySelectorAll('.guide-card').length>=5);assert(document.getElementById('guideCards').textContent.includes('Track & run assumptions'));
  assert.equal(document.querySelectorAll('.ladder-rung').length,Math.min(4,original.races[n-1].horses.filter(h=>!h.scratched&&!h.emergency).length));
  document.getElementById('showFullLadder').onclick();assert.equal(document.querySelectorAll('.ladder-rung').length,original.races[n-1].horses.filter(h=>!h.scratched&&!h.emergency).length);
  document.getElementById('simpleMode').onclick();document.querySelector('.full-field').open=true;
  for(const h of original.races[n-1].horses){vm.runInContext(`inspectRunner(${JSON.stringify(h.name)})`,context);assert(document.getElementById('horseDetail').textContent.includes(require('./dist/model.js').title(h.name)));assert(document.getElementById('runnerDialog').hasAttribute('open'));document.getElementById('closeRunner').onclick();assert(!document.getElementById('runnerDialog').hasAttribute('open'))}
 }
 // Pass 2: mobile navigation, route preservation, keyboard and freshness.
 let anchored=0;document.getElementById('raceStart').scrollIntoView=()=>{anchored++};
 vm.runInContext('chooseRace(1)',context);assert(document.getElementById('previousRace').disabled);document.getElementById('nextRace').onclick();assert.equal(document.getElementById('mobileRaceSelect').value,'2');
 const picker=document.getElementById('mobileRaceSelect');picker.value='9';picker.onchange({target:picker});assert(document.getElementById('nextRace').disabled);
 document.getElementById('simpleMode').onkeydown({key:'Home',preventDefault(){}});document.getElementById('simpleMode').onkeydown({key:'ArrowRight',preventDefault(){}});assert(!document.getElementById('raceDayPanel').hidden);assert(location.hash.includes('/race-day'));
 document.getElementById('raceDayMode').onkeydown({key:'End',preventDefault(){}});assert(!document.getElementById('connectionsPanel').hidden);
 const stamp=document.getElementById('homeLastUpdated').textContent;document.getElementById('simpleMode').onclick();document.getElementById('openLateMail').onclick();assert(!document.getElementById('raceDayPanel').hidden);assert.equal(document.getElementById('homeLastUpdated').textContent,stamp);
 vm.runInContext('chooseRace(3)',context);assert(document.getElementById('lateMailComparison').textContent.includes('Top pick remains'));assert(document.getElementById('lateMailComparison').textContent.includes('confidence remains low'));assert(document.getElementById('lateMailGear').textContent.includes('Blinkers'));assert(document.getElementById('lateMailFactors').textContent.includes('Soft5'));assert(document.getElementById('lateMailOpinions').textContent.includes('scratched'));
 const originalRanks=vm.runInContext('JSON.stringify(baseline.map(h=>[h.name,h.score]))',context);vm.runInContext('acceptSavedMail(lateMail)',context);assert.equal(vm.runInContext('JSON.stringify(baseline.map(h=>[h.name,h.score]))',context),originalRanks);
 const retimed=structuredClone(edition);retimed.meeting.races.find(r=>r.number===3).startAt='2026-11-05T11:25:00+08:00';context.retimed=retimed;vm.runInContext('acceptSavedMail(retimed)',context);assert(document.getElementById('raceMeta').textContent.includes('14:25'));assert(document.getElementById('lateMailFactors').textContent.includes('Race report checked'));
 assert(app.requests.every(r=>!r.options?.method||r.options.method==='GET'));assert(app.requests.every(r=>!['/api/meeting','/api/weather'].includes(r.url)));
 // Saved result/abandonment states must not manufacture a new prediction.
 const completed=structuredClone(edition),r=completed.meeting.races.find(r=>r.number===1);r.status='official';r.winners=[r.runners.find(h=>!h.scratched&&!h.emergency)];completed.selections['1'].status='official';completed.selections['1'].frozen=true;
 context.savedResult=completed;vm.runInContext('acceptSavedMail(savedResult);chooseRace(1)',context);assert(document.getElementById('lateMailComparison').textContent.includes('Winner:'));assert(document.querySelector('.official-race-result'));assert(document.getElementById('lateMailComparison').textContent.includes('Saved pre-race tip:'));assert(document.querySelector('#lateMailResults .mail-result-official'));
 assert(document.querySelector('#formPanel .form-result-card'));assert(document.getElementById('formResultReview').textContent.includes('OFFICIAL RESULT'));assert(document.getElementById('formResultReview').textContent.includes('WHAT'));
 assert(document.querySelector('.result-celebration'));assert.match(document.querySelector('.result-celebration').textContent,/WINNER|TOP-THREE|WINNER COVERED|RESULT REVIEW/);
 assert(anchored>0,'Navigation should return to race content, not the cover');
 const prior=edition.selections['1'].revisedTip?.name;assert.equal(vm.runInContext('lateMail.selections[1].revisedTip?.name',context),prior);
 completed.meeting.races.find(r=>r.number===2).status='abandoned';completed.selections['2'].status='abandoned';context.savedResult=completed;vm.runInContext('acceptSavedMail(savedResult);chooseRace(2)',context);assert(document.getElementById('lateMailBadge').textContent.includes('ABANDONED'));
 // Pass 3: failed saved store, total failure, delayed load and direct links.
 for(const failure of ['api','all']){const a=await boot({failure,hash:'#race-3/race-day'});assert(a.document.getElementById('loading').hidden);assert(!a.document.getElementById('raceDayPanel').hidden);if(failure==='api')assert(a.document.getElementById('lateMailStamp').textContent.includes('fallback'));else assert(a.document.getElementById('lateMailStamp').textContent.includes('No saved check'));a.document.getElementById('valueMode').onclick();assert(a.document.querySelectorAll('.guide-card').length>0)}
 const delayed=await boot({delay:true});vm.runInContext('chooseRace(2)',delayed.context);delayed.document.getElementById('raceDayMode').onclick();delayed.release();await new Promise(r=>setTimeout(r,30));assert.equal(delayed.document.getElementById('mobileRaceSelect').value,'2');assert(delayed.document.getElementById('lateMailComparison').textContent.includes('Misty Whisper'));
 for(const hash of ['#race-2/late-mail','#race-5/tips','#race-8/connections']){const a=await boot({hash});assert(a.document.getElementById('loading').hidden);assert.equal(['formPanel','raceDayPanel','valuePanel','connectionsPanel'].filter(id=>!a.document.getElementById(id).hidden).length,1)}
 console.log('PASS: 36 race/tab journeys, 149 runner sheets, one race picker/no factor controls, source details, keyboard/deep links, immutable form and saved/fallback/missing/delayed editions. DOM checks; rendered mobile browser unavailable.');
})().catch(e=>{console.error(e);process.exitCode=1});
