const prefix='nostalgia-duel:'+self.registration.scope+':';
const cacheName=prefix+build;
const root=new URL(self.registration.scope);
const home=new URL('index.html',root).href;
const assets=new Set(files.map(file=>new URL(file,root).href));

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(cacheName);
    await cache.addAll([...assets].map(url=>new Request(url,{cache:'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(prefix)&&key!==cacheName).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const navigation=event.request.mode==='navigate'&&
    (url.origin+url.pathname===root.href||url.origin+url.pathname===home);
  if(!navigation&&!assets.has(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(cacheName);
    if(navigation){
      try{
        const response=await fetch(event.request,{cache:'no-store'});
        if(response.ok)return response;
      }catch{
        // The installed entry page and its matching bundles work offline.
      }
      return (await cache.match(home))||Response.error();
    }
    const cached=await cache.match(url.href);
    return cached||fetch(event.request);
  })());
});
