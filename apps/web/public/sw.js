// Amplifi PWA service worker — minimal offline shell.
// A registered service worker is required before Android Chrome offers "Install app".
// No-op fetch handler to start; caching can be added later without changing app logic.
self.addEventListener('install', (e) => self.skipWaiting())
self.addEventListener('activate', (e) => self.clients.claim())
self.addEventListener('fetch', () => {}) // pass-through — network as normal
