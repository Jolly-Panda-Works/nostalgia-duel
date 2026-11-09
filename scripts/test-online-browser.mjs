import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {startOnlineServer} from '../online/server.mjs';
const {server,port}=await startOnlineServer({port:0,host:'127.0.0.1'});
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const c1=await browser.newContext({viewport:{width:1366,height:900}}),c2=await browser.newContext({viewport:{width:390,height:844}});
  const a=await c1.newPage(),b=await c2.newPage(),errors=[];
  for(const p of [a,b]){p.on('pageerror',error=>errors.push(error.message));await p.goto(`http://127.0.0.1:${port}`);await p.locator('#home').waitFor({state:'visible'});}
  await a.locator('#configure').click();await a.locator('#round-count').selectOption('1');await a.locator('#apply-setup').click();
  await a.locator('#online-open').click();assert.equal(await a.locator('#online-name').inputValue(),'آرش');await a.locator('#online-create').click();
  await a.waitForFunction(()=>document.getElementById('online-room-code').value.length===8);
  const code=await a.locator('#online-room-code').inputValue();
  await b.locator('#online-open').click();await b.locator('#online-name').fill('ترانه');await b.locator('#online-code').fill(code.toLowerCase());await b.locator('#online-join').click();
  await a.waitForFunction(()=>document.querySelectorAll('.online-member').length===2);await b.locator('.online-member').first().waitFor();
  assert.equal(await a.locator('[data-online=start]').isDisabled(),true);
  await a.locator('[data-online=ready]').click();await b.locator('[data-online=ready]').click();await a.waitForFunction(()=>!document.querySelector('[data-online=start]').disabled);
  await a.locator('[data-online=start]').click();await a.locator('[data-online-move=paper]').waitFor();await b.locator('[data-online-move=rock]').waitFor();
  await a.locator('[data-online-move=paper]').click();await a.getByRole('heading',{name:'دستت ثبت شد',exact:true}).waitFor();
  assert.deepEqual(await b.locator('.hand').allTextContents(),['؟','؟']);
  await b.locator('[data-online-move=rock]').click();await a.getByRole('heading',{name:'آرش قهرمان شد!'}).waitFor();await b.getByRole('heading',{name:'آرش قهرمان شد!'}).waitFor();
  await mkdir('out/qa',{recursive:true});await a.screenshot({path:'out/qa/online-result-desktop.png',fullPage:true});await b.screenshot({path:'out/qa/online-result-mobile.png',fullPage:true});
  assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await a.locator('[data-online=rematch]').click();await a.locator('[data-online=ready]').waitFor();
  await a.reload();await a.locator('#online-open').click();await a.locator('#online-resume').click();await a.waitForFunction(()=>document.querySelectorAll('.online-member').length===2);
  assert.equal(await a.locator('[data-online=start]').count(),1);
  await a.screenshot({path:'out/qa/online-lobby-desktop.png',fullPage:true});
  await b.screenshot({path:'out/qa/online-lobby-mobile.png',fullPage:true});
  for(const p of [a,b]){await p.locator('#online-leave').click();await p.locator('#online-leave-confirm').click();await p.locator('#home').waitFor({state:'visible'});}
  await a.locator('[data-mode=party]').click();await a.locator('#configure').click();await a.locator('#player-count').selectOption('3');await a.locator('#apply-setup').click();await a.locator('#online-open').click();await a.locator('#online-fill-bots').check();await a.locator('#online-create').click();
  await a.waitForFunction(()=>document.getElementById('online-room-code').value.length===8);
  const partyCode=await a.locator('#online-room-code').inputValue();
  await b.locator('#online-open').click();await b.locator('#online-code').fill(partyCode);await b.locator('#online-join').click();await a.waitForFunction(()=>document.querySelectorAll('.online-member').length===2);
  await a.locator('[data-online=ready]').click();await b.locator('[data-online=ready]').click();await a.waitForFunction(()=>!document.querySelector('[data-online=start]').disabled);await a.locator('[data-online=start]').click();
  await a.locator('[data-online-move=palm]').waitFor();await b.locator('[data-online-move=back]').waitFor();await a.locator('[data-online-move=palm]').click();await b.locator('[data-online-move=back]').click();
  await a.waitForFunction(()=>document.querySelectorAll('.online-table .eliminated').length===1);
  await b.screenshot({path:'out/qa/online-party-mobile.png',fullPage:true});assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const p of [a,b]){await p.locator('#online-leave').click();await p.locator('#online-leave-confirm').click();await p.locator('#home').waitFor({state:'visible'});}
  await a.setViewportSize({width:390,height:844});await a.locator('#configure').click();await a.locator('#player-count').selectOption('8');await a.locator('#apply-setup').click();await a.locator('#online-open').click();await a.locator('#online-create').click();await a.locator('[data-online=ready]').waitFor();await a.locator('[data-online=ready]').click();await a.waitForFunction(()=>!document.querySelector('[data-online=start]').disabled);await a.locator('[data-online=start]').click();await a.waitForFunction(()=>document.querySelectorAll('.online-table .hand-seat').length===8);assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await a.screenshot({path:'out/qa/online-eight-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('Online browser passed: independent devices, named players, readiness, RPS privacy and winner, reload/reconnect, rematch, leave, human/bot party and mobile layout.');
}finally{await browser?.close();await server.gracefullyShutdown(false);}
