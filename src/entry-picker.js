import {entryFees,offerFor} from './economy.js';
import {fa,modeLabels} from './core.js';

export function setupEntryPicker({getOptions,setEntry,isOffline,getIdentity,onConfirm}){
  const byId=id=>document.getElementById(id);
  const choices=byId('entry-options'),confirm=byId('entry-confirm');
  let balance=null,busy=false,request=0;
  choices.innerHTML=entryFees.map(entry=>`<button type="button" data-entry="${entry}"><b>${entry?fa(entry)+' سکه':'رایگان'}</b><small>جایزه: ${fa(offerFor(entry).coins)} سکه</small></button>`).join('');

  function draw(){
    const {entry}=getOptions();
    for(const button of choices.children){
      button.setAttribute('aria-pressed',String(Number(button.dataset.entry)===entry));
      button.disabled=busy;
    }
    document.querySelectorAll('[data-mode]').forEach(button=>button.disabled=busy);
    byId('entry-wallet').textContent=balance===null?'در حال دریافت موجودی…':'موجودی: '+fa(balance)+' سکه';
    if(isOffline()){
      choices.hidden=true;
      byId('entry-wallet').textContent='بازی رایگان با بات';
      confirm.disabled=busy;
      confirm.textContent='شروع بازی آفلاین';
      return;
    }
    choices.hidden=false;
    confirm.disabled=busy||balance===null||balance<entry;
    confirm.textContent=busy?'در حال ورود…':balance!==null&&balance<entry?'سکهٔ کافی نداری':entry?'ورود با '+fa(entry)+' سکه':'ورود رایگان';
  }
  choices.onclick=event=>{
    const button=event.target.closest('[data-entry]');
    if(!button||busy)return;
    setEntry(Number(button.dataset.entry));
    byId('entry-status').textContent='';
    draw();
  };
  window.addEventListener('wallet-update',event=>{
    if(Number.isSafeInteger(event.detail?.coins)){balance=event.detail.coins;draw();}
  });
  async function open(){
    const key=++request;
    const {mode,rounds,capacity}=getOptions(),party=mode==='party';
    byId('entry-title').textContent='ورودی '+modeLabels[mode];
    byId('entry-format').textContent=party?fa(capacity)+' بازیکن':fa(rounds)+' دور · دو بازیکن';
    byId('entry-status').textContent='';
    draw();
    if(isOffline())return;
    try{const identity=await getIdentity();if(key===request){balance=identity.wallet.coins;draw();}}
    catch{if(key===request){balance=null;draw();byId('entry-status').textContent='دریافت موجودی ممکن نشد؛ حالت بازی را دوباره انتخاب کن.';}}
  }
  confirm.onclick=async()=>{
    if(busy||confirm.disabled)return;
    busy=true;draw();
    try{await onConfirm();}
    catch(error){byId('entry-status').textContent=error.message||'ورود به مسابقه انجام نشد.';}
    finally{busy=false;draw();}
  };
  return {open};
}
