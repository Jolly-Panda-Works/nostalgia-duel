import {chromium} from 'playwright-core';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https?:/,route=>route.abort('internetdisconnected'));
  await page.goto(pathToFileURL(path.resolve('out/play.html')).href);
  await page.locator('#connection-dialog[open]').waitFor();
  await page.locator('#connection-retry').click();
  await page.getByText('اتصال به سرور برقرار نشد.',{exact:false}).waitFor();
  await page.locator('#connection-dismiss').click();
  await page.locator('#nav-players').click();
  for(const id of ['profile-edit-name','profile-avatar','friends-open','offline-stats','nav-shop','wallet-shop']){
    await page.locator('#'+id).click();
    await page.locator('#connection-dialog[open]').waitFor();
    assert.equal(await page.locator('#connection-dismiss').innerText(),'بی‌خیال');
    await page.locator('#connection-dismiss').click();
  }
  assert.equal(await page.locator('#profile-totals').isVisible(),false);
  await page.locator('#nav-home').click();
  for(const mode of ['rps','advanced','party']){
    await page.locator('[data-mode='+mode+']').click();
    await page.locator('#entry-confirm').click();
    assert.equal(await page.locator('.score-player').count(),mode==='party'?3:2);
    for(let round=0;round<(mode==='party'?2:3);round++){
      await page.locator('[data-online-move]').first().waitFor();
      await page.evaluate((partyOpening)=>{
        const original=Math.random;
        const values=partyOpening?[0,0.9]:[0];
        Math.random=()=>{const next=values.shift();if(!values.length)Math.random=original;return next;};
      },mode==='party'&&round===0);
      await page.locator('[data-online-move="'+(mode==='party'&&round===0?'palm':'paper')+'"]').click();
    }
    await page.locator('#match-result').waitFor();
    assert.equal(await page.locator('.result-reward').count(),0);
    assert.equal(await page.locator('.result-saved').innerText(),'بازی آفلاین • نتیجه ذخیره نمی‌شود.');
    await page.locator('[data-online=result-home]').click();
    await page.locator('#home').waitFor();
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('nostalgia-duel-v2')),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('nostalgia-saved-matches')),null);
  assert.deepEqual(errors,[]);
  console.log('Offline standalone: all three matches completed, restrictions, retry, no wallet or record writes.');
}finally{await browser.close();}
