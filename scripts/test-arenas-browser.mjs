import {chromium} from 'playwright-core';import assert from 'node:assert/strict';import {startOnlineServer} from '../online/server.mjs';import {mkdir} from 'node:fs/promises';import {matchMaker} from '@colyseus/core';
const {server,port,social}=await startOnlineServer({port:0,host:'127.0.0.1'});let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${port}`);await p.locator('#home').waitFor();assert.equal(await p.locator('#matchmaking-start,#online-open,dialog#entry-dialog').count(),0);
 const images=new Set();await mkdir('out/qa',{recursive:true});
 for(const mode of ['rps','advanced','party']){
  await p.locator(`[data-mode=${mode}]`).click();assert.equal(await p.locator('dialog[open]').count(),0);await p.waitForFunction(()=>!document.querySelector('#entry-confirm').disabled);
  assert.equal(await p.locator('.arena-card').getAttribute('data-arena'),mode+'-'+(mode==='party'?3:1));images.add(await p.locator('.arena-picture img').getAttribute('src'));
  const count=mode==='party'?6:5;assert.equal(await p.locator('#arena-dots button').count(),count);
  for(let i=1;i<count;i++){await p.locator('#arena-next').click();assert.equal(await p.locator('#entry-confirm').isDisabled(),true);images.add(await p.locator('.arena-picture img').getAttribute('src'));}
  assert.equal(await p.locator('#arena-next').isDisabled(),true);
  await p.locator('#arena-carousel').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#arena-dots [aria-pressed=true]').getAttribute('data-arena-index'),String(count-2));
  await p.locator('#arena-dots button').first().click();
  const box=await p.locator('.arena-picture').boundingBox();await p.mouse.move(box.x+box.width*.8,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width*.2,box.y+box.height/2,{steps:8});await p.mouse.up();assert.equal(await p.locator('#entry-confirm').isDisabled(),true);
  for(const [width,height]of [[1920,1080],[1366,768],[1280,600],[1024,600],[800,600],[390,844],[360,640]]){await p.setViewportSize({width,height});await p.waitForTimeout(60);const clipped=await p.locator('#entry-dialog button').evaluateAll(es=>es.filter(e=>e.checkVisibility()).filter(e=>{const b=e.getBoundingClientRect();return b.top<0||b.left<0||b.right>innerWidth+.9||b.bottom>innerHeight+.9;}).map(e=>e.id));assert.deepEqual(clipped,[],mode+width);assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);}
  await p.screenshot({path:`out/qa/arena-${mode}-mobile.png`});
 }
 assert.equal(images.size,16);
 const user=[...social.users.values()][0];user.xp=500;user.coins=1000;await p.setViewportSize({width:1366,height:768});await p.locator('[data-mode=rps]').click();await p.waitForFunction(()=>!document.querySelector('#entry-confirm').disabled);await p.locator('#arena-next').click();await p.waitForFunction(()=>!document.querySelector('#entry-confirm').disabled);await p.screenshot({path:'out/qa/arena-desktop.png'});await p.locator('#entry-confirm').click();await p.locator('.matchmaking').waitFor();const room=matchMaker.getLocalRoomById(await p.locator('#online-room-code').inputValue());assert.equal(room.rounds,5);assert.equal(room.arena.id,'rps-5');await p.locator('[data-online-move]').first().waitFor();assert.equal(room.capacity,2);assert.equal(user.coins,965);assert.deepEqual(errors,[]);
 console.log('Arena UI passed: 16 unique images, three modes, arrows/keyboard/swipe, locks, refresh unlock, seven sizes and authoritative selected matchmaking.');
}finally{await browser?.close();await server.gracefullyShutdown(false);}
