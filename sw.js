/* Работа без интернета: страница — свежая из сети, без связи — из памяти телефона; значки — из памяти, обновляются в фоне.
   Запросы к Google (другие адреса) не трогаем — их ведёт сама страница. */
const CACHE = 'babydiary-v13';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' — мимо кэша браузера (GitHub Pages разрешает ему хранить файлы до 10 минут — иначе в «новую» версию попадала старая)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // страница: сначала свежая из сети (не дольше 4 с), нет связи — из памяти телефона; ?action=feed и т.п. — та же страница
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match('./index.html');
      const net = fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) c.put('./index.html', r.clone()); return r; });
      if (!hit) return net;
      return Promise.race([net.catch(() => hit), new Promise(r => setTimeout(() => r(hit), 4000))]);
    }));
    return;
  }
  // значки и остальное: из памяти, в фоне — обновить
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
