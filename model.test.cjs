const assert=require('node:assert/strict');
const M=require('./dist/model.js');
const run=(date,winner,pos,margin,track='Test')=>({date,winner,pos,margin,track,distance:2000,raceTime:'2:00',grade:'G2',total:8});
const horse=(name,history)=>({name,display:name,number:1,history,scratched:false,emergency:false});
const fixture={races:[{number:1,distance:2000,horses:[
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
  for(const h of r.horses)for(const s of h.history){assert(s.date<'2026-11-05');assert(s.margin>=0);if(s.pos===1)assert.equal(s.margin,0)}
}
for(const e of actual.observations){assert(actual.adjacency.get(e.a).has(e.b));assert(e.race.results.has(e.a)&&e.race.results.has(e.b))}
console.log('PASS: chain direction, depth, missing connections, ratings, reversals, future leakage and all nine race datasets.');
