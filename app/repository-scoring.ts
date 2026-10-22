import type seed from './repository-seed.json';
export type Observation={at:string;stars:number;forks:number};
export type MaintenanceEvidence={checkedAt:string;releaseAt:string|null;activeContributors:number;commitsSampled:number;commitSampleLimited:boolean;issueSample:number;answeredIssues:number;medianResponseHours:number|null;sources:string[]};
export type Repo=typeof seed.records[number]&{history?:Observation[];maintenance?:MaintenanceEvidence};
const day=86400000;
const age=(date:string,now:number)=>Math.max(0,(now-Date.parse(date))/day);
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function momentum(r:Repo,now:number){
 const end=Date.parse(r.metadata_collected_at);
 const candidates=(r.history||[]).filter(h=>{const days=(end-Date.parse(h.at))/day;return days>=6&&days<=35;});
 const baseline=candidates.sort((a,b)=>Math.abs((end-Date.parse(a.at))/day-28)-Math.abs((end-Date.parse(b.at))/day-28))[0];
 if(!baseline||age(r.metadata_collected_at,now)>14)return null;
 const days=(end-Date.parse(baseline.at))/day,starDelta=r.stars-baseline.stars,forkDelta=r.forks-baseline.forks;
 // Smoothed relative growth reduces both giant-repository and tiny-baseline advantages.
 const growth=.75*(starDelta/(baseline.stars+100))+.25*(forkDelta/(baseline.forks+25));
 return {days,starDelta,forkDelta,from:baseline.at,to:r.metadata_collected_at,score:clamp(.5+2*growth*28/days)};
}
export function rankRepositories(records:Repo[],votes:Record<string,number>={},now=Date.now()){
 const eligible=records.filter(r=>!r.exclusion_reason);
 const groups=new Map<string,Repo[]>();for(const r of eligible)groups.set(r.category,[...(groups.get(r.category)||[]),r]);
 const ranked=eligible.map(r=>{
  const peers=groups.get(r.category)!;
  const ns=Math.log1p(r.stars)/Math.log1p(Math.max(1,...peers.map(x=>x.stars)));
  const nf=Math.log1p(r.forks)/Math.log1p(Math.max(1,...peers.map(x=>x.forks)));
  const nc=r.contributors===null||!r.contributors_collected_at||age(r.contributors_collected_at,now)>90?.5:Math.min(1,Math.log1p(r.contributors)/Math.log1p(5000));
  const e=r.maintenance, fresh=!!e&&age(e.checkedAt,now)<=42;
  const pushAge=age(r.pushed_at,now),push=pushAge<=30?1:pushAge<=90?.75:pushAge<=180?.5:pushAge<=365?.25:0;
  const release=!fresh?.5:!e.releaseAt?.5:age(e.releaseAt,now)<=90?1:age(e.releaseAt,now)<=180?.75:age(e.releaseAt,now)<=365?.5:.25;
  const active=fresh?Math.min(1,Math.log1p(e.activeContributors)/Math.log1p(20)):.5;
  const response=fresh&&e.issueSample>0?e.answeredIssues/e.issueSample:.5;
  const m=momentum(r,now),count=Math.max(0,votes[r.repository]||0);
  const parts={relevance:35*clamp(r.relevance),adoption:20*(.5*ns+.25*nf+.25*nc),maintenance:20*(.25*push+.25*release+.25*active+.25*response),momentum:15*(m?.score??.5),community:10*Math.min(1,Math.log1p(count)/Math.log1p(100))};
  const penalty=Math.max(r.maintenance_penalty||0,r.archived||r.maintenance_note||pushAge>365?.25:pushAge>180?.1:0);
  const research=parts.relevance+parts.adoption+parts.maintenance+parts.momentum;
  return {...r,parts,momentum:m,maintenanceFresh:fresh,metadataStale:age(r.metadata_collected_at,now)>14,maintenance_penalty:penalty,votes:count,fri:research/90*100*(1-penalty),score:(research+parts.community)*(1-penalty),categoryRank:0,rank:0};
 }).sort((a,b)=>b.score-a.score||b.stars-a.stars||a.repository.localeCompare(b.repository));
 const counts:Record<string,number>={};return ranked.map((r,i)=>({...r,rank:i+1,categoryRank:counts[r.category]=(counts[r.category]||0)+1}));
}
