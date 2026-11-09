import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {startOnlineServer} from '../online/server.mjs';
import {Client} from '@colyseus/sdk';
const {server,port}=await startOnlineServer({port:0,host:'127.0.0.1'});
let browser;const guests=[];
async function fit(page,label){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const clipped=await page.evaluate(()=>{const target=document.querySelector('dialog[open]')||document.getElementById('app');return [...target.querySelectorAll('button,input,select')].filter(el=>el.checkVisibility()).filter(el=>{const r=el.getBoundingClientRect();return r.left<-.9||r.top<-.9||r.right>innerWidth+.9||r.bottom>innerHeight+.9;}).map(el=>el.id||el.textContent);});
  assert.deepEqual(clipped,[],label+' clipped controls');await page.mouse.wheel(0,500);assert.equal(await page.evaluate(()=>scrollY),0,label+' scrolled');
}
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const c1=await browser.newContext({viewport:{width:1280,height:600}}),c2=await browser.newContext({viewport:{width:390,height:844}});
  const a=await c1.newPage(),b=await c2.newPage(),errors=[];
  for(const p of [a,b]){p.on('pageerror',error=>errors.push(error.message));await p.goto(`http://127.0.0.1:${port}`);await p.locator('#home').waitFor({state:'visible'});}
  await a.locator('#configure').click();await a.locator('#round-count').selectOption('1');await a.locator('#apply-setup').click();
  await a.locator('#online-open').click();assert.equal(await a.locator('#online-name').inputValue(),'آرش');await a.locator('#online-create').click();
  await a.waitForFunction(()=>document.getElementById('online-room-code').value.length===8);
  const code=await a.locator('#online-room-code').inputValue();
  await b.locator('#online-open').click();await b.locator('#online-name').fill('ترانه');await b.locator('#online-code').fill(code.toLowerCase());await b.locator('#online-join').click();
  await a.waitForFunction(()=>document.querySelectorAll('.online-member').length===2);await b.locator('.online-member').first().waitFor();
  await fit(a,'online lobby desktop');await fit(b,'online lobby mobile');
  assert.equal(await a.locator('[data-online=start]').isDisabled(),true);
  await a.locator('[data-online=ready]').click();await b.locator('[data-online=ready]').click();await a.waitForFunction(()=>!document.querySelector('[data-online=start]').disabled);
  await a.locator('[data-online=start]').click();await a.locator('[data-online-move=paper]').waitFor();await b.locator('[data-online-move=rock]').waitFor();
  await a.locator('[data-online-move=paper]').click();await a.getByRole('heading',{name:'دستت ثبت شد',exact:true}).waitFor();
  assert.deepEqual(await b.locator('.hand').allTextContents(),['؟','؟']);
  await b.locator('[data-online-move=rock]').click();await a.getByRole('heading',{name:'آرش قهرمان شد!'}).waitFor();await b.getByRole('heading',{name:'آرش قهرمان شد!'}).waitFor();
  await fit(a,'online result desktop');await fit(b,'online result mobile');
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
  await a.setViewportSize({width:360,height:640});await a.locator('#configure').click();await a.locator('#player-count').selectOption('8');await a.locator('#apply-setup').click();await a.locator('#online-open').click();await a.locator('#online-fill-bots').uncheck();await a.locator('#online-create').click();await a.locator('[data-online=ready]').waitFor();
  const eightCode=await a.locator('#online-room-code').inputValue(),sdk=new Client(`http://127.0.0.1:${port}`);
  for(let i=0;i<7;i++){const guest=await sdk.joinById(eightCode,{name:`دوست ${i+1}`});guest.onMessage('snapshot',()=>{});guests.push(guest);guest.send('ready',true);}
  await a.waitForFunction(()=>document.querySelectorAll('.online-member').length===8);await fit(a,'online 8-human waiting mobile');await a.screenshot({path:'out/qa/no-scroll-online-waiting-360.png'});
  await a.locator('[data-online=ready]').click();await a.waitForFunction(()=>!document.querySelector('[data-online=start]').disabled);await a.locator('[data-online=start]').click();await a.waitForFunction(()=>document.querySelectorAll('.online-table .hand-seat').length===8);await fit(a,'online 8-player match mobile');assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await a.screenshot({path:'out/qa/online-eight-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('Online browser passed: independent devices, named players, readiness, RPS privacy and winner, reload/reconnect, rematch, leave, human/bot party and mobile layout.');
}finally{await Promise.allSettled(guests.map(room=>room.leave()));await browser?.close();await server.gracefullyShutdown(false);}
