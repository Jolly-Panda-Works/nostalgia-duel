import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';

const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  await mkdir('out/qa',{recursive:true});
  for(const [name,width,height,native,mode] of [
    ['web',1366,768,false,'rps'],['android',390,844,true,'advanced'],['compact',360,640,false,'advanced']
  ]){
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    if(native)await page.addInitScript(()=>{window.Capacitor={isNativePlatform:()=>true};});
    let releaseNetwork;
    const loadingCapture=new Promise(resolve=>{releaseNetwork=resolve;});
    await page.route(/^https?:/,async route=>{await loadingCapture;await route.abort();});
    await page.goto(pathToFileURL(path.resolve('out/play.html')).href);
    await page.locator('#game-loader').waitFor();
    await page.locator('.loader-character').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    const figures=await page.locator('.loader-character').evaluateAll(images=>images.map(image=>image.getBoundingClientRect().toJSON()));
    assert.equal(figures.length,2);
    assert.ok(figures.every(r=>Math.abs(r.bottom-height)<1),'Loading characters touch bottom');
    assert.ok(figures[0].right<width/2 && figures[1].left>width/2,'Characters face across the screen');
    await page.screenshot({path:'out/qa/court-loading-'+name+'.png'});
    releaseNetwork();
    await page.locator('#connection-dialog[open]').waitFor();
    await page.locator('#connection-dismiss').click();
    await page.locator('#home .home-figure').first().waitFor();
    await page.locator('#connection-dialog').waitFor({state:'hidden'});
    await page.screenshot({animations:'disabled',path:'out/qa/court-home-'+name+'.png'});
    await page.locator('[data-mode='+mode+']').click();
    await page.locator('#entry-confirm').click();
    await page.locator('.duel-board').waitFor();
    assert.equal(await page.locator('.physical-table').count(),0);
    assert.equal(await page.locator('.gesture-key').count(),mode==='advanced'?5:3);
    const buttons=await page.locator('.gesture-key').evaluateAll(elements=>elements.map(e=>{
      const r=e.getBoundingClientRect();
      return {visible:r.width>=32&&r.height>=32&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1};
    }));
    assert.ok(buttons.every(b=>b.visible),'Gesture buttons should fit '+name);
    assert.equal(await page.locator('.fighter-left').getAttribute('data-pose'),'idle');
    await page.waitForFunction(()=>[...document.querySelectorAll('.duel-arm')].every(arm=>new DOMMatrix(getComputedStyle(arm).transform).a<0));
    await page.screenshot({path:'out/qa/court-hidden-'+name+'.png'});
    await page.evaluate(()=>{Math.random=()=>0;});
    await page.locator('[data-online-move=scissors]').click();
    await page.locator('.duel-board[data-phase=reveal]').waitFor();
    assert.equal(await page.locator('.fighter-left').getAttribute('data-pose'),'rock');
    assert.equal(await page.locator('.fighter-right').getAttribute('data-pose'),'scissors');
    await page.waitForFunction(()=>[...document.querySelectorAll('.duel-arm')].every(arm=>arm.closest('[data-phase=reveal]') && arm.getAnimations().every(animation=>animation.playState==='finished')));
    await page.screenshot({path:'out/qa/court-duel-'+name+'.png'});
    assert.deepEqual(errors,[]);
    console.log('Verified '+name+' '+width+'x'+height);
    await page.close();
  }
}finally{await browser.close();}
