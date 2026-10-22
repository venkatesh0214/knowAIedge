export type TimeRange='all'|'today'|'yesterday'|'7d'|'30d'|'90d';
export const timeRanges:{value:TimeRange;label:string}[]=[{value:'all',label:'All time'},{value:'today',label:'Today'},{value:'yesterday',label:'Yesterday'},{value:'7d',label:'7 days'},{value:'30d',label:'30 days'},{value:'90d',label:'90 days'}];
export const feedTimeZone='America/Los_Angeles';
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:feedTimeZone,year:'numeric',month:'2-digit',day:'2-digit'});
export function calendarDay(value:string|number|null|undefined):string|null{
 if(value===null||value===undefined||value==='')return null;
 if(typeof value==='string'&&/^\d{4}-\d{2}$/.test(value))return null;
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return Number.isFinite(Date.parse(value))?value:null;
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;
 const p=dayFormat.formatToParts(date);return ['year','month','day'].map(type=>p.find(x=>x.type===type)?.value).join('-');
}
export function dayAge(value:string|null|undefined,now:number){const day=calendarDay(value),today=calendarDay(now);return day&&today?Math.round((Date.parse(today)-Date.parse(day))/86400000):null}
export function inTimeRange(value:string|null|undefined,range:TimeRange,now:number){if(range==='all')return true;const age=dayAge(value,now);if(age===null||age<0)return false;if(range==='today')return age===0;if(range==='yesterday')return age===1;return age<Number.parseInt(range)}
export function relativeDate(value:string|null|undefined,now:number){
 if(!value)return 'Date unavailable';
 if(/^\d{4}-\d{2}$/.test(value))return new Date(value+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
 const age=dayAge(value,now);if(age===null)return 'Date unavailable';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value)){if(age===0)return 'Today';if(age===1)return 'Yesterday';if(age<0)return 'Upcoming';if(age<30)return `${age} days ago`;if(age<365)return `${Math.floor(age/30)} mo ago`;return `${Math.floor(age/365)} yr ago`}
 const seconds=Math.floor((now-Date.parse(value))/1000);if(seconds<0)return 'Upcoming';if(seconds<60)return 'Just now';if(seconds<3600)return `${Math.floor(seconds/60)} min ago`;if(seconds<86400)return `${Math.floor(seconds/3600)} hr ago`;if(age<30)return `${age} days ago`;if(age<365)return `${Math.floor(age/30)} mo ago`;return `${Math.floor(age/365)} yr ago`;
}
export function exactDate(value:string){if(/^\d{4}-\d{2}(-\d{2})?$/.test(value))return value;const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{timeZone:feedTimeZone,dateStyle:'medium',timeStyle:'short'})+' Pacific':value}
export function pageNumbers(page:number,pages:number):(number|'gap')[]{const list=[...new Set([1,pages,page-1,page,page+1,...(page<=3?[2,3,4]:[]),...(page>=pages-2?[pages-3,pages-2,pages-1]:[])])].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b);return list.flatMap((n,i)=>i&&n-list[i-1]>1?['gap',n] as (number|'gap')[]:[n])}
