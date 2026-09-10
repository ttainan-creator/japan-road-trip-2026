const CACHE='japan-road-trip-v2.9.1';
const ASSETS=['./','./index.html','./style.css','./app.js','./data.js','./reference.js','./db.js','./manifest.json','./version.json','./trip-guide.html','./kakegawa-guide.html','./culture-history-guide-kakegawa.pdf','./suzuki-tickets.html','./icons/icon-192.png','./icons/icon-512.png'];
const NETWORK_FIRST=['/app.js','/data.js','/version.json','/trip-guide.html','/index.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  const critical=NETWORK_FIRST.some(x=>u.pathname.endsWith(x));
  if(critical){
    e.respondWith(fetch(e.request).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return res}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return res}).catch(()=>caches.match('./index.html'))));
});
