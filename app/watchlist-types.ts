export const WATCH_TOPICS = ['AI','ML','Deep Learning','GenAI','LLMs','SLMs','Multimodal AI','RAG','MCP','AI Agents','Agentic AI','Multi-Agent Systems','A2A','Prompt Engineering','Context Engineering','Embeddings','Vector Search','Fine-Tuning','AI Evaluations','AI Guardrails','LLMOps','AgentOps','Jev'] as const;
export type WatchVideo={id:string;title:string;channel:string;topics:string[];level:'Beginner'|'Intermediate'|'Advanced';format:'Explainer'|'Tutorial'|'Discussion';why:string;source:string;publishedAt:string|null;reviewBasis:'Title and description'|'Creator article'|'Transcript';verifiedAt:string;addedAt:string};
export type WatchSnapshot={updatedAt:string;videos:WatchVideo[]};
export function validateVideos(input:unknown):WatchVideo[]{
 if(!Array.isArray(input)||input.length<1||input.length>30)throw Error('Watchlist requires 1–30 videos per update.');
 const ids=new Set<string>();
 return input.map((v:any)=>{
  if(!v||typeof v.id!=='string'||!/^[-\w]{11}$/.test(v.id)||ids.has(v.id))throw Error('Watchlist video IDs must be valid and unique.');ids.add(v.id);
  for(const k of ['title','channel','why','source'])if(typeof v[k]!=='string'||!v[k].trim()||v[k].length>(k==='why'?600:400))throw Error('Watchlist text is missing or too long.');
  let url:URL;try{url=new URL(v.source)}catch{throw Error('Watchlist source must be HTTPS.');}if(url.protocol!=='https:'||url.username||url.password)throw Error('Watchlist source must be HTTPS.');
  if(!Array.isArray(v.topics)||!v.topics.length||v.topics.length>6||v.topics.some((t:string)=>!WATCH_TOPICS.includes(t as any)))throw Error('Watchlist topics are invalid.');
  if(!['Beginner','Intermediate','Advanced'].includes(v.level)||!['Explainer','Tutorial','Discussion'].includes(v.format)||!['Title and description','Creator article','Transcript'].includes(v.reviewBasis))throw Error('Watchlist labels are invalid.');
  if(v.publishedAt!==null&&(typeof v.publishedAt!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.publishedAt)||!Number.isFinite(Date.parse(v.publishedAt))||new Date(v.publishedAt).toISOString().slice(0,10)!==v.publishedAt||Date.parse(v.publishedAt)>Date.now()))throw Error('Watchlist publication date must be verified, past, or null.');
  return {id:v.id,title:v.title.trim(),channel:v.channel.trim(),topics:[...new Set(v.topics)] as string[],level:v.level,format:v.format,why:v.why.trim(),source:url.href,publishedAt:v.publishedAt,reviewBasis:v.reviewBasis,verifiedAt:'',addedAt:''};
 });
}
