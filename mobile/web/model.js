(() => {
  "use strict";
  const fields = {news: "articles", repositories: "rows", watchlist: "videos"};
  function httpsURL(value) {
    if (typeof value !== "string") return "";
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  }
  function label(value) { return typeof value === "string" ? value.trim() : ""; }
  function normalize(section, payload) {
    const rows = payload?.[fields[section]];
    if (!Array.isArray(rows)) throw new Error("Unexpected feed format");
    const seen = new Set();
    const items = [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      let title, summary, credit, topic, date, url;
      if (section === "news") {
        ({title, summary, source: credit, category: topic, url} = row);
        date = row.addedAt || row.date;
      } else if (section === "repositories") {
        ({repository: title, description: summary, category: topic, url} = row);
        credit = Number.isInteger(row.rank) ? "Rank #" + row.rank : "GitHub";
      } else {
        ({title, why: summary, channel: credit, publishedAt: date} = row);
        topic = row.topics?.[0] || row.level;
        url = /^[\w-]{11}$/.test(row.id) ? "https://www.youtube.com/watch?v=" + row.id : row.source;
      }
      url = httpsURL(url);
      if (!url || !label(title) || seen.has(url)) continue;
      seen.add(url);
      items.push({section, url, title:label(title), summary:label(summary), credit:label(credit),
        topic:label(topic), date:label(date), added:section === "news" && Boolean(row.addedAt)});
    }
    if (rows.length && !items.length) throw new Error("No readable feed entries");
    if (section === "news") items.sort((a,b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
    return {updatedAt:label(payload.updatedAt), items};
  }
  function read(storage, key, fallback) {
    try { return JSON.parse(storage.getItem("reader.v1." + key)) ?? fallback; }
    catch { return fallback; }
  }
  function write(storage, key, value) {
    try { storage.setItem("reader.v1." + key, JSON.stringify(value)); return true; }
    catch { return false; }
  }
  const model = {normalize, httpsURL, read, write};
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  else window.readerModel = model;
})();
