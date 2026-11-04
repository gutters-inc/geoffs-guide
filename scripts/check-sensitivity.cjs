const fs=require('node:fs'),M=require('../dist/model.js'),data=require('../dist/data.json'),editorial=require('../dist/editorial.json'),graph=M.build(data);
const report={asOf:'2026-11-05',method:'Maximum absolute rating-point movement among eligible runners, changing one control at a time. Crowd changes are measured after recent-form weighting, so their incremental effect is isolated. Original form remains the 45-day benchmark.',races:[]};
for(const race of data.races){
 const baseline=M.rate(graph,race),recent=M.rate(graph,race,{preferRecent:true});
 const check=(from,to)=>{const previous=new Map(from.map(h=>[h.name,h]));return +Math.max(...to.filter(h=>h.eligible).map(h=>Math.abs(h.score-previous.get(h.name).score))).toFixed(3)};
 const crowd=strength=>M.rate(graph,race,{preferRecent:true,crowdBonuses:M.crowd(editorial.sources,race,{strength,asOf:report.asOf}).bonuses});
 report.races.push({race:race.number,recentForm:check(baseline,recent),softGround:check(recent,M.rate(graph,race,{preferRecent:true,going:'Soft',groundStrength:.7})),insideGateSmall:check(recent,M.rate(graph,race,{preferRecent:true,drawBias:-.25})),tipsLow:check(recent,crowd(.05)),tipsStandard:check(recent,crowd(.1)),tipsHigh:check(recent,crowd(.15))});
}
report.summary={maximumStandardTipPoints:Math.max(...report.races.map(r=>r.tipsStandard)),maximumHighTipPoints:Math.max(...report.races.map(r=>r.tipsHigh)),historicalFormHalfLifeDays:21,originalHalfLifeDays:45,tipHalfLifeDays:2,maximumTipRawBoost:.15};
fs.writeFileSync('reports/sensitivity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
