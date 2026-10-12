// ════════════════════════════════════════════
// 地理ワーク Service Worker
//   ・最初に全ファイルを保存しておき，オフラインでも開けるようにする
//   ・つながっているときは最新を取りに行く（遅いときは保存分を使う）
// ════════════════════════════════════════════
const CACHE = 'geo-v5';
const FILES = [
  './', './index.html', './app.js', './data.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png',
  './img/p31-map.jpg', './img/p31-productivity.jpg', './img/p33-pivot.jpg', './img/p33-soybean.jpg',
  './img/p35-catch.jpg', './img/p37-fishery.jpg',
];
const TIMEOUT = 3500;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('geo-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(networkFirst(e));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
  }
});

// 最新を取りに行き，失敗・時間切れなら保存分を返す
//   ブラウザの一時保存は使わず，毎回GitHubに新しい版があるか確かめる（?v=… を付けなくても更新が出る）
function networkFirst(e) {
  const req = e.request;
  const url = new URL(req.url);
  const key = url.origin + url.pathname;          // ?v=… は保存のときは外す
  const net = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(key, copy));
    }
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  const timeout = new Promise(r => setTimeout(r, TIMEOUT, null));
  return Promise.race([net.catch(() => null), timeout]).then(async res => {
    if (res) return res;
    const hit = await caches.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? await caches.match('./') : null);
    return hit || net;
  });
}

// フォントは保存分を優先
function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  }));
}
