import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {readSnapshot} from '../../../repository-data';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in with ChatGPT to vote.'},{status:401});
 const origin=request.headers.get('origin');if(origin!==new URL(request.url).origin)return Response.json({error:'Same-origin request required.'},{status:403});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return new Response('JSON required',{status:415});
 let data;try{const text=await request.text();if(text.length>500)return new Response('Too large',{status:413});data=JSON.parse(text);}catch{return new Response('Invalid JSON',{status:400});}
 if(!data||typeof data.repository!=='string'||!['add','remove'].includes(data.action))return new Response('Invalid vote',{status:400});
 try{const snapshot=await readSnapshot();const repo=snapshot.records.find(r=>!r.exclusion_reason&&r.repository===data.repository);if(!repo)return new Response('Repository not eligible',{status:404});if(!env.DB)throw Error('Missing database');
 if(data.action==='add')await env.DB.prepare('INSERT INTO repository_votes (repository,user_id,created_at) VALUES (?,?,?) ON CONFLICT(repository,user_id) DO NOTHING').bind(repo.repository,user.userId,new Date().toISOString()).run();
 else await env.DB.prepare('DELETE FROM repository_votes WHERE repository = ? AND user_id = ?').bind(repo.repository,user.userId).run();
 const total=await env.DB.prepare('SELECT COUNT(*) AS count FROM repository_votes WHERE repository = ?').bind(repo.repository).first<{count:number}>();return Response.json({ok:true,voted:data.action==='add',votes:total?.count??0},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Vote could not be saved. Please retry.'},{status:503});}
}
