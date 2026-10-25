/* =====================================
   رفقة البقرة
   PUSH NOTIFICATIONS
===================================== */


/* =====================================
   RECEIVE PUSH
===================================== */

self.addEventListener(
  'push',
  event => {
    let payload

    try {
      payload =
        event.data
          ? event.data.json()
          : {}
    } catch {
      payload = {
        body:
          event.data
            ? event.data.text()
            : ''
      }
    }


    const title =
      payload.title ||
      'رفقة البقرة'


    const options = {
      body:
        payload.body ||
        'لديك تذكير جديد من رفقة البقرة',

      icon:
        payload.icon ||
        '/pwa-192x192.png',

      badge:
        payload.badge ||
        '/pwa-192x192.png',

      tag:
        payload.tag ||
        'refqat-reminder',

      dir:
        'rtl',

      lang:
        'ar',

      renotify:
        true,

      data: {
        url:
          payload.url ||
          '/'
      }
    }


    event.waitUntil(
      self.registration
        .showNotification(
          title,
          options
        )
    )
  }
)


/* =====================================
   CLICK NOTIFICATION
===================================== */

self.addEventListener(
  'notificationclick',
  event => {
    event.notification.close()


    const targetUrl =
      new URL(
        event.notification
          .data?.url ||
        '/',

        self.location.origin
      ).href


    event.waitUntil(
      self.clients
        .matchAll({
          type:
            'window',

          includeUncontrolled:
            true
        })
        .then(
          async clients => {

            for (
              const client
              of clients
            ) {
              if (
                client.url.startsWith(
                  self.location.origin
                )
              ) {
                if (
                  'navigate' in client
                ) {
                  await client.navigate(
                    targetUrl
                  )
                }


                if (
                  'focus' in client
                ) {
                  return client.focus()
                }
              }
            }


            if (
              self.clients.openWindow
            ) {
              return self.clients
                .openWindow(
                  targetUrl
                )
            }


            return null
          }
        )
    )
  }
)