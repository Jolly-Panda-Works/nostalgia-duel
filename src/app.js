import {setupConnection} from './connection.js';
import {moveElement} from './motion.js';
import {startGame} from './startup.js';
import {themedIcon} from './icons.js';
import {setupShop} from './shop.js';
import {setupProfile} from './profile.js';
import {portrait} from './avatar-art.js';
import {setupTutorial} from './tutorial.js';
import {setupFriends} from './friends.js';
import {matchFormat,fa,cleanSave,defaultNames} from './core.js';
import {native,load,persist} from './platform.js';
import {setupOnline} from './online.js';
import {fitWebViewport} from './viewport.js';
document.querySelectorAll('[data-icon]').forEach(el=>{el.outerHTML=themedIcon(el.dataset.icon,el.getAttribute('class')||'ui-icon');});
const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

window.addEventListener('wallet-update',e=>{if(!e.detail)return;$('wallet-coins').textContent=fa(e.detail.coins);});
const selectedFees={rps:0,advanced:0,party:0};
let mode='rps',onlineAPI=null,friends=null,shop=null;
let profile={name:defaultNames[0],avatar:0};try{const saved=JSON.parse(localStorage.getItem('nostalgia-profile'));if(saved&&typeof saved.name==='string')profile={name:saved.name.slice(0,24),avatar:Number.isInteger(saved.avatar)&&saved.avatar>=0&&saved.avatar<10?saved.avatar:0};}catch{}
const loaded=load();let save=loaded.data;let savedMatches=[];try{savedMatches=JSON.parse(localStorage.getItem('nostalgia-saved-matches')||'[]');if(!Array.isArray(savedMatches))savedMatches=[];}catch{}

const connection=setupConnection({
  async retry(){
    await friends.identity();
    if(onlineAPI.isReconnecting())throw Error('Room reconnecting');
  },
  enterOffline(){
    document.querySelector('.local-badge').textContent='بازی آفلاین';
    for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
    $('profile-name').textContent=profile.name;
    $('profile-avatar').innerHTML=portrait(profile.avatar)+'<span>تغییر آواتار</span>';
    void onlineAPI.leave();
  },
  enterOnline(){
    document.querySelector('.local-badge').textContent='بازی آنلاین';
    if(document.documentElement.dataset.screen==='home')void onlineAPI.refreshEntries();
    if(document.documentElement.dataset.screen==='online'&&!onlineAPI.isActive())show('home');
  }
});
const restricted='#wallet-shop,#nav-shop,#profile-avatar,#profile-edit-name,#friends-open,#online-friends,#friend-alert,#offline-stats';
document.addEventListener('click',event=>{
  const button=event.target.closest(restricted);
  if(!button||!connection.isOffline())return;
  event.preventDefault();event.stopImmediatePropagation();
  connection.requireOnline(()=>{if(button.id==='offline-stats')openSetup();else button.click();});
},true);
function options(){return{mode,entry:selectedFees[mode],...matchFormat(mode),...profile,name:profile.name.trim()||defaultNames[0]};}
function setup(){document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});}
function show(id){if(id==='home')void onlineAPI?.refreshEntries();const previous=document.documentElement.dataset.screen;document.documentElement.dataset.screen=id;document.querySelectorAll('.screen').forEach(el=>el.hidden=el.id!==id);document.querySelector('.lobby-nav').hidden=id==='loading'||id==='online';
  const tabs=[...document.querySelectorAll('.lobby-nav [role=tab]')];
  const index=tabs.findIndex(tab=>tab.getAttribute('aria-controls')===id);
  tabs.forEach((tab,i)=>{
    const active=i===index;
    tab.setAttribute('aria-selected',String(active));
    tab.tabIndex=active?0:-1;
    if(active)tab.setAttribute('aria-current','page');
    else tab.removeAttribute('aria-current');
  });
  if(index>=0)document.querySelector('.lobby-nav').style.setProperty('--active-tab',String(tabs.length-1-index));
  if(previous!==id&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const panel=$(id),order=['setup-dialog','home','shop'],direction=order.indexOf(id)>=order.indexOf(previous)?-1:1;if(order.includes(id))moveElement(panel,'TabSwitch',[{opacity:0,transform:'translateX('+direction*8+'px)'},{opacity:1,transform:'translateX(0)'}]);}}
