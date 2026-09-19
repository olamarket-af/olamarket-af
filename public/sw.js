// Service worker minimal pour O'LA Market.
// - Ne met JAMAIS en cache : /api, /auth, les requêtes vers Supabase, ni
//   aucune page privée (/account, /seller, /admin) — pour ne jamais stocker
//   de session, de token ou de données de commande en cache public.
// - Cache uniquement le strict nécessaire à l'expérience hors-ligne :
//   la page d'accueil, la page /offline, le manifest et les icônes.

const CACHE_NAME = 'ola-market-v1'
const APP_SHELL = ['/', '/offline', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

const NEVER_CACHE_PREFIXES = ['/account', '/seller', '/admin', '/api', '/auth', '/cart']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function isNeverCached(url) {
  return NEVER_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Uniquement le même domaine, et jamais les zones privées / API.
  if (url.origin !== self.location.origin || isNeverCached(url)) {
    return
  }

  // Navigation (changement de page) : réseau d'abord, page /offline si hors-ligne.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline'))
    )
    return
  }

  // Assets statiques publics (images, css, icônes) : cache d'abord, réseau en secours.
  if (['style', 'image', 'font', 'script'].includes(event.request.destination)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request)
          .then((response) => {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            return response
          })
          .catch(() => cached)
      })
    )
  }
})
