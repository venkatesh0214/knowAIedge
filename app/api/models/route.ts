import {viewer} from '../../admin-access';
import {getModelRadar,refreshModelRadar,upsertModelResearch} from '../../model-data';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){if(!(await viewer()).isAdmin)return new Response('Admin access required',{status:403,headers});try{return Response.json(await getModelRadar(),{headers})}catch{return Response.json({error:'Model Radar could not be loaded.'},{status:503,headers})}}
export async function POST(request:Request){
 if(!(await viewer()).isAdmin)return new Response('Admin access required',{status:403,headers});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return new Response('Forbidden',{status:403,headers});
 try{const raw=await request.text();if(raw.length>200000)return new Response('Too large',{status:413,headers});const body=JSON.parse(raw);if(body.action==='refresh')return Response.json(await refreshModelRadar(),{headers});if(body.action==='research')return Response.json(await upsertModelResearch(body.records),{headers});return new Response('Invalid action',{status:400,headers})}catch(error){const msg=error instanceof Error?error.message:'';return Response.json({error:/^(Invalid model research|Model Radar|Model catalog)/.test(msg)?msg:'Refresh failed. Previous edition retained.'},{status:503,headers})}
}
