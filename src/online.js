import {Client} from '@colyseus/sdk';
import {icons,labels,moves,fa} from './core.js';

const $=id=>document.getElementById(id);
export function setupOnline({getOptions,escape,portrait,showHome,showRoom}){
  let room=null,client=null,state=null,signature='',connecting=false,reconnecting=false;
  const storageKey='nostalgia-online-seat';
  const configured=import.meta.env.VITE_COLYSEUS_URL;
  const host=location.protocol==='file:'||location.hostname==='localhost'? '127.0.0.1':location.hostname;
  const sameServer=['http:','https:'].includes(location.protocol)&&!['5173','4174','4175'].includes(location.port);
  $('online-endpoint').value=configured||(sameServer?location.origin:`http://${host||'127.0.0.1'}:2567`);
  const invite=new URLSearchParams(location.search).get('room');if(invite)$('online-code').value=invite;
  function status(text){$('online-connect-status').textContent=text;}
  function storeSeat(){try{sessionStorage.setItem(storageKey,JSON.stringify({endpoint:endpoint(),token:room.reconnectionToken}));}catch{}}
  function forgetSeat(){try{sessionStorage.removeItem(storageKey);}catch{}}
  function open(){if(room){showRoom();return;}$('online-name').value=getOptions().name;const options=getOptions();$('online-config-summary').textContent=options.mode==='party'?`اتاق پلم پولوم پلیچ • ظرفیت ${fa(options.capacity)} نفر`:`اتاق سنگ کاغذ قیچی • ${fa(options.rounds)} دور`;status('');$('online-dialog').showModal();}
  function endpoint(){
    const url=new URL($('online-endpoint').value.trim());
    if(!['http:','https:','ws:','wss:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('آدرس سرور معتبر نیست.');
    if(location.protocol==='https:'&&!['https:','wss:'].includes(url.protocol))throw Error('از صفحهٔ HTTPS باید به سرور HTTPS متصل شوی.');
    return url.href.replace(/\/$/,'');
  }
  function errorText(error){const code=Number(error?.code);if(code===4212||code===4210)return 'اتاق پیدا نشد، پُر است یا بازی آن شروع شده است.';return 'اتصال برقرار نشد. آدرس سرور، کد اتاق و اتصال به شبکهٔ یکسان را بررسی کن.';}
  async function connect(kind){
    if(connecting||room)return;connecting=true;
    state=null;signature='';$('online-room-code').value='';$('online-view').textContent='در حال ورود به اتاق…';
    document.querySelectorAll('#online-dialog button[data-connect]').forEach(b=>b.disabled=true);status('در حال اتصال…');
    try{
      client=new Client(endpoint());
      const options={...getOptions(),name:$('online-name').value.trim().slice(0,24),fillBots:$('online-fill-bots').checked};
      if(kind==='join'){
        const code=$('online-code').value.trim().replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).toUpperCase();if(!/^[A-F0-9]{8}$/.test(code))throw Error('کد اتاق معتبر نیست.');
        room=await client.joinById(code,options);
      }else if(kind==='resume'){
        let seat;try{seat=JSON.parse(sessionStorage.getItem(storageKey));}catch{}
        if(!seat?.token||seat.endpoint!==endpoint())throw Error('جایگاه قابل بازیابی نداریم.');
        room=await client.reconnect(seat.token);
      }else room=await client.create('nostalgia',options);
      attach(room);$('online-dialog').close();showRoom();
    }catch(error){status(errorText(error));}
    finally{connecting=false;document.querySelectorAll('#online-dialog button[data-connect]').forEach(b=>b.disabled=false);}
  }
  function attach(joined){
    joined.reconnection.minUptime=0;
    signature='';reconnecting=false;storeSeat();
    joined.onMessage('snapshot',snapshot=>{if(room!==joined)return;state=snapshot;render();});
    joined.onDrop(()=>{if(room!==joined)return;reconnecting=true;signature='';render();});
    joined.onReconnect(()=>{if(room!==joined)return;reconnecting=false;signature='';storeSeat();joined.send('sync');});
    joined.onLeave(()=>{if(room!==joined)return;room=null;forgetSeat();$('online-view').innerHTML='<div class="network-empty"><h2>اتصال اتاق پایان یافت</h2><p>برای بازی دوباره، به لابی برگرد و اتاق تازه‌ای بساز.</p><button data-online="leave" class="primary">برگشت به لابی</button></div>';});
    joined.onError(()=>{if(room===joined)$('online-network-status').textContent='خطای ارتباط؛ در صورت ادامه، از اتاق خارج شو و دوباره متصل شو.';});
    joined.send('sync');
  }
  function send(type,data){if(room&&!reconnecting)room.send(type,data);}
  function render(){
    if(!state)return;
    $('online-network-status').textContent=reconnecting?'ارتباط قطع شده؛ تا ۳۰ ثانیه برای اتصال دوباره تلاش می‌کنیم…':'متصل • هر بازیکن از دستگاه خودش بازی می‌کند';
    $('online-room-code').value=state.roomId;
    const key=JSON.stringify({...state,serverTime:0,reconnecting});
    if(key===signature){updateTime();return;}signature=key;
    const me=state.players.find(p=>p.id===state.selfId),member=state.members.find(p=>p.self);
    if(state.stage==='lobby'){
      const min=state.mode==='party'?3:2;
      const canStart=state.members.every(p=>p.ready&&p.connected)&&(state.fillBots||state.members.length>=min);
      $('online-view').innerHTML=`<div class="online-waiting"><span class="eyebrow">اتاق دوستان • ${state.mode==='party'?'پلم پولوم پلیچ':'سنگ کاغذ قیچی'}</span><h1>دورهمیِ آنلاین</h1><p>کد اتاق را به دوستانت بده؛ هر نفر با نام خودش وارد می‌شود.</p><div class="online-members">${state.members.map(p=>`<div class="online-member">${portrait(p.avatar)}<div><b>${escape(p.name)}${p.self?' (تو)':''}</b><small>${p.host?'میزبان • ':''}${!p.connected?'در انتظار اتصال':p.ready?'آماده':'در حال آماده‌شدن'}</small></div><span class="ready-mark">${p.ready?'آماده':'منتظر'}</span></div>`).join('')}</div><p class="online-room-details">${fa(state.members.length)} نفر از ظرفیت ${fa(state.capacity)} • ${state.mode==='rps'?fa(state.rounds)+' دور':'دوئل نهایی یک‌دست'}${state.fillBots?' • جای خالی با کامپیوتر پُر می‌شود':''}</p><p class="online-notice" role="status">${escape(state.notice)}</p><div class="online-actions"><button class="primary" data-online="ready" ${reconnecting?'disabled':''}>${member?.ready?'آماده نیستم':'آماده‌ام'}</button>${state.host?`<button class="primary" data-online="start" ${!canStart||reconnecting?'disabled':''}>شروع مسابقه</button>`:'<span>پس از آماده‌شدن همه، میزبان شروع می‌کند.</span>'}</div></div>`;
    }else{
      const revealed=state.stage==='reveal'||state.stage==='finished';
      const available=state.players.filter(p=>p.active).length>2?['palm','back']:moves;
      const winner=state.players.find(p=>p.id===state.winner);
      $('online-view').innerHTML=`<div class="online-match-top"><span>${state.mode==='party'?'پلم پولوم پلیچ':'سنگ کاغذ قیچی'} • دست ${fa(state.round)}</span><span id="online-time"></span></div><div class="hand-table online-table">${state.players.map(p=>`<div class="hand-seat ${!p.active?'eliminated':''}"><div class="seat-info">${portrait(p.avatar)}<div><b>${escape(p.name)}${p.id===state.selfId?' (تو)':''}</b><small>${p.bot?'کامپیوتر':!p.connected?'قطع ارتباط':!p.active?'حذف‌شده':p.committed?'دست ثبت شد':'در حال انتخاب'} • ${fa(p.wins)} برد</small></div></div><div class="arm" style="--sleeve:${['#eb755c','#a58ac8','#e0b65e','#78aaa5'][p.avatar]}"><span class="hand">${revealed&&state.choices[p.id]?icons[state.choices[p.id]]:p.active?'؟':'—'}</span></div></div>`).join('')}</div><div class="online-control-panel">${state.stage==='finished'?`<h1>${escape(winner?.name||'بازیکن')} قهرمان شد!</h1><p>نتیجه با سرور محاسبه شد. امتیاز این اتاق وارد رکورد محلی نمی‌شود.</p>${state.host?'<button class="primary" data-online="rematch">یک مسابقهٔ تازه</button>':'<p>برای بازی مجدد منتظر میزبان بمان.</p>'}`:revealed?`<h2>${escape(state.notice)}</h2><p>دست بعدی خودکار شروع می‌شود.</p>`:!me?.active?'<h2>از این دور حذف شدی</h2><p>دست‌های باقی بازیکن‌ها را تماشا کن.</p>':me.committed?'<h2>دستت ثبت شد</h2><p>انتخاب تو تا روشدن همگانی مخفی است؛ منتظر بقیه بمان.</p>':`<h2>${escape(me.name)}؛ دستت را انتخاب کن</h2><p>پس از ثبت، انتخاب قابل تغییر نیست.</p><div class="choices">${available.map((m,i)=>`<button data-online-move="${m}" ${reconnecting?'disabled':''}><span>${icons[m]}</span><b>${labels[m]}</b><small>کلید ${fa(i+1)}</small></button>`).join('')}</div>`}</div>`;
    }
    updateTime();
  }
  function updateTime(){const clock=$('online-time');if(clock&&state.deadline)clock.textContent=`${fa(Math.max(0,Math.ceil((state.deadline-state.serverTime)/1000)))} ثانیه`;}
  function choose(move){if(state?.stage==='choosing')send('move',{move,round:state.round,matchId:state.matchId});}
  async function leave(){const previous=room;room=null;state=null;signature='';forgetSeat();$('online-leave-dialog').close();showHome();if(previous)try{await previous.leave();}catch{}}
  function requestLeave(){if(!room){showHome();return;}$('online-leave-dialog').showModal();}
  $('online-open').onclick=open;$('online-close').onclick=()=>$('online-dialog').close();
  $('online-create').onclick=()=>connect('create');$('online-join').onclick=()=>connect('join');$('online-resume').onclick=()=>connect('resume');
  $('online-leave').onclick=requestLeave;$('online-leave-confirm').onclick=leave;$('online-leave-cancel').onclick=()=>$('online-leave-dialog').close();
  $('online-view').addEventListener('click',event=>{const b=event.target.closest('[data-online]');if(b){if(b.dataset.online==='ready')send('ready',!state.members.find(p=>p.self)?.ready);if(b.dataset.online==='start')send('start');if(b.dataset.online==='rematch')send('rematch');if(b.dataset.online==='leave')void leave();}const choice=event.target.closest('[data-online-move]');if(choice)choose(choice.dataset.onlineMove);});
  $('online-copy').onclick=async()=>{if(!state)return;try{await navigator.clipboard.writeText(state.roomId);$('online-network-status').textContent='کد اتاق کپی شد؛ دوستت آن را در بازی آنلاین وارد کند.';}catch{$('online-room-code').select();$('online-network-status').textContent='کد اتاق را از کادر انتخاب‌شده کپی کن.';}};
  document.addEventListener('keydown',event=>{if(!room||!state||reconnecting||event.repeat||event.target.matches('input,select')||document.querySelector('dialog[open]'))return;const i=['1','2','3'].indexOf(event.key);if(i>=0){event.preventDefault();choose((state.players.filter(p=>p.active).length>2?['palm','back']:moves)[i]);}});
  return {isActive:()=>Boolean(room),requestLeave};
}
