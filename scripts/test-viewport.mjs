import {chromium} from 'playwright-core';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    Math.random=()=>.4;
    localStorage.setItem('nostalgia-duel-v2',JSON.stringify({version:2,records:['rps','party'].flatMap(mode=>Array.from({length:10},(_,i)=>({mode,name:`آرش ${i+1}`,score:1000-i,rounds:3})))}));
  });
  await mkdir('out/qa',{recursive:true});
  const check=async(label)=>{
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const result=await page.evaluate(()=>{
      const dialog=document.querySelector('dialog[open]'),target=dialog||document.getElementById('app'),rect=target.getBoundingClientRect();
      const visible=el=>el.checkVisibility()&&el.getBoundingClientRect().width>0;
      const bad=[...target.querySelectorAll('button,input,select')].filter(visible).flatMap(el=>{const b=el.getBoundingClientRect();return b.left<-.9||b.top<-.9||b.right>innerWidth+.9||b.bottom>innerHeight+.9?[el.id||el.textContent.slice(0,30)]:[];});
      const scrolling=[...document.querySelectorAll('*')].filter(visible).filter(el=>['auto','scroll'].includes(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight+1).map(el=>el.id||el.className);
      return {width:innerWidth,height:innerHeight,left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,bad,scrolling,scale:document.getElementById('app').style.getPropertyValue('--stage-scale')};
    });
    assert.equal(result.bad.length,0,label+' clipped controls: '+JSON.stringify(result));
    assert.equal(result.scrolling.length,0,label+' scroll containers: '+JSON.stringify(result));
    assert.ok(result.left>=-.9&&result.top>=-.9&&result.right<=result.width+.9&&result.bottom<=result.height+.9,label+' stage bounds: '+JSON.stringify(result));
    await page.mouse.wheel(0,650);assert.equal(await page.evaluate(()=>scrollY),0,label+' page scrolled');
    return result;
  };
  for(const [width,height] of [[1920,1080],[1366,768],[1280,600],[1024,600],[800,600],[390,844],[360,640]]){
    await page.setViewportSize({width,height});await page.goto(pathToFileURL(path.resolve('out/play.html')).href);await page.locator('#home').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
    await check(`${width}x${height} home`);
    await page.locator('[data-mode=party]').click();await page.locator('#configure').click();await page.locator('#player-count').selectOption('8');await check('setup 8 page 1');
    await page.locator('#roster-next').click();assert.equal(await page.locator('[data-name="7"]').count(),1);await page.locator('[data-name="7"]').fill('دوست هشتم');await check('setup 8 page 2');await page.locator('#roster-prev').click();await page.locator('#roster-next').click();assert.equal(await page.locator('[data-name="7"]').inputValue(),'دوست هشتم');await page.locator('#apply-setup').click();
    await check('party lobby 8');await page.locator('#start').click();await check('local game 8');
    if(width===1366||width===390)await page.screenshot({path:`out/qa/no-scroll-game-${width}.png`});
    await page.locator('#pause').click();await check('pause');await page.locator('#modal-close').click();await page.locator('#exit').click();await check('exit dialog');await page.locator('#modal-exit').click();
    await page.locator('#scores').click();await check('scores 1');assert.equal(await page.locator('.score-row').count(),5);await page.locator('#score-next').click();await check('scores 2');assert.match(await page.locator('#score-list').innerText(),/آرش 10/);await page.locator('[data-score-mode=party]').click();await check('party scores');await page.locator('#nav-home').click();
    await page.locator('#help').click();await check('help');await page.locator('#modal-close').click();await page.locator('#online-open').click();await check('online connect');await page.locator('#online-close').click();
    await page.locator('[data-mode=rps]').click();await page.locator('#configure').click();await page.locator('#round-count').selectOption('1');await page.locator('#apply-setup').click();await page.locator('#start').click();await page.locator('[data-move=scissors]').click();await page.locator('#next').waitFor({state:'visible'});await check('reveal');await page.locator('#next').click();await check('result');
    if(width===1366||width===390)await page.screenshot({path:`out/qa/no-scroll-result-${width}.png`});
    console.log(`${width}x${height}: home, both setup pages, 8-player game, dialogs, both score modes/pages, online form, reveal and result fit.`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
