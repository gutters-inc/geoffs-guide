const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const {window}=parseHTML(fs.readFileSync('dist/index.html','utf8'));
const document=window.document;
// Supply the select value behaviour that this minimal DOM implementation omits.
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this._value??this.options[0]?.value??''},set(v){this._value=String(v)},configurable:true});
const data=JSON.parse(fs.readFileSync('dist/data.json','utf8'));
const errors=[];
const context=vm.createContext({window,document,console,location:{hash:''},history:{replaceState(){}},fetch:async()=>({ok:true,json:async()=>data}),setTimeout,Date,Map,Set,Error});
vm.runInContext(fs.readFileSync('dist/model.js','utf8'),context);context.FormModel=window.FormModel;
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
  console.log('PASS: all nine race tabs, every runner detail including scratchings, network modes, swap, chain depth, mixed chain and same-runner handling. DOM logic only; visual browser QA unavailable.');
 }catch(e){console.error(e);process.exitCode=1}
},100);
