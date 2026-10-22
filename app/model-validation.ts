import type {ModelResearch} from './model-types';
const https=(s:unknown)=>{try{const u=new URL(String(s));return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
const text=(s:unknown,n=700)=>typeof s==='string'&&s.length>0&&s.length<=n;
const price=(n:unknown)=>n===null||(typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100000);
export function validateResearch(input:unknown):ModelResearch[]{
 if(!Array.isArray(input)||!input.length||input.length>50)throw Error('Invalid model research: supply 1–50 records.');
 const today=new Date().toISOString().slice(0,10);
 const result=input.map(r=>{
  if(!r||!text(r.id,160)||!/^[-a-z0-9_.:/]+$/.test(r.id)||!text(r.name,160)||!text(r.provider,80)||!text(r.summary)||!text(r.releaseLabel,180)||!https(r.releaseSource)||!r.releaseDate||!/^\d{4}-\d{2}-\d{2}$/.test(r.releaseDate)||!Number.isFinite(Date.parse(r.releaseDate))||new Date(r.releaseDate).toISOString().slice(0,10)!==r.releaseDate||r.releaseDate>today||!Array.isArray(r.benchmarks)||r.benchmarks.length>6||!(r.contextWindow===null||(Number.isInteger(r.contextWindow)&&r.contextWindow>0)))throw Error('Invalid model research: check release date, source and required fields.');
  if(r.benchmarks.some((b:any)=>!text(b.name,120)||!text(b.score,60)||!text(b.setup,500)||!['Vendor-reported','Independent'].includes(b.attribution)||!https(b.source)))throw Error('Invalid model research: benchmark provenance required.');
  if(r.officialPrice!==null&&(!r.officialPrice||!price(r.officialPrice.input)||!price(r.officialPrice.output)||!text(r.officialPrice.note,500)||!https(r.officialPrice.source)))throw Error('Invalid model research: pricing source and conditions required.');
  return {id:r.id,name:r.name,provider:r.provider,releaseDate:r.releaseDate,releaseLabel:r.releaseLabel,releaseSource:r.releaseSource,summary:r.summary,benchmarks:r.benchmarks.map((b:any)=>({name:b.name,score:b.score,setup:b.setup,attribution:b.attribution,source:b.source})),officialPrice:r.officialPrice===null?null:{input:r.officialPrice.input,output:r.officialPrice.output,note:r.officialPrice.note,source:r.officialPrice.source},contextWindow:r.contextWindow,researchCheckedAt:new Date().toISOString()};
 });
 if(new Set(result.map(r=>r.id)).size!==result.length)throw Error('Invalid model research: duplicate IDs.');
 return result;
}
export function perMillion(value:unknown){if(typeof value!=='string'&&typeof value!=='number')return null;if(value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?Number((n*1000000).toFixed(6)):null}
