import {arenaArt} from './arena-art.js';
import {avatarArt} from './avatar-art.js';
import {handArt} from './hands.js';
import symbol from '../assets/branding/toranj-red-v1/game-symbol.webp';
import wordmark from '../assets/branding/toranj-red-v1/game-wordmark.webp';
import garden from '../assets/art/miniature-garden-v1.webp';
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const decoded=new Set();
async function decode(src){if(decoded.has(src))return;const img=new Image();img.src=src;let timer;try{await Promise.race([img.decode(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Asset timeout')),15000))]);decoded.add(src);}finally{clearTimeout(timer);}}
export async function startGame({prepare,onReady}){
 await Promise.allSettled([decode($('splash-studio-logo').src),sleep(1000)]);
 $('studio-splash').hidden=true;$('game-loader').hidden=false;document.documentElement.dataset.boot='loading';
 const assets=[...new Set([...arenaArt,...avatarArt,...Object.values(handArt),symbol,wordmark,garden,$('splash-studio-logo').src])];
 async function load(){
  $('boot-retry').hidden=true;let complete=0;const total=assets.length+2,started=performance.now();
  const update=()=>{$('boot-progress').value=complete;$('boot-progress').max=total;$('boot-percent').textContent=Math.round(complete/total*100).toLocaleString('fa-IR')+'٪';};
  update();$('boot-status').textContent='بارگذاری تصویرها، دست‌ها و قلم فارسی…';
  const jobs=[...assets.map(src=>()=>decode(src)),async()=>{await document.fonts.load('16px Mikhak');await document.fonts.ready;}];
  const results=await Promise.allSettled(jobs.map(async job=>{await job();complete++;update();}));
  if(results.some(r=>r.status==='rejected')){$('boot-status').textContent='بعضی فایل‌ها بارگذاری نشدند؛ اتصال را بررسی و دوباره تلاش کن.';$('boot-retry').hidden=false;return;}
  $('boot-status').textContent='آماده‌سازی پروفایل و میدان بازی…';
  // Connection failure remains recoverable from the home screen and server dialog.
  try{await prepare();}catch{}
  complete++;update();$('boot-status').textContent='آماده‌ایم!';
  await sleep(Math.max(120,450-(performance.now()-started)));
  onReady();document.body.classList.remove('booting');document.documentElement.dataset.boot='ready';$('boot-screen').remove();
 }
 $('boot-retry').onclick=()=>void load();await load();
}
