import {env} from "cloudflare:workers";
import {viewer} from "../../admin-access";
export const dynamic="force-dynamic";
export async function GET(){const {user}=await viewer();if(!user)return new Response("Sign in required",{status:401});const bucket=(env as unknown as {BUCKET:R2Bucket}).BUCKET;const items:unknown[]=[];let cursor:string|undefined;do{const page=await bucket.list({prefix:`history/${encodeURIComponent(user.userId)}/`,limit:100,cursor});const values=await Promise.all(page.objects.map(async object=>{const entry=await bucket.get(object.key);return entry?entry.json():null}));items.push(...values.filter(Boolean));cursor=page.truncated?page.cursor:undefined}while(cursor);return Response.json({items},{headers:{"Cache-Control":"private, no-store"}})}
