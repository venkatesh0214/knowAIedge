import {env} from "cloudflare:workers";
import {getChatGPTUser} from "./chatgpt-auth";
export function isAdminEmail(email:string|undefined,config:{SITE_ADMIN_EMAIL?:string;SITE_ADDITIONAL_ADMIN_EMAILS?:string}){
 const allowed=[config.SITE_ADMIN_EMAIL||"",...(config.SITE_ADDITIONAL_ADMIN_EMAILS||"").split(",")].map(x=>x.trim().toLowerCase()).filter(Boolean);
 return !!email && allowed.includes(email.trim().toLowerCase());
}
export async function viewer(){const user=await getChatGPTUser();return {user,isAdmin:!!user&&isAdminEmail(user.email,env as unknown as {SITE_ADMIN_EMAIL?:string;SITE_ADDITIONAL_ADMIN_EMAILS?:string})}}
