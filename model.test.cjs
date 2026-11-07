const assert=require('node:assert/strict');
const M=require('./dist/model.js');
const run=(date,winner,pos,margin,track='Test')=>({date,winner,pos,margin,track,distance:2000,raceTime:'2:00',grade:'G2',total:8});
const horse=(name,history)=>({name,display:name,number:1,history,scratched:false,emergency:false});
const fixture={date:'2026-11-05',races:[{number:1,distance:2000,horses:[
  horse('A',[run('2026-10-10','A',1,0)]),
  horse('B',[run('2026-10-10','A',3,2),run('2026-10-20','B',1,0)]),
  horse('C',[run('2026-10-20','B',4,3)]),
  horse('D',[])
]}]};
const g=M.build(fixture),race=fixture.races[0];
const p=M.path(g,'A','C',2);assert.equal(p.length,2);assert.deepEqual(p.map(s=>s.delta),[2,3]);
assert.equal(M.path(g,'A','C',1),null);
assert.deepEqual(M.path(g,'C','A',2).map(s=>s.delta),[-3,-2]);
assert.equal(M.path(g,'A','D',4),null);assert.notEqual(g.components.get('A'),g.components.get('D'));
const ranked=M.rate(g,race),byName=new Map(ranked.map(h=>[h.name,h]));
assert(byName.get('A').raw>byName.get('B').raw);assert(byName.get('B').raw>byName.get('C').raw);
assert.equal(byName.get('D').score,50);assert.equal(byName.get('D').evidence,'Sparse');
fixture.races[0].horses[0].history.push(run('2026-11-06','FUTURE',2,50));assert.equal(M.build(fixture).nodes.has('FUTURE'),false);
// Keep both directions when later form reverses, and use the most recent meeting in paths.
fixture.races[0].horses[0].history.push(run('2026-10-25','B',2,1));
const reversed=M.build(fixture);assert.equal(reversed.adjacency.get('A').get('B').length,2);assert.equal(M.path(reversed,'A','B',1)[0].delta,-1);
// Real data invariants: margins, historical dates, valid path evidence, finite scores, exclusions.
const data=require('./dist/data.json'),actual=M.build(data);
for(const r of data.races){const ranks=M.rate(actual,r);for(const h of ranks){assert(Number.isFinite(h.score));assert(h.score>5&&h.score<95);if(h.scratched||h.emergency)assert(!h.eligible)}
  for(const h of r.horses)for(const s of h.history){assert(s.date<'2026-11-07');assert(s.margin>=0);if(s.pos===1)assert.equal(s.margin,0)}
}
for(const e of actual.observations){assert(actual.adjacency.get(e.a).has(e.b));assert(e.race.results.has(e.a)&&e.race.results.has(e.b))}
console.log('PASS: chain direction, depth, missing connections, ratings, reversals, future leakage and all nine race datasets.');
// Scenario controls change only ratings; observed margins and paths remain intact.
const weighted={races:[{distance:2000,horses:[
 {...horse('LIGHT',[{...run('2026-10-20','LIGHT',1,0),weight:'56kg',winnerWeight:56,going:'Soft'}]),weight:56,barrier:1},
 {...horse('HEAVY',[{...run('2026-10-20','LIGHT',2,1),weight:'56kg',winnerWeight:56,going:'Soft'}]),weight:56,barrier:8}
]}]};
const wg=M.build(weighted),wr=weighted.races[0];
const raw=(options,n='LIGHT')=>M.rate(wg,wr,options).find(h=>h.name===n).raw;
assert.equal(raw({}),raw({going:'all',handicap:false,drawBias:0,overrides:{}}));
assert(raw({handicap:true,kgFactor:.5,overrides:{LIGHT:{weight:58}}})<raw({}),'More carried weight must hurt');
assert(raw({handicap:true,kgFactor:.5,overrides:{LIGHT:{weight:54}}})>raw({}),'Less carried weight must help');
assert.equal(raw({handicap:true,kgFactor:0,overrides:{LIGHT:{weight:58}}}),raw({}));
assert.equal(raw({overrides:{LIGHT:{bonus:1}}})-raw({}),1);
assert.equal(raw({drawBias:-.5})-raw({}),.5);
assert.equal(raw({drawBias:-.5},'HEAVY')-raw({},'HEAVY'),-.5);
const sample=wg.observations[0];assert(M.weight(sample,2000,{going:'Soft'})>M.weight(sample,2000,{going:'Good'}));
assert.equal(M.rate(wg,wr,{going:'Heavy'})[0].evidence,'Sparse');
assert.equal(M.path(wg,'LIGHT','HEAVY',1)[0].delta,1);
assert.equal(M.comparison(wg,'LIGHT','HEAVY').direction,'supports');
assert.equal(M.comparison(wg,'HEAVY','LIGHT').direction,'opposes');
assert.equal(M.comparison(g,'A','D').kind,'disconnected');
assert.equal(M.comparison(g,'A','C').kind,'indirect');
assert.equal(M.comparison(g,'A','C').commonRival,'B');
assert.equal(M.comparison(reversed,'A','B').reversal,true);
assert.equal(raw({going:'Good',groundStrength:0}),raw({}),'Zero ground preference must restore baseline ratings');
assert.equal(M.weight(sample,2000,{going:'Good',groundStrength:1}),0,'Maximum matching preference excludes nonmatching ground');
assert(M.weight(sample,2000,{going:'Good',groundStrength:.2})>M.weight(sample,2000,{going:'Good',groundStrength:.8}),'Sensitivity changes evidence smoothly');
console.log('PASS: neutral scenario, handicap direction and zero coefficient, draw bias, manual lengths, ground reweighting, sparse-ground flag and unchanged results.');

