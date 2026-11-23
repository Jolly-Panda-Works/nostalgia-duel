export function fitWebViewport(){
  const root=document.documentElement;
  const app=document.getElementById('app');
  root.classList.add('web-viewport');
  const updateViewport=()=>{
    const viewport=window.visualViewport;
    root.style.setProperty('--game-height',`${viewport?.height || innerHeight}px`);
    root.style.setProperty('--game-top',`${viewport?.offsetTop || 0}px`);
  };
  window.addEventListener('resize',updateViewport);
  window.visualViewport?.addEventListener('resize',updateViewport);
  window.visualViewport?.addEventListener('scroll',updateViewport);
  new MutationObserver(()=>{app.scrollTop=0;}).observe(root,{
    attributes:true,attributeFilter:['data-screen'],
  });
  updateViewport();
}
