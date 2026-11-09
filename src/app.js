import {setupTutorial} from './tutorial.js';
import {setupFriends} from './friends.js';
import {avatars,modeLabels,fa,cleanSave,defaultNames} from './core.js';
import {native,load,persist} from './platform.js';
import {setupOnline} from './online.js';
import {fitWebViewport} from './viewport.js';
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

window.addEventListener('wallet-update',e=>{if(!e.detail)return;$('wallet-coins').textContent=fa(e.detail.coins);$('wallet-xp').textContent=fa(e.detail.xp);});
let mode='rps',onlineAPI=null,friends=null,scorePage=0,scoreMode='rps';
let profile={name:defaultNames[0],avatar:0};try{const saved=JSON.parse(localStorage.getItem('nostalgia-profile'));if(saved&&typeof saved.name==='string')profile={name:saved.name.slice(0,24),avatar:Number.isInteger(saved.avatar)&&saved.avatar>=0&&saved.avatar<4?saved.avatar:0};}catch{}
const loaded=load();let save=loaded.data;let savedMatches=[];try{savedMatches=JSON.parse(localStorage.getItem('nostalgia-saved-matches')||'[]');if(!Array.isArray(savedMatches))savedMatches=[];}catch{}
const portrait=i=>{const a=avatars[i%avatars.length];return `<span class="avatar" style="--character-color:${a.color}" aria-label="آواتار ${a.name}"><i class="hat"></i><i class="smile"></i></span>`;};
function options(){return{mode,rounds:Number($('round-count').value),capacity:mode==='party'?Number($('player-count').value):2,...profile,name:profile.name.trim()||defaultNames[0]};}
function updateLobby(){$('quick-rule').textContent='یک مود انتخاب کن؛ ورودی و جایزه را ببین.';}
function setup(){ $('rps-settings').hidden=mode==='party';$('party-settings').hidden=mode!=='party';document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});$('roster').innerHTML=`<div class="roster-row">${portrait(profile.avatar)}<input maxlength="24" aria-label="نام تو" value="${escape(profile.name)}" data-name="0"><select aria-label="آواتار تو" data-avatar="0">${avatars.map((a,k)=>`<option value="${k}" ${k===profile.avatar?'selected':''}>${a.name}</option>`).join('')}</select></div>`;}
function show(id){document.documentElement.dataset.screen=id;document.querySelectorAll('.screen').forEach(el=>el.hidden=el.id!==id);$('best').textContent=fa(Math.max(0,...save.records.filter(r=>r.mode==='rps').map(r=>r.score)));document.querySelector('.lobby-nav').hidden=id==='loading'||id==='online';document.querySelectorAll('.lobby-nav button').forEach(b=>b.removeAttribute('aria-current'));if(id==='home')$('nav-home').setAttribute('aria-current','page');if(id==='leaderboard')$('scores').setAttribute('aria-current','page');const selected={home:'nav-home','setup-dialog':'nav-players',leaderboard:'scores',guide:'help'}[id];document.querySelectorAll('.lobby-nav button').forEach(b=>{const active=b.id===selected;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active)b.setAttribute('aria-current','page');});}
function home(){if(onlineAPI?.isActive()){onlineAPI.requestLeave();return;}show('home');}
function modal(title,copy){$('modal').classList.remove('tutorial-modal');if($('tutorial-view'))$('tutorial-view').hidden=true;$('modal-copy').hidden=false;$('modal-close').textContent='ادامه';$('modal-title').textContent=title;$('modal-copy').textContent=copy;$('modal-exit').hidden=true;$('modal').showModal();}
function openSetup(){if(onlineAPI?.isActive()){onlineAPI.requestLeave();return;}show('setup-dialog');}
function closeSetup(){show('home');try{localStorage.setItem('nostalgia-profile',JSON.stringify(profile));}catch{}updateLobby();void friends.identity().catch(()=>{});}
function saveResult(state){if(savedMatches.includes(state.matchId))return;const self=state.players.find(p=>p.id===state.selfId);if(!self)return;const winner=state.players.find(p=>p.id===state.winner);const record=state.mode==='party'?{mode:'party',name:winner.name,score:state.players.length,rounds:state.round}:{mode:state.mode,name:self.name,score:self.score,rounds:state.rounds};save=cleanSave({...save,records:[record,...save.records]});persist(save);savedMatches=[state.matchId,...savedMatches].slice(0,100);try{localStorage.setItem('nostalgia-saved-matches',JSON.stringify(savedMatches));}catch{}}
function board(){
  show('leaderboard');
  const records=save.records.filter(r=>r.mode===scoreMode);
  scorePage=Math.min(scorePage,Math.max(0,Math.ceil(records.length/5)-1));
  document.querySelectorAll('[data-score-mode]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.scoreMode===scoreMode)));
  $('score-list').innerHTML=records.length?records.slice(scorePage*5,(scorePage+1)*5).map((r,i)=>`<div class="score-row"><span>${fa(scorePage*5+i+1)}. ${escape(r.name)}</span><small>${fa(r.rounds)} ${scoreMode!=='party'?'دور':'دست'}</small><b>${fa(r.score)} ${scoreMode!=='party'?'امتیاز':'نفره'}</b></div>`).join(''):'<p class="empty">هنوز نتیجه‌ای ثبت نشده.</p>';
  $('score-pager').hidden=records.length<=5;
  $('score-page').textContent=`${fa(scorePage+1)} / ${fa(Math.max(1,Math.ceil(records.length/5)))}`;
  $('score-prev').disabled=scorePage===0;$('score-next').disabled=(scorePage+1)*5>=records.length;
}

document.addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b){mode=b.dataset.mode;setup();updateLobby();void onlineAPI.confirmStart();}if(e.target.closest('.back-home'))home();});
$('roster').addEventListener('input',e=>{if(e.target.dataset.name!==undefined){profile.name=e.target.value;try{localStorage.setItem('nostalgia-profile',JSON.stringify(profile));}catch{}}});$('roster').addEventListener('change',e=>{if(e.target.dataset.avatar!==undefined){profile.avatar=Number(e.target.value);try{localStorage.setItem('nostalgia-profile',JSON.stringify(profile));}catch{}setup();}});
$('nav-players').onclick=openSetup;$('close-setup').onclick=closeSetup;$('apply-setup').onclick=closeSetup;$('player-count').onchange=updateLobby;$('round-count').onchange=updateLobby;$('home-link').onclick=home;$('nav-home').onclick=home;$('scores').onclick=board;
$('modal-close').onclick=()=>$('modal').close();const renderGuide=setupTutorial({getMode:()=>mode,host:$('tutorial-view')});$('help').onclick=()=>{show('guide');renderGuide();};
$('score-prev').onclick=()=>{scorePage--;board();};$('score-next').onclick=()=>{scorePage++;board();};document.querySelectorAll('[data-score-mode]').forEach(b=>b.onclick=()=>{scoreMode=b.dataset.scoreMode;scorePage=0;board();});
Array.from($('player-count').options).forEach(o=>{o.value=String(Number(o.value));o.textContent=fa(Number(o.value));});
if(!native)fitWebViewport();$('studio-about').onclick=()=>$('studio-dialog').showModal();$('studio-close').onclick=()=>$('studio-dialog').close();
onlineAPI=setupOnline({getOptions:options,getIdentity:()=>friends.identity(),onResult:saveResult,escape,portrait,showHome:()=>show('home'),showRoom:()=>show('online')});
friends=setupFriends({getOnline:()=>onlineAPI,getOptions:options,escape,portrait});$('platform-label').textContent=native?'ANDROID • PORTRAIT':'WEB • LANDSCAPE';setup();updateLobby();requestAnimationFrame(()=>show('home'));friends.connect();

document.querySelector('.lobby-nav').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[...document.querySelectorAll('.lobby-nav [role=tab]')];const i=tabs.indexOf(e.target);if(i<0)return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowLeft'?1:-1)+tabs.length)%tabs.length;tabs[n].click();tabs[n].focus({preventScroll:true});});
