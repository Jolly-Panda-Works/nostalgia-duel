import{avatars,moves,icons,labels,fa,createMatch,resolve,cleanSave,defaultNames}from'./core.js';
import{native,load,persist,bindLifecycle}from'./platform.js';
import{setupOnline}from'./online.js';
import{fitWebViewport}from'./viewport.js';
import sword from '@phosphor-icons/core/assets/duotone/sword-duotone.svg';
import users from '@phosphor-icons/core/assets/duotone/users-three-duotone.svg';
import trophy from '@phosphor-icons/core/assets/duotone/trophy-duotone.svg';
import house from '@phosphor-icons/core/assets/duotone/house-duotone.svg';
import book from '@phosphor-icons/core/assets/duotone/book-open-duotone.svg';
import flower from '@phosphor-icons/core/assets/duotone/flower-lotus-duotone.svg';
import sliders from '@phosphor-icons/core/assets/duotone/sliders-horizontal-duotone.svg';
import playIcon from '@phosphor-icons/core/assets/duotone/play-duotone.svg';
import pauseIcon from '@phosphor-icons/core/assets/duotone/pause-duotone.svg';
import arrow from '@phosphor-icons/core/assets/duotone/arrow-right-duotone.svg';
const iconAssets={'sword':sword,'users-three':users,'trophy':trophy,'house':house,'book-open':book,'flower-lotus':flower,'sliders-horizontal':sliders,'play':playIcon,'pause':pauseIcon,'arrow-right':arrow};
document.querySelectorAll('[data-icon]').forEach(el=>el.src=iconAssets[el.dataset.icon]);
const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let mode='rps',roster=[],match,screen='loading',choices={},turns=[],turn=0,phase='idle',paused=false,timer=0,pending=null,remaining=0,started=0;
let onlineAPI=null;
let rosterPage=0,scorePage=0,scoreMode='rps';
const loaded=load();let save=loaded.data;
function updateLobby(){
  $('lobby-mode-name').textContent=mode==='rps'?'سنگ کاغذ قیچی':'پلم پولوم پلیچ';
  $('lobby-players').innerHTML=roster.slice(0,4).map(p=>`<div class="lobby-player">${portrait(p.avatar)}<span>${escape(p.name.trim()||'بازیکن')}<small>${p.bot?'کامپیوتر':'انسان'}</small></span></div>`).join('')+(roster.length>4?`<span class="lobby-more">و ${fa(roster.length-4)} بازیکن دیگر؛ همه در «بازیکن‌ها»</span>`:'');
  $('lobby-summary').textContent=mode==='rps'?`${fa(Number($('round-count').value))} دور • ${roster[1].bot?'حریف کامپیوتری':'دو نفر روی یک دستگاه'}`:`${fa(roster.length)} نفر • ${fa(roster.filter(p=>!p.bot).length)} انسان و ${fa(roster.filter(p=>p.bot).length)} کامپیوتر`;
  $('quick-rule').textContent=mode==='rps'?'بازی سریع؛ تساوی تکرار می‌شود.':'تک شوی حذف می‌شوی؛ دو نفر آخر، یک دوئل!';
}
function updateHUD(){
  const alive=match.players.filter(p=>p.active);
  $('phase-label').textContent=phase==='resolved'?'نتیجهٔ این دست':phase==='revealing'?'آمادهٔ روشدن':'انتخاب دست';
  $('match-track').innerHTML=match.mode==='rps'?`<span>${match.players.map(p=>`${escape(p.name)}: ${fa(p.wins)}`).join(' • ')}</span><progress value="${match.decisive}" max="${match.rounds}" aria-label="پیشرفت دورهای مسابقه"></progress>`:`<span>${fa(alive.length)} نفر باقی‌مانده از ${fa(match.players.length)} نفر</span><progress value="${match.players.length-alive.length}" max="${match.players.length-1}" aria-label="پیشرفت دورهمی"></progress>`;
}
function renderBattleLog(){
  $('battle-log').innerHTML='<h2>دست‌های آخر</h2>'+match.history.slice(-3).map(h=>`<p><b>دست ${fa(h.round)}</b><span>${Object.entries(h.choices).map(([id,m])=>`${escape(match.players[Number(id)].name)}: ${labels[m]}`).join(' / ')}</span></p>`).join('');
}
function openSetup(){if(screen!=='home')home();if(!$('setup-dialog').open)$('setup-dialog').showModal();}
function closeSetup(){$('setup-dialog').close();updateLobby();}
const portrait=i=>{const a=avatars[i%avatars.length];return`<span class="avatar" style="--character-color:${a.color}" aria-label="آواتار موقت ${a.name}"><i class="hat"></i><i class="smile"></i></span>`;};
function show(id){document.querySelectorAll('.screen').forEach(el=>el.hidden=el.id!==id);screen=id;$('best').textContent=fa(Math.max(0,...save.records.filter(r=>r.mode==='rps').map(r=>r.score)));document.querySelector('.lobby-nav').hidden=id==='game'||id==='loading'||id==='online';document.querySelectorAll('.lobby-nav button').forEach(b=>b.removeAttribute('aria-current'));if(id==='home')$('nav-home').setAttribute('aria-current','page');if(id==='leaderboard')$('scores').setAttribute('aria-current','page');}
function setup(){
  const count=mode==='rps'?2:Number($('player-count').value);
  roster=Array.from({length:count},(_,i)=>roster[i]||{name:defaultNames[i],bot:i>0,avatar:i%4});
  if(mode==='rps')roster[1].bot=$('rps-opponent').value==='bot';
  $('rps-settings').hidden=mode!=='rps';$('party-settings').hidden=mode!=='party';
  document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
  rosterPage=Math.min(rosterPage,Math.floor((roster.length-1)/4));
  $('roster').innerHTML=roster.slice(rosterPage*4,(rosterPage+1)*4).map((p,j)=>{
    const i=rosterPage*4+j;
    return `<div class="roster-row">${portrait(p.avatar)}<input maxlength="24" aria-label="نام بازیکن ${fa(i+1)}" value="${escape(p.name)}" data-name="${i}"><select aria-label="آواتار بازیکن ${fa(i+1)}" data-avatar="${i}">${avatars.map((a,k)=>`<option value="${k}" ${k===p.avatar?'selected':''}>${a.name}</option>`).join('')}</select>${mode==='party'?`<label class="bot-label"><input type="checkbox" data-bot="${i}" ${p.bot?'checked':''}>کامپیوتر</label>`:`<span class="role">${p.bot?'کامپیوتر':'انسان'}</span>`}</div>`;
  }).join('');
  $('roster-pager').hidden=roster.length<=4;
  $('roster-page').textContent=`${fa(rosterPage+1)} / ${fa(Math.ceil(roster.length/4))}`;
  $('roster-prev').disabled=rosterPage===0;$('roster-next').disabled=(rosterPage+1)*4>=roster.length;
}
function modal(title,copy,exit=false){$('modal-title').textContent=title;$('modal-copy').textContent=copy;$('modal-exit').hidden=!exit;if(!$('modal').open)$('modal').showModal();}
function stopTimer(){if(timer){clearTimeout(timer);timer=0;remaining=Math.max(0,remaining-(performance.now()-started));}}
function resumeTimer(){if(pending&&!paused){started=performance.now();timer=setTimeout(()=>{timer=0;const fn=pending;pending=null;fn();},remaining);}}
function pause(){if(screen!=='game'||paused)return;paused=true;stopTimer();document.body.classList.add('paused');modal('یک نفس تازه کن','انتخاب‌ها حفظ شده‌اند؛ برای ادامه بزن.');}
function home(){if(onlineAPI?.isActive()){onlineAPI.requestLeave();return;}stopTimer();pending=null;paused=false;document.body.classList.remove('paused');$('modal').close();show('home');}
function start(){if(!roster.some(p=>!p.bot)){modal('حداقل یک بازیکن انسانی','نوع یکی از بازیکنان را از کامپیوتر به انسان تغییر بده.');return;}match=createMatch(mode,roster.map((p,i)=>({...p,name:p.name.trim()||defaultNames[i]})),Number($('round-count').value));show('game');beginRound();}
function table(revealed=false){$('table').innerHTML=match.players.map(p=>`<div class="hand-seat ${!p.active?'eliminated':''}"><div class="seat-info">${portrait(p.avatar)}<div><b>${escape(p.name)}</b><small>${!p.active?'حذف‌شده':p.bot?'کامپیوتر':'بازیکن'}${match.mode==='rps'?` • ${fa(p.wins)} برد`:''}</small></div></div><div class="arm" style="--sleeve:${avatars[p.avatar].color}"><span class="hand ${revealed?'reveal':''}">${revealed&&choices[p.id]?icons[choices[p.id]]:p.active?'؟':'—'}</span></div></div>`).join('');}
function beginRound(){phase='choose';choices={};turn=0;const active=match.players.filter(p=>p.active);const available=active.length>2?['palm','back']:moves;for(const p of active)if(p.bot)choices[p.id]=available[Math.floor(Math.random()*available.length)];turns=active.filter(p=>!p.bot);$('round-label').textContent=match.mode==='rps'?`دست ${fa(match.decisive+1)} از ${fa(match.rounds)}${match.decisive>=match.rounds?' • تعیین‌کننده':''}`:`دور ${fa(match.round)} • ${fa(active.length)} نفر${active.length===2?' • دوئل نهایی':''}`;$('game-status').textContent=active.length>2?'پلم… پولوم… پلیچ!':'سنگ… کاغذ… قیچی!';table();updateHUD();$('resolution').hidden=true;$('input-panel').hidden=false;nextHuman();}
function nextHuman(){$('choices').hidden=true;if(turn>=turns.length){$('input-panel').hidden=true;$('game-status').textContent='همه آماده‌اند؛ دست‌ها رو می‌شوند…';phase='revealing';pending=reveal;remaining=650;resumeTimer();return;}const p=turns[turn];$('turn-name').textContent=`نوبت ${p.name}`;$('turn-help').textContent=turns.length>1?'دستگاه را به این بازیکن بدهید؛ بقیه نگاه نکنند.':'حرکتت را انتخاب کن؛ حریف انتخابش را ثبت کرده است.';$('reveal-controls').hidden=false;if(turns.length===1)revealControls();}
function revealControls(){if(paused||phase!=='choose')return;$('reveal-controls').hidden=true;const available=match.players.filter(p=>p.active).length>2?['palm','back']:moves;$('choices').innerHTML=available.map((m,i)=>`<button data-move="${m}"><span>${icons[m]}</span><b>${labels[m]}</b><small>کلید ${fa(i+1)}</small></button>`).join('');$('choices').hidden=false;}
function choose(move){if(paused||phase!=='choose'||$('choices').hidden||turn>=turns.length)return;const valid=match.players.filter(p=>p.active).length>2?['palm','back']:moves;if(!valid.includes(move))return;choices[turns[turn].id]=move;turn++;nextHuman();}
function reveal(){const result=resolve(match,choices);phase='resolved';table(true);updateHUD();$('resolution').hidden=false;$('round-result').textContent=result.message;$('game-status').textContent=match.mode==='party'&&match.players.filter(p=>p.active).length===2&&!result.finished?'دو نفر ماندند؛ دست بعدی سنگ کاغذ قیچی است.':'دست‌ها رو شدند!';$('next').textContent=result.finished?'دیدن نتیجه ←':'دور بعد ←';}
function finish(){phase='finished';const winner=match.players.find(p=>p.id===match.winner);show('result');renderBattleLog();$('result-title').textContent=`${winner.name} قهرمان شد!`;$('result-copy').textContent=match.mode==='party'?'از جمع شلوغ تا دوئل آخر؛ یک خاطرهٔ تازه.':'یک دوئل دیگر، یک خاطرهٔ دیگر.';$('result-stats').innerHTML=match.mode==='party'?`<div><span>تعداد بازیکنان</span><strong>${fa(match.players.length)}</strong></div><div><span>دست‌های بازی‌شده</span><strong>${fa(match.history.length)}</strong></div>`:match.players.map(p=>`<div><span>${escape(p.name)}</span><strong>${fa(p.wins)} برد</strong><small>${fa(p.score)} امتیاز</small></div>`).join('');const records=match.mode==='party'?[{mode:'party',name:winner.name,score:match.players.length,rounds:match.history.length}]:match.players.filter(p=>!p.bot).map(p=>({mode:'rps',name:p.name,score:p.score,rounds:match.rounds}));save=cleanSave({...save,records:[...records,...save.records]});$('save-status').textContent=loaded.available&&persist(save)?'نتیجه روی همین دستگاه ذخیره شد.':'ذخیره در دسترس نیست؛ نتیجه فقط در این اجرا باقی می‌ماند.';}
function board(){
  show('leaderboard');
  const records=save.records.filter(r=>r.mode===scoreMode);
  scorePage=Math.min(scorePage,Math.max(0,Math.ceil(records.length/5)-1));
  document.querySelectorAll('[data-score-mode]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.scoreMode===scoreMode)));
  $('score-list').innerHTML=records.length?records.slice(scorePage*5,(scorePage+1)*5).map((r,i)=>`<div class="score-row"><span>${fa(scorePage*5+i+1)}. ${escape(r.name)}</span><small>${fa(r.rounds)} ${scoreMode==='rps'?'دور':'دست'}</small><b>${fa(r.score)} ${scoreMode==='rps'?'امتیاز':'نفره'}</b></div>`).join(''):'<p class="empty">هنوز نتیجه‌ای ثبت نشده.</p>';
  $('score-pager').hidden=records.length<=5;
  $('score-page').textContent=`${fa(scorePage+1)} / ${fa(Math.max(1,Math.ceil(records.length/5)))}`;
  $('score-prev').disabled=scorePage===0;$('score-next').disabled=(scorePage+1)*5>=records.length;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b){mode=b.dataset.mode;setup();updateLobby();}const c=e.target.closest('[data-move]');if(c)choose(c.dataset.move);if(e.target.closest('.back-home'))home();});
