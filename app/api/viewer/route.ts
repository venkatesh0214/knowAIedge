import {viewer} from "../../admin-access";
export const dynamic="force-dynamic";
export async function GET(){const {user,isAdmin}=await viewer();return Response.json({signedIn:!!user,isAdmin,name:user?.displayName??null},{headers:{"Cache-Control":"private, no-store"}})}
