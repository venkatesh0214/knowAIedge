"use client";
import {useEffect,useState} from 'react';
export default function ThemeToggle(){
 const [dark,setDark]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const sync=()=>{let saved:string|null=null;try{saved=localStorage.getItem('knowaiedge-theme')}catch{}const value=saved==='dark'||(saved!=='light'&&media.matches);document.documentElement.dataset.theme=value?'dark':'light';setDark(value)};
  sync();media.addEventListener('change',sync);window.addEventListener('storage',sync);
  return()=>{media.removeEventListener('change',sync);window.removeEventListener('storage',sync)};
 },[]);
 function toggle(){const next=!dark;document.documentElement.dataset.theme=next?'dark':'light';setDark(next);try{localStorage.setItem('knowaiedge-theme',next?'dark':'light')}catch{}}
 return <button className="theme-toggle" onClick={toggle} aria-label={dark?'Switch to light mode':'Switch to dark mode'} title={dark?'Switch to light mode':'Switch to dark mode'}><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{dark?<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>:<path d="M20.5 14.1A9 9 0 0 1 9.9 3.5 9 9 0 1 0 20.5 14.1Z"/>}</svg>{dark?'Light':'Dark'}</button>
}
