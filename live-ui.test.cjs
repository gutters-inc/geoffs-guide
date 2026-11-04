const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const {window}=parseHTML(fs.readFileSync('dist/index.html','utf8')),document=window.document;
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this._value??this.options[0]?.value??''},set(v){this._value=String(v)},configurable:true});
const data=JSON.parse(fs.readFileSync('dist/data.json')),editorialData=JSON.parse(fs.readFileSync('dist/editorial.json'));
const saved=new Map(),location={hash:''};
const context=vm.createContext({window,document,console,location,history:{replaceState(_,__,hash){location.hash=hash}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},fetch:async(url)=>({ok:true,json:async()=>url==='data.json'?data:JSON.parse(fs.readFileSync('dist/'+url))}),setTimeout,Date,Map,Set,Error});
for(const f of ['model','views','ux','mobile','tips','ladder','live-model','live','app']){vm.runInContext(fs.readFileSync(`dist/${f}.js`,'utf8'),context);if(f==='model')context.FormModel=window.FormModel;if(f==='live-model')context.LiveForm=window.LiveForm}
setTimeout(()=>{
 try{
  assert(document.getElementById('loading').hidden);assert.equal(document.getElementById('raceName').textContent,'Crown Oaks');
  assert(!document.getElementById('formPanel').hidden);assert(document.getElementById('connectionsPanel').hidden);
  assert(document.title.includes('Geoffs Guide'));assert(document.querySelector('img[alt="Geoff"]'));
  // Every field retains working race navigation, runner details and an honest ladder edge.
  for(let n=1;n<=9;n++){
   vm.runInContext(`chooseRace(${n})`,context);
   const activeCount=data.races[n-1].horses.filter(h=>!h.scratched&&!h.emergency).length;
   assert.equal(document.querySelectorAll('#rankings tr').length,data.races[n-1].horses.length);
   assert.equal(document.querySelectorAll('.ladder-rung').length,Math.min(6,activeCount));
   assert.equal(document.querySelectorAll('.rung-explanation').length,Math.min(6,activeCount)-1);
   assert(document.querySelectorAll('.guide-card').length>=5);
   document.getElementById('showFullLadder').onclick();assert.equal(document.querySelectorAll('.ladder-rung').length,activeCount);
   for(const h of data.races[n-1].horses){vm.runInContext(`selectHorse(${JSON.stringify(h.name)})`,context);assert(document.getElementById('horseDetail').textContent.includes(h.display))}
  }
  vm.runInContext('chooseRace(8)',context);
  assert(document.getElementById('formLadder').textContent.includes('De Armas'));
  assert(document.getElementById('formLadder').textContent.includes('Icelady'));
  assert(document.getElementById('formLadder').textContent.includes('2.75L ahead'));
  assert(document.getElementById('formLadder').textContent.includes('traded places'));
  assert.equal(document.querySelector('#graph'),null);assert.equal(document.getElementById('priceCheck'),null);assert.equal(document.getElementById('offeredOdds'),null);assert.equal(document.getElementById('fairChance'),null);
  assert.equal(vm.runInContext('typeof valueMath',context),'undefined');
  // Tips are source-led, with no preference selector, pinning or promotions.
  document.getElementById('valueMode').onclick();assert(!document.getElementById('valuePanel').hidden);
  assert.equal(document.querySelectorAll('.guide-card').length,11);
  assert.equal(document.getElementById('trustedGuide'),null);assert.equal(document.getElementById('trustedOnly'),null);
  assert.equal(document.querySelector('[data-trust]'),null);assert.equal(document.getElementById('bookieSpecials'),null);
  assert(document.getElementById('guideCards').textContent.includes('Why this tip'));
  assert(document.getElementById('guideCards').textContent.includes('Track assumption'));
  vm.runInContext('chooseRace(1)',context);assert(document.getElementById('guideCards').textContent.includes('No bet'));
  vm.runInContext('chooseRace(5)',context);assert(document.getElementById('guideCards').textContent.includes('Scratched'));
  assert(!document.getElementById('tipsRoundup').textContent.includes('Fiorenot'));
  // Live scenario controls still update ratings and the ladder without recreating the input.
  vm.runInContext('chooseRace(8)',context);document.getElementById('simpleMode').onclick();
  const before=vm.runInContext('ranked.find(h=>h.name==="DE ARMAS").score',context);
  const bonus=document.querySelector('[data-bonus="DE ARMAS"]');bonus.value='0.1';bonus.oninput();
  assert(vm.runInContext('ranked.find(h=>h.name==="DE ARMAS").score',context)>before);assert.equal(document.querySelector('[data-bonus="DE ARMAS"]'),bonus);
  bonus.value='6';bonus.oninput();assert.equal(bonus.getAttribute('aria-invalid'),'true');
  document.getElementById('resetScenario').onclick();assert.equal(vm.runInContext('ranked.find(h=>h.name==="DE ARMAS").score',context),before);
  const a=document.getElementById('horseA'),b=document.getElementById('horseB');a.value='PROXIMA DEA';b.value='DE ARMAS';document.getElementById('maxHops').value='3';a.onchange();assert(document.getElementById('pathResult').textContent.includes('Voynichese'));
  document.getElementById('simpleMode').onkeydown({key:'End',preventDefault(){}});assert(!document.getElementById('connectionsPanel').hidden);
  document.querySelector('[data-ladder-horse="DE ARMAS"]').onclick();assert(document.getElementById('runnerDialog').hasAttribute('open'));document.getElementById('closeRunner').onclick();assert(!document.getElementById('runnerDialog').hasAttribute('open'));
  document.getElementById('previousRace').onclick();assert.equal(document.getElementById('mobileRaceSelect').value,'7');document.getElementById('nextRace').onclick();assert.equal(document.getElementById('mobileRaceSelect').value,'8');
  assert(document.getElementById('scenarioSettings').hasAttribute('open'));
  assert.equal(document.querySelectorAll('.control-group').length,3);
  const stamp=new Date().toISOString();
  context.liveFixture={date:'2026-11-05',checked:stamp,errors:[],races:[{number:8,checked:stamp,condition:'Soft6',status:'pending',distance:2500,source:'https://www.tabtouch.com.au/racing/2026-11-05/mr/8',winners:[],runners:data.races[7].horses.map(h=>({...h,scratched:h.name==='DE ARMAS'?true:h.scratched}))}]};
  vm.runInContext('livePrefs.followTrack=true;acceptLiveMeeting(liveFixture)',context);
  assert.equal(vm.runInContext('scenario.going',context),'Soft');
  assert.equal(vm.runInContext('active().some(h=>h.name==="DE ARMAS")',context),false);
  assert(document.getElementById('liveTrack').textContent.includes('Soft6'));
  document.querySelector('[data-ground-preset="Heavy"]').onclick();
  assert.equal(vm.runInContext('scenario.going',context),'Heavy');assert.equal(vm.runInContext('livePrefs.followTrack',context),false);
  vm.runInContext('acceptLiveMeeting(liveFixture)',context);assert.equal(vm.runInContext('scenario.going',context),'Heavy');
  document.getElementById('resetScenario').onclick();assert.equal(vm.runInContext('scenario.going',context),'all');assert.equal(vm.runInContext('livePrefs.followTrack',context),false);
  assert(document.getElementById('horseDetail').textContent.includes('Race-day context'));

  console.log('PASS: all nine mobile fields, 12 source identities, tips-only layout, no-bet/scratched exclusions, price UI removal, ladder evidence/expansion, preserved scenario controls, comparisons, navigation and runner sheet. DOM logic only; rendered browser QA unavailable.');
 }catch(e){console.error(e);process.exitCode=1}
},100);
