export function setupConnection({retry,enterOffline,enterOnline}){
  const dialog=document.getElementById('connection-dialog');
  const message=document.getElementById('connection-message');
  const retryButton=document.getElementById('connection-retry');
  const dismiss=document.getElementById('connection-dismiss');
  let offline=false,version=0,action=null,ready=false;
  function open(feature){
    action=feature||null;
    message.textContent=offline?'برای استفاده از این بخش باید آنلاین شوی.':'دسترسی به سرور بازی ممکن نیست.';
    dismiss.textContent=offline?'بی‌خیال':'بازی آفلاین با بات';
    if(!dialog.open)dialog.showModal();
  }
  function close(){version++;retryButton.disabled=false;dialog.close();}
  function disconnected(){if(ready&&!offline&&!dialog.open)open();}
  function recovered(){if(!offline&&dialog.open){close();action=null;}}
  dismiss.onclick=()=>{
    close();action=null;
    if(!offline){offline=true;document.body.classList.add('offline');enterOffline();}
  };
  dialog.addEventListener('cancel',event=>{if(!offline)event.preventDefault();else{version++;action=null;retryButton.disabled=false;}});
  retryButton.onclick=async()=>{
    const attempt=++version;
    retryButton.disabled=true;message.textContent='در حال اتصال به سرور…';
    try{
      await retry();
      if(attempt!==version)return;
      const resume=action;
      offline=false;document.body.classList.remove('offline');action=null;close();enterOnline();resume?.();
    }catch{
      if(attempt===version)message.textContent='اتصال به سرور برقرار نشد.\nمی‌توانی دوباره تلاش کنی یا آفلاین بازی کنی.';
    }finally{if(attempt===version)retryButton.disabled=false;}
  };
  window.addEventListener('offline',disconnected);
  return {isOffline:()=>offline,requireOnline:open,disconnected,recovered,
    ready(connected){ready=true;if(!connected)disconnected();}};
}
