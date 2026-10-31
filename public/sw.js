const CACHE_NAME = 'alqirsh-shell-v3';
const APP_SHELL = ['/manifest.webmanifest', '/brand/alqirsh-icon-192.png', '/brand/alqirsh-icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('alqirsh-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Let the browser and Next.js handle app assets, RSC requests, and data
  // fetches directly. This worker only supplies an offline page for navigation.
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin || url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) return;

  // Dynamic pages, including trips and authenticated pages, are never cached.
  // The fallback is only used when a page navigation itself cannot reach the server.
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch {
      if (request.mode === 'navigate') {
        return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>&#1578;&#1593;&#1584;&#1585; &#1575;&#1604;&#1575;&#1578;&#1589;&#1575;&#1604;</title><body style="font-family:system-ui,sans-serif;max-width:36rem;margin:15vh auto;padding:1.5rem;text-align:center;color:#182b25"><h1>&#1578;&#1593;&#1584;&#1585; &#1575;&#1604;&#1575;&#1578;&#1589;&#1575;&#1604; &#1576;&#1575;&#1604;&#1582;&#1575;&#1583;&#1605;</h1><p>&#1578;&#1581;&#1602;&#1602; &#1605;&#1606; &#1575;&#1578;&#1589;&#1575;&#1604; &#1575;&#1604;&#1573;&#1606;&#1578;&#1585;&#1606;&#1578; &#1579;&#1605; &#1571;&#1593;&#1583; &#1578;&#1581;&#1605;&#1610;&#1604; &#1575;&#1604;&#1589;&#1601;&#1581;&#1577;.</p><button onclick="location.reload()" style="padding:.75rem 1rem;border:0;border-radius:.75rem;background:#08745d;color:white;font-weight:700">&#1573;&#1593;&#1575;&#1583;&#1577; &#1575;&#1604;&#1605;&#1581;&#1575;&#1608;&#1604;&#1577;</button></body></html>', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
      return new Response(null, { status: 504, statusText: 'Gateway Timeout', headers: { 'Cache-Control': 'no-store' } });
    }
  })());
});
