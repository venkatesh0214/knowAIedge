const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const {normalize, httpsURL, read, write} = require("../web/model.js");
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../web/edition.js"),"utf8"),context);
const edition = context.window.bundledEdition;

for (const [section, input] of Object.entries(edition)) {
  test(section + " starter edition uses the site schema and HTTPS originals", () => {
    const result = normalize(section,input);
    assert.equal(result.updatedAt,input.updatedAt);
    assert.equal(result.items.length,6);
    for (const item of result.items) {
      assert.ok(item.title && item.summary && item.credit);
      assert.equal(httpsURL(item.url),item.url);
    }
  });
}
test("news uses site-added date, falls back to publication dates and removes duplicates", () => {
  const entry={title:"First",url:"https://example.org/one",date:"2026-05-01"};
  const newer={...entry,title:"Second",url:"https://example.org/two",addedAt:"2026-11-18T15:00:00Z"};
  const {items}=normalize("news",{articles:[entry,newer,entry,{...entry,url:"javascript:void(0)"}]});
  assert.deepEqual(items.map(i=>[i.title,i.added]),[["Second",true],["First",false]]);
});
test("malformed responses preserve the previous edition, while empty editions are valid", () => {
  assert.throws(()=>normalize("news",{error:"Unavailable"}));
  assert.throws(()=>normalize("watchlist",{videos:[{}]}));
  assert.deepEqual(normalize("repositories",{rows:[]}).items,[]);
});
test("videos link to the video itself, independent of the research source", () => {
  const [video]=edition.watchlist.videos;
  const {items}=normalize("watchlist",{videos:[{...video,source:"https://example.com/about"}]});
  assert.equal(items[0].url,"https://www.youtube.com/watch?v="+video.id);
});
test("repository order follows the site's ranking", () => {
  const {items}=normalize("repositories",edition.repositories);
  assert.deepEqual(items.map(i=>i.title),Array.from(edition.repositories.rows,r=>r.repository));
});
test("only HTTPS links without embedded credentials are allowed", () => {
  for (const value of [null,"javascript:alert(1)","http://example.com","https://user:pass@example.com/","file:///x"]) assert.equal(httpsURL(value),"");
});
test("saved items persist and storage failures are recoverable", () => {
  const data=new Map(), storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const item=normalize("news",edition.news).items[0];
  assert.equal(write(storage,"saved",[item]),true);
  assert.deepEqual(read(storage,"saved",[]),[item]);
  data.set("reader.v1.saved","broken"); assert.deepEqual(read(storage,"saved",[]),[]);
  assert.equal(write(undefined,"saved",[]),false);
});
