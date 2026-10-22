import {env} from "cloudflare:workers";
import seed from "../../seed.json";
import {viewer} from "../../admin-access";
export const dynamic="force-dynamic";
const bucket=()=> (env as unknown as {BUCKET:R2Bucket}).BUCKET;
export async function POST(request:Request){
 const {user}=await viewer();
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return new Response("Forbidden",{status:403});
 let body;try{const raw=await request.text();if(raw.length>500)return new Response("Too large",{status:413});body=JSON.parse(raw)}catch{return new Response("Invalid request",{status:400})}
 if(!body || typeof body!=="object")return new Response("Invalid activity",{status:400});
 if(!user){if(body.type!=="page"||!["News","About","AI-RepoRadar"].includes(body.value))return new Response("Sign in required",{status:401});const cookie=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith("knowaiedge_visitor="))?.split("=")[1];const id=cookie&&/^[0-9a-f-]{36}$/.test(cookie)?cookie:crypto.randomUUID();const day=new Date().toISOString().slice(0,10);await bucket().put(`anonymous/${day}/${id}.json`,JSON.stringify({lastSeen:new Date().toISOString()}));return new Response(null,{status:204,headers:{"Set-Cookie":`knowaiedge_visitor=${id}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,"Cache-Control":"private, no-store"}})}
 let article:typeof seed.articles[number]|undefined;
 if(body.type==="article"&&typeof body.value==="string"){const saved=await bucket().get("news/current.json");const feed=saved?await saved.json<typeof seed>():seed;article=feed.articles.find(a=>a.id===body.value);if(!article){const previous=await bucket().get(`history/${encodeURIComponent(user.userId)}/${encodeURIComponent(body.value)}.json`);if(previous)article=await previous.json() as typeof article}}
 const valid=body.type==="page"?["News","About","AI-RepoRadar"].includes(body.value):body.type==="topic"?["All stories","AI tools","Coding","Robotics","Research","Industry"].includes(body.value):body.type==="article"?!!article:false;
 if(!valid)return new Response("Invalid activity",{status:400});
 const time=new Date().toISOString();const metadata={userId:user.userId,email:user.email,name:user.fullName||"",articleId:article?.id||"",type:body.type,value:article?article.title.slice(0,350):body.value,time};
 await bucket().put(`activity/${time.slice(0,10)}/${crypto.randomUUID()}.json`,JSON.stringify(metadata),{customMetadata:metadata,httpMetadata:{contentType:"application/json"}});
 if(article){const item={id:article.id,title:article.title,url:article.url,source:article.source,openedAt:time};await bucket().put(`history/${encodeURIComponent(user.userId)}/${encodeURIComponent(article.id)}.json`,JSON.stringify(item),{httpMetadata:{contentType:"application/json"}});return Response.json({item},{headers:{"Cache-Control":"private, no-store"}})}
 return new Response(null,{status:204});
}
export async function GET(){const {isAdmin}=await viewer();if(!isAdmin)return new Response("Admin access required",{status:403});
 const days=Array.from({length:7},(_,i)=>new Date(Date.now()-i*86400000).toISOString().slice(0,10));
 const pages=await Promise.all(days.map(async day=>{let cursor:string|undefined;const objects:R2Object[]=[];do{const page=await bucket().list({prefix:`activity/${day}/`,limit:1000,cursor,include:["customMetadata"]} as R2ListOptions & {include:string[]});objects.push(...page.objects);cursor=page.truncated?page.cursor:undefined}while(cursor);return objects}));
 const events=pages.flat().map(o=>o.customMetadata).filter(Boolean).sort((a,b)=>(b!.time||"").localeCompare(a!.time||""));
 const anonymousIds=new Set<string>();await Promise.all(days.map(async day=>{let cursor:string|undefined;do{const page=await bucket().list({prefix:`anonymous/${day}/`,limit:1000,cursor});for(const object of page.objects)anonymousIds.add(object.key.split("/").pop()!);cursor=page.truncated?page.cursor:undefined}while(cursor)}));
 return Response.json({events,anonymousVisitors:anonymousIds.size,truncated:false,window:"Last 7 UTC calendar days"},{headers:{"Cache-Control":"private, no-store"}})
}
