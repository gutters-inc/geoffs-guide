(function(root){
 const key=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,''),words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
 function timeline(scenes){const total=scenes.reduce((n,s)=>n+Math.max(8,words(s.narration)),0);let start=0;return scenes.map((s,i)=>{const end=i===scenes.length-1?30:start+30*Math.max(8,words(s.narration))/total;const out={...s,start:+start.toFixed(3),end:+end.toFixed(3)};start=end;return out})}
 function racePreview({race,selection,report,editorial,notes=[],changes=[],preparedAt,runKey}){
  const title=s=>root.FormModel.title(s),active=name=>race.horses.find(h=>key(h.name)===key(name)&&!h.scratched&&!h.emergency);
  const seen=new Set(),opinions=[];
  if(report.latestTip&&active(report.latestTip.name)){const s=(editorial.sources||[]).find(x=>x.perRaceSource),h=active(report.latestTip.name),match=s&&key(s.picks?.[String(race.number)])===key(h.name)&&key(s.name)===key(String(report.latestTip.author||'').replace(/\([^)]*\)/g,'')),note=match?s.tipNotes?.[String(race.number)]||{}:{};opinions.push({name:report.latestTip.author||'TABtouch preview',horse:title(h.name),why:note.why||'Read the current race preview.',ground:note.ground||'Not stated.',run:note.run||'Not stated.',url:report.source,published:null});seen.add(s?.group||'TABtouch')}
  for(const s of editorial.sources||[]){const h=active(s.picks?.[String(race.number)]);if(!h||seen.has(s.group||s.id))continue;seen.add(s.group||s.id);const note=s.tipNotes?.[String(race.number)]||{};opinions.push({name:s.name,horse:title(h.name),why:note.why||s.rationale?.[String(race.number)]||'No written reason supplied.',ground:note.ground||s.meetingGround||'Not stated.',run:note.run||'Not stated.',url:s.perRaceSource?report.source:s.sourceUrls?.[String(race.number)]||s.url,published:s.sourceDates?.[String(race.number)]||s.date||null});if(opinions.length===2)break}
  const picked=selection.revisedTip||selection.provisionalLeader,lead=picked?title(picked.name):'No firm selection',firm=!!selection.revisedTip;
  const crowdSources=(editorial.sources||[]).map(s=>report.latestTip&&s.perRaceSource?{...s,picks:{...s.picks,[String(race.number)]:report.latestTip.name}}:s),crowd=root.FormModel.crowd(crowdSources,race,{asOf:(preparedAt||race.date||'').slice(0,10)});
  const support=Object.entries(crowd.support).sort((a,b)=>b[1].guides.length-a[1].guides.length),popular=support[0],ladder=selection.baselineTopThree?.[0]||selection.baselineTip;
  const supportText=popular?`${title(popular[0])} has ${popular[1].guides.length} of ${crowd.guideCount} verified first picks.`:'Published picks are split or unavailable.';
  const ladderText=ladder?`${title(ladder.name)} tops our form ladder.`:'No connected-form ladder leader is available.';
  const cutoff=Date.parse(preparedAt),fresh=n=>n.published&&Number.isFinite(Date.parse(n.published))&&Date.parse(n.published)<=cutoff&&cutoff-Date.parse(n.published)<=10800000;
  const social=notes.filter(n=>n.race===race.number&&n.type==='tip'&&/^https:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^/]+\/status\/\d+/.test(n.url||'')&&fresh(n)&&active(n.horse)).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published))[0];
  const rankedChanges=changes.filter(c=>c.type!=='gear'||c.newSinceBaseline!==false).slice().sort((a,b)=>({track:5,scratching:5,rider:4,gear:3,weight:2,barrier:1}[b.type]||0)-({track:5,scratching:5,rider:4,gear:3,weight:2,barrier:1}[a.type]||0)),change=rankedChanges[0];
  const relevant=n=>['trainer','gear','rider','track','scratching','stewards'].includes(n.type),fact=notes.filter(n=>(n.race===race.number||n.race===0)&&relevant(n)).sort((a,b)=>(fresh(b)?1:0)-(fresh(a)?1:0))[0];
  let lateText='No major new change verified at this check.',lateSource=null;
  if(change){const horse=change.horse?title(change.horse):'';lateText=change.type==='scratching'?`${horse} is scratched.`:change.type==='track'?`Track changed from ${change.from} to ${change.to}.`:change.type==='rider'?`${horse}: rider changed to ${change.to}.`:`${horse}: ${change.type} changed. See the sourced notice.`;lateSource=change.source}
  else if(social){const author=social.author||new URL(social.url).pathname.split('/')[1];lateText=`Late on X, ${author} selects ${title(social.horse)}.`;lateSource=social.url}
  else if(fact){lateText=(fact.horse?title(fact.horse)+'. ':'')+fact.summary;if(words(lateText)>18)lateText='Have a squiz at the sourced track and runner notices.';lateSource=fact.url}
  const greeting=['Kia ora, team.','Gidday, team.','Kia ora, good sorts.'][(race.number-1)%3];
  const scenes=[
   {title:`Race ${race.number} in 30 seconds`,caption:`${race.name} · ${race.distance}m · ${report.condition||'Going unconfirmed'}`,narration:`${greeting} Geoff here. Race ${race.number}. Going: ${report.condition||'not confirmed'}.`},
   {title:lead,caption:firm?'Saved selection':'Leading watch · no firm revised selection',narration:picked?`For mine, ${lead} leads our view.${firm?'':' A watch, not a firm tip.'}`:'No firm selection. The evidence does not support a firm call.'},
   {title:'The tipster support',caption:`${supportText} ${crowd.groupCount} outlet groups; shared outlets are not independent votes.`,narration:supportText},
   {title:'Top of the ladder',caption:`${ladderText} Historical form order, not a predicted finish.`,narration:ladderText},
   {title:change||social?'What changed late?':'The race note',caption:lateText,source:lateSource,narration:lateText},
   {title:social&&change?'The last-minute tip':'The published view',caption:social&&change?`${social.summary} · ${social.published}`:opinions[0]?`${opinions[0].name}: ${opinions[0].horse}. ${opinions[0].why}`:'Read the sourced tips and run assumptions.',assumptions:social&&change?'Verified public post; an attributed opinion.':opinions[0]?`Ground: ${opinions[0].ground} Run: ${opinions[0].run}`:'',source:social&&change?social.url:opinions[0]?.url,narration:(social&&change?`On X, ${social.author||new URL(social.url).pathname.split('/')[1]} selects ${title(social.horse)}.`:opinions[0]?`${opinions[0].name} selects ${opinions[0].horse}.`:'Check the saved tips.').concat(' Happy punting, team.')}
  ];
  // Keep the single short qualification on an unsupported selection; do not repeatedly talk it down.
  const evidence={supportHorse:popular?title(popular[0]):null,supportCount:popular?.[1].guides.length||0,guideCount:crowd.guideCount,outletGroups:crowd.groupCount,ladderLeader:ladder?title(ladder.name):null,headline:popular?`${popular[1].guides.length}/${crowd.guideCount} first picks`:ladder?'Form ladder leader':'Saved race view',lateChange:change||null,social:social||null};

  return {schema:1,race:race.number,date:race.date||null,duration:30,presenter:'Geoff',voice:{lang:'en',kind:'synthetic',recorded:false},preparedAt,jumpAt:selection.startAt,runKey,firm,confidence:selection.confidence,evidence,scenes:timeline(scenes),opinions,sources:[...new Set([report.source,...opinions.map(o=>o.url),lateSource,social?.url,fact?.url].filter(Boolean))]};
 }
 root.PreviewModel={timeline,racePreview};if(typeof module!=='undefined')module.exports=root.PreviewModel;
})(typeof window!=='undefined'?window:globalThis);
