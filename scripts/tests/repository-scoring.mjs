import ts from 'typescript';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
const source=await readFile('app/repository-scoring.ts','utf8');
const temp=new URL('./scoring-test-module.mjs',import.meta.url);
await writeFile(temp,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
try{
 const {rankRepositories,momentum}=await import(temp.href);
 const now=Date.parse('2026-10-21T00:00:00Z');
 const base={repository:'a/one',category:'AI',stars:100,forks:20,contributors:5,contributors_collected_at:'2026-10-20',metadata_collected_at:'2026-10-20',pushed_at:'2026-10-20',relevance:.9,maintenance_penalty:0,exclusion_reason:'',archived:false};
 const one=rankRepositories([base],{},now)[0];
 const mixed=rankRepositories([base,{...base,repository:'b/giant',category:'ML',stars:1000000,forks:100000}],{},now);
 assert.equal(mixed.find(x=>x.repository===base.repository).parts.adoption,one.parts.adoption,'Other categories must not change adoption');
 assert.equal(mixed.filter(x=>x.categoryRank===1).length,2);
 assert.equal(momentum(base,now),null);
 const history=[{at:'2026-09-22',stars:80,forks:10}];
 assert.equal(momentum({...base,history},now).starDelta,20);
 assert.equal(momentum({...base,history},now+30*86400000),null,'Stale observations must not score as recent momentum');
 const cap=rankRepositories([base],{'a/one':100},now)[0];
 assert.equal(cap.parts.community,10);
 assert.equal(rankRepositories([base],{'a/one':100000},now)[0].score,cap.score);
 assert.ok(rankRepositories([base],{'a/one':1},now)[0].parts.community<2);
 const archived=rankRepositories([{...base,archived:true}],{},now)[0];assert.equal(archived.score,one.score*.75);
 const evidence={checkedAt:'2026-10-20',releaseAt:'2026-10-01',activeContributors:20,issueSample:5,answeredIssues:5};
 assert.ok(rankRepositories([{...base,maintenance:evidence}],{},now)[0].parts.maintenance>one.parts.maintenance);
 assert.equal(rankRepositories([{...base,maintenance:{...evidence,checkedAt:'2026-01-01'}}],{},now)[0].parts.maintenance,one.parts.maintenance);
 assert.equal(rankRepositories([{...base,exclusion_reason:'Fork'}],{},now).length,0);
 console.log('Passed: category isolation, category ranks, observed growth, stale evidence, vote caps, inactivity penalties, eligibility.');
}finally{await unlink(temp);}
