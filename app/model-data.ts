import {env} from 'cloudflare:workers';
import seed from './model-seed.json';
import {perMillion,validateResearch} from './model-validation';
import type {ModelRow,ModelSnapshot} from './model-types';
const key='models/current.json';
const bucket=()=>{if(!env.BUCKET)throw Error('Model Radar storage unavailable');return env.BUCKET};
async function load(){const object=await bucket().get(key);return {data:object?await object.json<ModelSnapshot>():seed as ModelSnapshot,etag:object?.etag}}
export async function getModelRadar(){return (await load()).data}
async function save(data:ModelSnapshot,etag?:string){
 const saved=await bucket().put(key,JSON.stringify(data),{onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});
 if(!saved)throw Error('Model Radar changed during refresh; read it again before retrying.');
 const check=await load();if(check.etag!==saved.etag)throw Error('Model Radar readback changed during verification; read current data.');
 return {ok:true,updatedAt:data.updatedAt,count:data.records.length,catalogCheckedAt:data.catalogCheckedAt,researchCheckedAt:data.researchCheckedAt,changes:data.changes};
}
const providers:Record<string,string>={openai:'OpenAI',anthropic:'Anthropic',google:'Google','meta-llama':'Meta',mistralai:'Mistral',deepseek:'DeepSeek',qwen:'Qwen','x-ai':'xAI',cohere:'Cohere',minimax:'MiniMax',moonshotai:'Moonshot AI',microsoft:'Microsoft',nvidia:'NVIDIA',muse:'Muse',meta:'Meta'};
export async function refreshModelRadar(){
 const previous=await load();
 const response=await fetch('https://openrouter.ai/api/v1/models',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error(`Model catalog unavailable (${response.status}); previous edition retained.`);
 const raw=await response.text();if(raw.length>10000000)throw Error('Model catalog too large; previous edition retained.');
 const body=JSON.parse(raw);if(!Array.isArray(body.data)||body.data.length<20||body.links?.next||(typeof body.total_count==='number'&&body.total_count>body.data.length))throw Error('Model catalog incomplete; previous edition retained.');
 const items=body.data.filter((r:any)=>typeof r.id==='string'&&typeof r.name==='string'&&providers[r.id.split('/')[0]]&&!r.id.includes(':')&&r.architecture?.output_modalities?.includes('text')&&r.pricing&&Number.isFinite(r.created)&&r.created>0&&r.created*1000<=Date.now());
 if(items.length<10)throw Error('Model catalog validation failed; previous edition retained.');
 const now=new Date().toISOString();const existing=new Map(previous.data.records.map(r=>[r.id,r]));const liveIds=new Set(items.map((x:any)=>x.id));
 const selected=new Map<string,any>(items.sort((a:any,b:any)=>b.created-a.created).slice(0,75).map((x:any)=>[x.id,x]));
 for(const x of items)if(existing.get(x.id)?.releaseDate)selected.set(x.id,x);
 const rows:ModelRow[]=[];const changes:ModelSnapshot['changes']=[];
 for(const m of selected.values()){
  const old=existing.get(m.id);const price={input:perMillion(m.pricing.prompt),output:perMillion(m.pricing.completion),note:'OpenRouter catalog base text rates. Routing, long-context tiers, caching, reasoning, image/audio and request fees may differ. See model details.',source:`https://openrouter.ai/${m.id}`};
  const change=!old?'Added to radar':old.routerPrice&&(old.routerPrice.input!==price.input||old.routerPrice.output!==price.output)?'Router price changed':!old.routerPrice?'Router pricing added':old.routerAvailable===false?'Back in router catalog':'';
  const row:ModelRow={...(old||{id:m.id,name:m.name,provider:providers[m.id.split('/')[0]],releaseDate:null,releaseLabel:'Release date unverified',releaseSource:'',summary:'Discovered in the OpenRouter catalog. Vendor release details and benchmarks await verification.',benchmarks:[],officialPrice:null,contextWindow:null,researchCheckedAt:''}),catalogCreatedAt:new Date(m.created*1000).toISOString(),catalogCheckedAt:now,routerPrice:price,routerContextWindow:Number.isInteger(m.context_length)?m.context_length:null,routerAvailable:true,lastChangeAt:change?now:old?.lastChangeAt,change:change||old?.change,previousRouterPrice:change==='Router price changed'?old?.routerPrice:old?.previousRouterPrice};
  rows.push(row);if(change)changes.push({id:row.id,name:row.name,type:change,at:now});
 }
 for(const old of existing.values())if(old.releaseDate&&!selected.has(old.id)){const missing=old.routerAvailable===true&&!liveIds.has(old.id);rows.push({...old,routerAvailable:false,change:missing?'No longer in router catalog':old.change,lastChangeAt:missing?now:old.lastChangeAt});if(missing)changes.push({id:old.id,name:old.name,type:'No longer in router catalog',at:now})}
 if(rows.length>200)throw Error('Model Radar capacity reached; research review needed.');
 return save({...previous.data,updatedAt:now,catalogCheckedAt:now,records:rows,changes:[...changes,...previous.data.changes].slice(0,150)},previous.etag);
}
export async function upsertModelResearch(input:unknown){
 const research=validateResearch(input),previous=await load(),now=new Date().toISOString();const records=new Map(previous.data.records.map(r=>[r.id,r]));const changes:ModelSnapshot['changes']=[];
 for(const r of research){const old=records.get(r.id);const comparable=(x:any)=>JSON.stringify(x?{name:x.name,releaseDate:x.releaseDate,releaseLabel:x.releaseLabel,benchmarks:x.benchmarks,officialPrice:x.officialPrice,summary:x.summary}:null);const changed=comparable(old)!==comparable(r);records.set(r.id,{...old,...r,lastChangeAt:changed?now:old?.lastChangeAt,change:changed?'Research verified':old?.change});if(changed)changes.push({id:r.id,name:r.name,type:'Research verified',at:now})}
 if(records.size>200)throw Error('Model Radar capacity reached; previous edition retained.');
 return save({...previous.data,updatedAt:now,researchCheckedAt:now,records:[...records.values()],changes:[...changes,...previous.data.changes].slice(0,150)},previous.etag);
}
