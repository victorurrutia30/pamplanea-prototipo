// Producto v2 · prototipo. Service worker: precarga todo para abrir sin internet. La versión va en
// el nombre de la caché; una versión nueva espera hasta que la persona toque «Actualizar» (los datos
// guardados en el navegador no se tocan). Generado por herramientas/generar-sw.mjs: no editar a mano.
'use strict';
const VERSION_SW = '__VERSION__';
const CACHE = 'pamplanea-proto-' + VERSION_SW;
const ARCHIVOS = __ARCHIVOS__;

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS.map((a) => new Request(a, { cache: 'reload' })))));
});
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches
            .keys()
            .then((nombres) => Promise.all(nombres.filter((n) => n.startsWith('pamplanea-proto-') && n !== CACHE).map((n) => caches.delete(n))))
            .then(() => self.clients.claim()),
    );
});
self.addEventListener('message', (e) => {
    if (e.data && e.data.tipo === 'saltar') self.skipWaiting();
});
// Primero la caché (sin importar «?set=A» y similares); si no está, la red.
self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
    e.respondWith(
        caches.open(CACHE).then((c) =>
            c.match(req, { ignoreSearch: true }).then((r) => r || fetch(req).catch(() => (req.mode === 'navigate' ? c.match('./', { ignoreSearch: true }) : Response.error()))),
        ),
    );
});