// Shared groups and duplicate guide identities cannot create extra crowd votes.
const voices=[{id:'one',name:'One',group:'Shared',picks:{1:'A'}},{id:'two',name:'Two',group:'Shared',picks:{1:'A'}},{id:'three',name:'Three',group:'Other',picks:{1:'B'}},{id:'abstain',name:'Abstain',picks:{1:null}}];
for(const voice of voices)voice.date='2026-11-07';
const consensus=M.crowd([...voices,voices[0]],race,{strength:.1});
assert.equal(consensus.guideCount,3);assert.equal(consensus.groupCount,2);
assert.equal(consensus.bonuses.A,.05);assert.equal(consensus.bonuses.B,.05);
assert.equal(consensus.bonuses.C,undefined);
const withVotes=M.rate(g,race,{crowdBonuses:consensus.bonuses});
assert.equal(withVotes.find(h=>h.name==='A').crowdBonus,.05);
assert.equal(M.rate(g,race,{crowdBonuses:{D:.5}}).find(h=>h.name==='D').crowdBonus,0,'Missing form must not acquire an average plus a crowd bonus');
assert.equal(M.crowd(voices,race,{excludedGuides:['one','two','three']}).guideCount,0);
const scratchedRace={...race,horses:race.horses.map(h=>({...h,scratched:h.name==='A'}))};
assert.equal(M.crowd(voices,scratchedRace).bonuses.A,undefined);
assert.equal(M.crowd(voices,race,{strength:10}).bonuses.A,.075);
console.log('PASS: crowd deduplication, group discounting, exclusions, missing-form protection and bounded boosts.');

// Recent conflicting race evidence outranks stale published opinion.
const recencyRace={number:1,distance:2000,horses:[horse('A',[run('2026-11-01','A',1,0),run('2026-09-20','B',2,4)]),horse('B',[run('2026-11-01','A',2,2),run('2026-09-20','B',1,0)])]};
recencyRace.horses[1].number=2;
const recencyGraph=M.build({races:[recencyRace]});
assert.equal(M.rate(recencyGraph,recencyRace)[0].name,'B');
assert.equal(M.rate(recencyGraph,recencyRace,{preferRecent:true})[0].name,'A');
const staleTip=[{id:'tip',name:'Tip',date:'2026-11-01',picks:{1:'B'}}];
const oldSupport=M.crowd(staleTip,recencyRace,{strength:.15,asOf:'2026-11-05'});
assert.equal(oldSupport.bonuses.B,.0375);
assert.equal(M.rate(recencyGraph,recencyRace,{preferRecent:true,crowdBonuses:oldSupport.bonuses})[0].name,'A');
const freshTip=M.crowd([{...staleTip[0],date:'2026-11-05'}],recencyRace,{strength:.15,asOf:'2026-11-05'});
assert.equal(freshTip.bonuses.B,.15);
assert.equal(M.rate(recencyGraph,recencyRace,{preferRecent:true,crowdBonuses:freshTip.bonuses})[0].name,'A');
assert.equal(M.crowd([{...staleTip[0],date:'2026-11-06'}],recencyRace,{asOf:'2026-11-05'}).guideCount,0);
assert.equal(M.crowd([{...staleTip[0],date:undefined}],recencyRace,{strength:.1,asOf:'2026-11-05'}).bonuses.B,.05);
const evidence=M.rate(recencyGraph,recencyRace,{preferRecent:true}),boosted=M.rate(recencyGraph,recencyRace,{preferRecent:true,crowdBonuses:freshTip.bonuses});
for(const h of boosted)assert(h.crowdBonus<=.15&&h.crowdBonus>=0);
assert(evidence[0].raw-evidence[1].raw>.15);
console.log('PASS: newer conflicting results lead; fresh/old/unknown/future tips respect the evidence-first cap.');

assert.equal(M.confidence({history:[],ownRecentRuns:0,daysSinceRun:null}).level,'low');
assert.equal(M.confidence({history:[{}],ownRecentRuns:0,daysSinceRun:190,evidence:'Supported'}).level,'low');
assert.equal(M.confidence({history:[{}],ownRecentRuns:3,ownGoingRuns:0,daysSinceRun:14,evidence:'Supported'},{live:true,checked:new Date().toISOString(),going:'Heavy'}).level,'low');
assert.equal(M.confidence({history:[{}],ownRecentRuns:3,daysSinceRun:14,evidence:'Supported'},{separateGroups:true}).level,'low');
assert.equal(M.confidence({history:[{}],ownRecentRuns:3,daysSinceRun:14,evidence:'Supported'}).level,'moderate');
const review=require('./dist/lessons.json');assert.equal(review.originalWins,3);assert.equal(review.revisedWins,1);assert.equal(review.firmRevisedPicks,4);

// Neutral defaults without comparative links must not outrank assessed horses.
{const d=require('./dist/data.json'),g=M.build(d),field=M.rate(g,d.races[0]),soldi=field.find(h=>h.name==='SOLDI'),supreme=field.find(h=>h.name==="SHE'S SUPREME");assert.equal(soldi.raw,0);assert.equal(soldi.rankable,false);assert.equal(supreme.rankable,true);assert(field.indexOf(supreme)<field.indexOf(soldi));assert.equal(field.find(h=>h.rankable).name,"SHE'S SUPREME");}
