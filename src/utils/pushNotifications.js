function urlBase64ToUint8Array(base64String) {
  const padding =
    '='.repeat(
      (4 - (base64String.length % 4)) % 4
    )

  const base64 =
    (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

  const rawData =
    window.atob(base64)

  return Uint8Array.from(
    [...rawData].map(
      char => char.charCodeAt(0)
    )
  )
}


export function isIosDevice() {
  return /iphone|ipad|ipod/i.test(
    navigator.userAgent
  )
}


export function isStandaloneApp() {
  return (
    window.matchMedia(
      '(display-mode: standalone)'
    ).matches ||
    window.navigator.standalone === true
  )
}


export function pushIsSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}


export async function getPushStatus() {
  if (!pushIsSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false
    }
  }


  const registration =
    await navigator.serviceWorker.ready


  const subscription =
    await registration.pushManager
      .getSubscription()


  return {
    supported: true,
    permission:
      Notification.permission,

    subscribed:
      Boolean(subscription)
  }
}


async function getPublicKey() {
  const response =
    await fetch(
      '/api/push?action=public-key',
      {
        method: 'GET',
        credentials: 'include'
      }
    )


  const data =
    await response.json()


  if (
    !response.ok ||
    !data?.publicKey
  ) {
    throw new Error(
      data?.error ||
      'تعذر قراءة مفتاح الإشعارات.'
    )
  }


  return data.publicKey
}


function detectPlatform() {
  if (
    /iphone|ipad|ipod/i.test(
      navigator.userAgent
    )
  ) {
    return 'ios'
  }


  if (
    /android/i.test(
      navigator.userAgent
    )
  ) {
    return 'android'
  }


  return 'web'
}


export async function enablePushNotifications() {
  if (!pushIsSupported()) {
    throw new Error(
      'هذا الجهاز أو المتصفح لا يدعم الإشعارات.'
    )
  }


  if (
    isIosDevice() &&
    !isStandaloneApp()
  ) {
    throw new Error(
      'على iPhone يجب إضافة رفقة البقرة إلى الشاشة الرئيسية وفتحها من الأيقونة أولًا.'
    )
  }


  const permission =
    await Notification
      .requestPermission()


  if (
    permission !==
    'granted'
  ) {
    throw new Error(
      'لم يتم السماح بالإشعارات.'
    )
  }


  const registration =
    await navigator
      .serviceWorker
      .ready


  let subscription =
    await registration
      .pushManager
      .getSubscription()


  if (!subscription) {
    const publicKey =
      await getPublicKey()


    subscription =
      await registration
        .pushManager
        .subscribe({
          userVisibleOnly: true,

          applicationServerKey:
            urlBase64ToUint8Array(
              publicKey
            )
        })
  }


  const response =
    await fetch(
      '/api/push?action=subscribe',
      {
        method: 'POST',

        credentials:
          'include',

        headers: {
          'Content-Type':
            'application/json'
        },

        body:
          JSON.stringify({
            subscription:
              subscription.toJSON(),

            platform:
              detectPlatform()
          })
      }
    )


  const data =
    await response.json()


  if (!response.ok) {
    throw new Error(
      data?.error ||
      'تعذر تسجيل الجهاز للإشعارات.'
    )
  }


  return {
    ok: true,
    subscription
  }
}


export async function disablePushNotifications() {
  if (!pushIsSupported()) {
    return {
      ok: true
    }
  }


  const registration =
    await navigator
      .serviceWorker
      .ready


  const subscription =
    await registration
      .pushManager
      .getSubscription()


  if (!subscription) {
    return {
      ok: true
    }
  }


  const endpoint =
    subscription.endpoint


  const response =
    await fetch(
      '/api/push?action=unsubscribe',
      {
        method: 'POST',

        credentials:
          'include',

        headers: {
          'Content-Type':
            'application/json'
        },

        body:
          JSON.stringify({
            endpoint
          })
      }
    )


  const data =
    await response.json()


  if (!response.ok) {
    throw new Error(
      data?.error ||
      'تعذر إيقاف الإشعارات.'
    )
  }


  await subscription
    .unsubscribe()


  return {
    ok: true
  }
}


export async function sendTestPush() {
  const response =
    await fetch(
      '/api/push?action=test',
      {
        method: 'POST',

        credentials:
          'include'
      }
    )


  const data =
    await response.json()


  if (
    !response.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.error ||
      'تعذر إرسال الإشعار التجريبي.'
    )
  }


  return data
}