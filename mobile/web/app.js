(() => {
  "use strict";
  const {normalize, httpsURL, read, write} = window.readerModel;
  const sections = {
    news: ["News", "Daily briefing", "news"], repositories: ["Repos", "Repo Radar", "repo"],
    watchlist: ["Watchlist", "AI Watchlist", "play"], saved: ["Saved", "Saved items", "bookmark"]
  };
  const paths = {
    news:"M4 4h16v16H4z M7 8h10 M7 12h5 M7 16h8",
    repo:"M8 5a2 2 0 1 0-4 0 2 2 0 0 0 4 0 M6 7v10 M8 19a2 2 0 1 0-4 0 2 2 0 0 0 4 0 M20 5a2 2 0 1 0-4 0 2 2 0 0 0 4 0 M18 7v1a5 5 0 0 1-5 5h-2a5 5 0 0 0-5 5",
    play:"M3 5h18v14H3z M10 9l5 3-5 3z", bookmark:"M6 3h12v18l-6-4-6 4z",
    share:"M12 15V3 M8 7l4-4 4 4 M6 11H4v10h16V11h-2",
    refresh:"M20 5v6h-6 M19.5 10a8 8 0 1 0-1.3 7"
  };
  const $ = id => document.getElementById(id);
  const make = (tag, cls, value) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value) el.textContent = value;
    return el;
  };
  function icon(name) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns,"svg"), path = document.createElementNS(ns,"path");
    svg.setAttribute("class","ico"); svg.setAttribute("viewBox","0 0 24 24"); svg.setAttribute("aria-hidden","true");
    path.setAttribute("d",paths[name]); svg.append(path); return svg;
  }
  let storage;
  try { storage = window.localStorage; } catch { /* The reader still works in memory. */ }
  const feeds = {}, origin = {}, loading = new Set(), attempted = new Set(), errors = new Set();
  for (const key of Object.keys(window.bundledEdition)) {
    const cache = read(storage,key,null);
    if (Array.isArray(cache?.items)) { feeds[key]=cache; origin[key]="Cached edition"; }
    else { feeds[key]=normalize(key,window.bundledEdition[key]); origin[key]="Included edition"; }
  }
  const previous = read(storage,"saved",[]);
  let saved = Array.isArray(previous) ? previous.filter(item => item && httpsURL(item.url) && item.title) : [];
  let current="news", filter="", limit=10;
  const formatter = new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"numeric"});
  function formatted(value) {
    if (!value) return "";
    const date = new Date(value.length === 10 ? value + "T12:00:00" : value);
    return Number.isNaN(date.valueOf()) ? "" : formatter.format(date);
  }
  function announce(message) { $("notice").textContent=message; }
  function toggleSave(item) {
    const exists=saved.some(v => v.url === item.url);
    saved=exists ? saved.filter(v => v.url !== item.url) : [item,...saved];
    const persisted=write(storage,"saved",saved);
    render();
    const message=persisted ? (exists ? "Removed from Saved" : "Saved on this device") : "Device storage is unavailable. Changes last for this session.";
    announce(message);
    if (!persisted) $("status").textContent=message;
    const focusTarget=Array.from($("list").querySelectorAll("button[data-save]")).find(b=>b.dataset.save===item.url);
    (focusTarget || $("tabs").querySelector('[aria-current="page"]')).focus({preventScroll:true});
  }
  async function share(item) {
    if (window.webkit?.messageHandlers?.feed || location.hostname === "appassets.androidplatform.net") {
      location.href="knowaiedge-share://item?url=" + encodeURIComponent(item.url); return;
    }
    try {
      if (navigator.share) await navigator.share({title:item.title,url:item.url});
      else { await navigator.clipboard.writeText(item.url); $("status").textContent="Link copied."; }
    } catch (error) { if (error.name !== "AbortError") $("status").textContent="Open the original to share its link."; }
  }
  function action(name, title, handler) {
    const b=make("button"); b.type="button"; b.setAttribute("aria-label",title); b.title=title;
    b.append(icon(name)); b.onclick=handler; return b;
  }
  function card(item, featured) {
    const a=make("article",featured ? "card feature" : "card");
    const meta=make("div","story-meta");
    meta.append(make("span","",item.topic || sections[item.section]?.[0] || "Saved"));
    const when=formatted(item.date);
    if (when) meta.append(make("span","",item.added ? "Added " + when : when));
    const h=make("h2"), link=make("a","",item.title); link.href=httpsURL(item.url); h.append(link);
    const footer=make("div","card-foot"), tools=make("div","tools");
    const chosen=saved.some(v=>v.url===item.url);
    const save=action("bookmark",(chosen?"Unsave ":"Save ")+item.title,()=>toggleSave(item));
    save.setAttribute("aria-pressed",String(chosen)); save.dataset.save=item.url;
    tools.append(save,action("share","Share "+item.title,()=>share(item)));
    footer.append(make("span","credit",item.credit),tools);
    a.append(meta,h,make("p","summary",item.summary),footer); return a;
  }
  function render() {
    const isSaved=current==="saved", items=isSaved ? saved : feeds[current].items;
    $("heading").textContent=sections[current][1];
    $("refresh").hidden=isSaved;
    $("refresh").disabled=loading.has(current);
    $("refresh").setAttribute("aria-label","Refresh " + sections[current][0]);
    const date=!isSaved && formatted(feeds[current].updatedAt);
    $("edition").textContent=isSaved ? saved.length+" saved on this device" : [origin[current],date].filter(Boolean).join(" · ");
    $("status").textContent=loading.has(current) ? "Checking for updates…" : errors.has(current) ? "Couldn’t refresh. Showing the last available edition." : "";
    for (const tab of $("tabs").children) {
      if (tab.dataset.key===current) tab.setAttribute("aria-current","page"); else tab.removeAttribute("aria-current");
    }
    const topics=[...new Set(items.map(i=>i.topic).filter(Boolean))].sort();
    if (!topics.includes(filter)) filter="";
    $("filters").hidden=!topics.length; $("filter").replaceChildren(new Option("All topics",""),...topics.map(t=>new Option(t,t)));
    $("filter").value=filter;
    const visible=filter ? items.filter(i=>i.topic===filter) : items;
    const list=$("list"); list.replaceChildren();
    visible.slice(0,limit).forEach((item,index)=>list.append(card(item,index===0 && !isSaved)));
    if (!visible.length) {
      const box=make("div","empty"); box.append(make("h2","",isSaved ? "Your reading list starts here" : "No items in this edition"),
        make("p","",isSaved ? "Tap the bookmark on a story, repository, or video to keep its summary here." : "Refresh to check for new items."));
      list.append(box);
    }
    $("more").hidden=visible.length<=limit;
  }
  async function refresh(section) {
    if (section==="saved" || loading.has(section)) return;
    loading.add(section); attempted.add(section); errors.delete(section); render();
    try {
      let data;
      const nativeFeed=window.webkit?.messageHandlers?.feed;
      if (nativeFeed) data=JSON.parse(await nativeFeed.postMessage(section));
      else {
        const response=await fetch("/api/"+section,{cache:"no-store"});
        if (!response.ok) throw new Error("Feed unavailable");
        data=await response.json();
      }
      const edition=normalize(section,data);
      feeds[section]=edition; origin[section]="Latest edition"; write(storage,section,edition);
    } catch { errors.add(section); }
    finally { loading.delete(section); if (current===section) render(); }
  }
  function select(section) {
    current=section; filter=""; limit=10; render(); window.scrollTo(0,0);
    if (!attempted.has(section)) void refresh(section);
  }
  for (const [key,[label,,symbol]] of Object.entries(sections)) {
    const button=make("button"); button.type="button"; button.dataset.key=key;
    button.append(icon(symbol),make("span","",label)); button.onclick=()=>select(key); $("tabs").append(button);
  }
  $("refresh").append(icon("refresh")); $("refresh").onclick=()=>refresh(current);
  $("more").onclick=()=>{limit+=10; render();};
  $("filter").onchange=e=>{filter=e.target.value; limit=10; render();};
  window.readerBack=()=>{if(current==="news") return false; select("news"); return true;};
  window.addEventListener("online",()=>refresh(current));
  select("news");
})();
