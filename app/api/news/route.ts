import { env } from "cloudflare:workers";
import {viewer} from "../../admin-access";
import seed from "../../seed.json";
export const dynamic = "force-dynamic";
const bucket=()=> (env as unknown as {BUCKET:R2Bucket}).BUCKET;
export async function GET(){const saved=await bucket().get("news/current.json");return Response.json(saved?await saved.json():seed,{headers:{"Cache-Control":"no-store"}})}
// Publication always requires the configured owner identity.
export async function POST(request:Request){
 if(!(await viewer()).isAdmin)return new Response("Admin access required",{status:403});
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return new Response("Forbidden",{status:403});
 if(Number(request.headers.get("content-length")||0)>200000)return new Response("Too large",{status:413});
 let data;try{const raw=await request.text();if(raw.length>200000)return new Response("Too large",{status:413});data=JSON.parse(raw)}catch{return new Response("Invalid JSON",{status:400})}
 const categories=["AI tools","Coding","Robotics","Research","Industry"];
 if(!data||!Array.isArray(data.articles)||!data.articles.length||data.articles.length>100||data.articles.some((a:any)=>!["id","title","summary","source","date","url"].every(k=>typeof a[k]==="string"&&a[k].length>0&&a[k].length<2000)||!categories.includes(a.category)||!/^https:\/\//.test(a.url)||!/^\d{4}-\d{2}(-\d{2})?$/.test(a.date))||new Set(data.articles.map((a:any)=>a.id)).size!==data.articles.length)return new Response("Invalid article data",{status:400});
 const value={updatedAt:new Date().toISOString(),articles:data.articles};await bucket().put("news/current.json",JSON.stringify(value),{httpMetadata:{contentType:"application/json"}});return Response.json({ok:true,count:value.articles.length,updatedAt:value.updatedAt});
}
