// Service Worker do TEAlimenta.
// Isso roda em segundo plano no navegador, fora da página, e é o único jeito
// de mostrar uma notificação de verdade mesmo com o app fechado. Também
// guarda uma cópia do app pra ele abrir mesmo sem internet no momento.

const SHELL_CACHE = 'tealimenta-shell-v1';
const SHELL_FILES = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch((e) => console.error('Falha ao preparar cache offline', e))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== SHELL_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Estratégia: tenta buscar na internet primeiro (pra sempre pegar a versão
// mais nova); se não conseguir (sem sinal, avião, etc.), usa a cópia salva.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});

// Chega aqui quando o servidor (nossa função no Netlify) envia um aviso.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'TEAlimenta', body: event.data ? event.data.text() : 'Você tem um lembrete.' };
  }

  const title = data.title || 'TEAlimenta';
  const options = {
    body: data.body || 'Você tem um lembrete.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'tealimenta-lembrete',
    renotify: true,
    requireInteraction: true,
    data: { url: '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Ao tocar na notificação, abre (ou foca) o app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
