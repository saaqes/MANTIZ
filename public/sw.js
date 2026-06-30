/**
 * public/sw.js — Service Worker de MANTIZ
 * Maneja notificaciones push reales y la base de instalación PWA.
 */

const CACHE_NAME = 'mantiz-v1';

// ── Instalación / activación ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Recepción de notificaciones push reales ─────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { titulo: 'MANTIZ', mensaje: event.data ? event.data.text() : 'Tienes una notificación nueva' };
  }

  const titulo = data.titulo || 'MANTIZ';
  const opciones = {
    body: data.mensaje || '',
    icon: data.icono || '/img/logo-default.png',
    badge: '/img/logo-default.png',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    tag: data.tag || 'mantiz-notif'
  };

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

// ── Clic en la notificación: abrir/enfocar la URL relacionada ──────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
