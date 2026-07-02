/* Push handling for CalTrack, imported into the Workbox-generated service
 * worker via `workbox.importScripts` (see vite.config.js). Kept in /public as
 * plain JS so it ships as-is and can be swapped without rebuilding the SW.
 *
 * The generated SW still owns precaching/offline; this only adds the two
 * listeners the Push API needs: render a notification, and focus the app when
 * it's tapped.
 */

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data && event.data.text() }
  }

  const title = payload.title || 'CalTrack'
  const options = {
    body: payload.body || 'Time to log your meals.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Same tag collapses repeat reminders into one notification.
    tag: payload.tag || 'meal-reminder',
    renotify: true,
    data: { url: payload.url || '/log' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/log'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Reuse an existing tab if the app is already open.
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target).catch(() => {})
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
