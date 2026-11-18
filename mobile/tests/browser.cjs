const {chromium}=require(process.env.KNOW_PLAYWRIGHT);
const path=require('node:path');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.KNOW_CHROME,headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const state={window:{}};vm.runInNewContext(fs.readFileSync('mobile/web/edition.js','utf8'),state);
    let online=false;
    await page.route('https://reader.example/**',async route=>{
      const resource=new URL(route.request().url()).pathname.slice(1)||'index.html';
      if (resource.startsWith('api/')) {
        if (online) await route.fulfill({json:state.window.bundledEdition[resource.slice(4)]});
        else await route.fulfill({status:503,body:'offline'});
        return;
      }
      await route.fulfill({path:path.resolve('mobile/web',resource)});
    });
    await page.goto('https://reader.example/index.html');
    await page.getByText('Couldn’t refresh.',{exact:false}).waitFor();
    assert.equal(await page.locator('article').count(),6);
    const title=await page.locator('article h2').first().innerText();
    await page.locator('button[data-save]').first().click();
    await page.getByRole('button',{name:'Saved',exact:true}).click();
    assert.equal(await page.locator('article h2').innerText(),title);
    await page.reload();
    await page.getByRole('button',{name:'Saved',exact:true}).click();
    assert.equal(await page.locator('article h2').innerText(),title);
    await page.locator('button[data-save]').first().click();
    await page.getByText('Your reading list starts here').waitFor();
    online=true;
    for (const tab of ['Repos','Watchlist','News']) {
      await page.getByRole('button',{name:tab,exact:true}).click();
      await page.locator('#refresh').click();
      await page.getByText('Latest edition',{exact:false}).waitFor();
      assert.equal(await page.locator('article').count(),6);
      await page.locator('#filter').selectOption({index:1});
      assert.ok(await page.locator('article').count()>0);
    }
    await page.locator('#filter').selectOption('');
    online=false;
    await page.reload();
    await page.getByText('Cached edition',{exact:false}).waitFor();
    assert.equal(await page.locator('article').count(),6);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('Passed phone viewport, offline first launch, bookmark/relaunch/remove, all three refreshes, topic filtering, persistent feed cache and console checks.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
