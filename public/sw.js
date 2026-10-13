// Zone5Training · Service Worker. Muda V ao publicar uma nova versão da app.
const V = 'z5-v5';
const SHELL = ['/', '/index.html', '/config.js', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];
const CDN = /(^|\.)(jsdelivr\.net|googleapis\.com|gstatic\.com)$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // Nunca guardar API (Supabase), funções do servidor nem fotos privadas
  if (u.pathname.startsWith('/.netlify/') || u.hostname.endsWith('supabase.co')) return;
  // Páginas: rede primeiro, cache como reserva (abre offline)
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((x) => { const c = x.clone(); caches.open(V).then((ch) => ch.put('/index.html', c)); return x; }).catch(() => caches.match('/index.html')));
    return;
  }
  // Ficheiros da app e bibliotecas: cache primeiro e atualiza em segundo plano
  if (u.origin === location.origin || CDN.test(u.hostname)) {
    e.respondWith(caches.match(r).then((hit) => {
      const net = fetch(r).then((x) => { if (x && (x.ok || x.type === 'opaque')) { const c = x.clone(); caches.open(V).then((ch) => ch.put(r, c)); } return x; }).catch(() => hit);
      return hit || net;
    }));
  }
});
// Web Push (enviado pelo servidor a cada minuto: água, hábitos, suplementos)
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'Zone5Training', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Zone5Training', {
    body: d.body || '', tag: d.tag || undefined, icon: '/icon-192.png', badge: '/icon-192.png',
    vibrate: [100, 50, 100], data: { url: d.url || '/' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => (l[0] ? l[0].focus() : self.clients.openWindow(url))));
});
