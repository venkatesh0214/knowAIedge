import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'watchlist-test-'));const originalFetch=globalThis.fetch;
try{
 const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 await writeFile(join(dir,'types.mjs'),compile(await readFile('app/watchlist-types.ts','utf8')));
 const seed=JSON.parse(await readFile('app/watchlist-seed.json','utf8'));
 let saved=null,etag=null,writes=0,conflict=false;
 globalThis.__watchEnv={BUCKET:{get:async()=>saved?{etag,json:async()=>JSON.parse(saved)}:null,put:async(k,value,opts)=>{if(conflict)return null;assert.equal(k,'watchlist/current.json');assert.deepEqual(opts.onlyIf,etag?{etagMatches:etag}:{etagDoesNotMatch:'*'});saved=value;etag='revision-'+(++writes);return{etag}}}};
 let source=await readFile('app/watchlist-data.ts','utf8');source=source.replace("import {env} from 'cloudflare:workers';",'const env=globalThis.__watchEnv;').replace("import seed from './watchlist-seed.json';",'const seed='+JSON.stringify(seed)+';').replace("'./watchlist-types'","'./types.mjs'");await writeFile(join(dir,'data.mjs'),compile(source));
 const {validateVideos,WATCH_TOPICS}=await import(pathToFileURL(join(dir,'types.mjs')));const {getWatchlist,upsertWatchlist}=await import(pathToFileURL(join(dir,'data.mjs')));
 assert.equal(WATCH_TOPICS.length,23);assert.equal(new Set(seed.videos.flatMap(v=>v.topics)).size,23);assert.equal(validateVideos(seed.videos).length,22);
 const example=seed.videos[0];for(const bad of [{id:'../../bad'},{source:'javascript:alert(1)'},{topics:['Wrong']},{publishedAt:'2026-02-30'},{publishedAt:'2099-01-01'},{reviewBasis:'Watched'}])assert.throws(()=>validateVideos([{...example,...bad}]));assert.throws(()=>validateVideos([example,example]));
 globalThis.fetch=async()=>new Response('',{status:404});await assert.rejects(upsertWatchlist([example]),/verification failed/);assert.equal(writes,0);assert.equal((await getWatchlist()).videos.length,22);
 globalThis.fetch=async url=>{assert.ok(String(url).startsWith('https://www.youtube.com/oembed?'));return Response.json({provider_name:'YouTube',title:'Verified title',author_name:'Verified creator'})};
 await upsertWatchlist([{...example,title:'Untrusted title'}]);let result=await getWatchlist();assert.equal(result.videos.length,22);assert.equal(result.videos[0].title,'Verified title');assert.equal(result.videos[0].addedAt,example.addedAt);
 const before=saved;conflict=true;await assert.rejects(upsertWatchlist([example]),/changed during publishing/);assert.equal(saved,before);
 console.log('Watchlist: validation, topic coverage, verification failure, merge, metadata and concurrent-write checks passed.');
}finally{globalThis.fetch=originalFetch;delete globalThis.__watchEnv;await rm(dir,{recursive:true,force:true})}
