import {env} from 'cloudflare:workers';
import seed from './watchlist-seed.json';
import {validateVideos,type WatchSnapshot} from './watchlist-types';
const key='watchlist/current.json';
const bucket=()=>{if(!env.BUCKET)throw Error('Watchlist storage unavailable.');return env.BUCKET};
async function load(){const item=await bucket().get(key);return {data:item?await item.json<WatchSnapshot>():seed as WatchSnapshot,etag:item?.etag}}
export async function getWatchlist(){return (await load()).data}
export async function upsertWatchlist(input:unknown){
 const videos=validateVideos(input),previous=await load(),now=new Date().toISOString();
 // Only fixed YouTube oEmbed URLs are fetched. Never fetch caller-supplied source URLs.
 const checked=[];
 for(let start=0;start<videos.length;start+=5){checked.push(...await Promise.all(videos.slice(start,start+5).map(async v=>{
  const r=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v='+v.id)}&format=json`,{signal:AbortSignal.timeout(8000),redirect:'manual'});
  if(!r.ok)throw Error('Watchlist video verification failed; previous edition retained.');
  const data:any=await r.json();if(data.provider_name!=='YouTube'||typeof data.title!=='string'||!data.title||typeof data.author_name!=='string'||!data.author_name)throw Error('Watchlist video metadata is incomplete; previous edition retained.');
  return {...v,title:data.title.slice(0,400),channel:data.author_name.slice(0,400),verifiedAt:now};
 })));}
 const merged=new Map(previous.data.videos.map(v=>[v.id,v]));
 for(const v of checked)merged.set(v.id,{...v,addedAt:merged.get(v.id)?.addedAt||now});
 if(merged.size>500)throw Error('Watchlist capacity reached; review existing selections before adding more.');
 const data:WatchSnapshot={updatedAt:now,videos:[...merged.values()]};
 const saved=await bucket().put(key,JSON.stringify(data),{onlyIf:previous.etag?{etagMatches:previous.etag}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});
 if(!saved)throw Error('Watchlist changed during publishing; read it again before retrying.');
 const result=await load();if(result.etag!==saved.etag)throw Error('Watchlist changed during readback; read the current edition.');
 return {ok:true,count:data.videos.length,verified:checked.length,updatedAt:now};
}
