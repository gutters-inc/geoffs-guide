(function(root){
  const TODAY='2026-11-05';
  const norm=s=>s.toUpperCase().replace(/\s*\((?:[A-Z]{2,3}|EM\d+)\)/g,'').trim();
  const title=s=>s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  function build(data){
    const nodes=new Map(), races=new Map();
    for(const r of data.races)for(const h of r.horses){
      if(!nodes.has(h.name))nodes.set(h.name,{name:h.name,display:h.display,horse:h});
      else nodes.get(h.name).horse=h;
      for(const run of h.history){
        if(run.date>=TODAY)continue;
        const key=[run.date,run.track,run.distance,run.raceTime||run.grade].join('|');
        if(!races.has(key))races.set(key,{...run,key,results:new Map()});
        const race=races.get(key);
        race.results.set(h.name,{name:h.name,pos:run.pos,margin:run.margin});
        if(run.winner){
          const winner=norm(run.winner);
          if(!nodes.has(winner))nodes.set(winner,{name:winner,display:title(winner)});
          race.results.set(winner,{name:winner,pos:1,margin:0});
        }
      }
    }
    const adjacency=new Map([...nodes.keys()].map(n=>[n,new Map()]));
    const observations=[];
    for(const race of races.values()){
      const results=[...race.results.values()];
      for(let i=0;i<results.length;i++)for(let j=i+1;j<results.length;j++){
        const a=results[i],b=results[j];
        // Conflicting identities or inconsistent results are not usable evidence.
        if(a.pos===b.pos && Math.abs(a.margin-b.margin)>.15)continue;
        const edge={a:a.name,b:b.name,aPos:a.pos,bPos:b.pos,delta:b.margin-a.margin,race};
        observations.push(edge);
        for(const [from,to] of [[a.name,b.name],[b.name,a.name]]){
          const m=adjacency.get(from);if(!m.has(to))m.set(to,[]);m.get(to).push(edge);
        }
      }
    }
    const components=new Map();let cid=0;
    for(const n of nodes.keys())if(!components.has(n)){
      const queue=[n];components.set(n,cid);
      for(let i=0;i<queue.length;i++)for(const v of adjacency.get(queue[i]).keys())if(!components.has(v)){components.set(v,cid);queue.push(v)}cid++;
    }
    return {nodes,races,adjacency,observations,components};
  }
  function weight(edge,distance){
    const days=(Date.parse(TODAY)-Date.parse(edge.race.date))/86400000;
    return Math.pow(.5,days/45)*Math.exp(-Math.abs(Math.log(distance/edge.race.distance))/.7)/Math.max(1,edge.race.results.size-1);
  }
  function rate(graph,race){
    const ratings=new Map([...graph.nodes.keys()].map(n=>[n,0]));
    const incident=new Map([...graph.nodes.keys()].map(n=>[n,[]]));
    for(const e of graph.observations){
      const w=weight(e,race.distance), delta=Math.max(-8,Math.min(8,e.delta));
      incident.get(e.a).push({other:e.b,delta,w});incident.get(e.b).push({other:e.a,delta:-delta,w});
    }
    // Coordinate descent minimises sum w*(rA-rB-margin)^2 + .15*sum r^2.
    for(let iter=0;iter<350;iter++){
      let change=0;
      for(const [n,edges] of incident){let numerator=0,denominator=.15;
        for(const e of edges){numerator+=e.w*(ratings.get(e.other)+e.delta);denominator+=e.w}
        const next=numerator/denominator;change=Math.max(change,Math.abs(next-ratings.get(n)));ratings.set(n,next);
      }
      if(change<1e-7)break;
    }
    const field=race.horses.filter(h=>!h.scratched&&!h.emergency);
    return race.horses.map(h=>{
      const edges=graph.adjacency.get(h.name)||new Map();
      const direct=field.filter(o=>o.name!==h.name&&edges.has(o.name)).length;
      const connectedRuns=new Set([...edges.values()].flat().map(e=>e.race.key));
      const relevantRuns=[...connectedRuns].filter(key=>{const r=graph.races.get(key);return (Date.parse(TODAY)-Date.parse(r.date))/86400000<=90&&Math.abs(Math.log(race.distance/r.distance))<.5}).length;
      const evidence=relevantRuns>=3&&direct>=2?'Supported':relevantRuns>=2?'Limited':'Sparse';
      const raw=ratings.get(h.name)||0;
      return {...h,raw,score:50+45*Math.tanh(raw/4),direct,runs:connectedRuns.size,relevantRuns,evidence,component:graph.components.get(h.name),eligible:!h.scratched&&!h.emergency,edges};
    }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.raw-a.raw||a.number-b.number);
  }
  function path(graph,from,to,max=3){
    if(from===to)return [];
    const queue=[{name:from,steps:[]}],seen=new Set([from]);
    for(let i=0;i<queue.length;i++){
      const cur=queue[i];if(cur.steps.length>=max)continue;
      const neighbours=[...(graph.adjacency.get(cur.name)||new Map()).entries()].sort((a,b)=>{
        const da=Math.max(...a[1].map(e=>Date.parse(e.race.date))),db=Math.max(...b[1].map(e=>Date.parse(e.race.date)));return db-da||a[0].localeCompare(b[0]);
      });
      for(const [name,edges] of neighbours){if(seen.has(name))continue;
        const sorted=edges.slice().sort((a,b)=>b.race.date.localeCompare(a.race.date));
        const e=sorted[0],step={from:cur.name,to:name,edge:e,delta:e.a===cur.name?e.delta:-e.delta,meetings:edges.length};
        const steps=[...cur.steps,step];if(name===to)return steps;
        seen.add(name);queue.push({name,steps});
      }
    }
    return null;
  }
  function wins(graph,n,distance){
    const out=[];
    for(const [other,edges] of graph.adjacency.get(n)||[])for(const edge of edges){
      const delta=edge.a===n?edge.delta:-edge.delta;
      if(delta>0)out.push({other,edge,delta,value:weight(edge,distance)*Math.min(delta,8)});
    }
    return out.sort((a,b)=>b.value-a.value);
  }
  const api={build,rate,path,wins,weight,title};root.FormModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