$('roster').addEventListener('input',e=>{if(e.target.dataset.name!==undefined)roster[Number(e.target.dataset.name)].name=e.target.value;});
$('roster').addEventListener('change',e=>{const i=e.target.dataset.bot;if(i!==undefined)roster[Number(i)].bot=e.target.checked;const a=e.target.dataset.avatar;if(a!==undefined){roster[Number(a)].avatar=Number(e.target.value);setup();updateLobby();}});
$('player-count').onchange=()=>{setup();updateLobby();};$('rps-opponent').onchange=()=>{setup();updateLobby();};$('start').onclick=start;$('again').onclick=start;$('scores').onclick=board;$('home-link').onclick=()=>screen==='game'?$('exit').click():home();$('reveal-controls').onclick=revealControls;
$('next').onclick=()=>{if(paused||phase!=='resolved')return;if(match.winner!==null)finish();else{match.round++;beginRound();}};
$('pause').onclick=pause;$('exit').onclick=()=>{pause();modal('خروج از مسابقه؟','مسابقهٔ ناتمام در رکوردها ثبت نمی‌شود. می‌توانی ادامه بدهی یا به خانه برگردی.',true);};$('modal-close').onclick=()=>{$('modal').close();paused=false;document.body.classList.remove('paused');resumeTimer();};$('modal-exit').onclick=home;$('modal').addEventListener('cancel',e=>{e.preventDefault();$('modal-close').click();});
$('help').onclick=()=>modal('قانون دورهمی','سنگ کاغذ قیچی: تعداد دورها قابل تنظیم است. تساوی تکرار می‌شود؛ برنده کسی است که در پایان برد بیشتری دارد. برد ۱۰۰ امتیاز دارد، زنجیرهٔ برد پاداش دارد و قهرمانی ۲۰۰ امتیاز اضافه.\nپلم پولوم پلیچ: همه کف یا پشت دست می‌آورند. بازیکن تک حذف می‌شود؛ در غیر این صورت همان جمع تکرار می‌کند. دو نفر آخر یک دست سنگ کاغذ قیچی بازی می‌کنند و تساوی تکرار می‌شود.\nبازی انسانی روی یک دستگاه: انتخاب‌ها مخفی و نوبتی‌اند؛ پس از انتخاب همه، دست‌ها هم‌زمان نمایش داده می‌شوند.\nآواتارها فعلاً نمادین هستند؛ طراحی چهره و انیمیشن دست‌ها مرحلهٔ بعد است.');
document.addEventListener('keydown',e=>{if(e.repeat||$('modal').open||screen!=='game'||e.target.matches('input,select'))return;const i=['1','2','3'].indexOf(e.key);if(i>=0){e.preventDefault();choose((match.players.filter(p=>p.active).length>2?['palm','back']:moves)[i]);}});
$('configure').onclick=openSetup;$('nav-players').onclick=openSetup;$('close-setup').onclick=closeSetup;$('apply-setup').onclick=closeSetup;$('round-count').onchange=updateLobby;$('nav-home').onclick=home;
Array.from($('player-count').options).forEach(option=>{const count=Number(option.value);option.value=String(count);option.textContent=fa(count);});
$('setup-dialog').addEventListener('cancel',e=>{e.preventDefault();closeSetup();});
$('roster-prev').onclick=()=>{rosterPage--;setup();};$('roster-next').onclick=()=>{rosterPage++;setup();};
$('score-prev').onclick=()=>{scorePage--;board();};$('score-next').onclick=()=>{scorePage++;board();};
document.querySelectorAll('[data-score-mode]').forEach(button=>button.onclick=()=>{scoreMode=button.dataset.scoreMode;scorePage=0;board();});
if(!native)fitWebViewport();
onlineAPI=setupOnline({getOptions:()=>({mode,rounds:Number($('round-count').value),capacity:mode==='rps'?2:Number($('player-count').value),name:roster[0]?.name||defaultNames[0],avatar:roster[0]?.avatar||0}),escape,portrait,showHome:()=>show('home'),showRoom:()=>show('online')});
bindLifecycle(pause);$('platform-label').textContent=native?'ANDROID • PORTRAIT':'WEB • LANDSCAPE';setup();updateLobby();requestAnimationFrame(()=>show('home'));
