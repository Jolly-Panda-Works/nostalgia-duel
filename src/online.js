import {offerFor} from './economy.js';
import {Client} from '@colyseus/sdk';
import {labels,availableMoves,modeLabels,fa} from './core.js';
import {tabletop,choiceArt,handArt} from './hands.js';
import {setupMatchFeedback} from './match-feedback.js';

const $=id=>document.getElementById(id);
export function setupOnline({getOptions,getIdentity=async()=>({}),onResult=()=>{},escape,portrait,showHome,showRoom}){
  let room=null,client=null,state=null,signature='',connecting=false,reconnecting=false,ownMove=null,choiceKey='';
  const feedback=setupMatchFeedback();let receivedAt=performance.now(),effectKey='',tickKey='',resultPage=0,resultMatch='';
  const storageKey='nostalgia-online-seat';
  const configured=import.meta.env.VITE_COLYSEUS_URL;
  const host=location.protocol==='file:'||location.hostname==='localhost'? '127.0.0.1':location.hostname;
  const sameServer=['http:','https:'].includes(location.protocol)&&!['5173','4174','4175'].includes(location.port);
  $('online-endpoint').value=configured||(sameServer?location.origin:`http://${host||'127.0.0.1'}:2567`);
  const invite=new URLSearchParams(location.search).get('room');if(invite)$('online-code').value=invite;
  let entryBusy=false,entryRequest=0;
  async function confirmStart(){
    if(room){showRoom();return;}const request=++entryRequest;const options=getOptions(),offer=offerFor(options.mode);$('entry-rounds-label').hidden=options.mode==='party';$('entry-capacity-label').hidden=options.mode!=='party';$('entry-title').textContent=modeLabels[options.mode];$('entry-format').textContent=options.mode==='party'?fa(options.capacity)+' نفر دور یک میز':fa(options.rounds)+' دور • دو نفر';$('entry-cost').textContent=fa(offer.entry)+' سکه';$('entry-prize').textContent=fa(offer.coins)+' سکه';$('entry-xp').textContent='+'+fa(offer.xp)+' XP';$('entry-participation').textContent='پایان مسابقه بدون قهرمانی: '+fa(offer.participationXp)+' XP';$('entry-status').textContent='در حال بررسی موجودی…';$('entry-wallet').textContent='';$('entry-confirm').disabled=true;if(!$('entry-dialog').open)$('entry-dialog').showModal();
    try{const identity=await getIdentity();if(request!==entryRequest)return;$('entry-wallet').textContent='موجودی تو: '+fa(identity.wallet?.coins||0)+' سکه';const enough=(identity.wallet?.coins||0)>=offer.entry;$('entry-confirm').disabled=!enough;$('entry-status').textContent=enough?'': 'سکهٔ کافی برای ورودی نداری.';}catch{$('entry-status').textContent='اتصال به سرور برقرار نشد؛ دوباره تلاش کن.';}
  }
  $('entry-dialog').addEventListener('cancel',e=>{if(entryBusy)e.preventDefault();});
  const updateEntryFormat=()=>{const o=getOptions();$('entry-format').textContent=o.mode==='party'?fa(o.capacity)+' نفر دور یک میز':fa(o.rounds)+' دور • دو نفر';};$('entry-rounds').onchange=updateEntryFormat;$('entry-capacity').onchange=updateEntryFormat;
  $('entry-cancel').onclick=()=>$('entry-dialog').close();
  $('entry-confirm').onclick=async()=>{if(entryBusy)return;entryBusy=true;$('entry-cancel').disabled=true;$('entry-confirm').disabled=true;$('online-name').value=getOptions().name;try{await connect('quick',true);$('entry-dialog').close();}catch(error){$('online-dialog').close();$('entry-status').textContent=error?.message?.includes('سکه')?error.message:'شروع انجام نشد؛ دوباره تلاش کن.';}finally{entryBusy=false;$('entry-cancel').disabled=false;$('entry-confirm').disabled=false;}};

  function status(text){$('online-connect-status').textContent=text;}
  function storeSeat(){try{sessionStorage.setItem(storageKey,JSON.stringify({endpoint:endpoint(),token:room.reconnectionToken}));}catch{}}
  function forgetSeat(){try{sessionStorage.removeItem(storageKey);}catch{}}
  function open(){if(room){showRoom();return;}$('online-name').value=getOptions().name;const options=getOptions();$('online-config-summary').textContent=options.mode==='party'?`اتاق پلم پولوم پلیچ • ظرفیت ${fa(options.capacity)} نفر`:`اتاق ${modeLabels[options.mode]} • ${fa(options.rounds)} دور`;status('');$('online-dialog').showModal();}
  function endpoint(){
    const url=new URL($('online-endpoint').value.trim());
    if(!['http:','https:','ws:','wss:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('آدرس سرور معتبر نیست.');
    if(location.protocol==='https:'&&!['https:','wss:'].includes(url.protocol))throw Error('از صفحهٔ HTTPS باید به سرور HTTPS متصل شوی.');
    return url.href.replace(/\/$/,'');
  }
  function errorText(error){const code=Number(error?.code);if(code===4212||code===4210)return 'اتاق پیدا نشد، پُر است یا بازی آن شروع شده است.';return 'اتصال برقرار نشد. آدرس سرور، کد اتاق و اتصال به شبکهٔ یکسان را بررسی کن.';}
  async function connect(kind,strict=false){
    if(connecting||room)return;connecting=true;
    state=null;signature='';$('online-room-code').value='';$('online-view').textContent='در حال ورود به اتاق…';
    document.querySelectorAll('#online-dialog button[data-connect]').forEach(b=>b.disabled=true);status('در حال اتصال…');
    try{
      client=new Client(endpoint());
      const identity=await getIdentity();
      const options={...getOptions(),...identity,name:($('online-name').value.trim()||getOptions().name).slice(0,24),fillBots:$('online-fill-bots').checked};
      if(kind==='join'){
        const code=$('online-code').value.trim().replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).toUpperCase();if(!/^[A-F0-9]{8}$/.test(code))throw Error('کد اتاق معتبر نیست.');
        room=await client.joinById(code,options);
      }else if(kind==='resume'){
        let seat;try{seat=JSON.parse(sessionStorage.getItem(storageKey));}catch{}
        if(!seat?.token||seat.endpoint!==endpoint())throw Error('جایگاه قابل بازیابی نداریم.');
        room=await client.reconnect(seat.token);
      }else if(kind==='quick')room=await client.joinOrCreate('quick_match',options);
      else room=await client.create('nostalgia',options);
      attach(room);$('online-dialog').close();showRoom();return room;
    }catch(error){if(kind==='quick'&&!$('online-dialog').open)$('online-dialog').showModal();status(error?.message?.includes('سکه')?error.message:errorText(error));if(strict)throw error;}
    finally{connecting=false;$('matchmaking-start').disabled=false;document.querySelectorAll('#online-dialog button[data-connect]').forEach(b=>b.disabled=false);}
  }
  function attach(joined){
    joined.reconnection.minUptime=0;
    signature='';reconnecting=false;storeSeat();
    joined.onMessage('snapshot',snapshot=>{if(room!==joined)return;const key=snapshot.matchId+':'+snapshot.round;if(key!==choiceKey){ownMove=null;choiceKey=key;}state=snapshot;if(state.wallet)window.dispatchEvent(new CustomEvent('wallet-update',{detail:state.wallet}));receivedAt=performance.now();if(state.stage==='finished')onResult(state);render();if(state.roundResult&&key!==effectKey){effectKey=key;feedback.play(state.roundResult.tie?'tie':state.roundResult.winnerId===state.selfId?'win':state.roundResult.winnerId!==null||state.roundResult.eliminatedId===state.selfId?'lose':'choose');}});
    joined.onDrop(()=>{if(room!==joined)return;reconnecting=true;signature='';render();});
    joined.onReconnect(()=>{if(room!==joined)return;reconnecting=false;signature='';storeSeat();joined.send('sync');});
    joined.onLeave(()=>{if(room!==joined)return;room=null;state=null;document.body.classList.remove('in-match','round-urgent');forgetSeat();$('online-view').innerHTML='<div class="network-empty"><h2>اتصال اتاق پایان یافت</h2><p>برای بازی دوباره، به لابی برگرد و اتاق تازه‌ای بساز.</p><button data-online="leave" class="primary">برگشت به لابی</button></div>';});
    joined.onError(()=>{if(room===joined)$('online-network-status').textContent='خطای ارتباط؛ در صورت ادامه، از اتاق خارج شو و دوباره متصل شو.';});
    joined.send('sync');
  }
  function send(type,data){if(room&&!reconnecting)room.send(type,data);}
  function render(){
    if(!state)return;
    const playing=['choosing','reveal','finished'].includes(state.stage);document.body.classList.toggle('in-match',playing);document.body.classList.toggle('has-connection-issue',reconnecting);$('match-settings').hidden=!playing;$('match-mode-bar').hidden=!playing;$('match-mode-bar').textContent=modeLabels[state.mode];if(!playing&&$('match-settings-dialog').open)$('match-settings-dialog').close();
    $('online-network-status').textContent=reconnecting?'ارتباط قطع شده؛ تا ۳۰ ثانیه برای اتصال دوباره تلاش می‌کنیم…':state.quickMatch?'متصل به میدان بازی':'متصل به اتاق دوستان';
    document.querySelector('.room-code-label').hidden=state.quickMatch;
    $('online-friends').textContent=state.stage==='lobby'&&!state.quickMatch?'دعوت دوستان':'دوستان';
    $('online-leave').textContent=state.stage==='matching'?'انصراف از جست‌وجو':'ترک اتاق';
    $('online-room-code').value=state.roomId;
    const key=JSON.stringify({...state,serverTime:0,reconnecting});
    if(key===signature){updateTime();return;}signature=key;
    const me=state.players.find(p=>p.id===state.selfId),member=state.members.find(p=>p.self);
    if(state.stage==='matching'||state.stage==='starting'){
      $('online-view').innerHTML=`<div class="matchmaking"><span class="eyebrow">${modeLabels[state.mode]}</span><div class="search-emblem"><img src="${handArt.rock}" alt=""></div><h1>در جست‌وجوی حریف…</h1><p>دستت را آماده کن؛ مسابقه تا چند لحظهٔ دیگر شروع می‌شود.</p><div id="matching-seconds" class="search-count"></div><progress id="matching-progress" max="5000" value="0" aria-label="پیشرفت جست‌وجوی حریف"></progress><div class="matching-names">${state.members.map(p=>escape(p.name)).join(' • ')}</div><p>${fa(state.members.length)} از ${fa(state.capacity)} جای میز پُر شده</p></div>`;
    }else if(state.stage==='lobby'){
      const min=state.mode==='party'?3:2;
      const canStart=state.members.every(p=>p.ready&&p.connected)&&(state.fillBots||state.members.length>=min);
      $('online-view').innerHTML=`<div class="online-waiting"><span class="eyebrow">اتاق دوستان • ${modeLabels[state.mode]}</span><h1>دورهمیِ آنلاین</h1><p>کد اتاق را به دوستانت بده؛ هر نفر با نام خودش وارد می‌شود.</p><div class="online-members">${state.members.map(p=>`<div class="online-member">${portrait(p.avatar)}<div><b>${escape(p.name)}${p.self?' (تو)':''}</b><small>${p.host?'میزبان • ':''}${!p.connected?'در انتظار اتصال':p.ready?'آماده':'در حال آماده‌شدن'}</small></div><span class="ready-mark">${p.ready?'آماده':'منتظر'}</span></div>`).join('')}</div><p class="online-room-details">${fa(state.members.length)} نفر از ظرفیت ${fa(state.capacity)} • ${state.mode!=='party'?fa(state.rounds)+' دور':'دوئل نهایی یک‌دست'}${state.fillBots?' • تکمیل خودکار میز':''}</p><p class="lobby-economy">ورودی هر مسابقه: ${fa(offerFor(state.mode).entry)} سکه • جایزهٔ قهرمان: ${fa(offerFor(state.mode).coins)} سکه + ${fa(offerFor(state.mode).xp)} XP</p><p class="online-notice" role="status">${escape(state.notice)}</p><div class="online-actions"><button class="primary" data-online="ready" ${reconnecting?'disabled':''}>${member?.ready?'آماده نیستم':'آماده‌ام'}</button>${state.host?`<button class="primary" data-online="start" ${!canStart||reconnecting?'disabled':''}>شروع مسابقه</button>`:'<span>پس از آماده‌شدن همه، میزبان شروع می‌کند.</span>'}</div></div>`;
    }else if(state.stage==='finished'){
      if(resultMatch!==state.matchId){resultMatch=state.matchId;resultPage=0;}
      $('online-view').innerHTML=matchResult();
    }else{
      const revealed=state.stage==='reveal'||state.stage==='finished';
      const available=availableMoves(state.mode,state.players.filter(p=>p.active).length);
      const winner=state.players.find(p=>p.id===state.winner);
      $('online-view').innerHTML=`${matchHud()}<div class="arena-stage">${tabletop(state.players,{className:'online-table',selfId:state.selfId,choices:state.choices,revealed,ownMove,round:state.round})}${roundAward()}</div><div class="online-control-panel">${state.stage==='finished'?`<h1>${escape(winner?.name||'بازیکن')} قهرمان شد!</h1><p>نتیجهٔ این مسابقه با سرور محاسبه شد.</p>${state.host?'<button class="primary" data-online="rematch">یک مسابقهٔ تازه</button>':'<p>برای بازی مجدد منتظر میزبان بمان.</p>'}`:revealed?`<p>دست بعدی تا چند لحظهٔ دیگر…</p>`:!me?.active?'<h2>از این دور حذف شدی</h2><p>دست‌های باقی بازیکن‌ها را تماشا کن.</p>':me.committed||ownMove?'<h2>دستت ثبت شد</h2><p>انتخاب‌ها با هم رو می‌شوند؛ آماده باش.</p>':`<h2>${escape(me.name)}؛ دستت را انتخاب کن</h2><p>پیش از تمام‌شدن نوار، حرکتت را انتخاب کن.</p><div class="choices">${available.map((m,i)=>`<button data-online-move="${m}" ${reconnecting?'disabled':''}>${choiceArt(m)}<b>${labels[m]}</b><small>کلید ${fa(i+1)}</small></button>`).join('')}</div>`}</div>`;
    }
    updateTime();
  }
  function matchResult(){
    const winner=state.players.find(p=>p.id===state.winner),summary=state.summary,history=summary?.lastRounds||[],round=history[resultPage];
    const players=[...state.players].sort((a,b)=>Number(b.id===state.winner)-Number(a.id===state.winner)||b.wins-a.wins||b.score-a.score);
    return `<section id="match-result" class="match-result ${state.winner===state.selfId?'you-won':''}" aria-labelledby="match-result-title"><span class="result-medallion" aria-hidden="true">✦</span><span class="eyebrow">${state.winner===state.selfId?'تبریک؛ قهرمان شدی!':'پایان مسابقه'}</span><h1 id="match-result-title" tabindex="-1">${escape(winner?.name||'بازیکن')} قهرمان شد!</h1><p class="result-overview">${modeLabels[state.mode]} • ${fa(summary?.roundsPlayed||state.round)} دست بازی شد${state.mode!=='party'?' • '+fa(state.rounds)+' دور تعیین‌کننده':''}</p><div class="final-score-grid" data-count="${players.length}" aria-label="امتیاز نهایی بازیکنان">${players.map(p=>`<div class="final-score ${p.id===state.winner?'champion':''}"><span>${p.id===state.winner?'✦ قهرمان':p.id===state.selfId?'تو':'بازیکن'}</span><b>${escape(p.name)}${p.id===state.selfId?' (تو)':''}</b><strong>${fa(p.score)} <small>امتیاز</small></strong><small>${fa(p.wins)} برد</small></div>`).join('')}</div>${round?`<div class="result-rounds"><div class="result-rounds-top"><b>دست‌های آخر</b><div role="group" aria-label="نمایش نتیجهٔ دست">${history.map((h,i)=>`<button data-result-page="${i}" aria-pressed="${i===resultPage}">دست ${fa(h.round)}</button>`).join('')}</div></div><div class="result-moves">${Object.entries(round.choices).map(([id,move])=>`<div>${choiceArt(move)}<span>${escape(state.players.find(p=>p.id===Number(id))?.name||'بازیکن')}</span><b>${labels[move]}</b></div>`).join('')}</div>${round.eliminated!==null?`<p>${escape(state.players.find(p=>p.id===round.eliminated)?.name||'بازیکن')} تک شد و حذف شد.</p>`:''}</div>`:''}${state.reward?`<div class="result-reward"><b>پاداش این مسابقه</b><strong>+${fa(state.reward.coins)} سکه · +${fa(state.reward.xp)} XP</strong><small>ورودی: ${fa(state.reward.entry)} سکه • موجودی: ${fa(state.wallet?.coins||0)} سکه</small></div>`:''}<div class="match-result-actions">${state.quickMatch?'<button data-online="new-match" class="primary">مسابقهٔ تازه</button>':state.host?'<button data-online="rematch" class="primary">دوباره با همین جمع</button>':'<p>برای مسابقهٔ دوباره منتظر میزبان بمان.</p>'}<button data-online="result-home" class="secondary">برگشت به میدان</button></div><p class="result-saved">نتیجه در بخش رکوردهای همین دستگاه قابل مشاهده است.</p></section>`;
  }

  function matchHud(){
    return `<div class="arena-hud"><div class="arena-round-label">دست ${fa(state.round)} • ${state.mode==='party'?fa(state.players.filter(p=>p.active).length)+' نفر باقی مانده':fa(state.rounds)+' دور'}</div><div class="arena-scoreboard" data-count="${state.players.length}" aria-label="امتیاز بازیکن‌ها">${state.players.map(p=>`<div class="score-player ${p.id===state.selfId?'is-you':''} ${!p.active?'is-out':''}"><b>${escape(p.name)}${p.id===state.selfId?' (تو)':''}</b><strong>${fa(p.wins)} <small>برد</small></strong><span>${state.mode==='party'&&!p.active?'حذف شده':fa(p.score)+' امتیاز'}</span></div>`).join('')}</div><div class="arena-timer"><span id="online-time" class="round-clock"></span><div id="round-timebar" class="round-timebar" role="progressbar" aria-label="زمان باقی‌ماندهٔ انتخاب" aria-valuemin="0" aria-valuemax="5" aria-valuenow="5"><span id="round-time-fill"></span></div></div></div>`;
  }
  function roundAward(){
    const r=state.roundResult;if(!r)return '';const scorer=state.players.find(p=>p.id===r.winnerId),out=state.players.find(p=>p.id===r.eliminatedId);
    return `<div class="round-award ${r.tie?'is-tie':scorer?.id===state.selfId?'is-win':'is-result'}" role="status" aria-live="polite"><span class="award-burst" aria-hidden="true">✦</span><span class="award-caption">نتیجهٔ این دست</span><h2>${scorer?escape(scorer.name)+' برد!':out?escape(out.name)+' تک شد!':'مساوی!'}</h2><strong>${scorer?'+'+fa(r.points)+' امتیاز':out?'از این جمع حذف شد':'این دست دوباره'}</strong>${r.championBonus?'<small>+'+fa(r.championBonus)+' پاداش قهرمانی</small>':''}</div>`;
  }
  function updateTime(){
    if(!state)return;const now=state.serverTime+performance.now()-receivedAt;
    const remaining=Math.max(0,state.deadline-now),seconds=Math.ceil(remaining/1000),choosing=state.stage==='choosing';
    const clock=$('online-time');if(clock){const text=choosing?fa(seconds)+' ثانیه برای انتخاب':state.stage==='finished'?'مسابقه تمام شد':'دست‌ها رو شدند';if(clock.textContent!==text)clock.textContent=text;clock.classList.toggle('urgent',seconds<=2&&choosing);}
    const bar=$('round-timebar');if(bar){bar.setAttribute('aria-valuenow',String(choosing?Math.round(remaining/100)/10:0));bar.setAttribute('aria-valuetext',choosing?fa(seconds)+' ثانیه':'پایان انتخاب');$('round-time-fill').style.transform='scaleX('+(choosing?Math.min(1,remaining/5000):0)+')';}
    const me=state.players.find(p=>p.id===state.selfId),urgent=choosing&&remaining>0&&remaining<=2000&&me?.active&&!me.committed&&!ownMove&&!reconnecting;document.body.classList.toggle('round-urgent',Boolean(urgent));
    if(urgent){const key=state.matchId+':'+state.round+':'+seconds;if(key!==tickKey){tickKey=key;feedback.play('tick');}}
    if(state.stage==='matching'){const remaining=Math.max(0,state.matchingDeadline-now);if($('matching-seconds'))$('matching-seconds').textContent=fa(Math.ceil(remaining/1000));if($('matching-progress'))$('matching-progress').value=5000-remaining;}
  }
  setInterval(updateTime,50);
  function choose(move){if(!availableMoves(state?.mode,state?.players.filter(p=>p.active).length).includes(move))return;if(state?.stage==='choosing'&&!ownMove&&state.players.find(p=>p.id===state.selfId)?.active){ownMove=move;feedback.play('choose');send('move',{move,round:state.round,matchId:state.matchId});signature='';render();}}
  async function newMatch(){await leave();await confirmStart();}
  async function leave(){const previous=room;room=null;state=null;signature='';document.body.classList.remove('in-match','round-urgent','has-connection-issue');$('match-settings-dialog').close();forgetSeat();$('online-leave-dialog').close();showHome();if(previous)try{await previous.leave();}catch{}}
  function requestLeave(){if(!room){showHome();return;}if(state?.stage==='matching'){void leave();return;}$('online-leave-dialog').showModal();}
  $('matchmaking-start').onclick=()=>{if(room){showRoom();return;}void confirmStart();};
  $('online-open').onclick=open;$('online-close').onclick=()=>$('online-dialog').close();
  $('online-create').onclick=()=>connect('create');$('online-join').onclick=()=>connect('join');$('online-resume').onclick=()=>connect('resume');
  $('match-settings').onclick=()=>$('match-settings-dialog').showModal();$('match-settings-close').onclick=()=>$('match-settings-dialog').close();$('match-exit').onclick=()=>{$('match-settings-dialog').close();requestLeave();};
  $('online-leave').onclick=requestLeave;$('online-leave-confirm').onclick=leave;$('online-leave-cancel').onclick=()=>$('online-leave-dialog').close();
  $('online-view').addEventListener('click',event=>{const b=event.target.closest('[data-online]');if(b){if(b.dataset.online==='ready')send('ready',!state.members.find(p=>p.self)?.ready);if(b.dataset.online==='start')send('start');if(b.dataset.online==='rematch')send('rematch');if(b.dataset.online==='new-match')void newMatch();if(b.dataset.online==='result-home')void leave();if(b.dataset.online==='leave')void leave();}const page=event.target.closest('[data-result-page]');if(page){resultPage=Number(page.dataset.resultPage);signature='';render();}const choice=event.target.closest('[data-online-move]');if(choice)choose(choice.dataset.onlineMove);});
  $('online-copy').onclick=async()=>{if(!state)return;try{await navigator.clipboard.writeText(state.roomId);$('online-network-status').textContent='کد اتاق کپی شد؛ دوستت آن را در بازی آنلاین وارد کند.';}catch{$('online-room-code').select();$('online-network-status').textContent='کد اتاق را از کادر انتخاب‌شده کپی کن.';}};
  document.addEventListener('keydown',event=>{if(!room||!state||reconnecting||event.repeat||event.target.matches('input,select')||document.querySelector('dialog[open]'))return;const i=['1','2','3','4','5'].indexOf(event.key);if(i>=0){event.preventDefault();choose((availableMoves(state.mode,state.players.filter(p=>p.active).length))[i]);}});
  return {confirmStart,isActive:()=>Boolean(room),requestLeave,getEndpoint:endpoint,
    async prepareInvite(){if(room){if(!state||state.quickMatch||state.stage!=='lobby')throw Error('دعوت فقط در میز دوستان و پیش از شروع مسابقه ممکن است.');return room.roomId;}const created=await connect('create',true);if(!created)throw Error('ساخت میز انجام نشد.');return created.roomId;},
    async joinInvitation(code){if(room)throw Error('ابتدا از میز فعلی خارج شو.');$('online-code').value=code;const joined=await connect('join',true);if(!joined)throw Error('ورود به میز انجام نشد.');return joined;}
  };
}