function home(){if(onlineAPI?.isActive()){onlineAPI.requestLeave();return;}show('home');}
function modal(title,copy){$('modal').classList.remove('tutorial-modal');$('modal-copy').hidden=false;$('modal-close').textContent='ادامه';$('modal-title').textContent=title;$('modal-copy').textContent=copy;$('modal-exit').hidden=true;$('modal').showModal();}
function openSetup(){if(onlineAPI?.isActive()){onlineAPI.requestLeave();return;}show('setup-dialog');}

function saveResult(state){if(savedMatches.includes(state.matchId))return;const self=state.players.find(p=>p.id===state.selfId);if(!self)return;const winner=state.players.find(p=>p.id===state.winner);const record=state.mode==='party'?{mode:'party',name:winner.name,score:state.players.length,rounds:state.round}:{mode:state.mode,name:self.name,score:self.score,rounds:state.rounds};save=cleanSave({...save,records:[record,...save.records]});persist(save);void friends?.refresh().catch(()=>{});savedMatches=[state.matchId,...savedMatches].slice(0,100);try{localStorage.setItem('nostalgia-saved-matches',JSON.stringify(savedMatches));}catch{}}

document.addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b){mode=b.dataset.mode;setup();void onlineAPI.confirmStart();}if(e.target.closest('.back-home'))home();});
function openShop(){if(onlineAPI?.isActive()){onlineAPI.requestLeave();return;}show('shop');void shop.open();}$('nav-shop').onclick=openShop;$('wallet-shop').onclick=openShop;$('nav-players').onclick=openSetup;$('home-link').onclick=home;$('nav-home').onclick=home;
$('modal-close').onclick=()=>$('modal').close();const renderGuide=setupTutorial({getMode:()=>mode,host:$('tutorial-view')});$('guide-close').onclick=()=>$('guide').close();$('help').onclick=()=>{renderGuide();$('guide').showModal();};

if(!native)fitWebViewport();$('studio-about').onclick=()=>$('studio-dialog').showModal();$('studio-close').onclick=()=>$('studio-dialog').close();
onlineAPI=setupOnline({isOffline:connection.isOffline,onDisconnect:connection.disconnected,onReconnect:connection.recovered,getOptions:options,setEntry:fee=>{selectedFees[mode]=fee;},getIdentity:()=>friends.identity(),onResult:saveResult,escape,portrait,showHome:()=>show('home'),showRoom:()=>show('online')});
friends=setupFriends({isOffline:connection.isOffline,onDisconnect:connection.disconnected,getOnline:()=>onlineAPI,getOptions:options,escape,portrait});setupProfile({getFriends:()=>friends,getRecords:()=>save.records});shop=setupShop({getFriends:()=>friends,escape});window.addEventListener('profile-update',e=>{if(!e.detail)return;profile={name:e.detail.name,avatar:e.detail.avatar};try{localStorage.setItem('nostalgia-profile',JSON.stringify(profile));}catch{}});$('platform-label').textContent=native?'ANDROID • PORTRAIT':'WEB • LANDSCAPE';setup();void startGame({prepare:()=>friends.identity(),onReady:connected=>{show('home');connection.ready(connected);}});

document.querySelector('.lobby-nav').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[...document.querySelectorAll('.lobby-nav [role=tab]')];const i=tabs.indexOf(e.target);if(i<0)return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowLeft'?1:-1)+tabs.length)%tabs.length;tabs[n].click();tabs[n].focus({preventScroll:true});});
if(import.meta.env.PROD&&!native&&/^https?:$/.test(location.protocol)&&'serviceWorker' in navigator){
  window.addEventListener('load',()=>{void navigator.serviceWorker.register('./offline-worker.js',{updateViaCache:'none'}).catch(()=>{});});
}
