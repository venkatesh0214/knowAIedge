import {getWatchlist} from '../../watchlist-data';
export const dynamic='force-dynamic';
export async function GET(){return Response.json(await getWatchlist(),{headers:{'Cache-Control':'no-store'}})}
