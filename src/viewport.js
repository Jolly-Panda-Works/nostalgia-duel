// Fit the complete game stage to the browser; transforms never discard content.
export function fitWebViewport(){
  const root=document.documentElement,app=document.getElementById('app');
  root.classList.add('web-viewport');
  let frame=0;
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(fit);};
  function fit(){
    frame=0;
    const viewport=window.visualViewport;
    const width=viewport?.width||innerWidth,height=viewport?.height||innerHeight,top=viewport?.offsetTop||0;
    root.style.setProperty('--game-height',`${height}px`);
    root.style.setProperty('--game-top',`${top}px`);
    app.style.width=`${Math.min(1240,width)}px`;
    const scale=Math.min(1,width/Math.max(1,app.offsetWidth),(height-4)/Math.max(1,app.scrollHeight));
    app.style.setProperty('--stage-scale',String(scale));
    for(const dialog of document.querySelectorAll('dialog[open]')){
      const s=Math.min(1,(width-16)/Math.max(1,dialog.offsetWidth),(height-16)/Math.max(1,dialog.scrollHeight+dialog.offsetHeight-dialog.clientHeight));
      dialog.style.setProperty('--dialog-scale',String(s));
    }
  }
  new ResizeObserver(schedule).observe(app);
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','open','class']});
  window.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('scroll',schedule);
  document.addEventListener('load',schedule,true);
  document.fonts.ready.then(schedule);
  schedule();
}
