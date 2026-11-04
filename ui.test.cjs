const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const {window}=parseHTML(fs.readFileSync('dist/index.html','utf8'));
const document=window.document;
// Supply the select value behaviour that this minimal DOM implementation omits.
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this._value??this.options[0]?.value??''},set(v){this._value=String(v)},configurable:true});
const data=JSON.parse(fs.readFileSync('dist/data.json','utf8'));
const errors=[];
const context=vm.createContext({window,document,console,location:{hash:''},history:{replaceState(){}},fetch:async(url)=>({ok:true,json:async()=>url==='media.json'?JSON.parse(fs.readFileSync('dist/media.json','utf8')):data}),setTimeout,Date,Map,Set,Error});
vm.runInContext(fs.readFileSync('dist/model.js','utf8'),context);context.FormModel=window.FormModel;
vm.runInContext(fs.readFileSync('dist/views.js','utf8'),context);
vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context);
setTimeout(()=>{
 try{
  assert.equal(document.getElementById('loading').hidden,true);
  assert.equal(document.getElementById('raceName').textContent,'Crown Oaks');
  assert(document.getElementById('verdict').textContent.includes('De Armas'));
  for(let n=1;n<=9;n++){
   vm.runInContext(`chooseRace(${n})`,context);
   assert.equal(document.querySelectorAll('#raceTabs button').length,9);
   assert.equal(document.querySelectorAll('#rankings tr').length,data.races[n-1].horses.length);
   for(const h of data.races[n-1].horses){vm.runInContext(`selectHorse(${JSON.stringify(h.name)})`,context);assert(document.getElementById('horseDetail').textContent.includes(h.display));}
   document.getElementById('swap').onclick();document.getElementById('focusView').onclick();document.getElementById('allView').onclick();
  }
  vm.runInContext('chooseRace(8)',context);
  const a=document.getElementById('horseA'),b=document.getElementById('horseB');a.value='PROXIMA DEA';b.value='DE ARMAS';document.getElementById('maxHops').value='3';a.onchange();
  assert(document.getElementById('pathResult').textContent.includes('Voynichese'));
  assert(document.getElementById('pathResult').textContent.includes('mixed directions'));
  document.getElementById('maxHops').value='1';document.getElementById('maxHops').onchange();assert(document.getElementById('pathResult').textContent.includes('No connection'));
  b.value=a.value;b.onchange();assert(document.getElementById('pathResult').textContent.includes('two different horses'));
  assert.equal(document.querySelectorAll('.contender-card').length,3);
  assert.equal(document.querySelectorAll('.form-lane').length,data.races[7].horses.filter(h=>!h.scratched&&!h.emergency).length);
  const before=vm.runInContext('ranked.find(h=>h.name==="DE ARMAS").score',context);
  const input=document.querySelector('[data-bonus="DE ARMAS"]');input.value='1';input.onchange();
  assert(vm.runInContext('ranked.find(h=>h.name==="DE ARMAS").score',context)>before);
  assert(document.getElementById('scenarioStatus').textContent.includes('active'));
  const kg=document.querySelector('[data-weight="DE ARMAS"]');kg.value='57';kg.onchange();assert(document.getElementById('handicapInput').checked);
  const going=document.getElementById('goingInput');going.value='Heavy';going.onchange({target:going});assert(document.getElementById('scenarioStatus').textContent.includes('Heavy'));
  document.getElementById('matrixView').onclick();assert(document.querySelectorAll('.matrix-cell').length>10);
  const cell=document.querySelector('[data-match-a="DE ARMAS"][data-match-b="ICELADY"]');cell.onclick();assert(!document.body.classList.contains('simple-mode'));assert(document.getElementById('pathResult').textContent.includes('Icelady'));
  document.getElementById('simpleMode').onclick();assert(document.body.classList.contains('simple-mode'));
  document.getElementById('lanesView').onclick();document.getElementById('resetScenario').onclick();assert.equal(vm.runInContext('ranked.find(h=>h.name==="DE ARMAS").score',context),before);
  assert(document.querySelectorAll('.race-silk').length>20);assert(document.querySelector('img[alt="De Armas"]'));
  console.log('PASS: all nine races, runner details, network modes, comparisons, simple/explore toggle, photo/silks, lanes, matrix drill-down, ground, weight, custom edge and reset. DOM logic only; visual browser QA unavailable.');
 }catch(e){console.error(e);process.exitCode=1}
},100);
