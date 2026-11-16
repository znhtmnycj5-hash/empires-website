const CACHE_NAME='clanwars-images-v2';

self.addEventListener('install',event=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key.startsWith('clanwars-images-')&&key!==CACHE_NAME)
        .map(key=>caches.delete(key))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const accept=request.headers.get('accept')||'';
  if(!accept.includes('image/'))return;

  event.respondWith(
    caches.match(request).then(cached=>{
      if(cached)return cached;
      return fetch(request).then(response=>{
        if(response.ok||response.type==='opaque'){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)).catch(()=>{});
        }
        return response;
      });
    }).catch(()=>caches.match(request))
  );
});
