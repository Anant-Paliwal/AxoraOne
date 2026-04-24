const CACHE_NAME = 'axora-v1';
const STATIC_CACHE = 'axora-static-v1';
const DYNAMIC_CACHE = 'axora-dynamic-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/axora-logo.png',
  '/axora-logo-light.png',
  '/favicon.svg'
];

// Install service worker and cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy: Cache first for static assets, Network first for API calls
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for API calls to backend
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first strategy for static assets
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version and update cache in background
            fetch(request)
              .then((response) => {
                if (response && response.status === 200) {
                  caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(request, response.clone());
                  });
                }
              })
              .catch(() => {});
            return cachedResponse;
          }

          // Not in cache, fetch from network
          return fetch(request)
            .then((response) => {
              // Don't cache if not a valid response
              if (!response || response.status !== 200 || response.type === 'error') {
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              // Cache the fetched response
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              // If network fails, try to return from cache
              return caches.match(request);
            });
        })
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Axora Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/axora-logo.png',
    badge: '/axora-logo.png',
    tag: data.tag || 'default',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const data = event.notification.data || {};
  let url = '/';

  // Route based on notification type
  if (data.type === 'task' && data.taskId) {
    url = `/tasks?highlight=${data.taskId}`;
  } else if (data.type === 'skill' && data.skillId) {
    url = `/skills/${data.skillId}`;
  } else if (data.type === 'mention' && data.mentionId) {
    url = `/notifications?highlight=${data.mentionId}`;
  } else if (data.type === 'ai-suggestion') {
    url = '/ask';
  } else if (data.type === 'weekly-digest') {
    url = '/';
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
