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


/* =====================================
   NORMALIZE VAPID PUBLIC KEY
===================================== */

function normalizePublicKey(value) {
  const publicKey =
    String(value || '')
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .replace(/\s+/g, '')
      .replace(/=+$/g, '')


  if (!publicKey) {
    throw new Error(
      'مفتاح الإشعارات العام غير موجود.'
    )
  }


  if (
    !/^[A-Za-z0-9_-]+$/.test(
      publicKey
    )
  ) {
    throw new Error(
      'صيغة VAPID_PUBLIC_KEY غير صحيحة في Vercel.'
    )
  }


  if (
    publicKey.length !== 87
  ) {
    throw new Error(
      `مفتاح VAPID العام طوله ${publicKey.length} حرفًا، والمفترض 87 حرفًا.`
    )
  }


  return publicKey
}


/* =====================================
   GET PUBLIC KEY
===================================== */

async function getPublicKey() {
  const response =
    await fetch(
      '/api/push?action=public-key',
      {
        method: 'GET',

        credentials:
          'include',

        cache:
          'no-store'
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


  return normalizePublicKey(
    data.publicKey
  )
}


/* =====================================
   PLATFORM
===================================== */

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


/* =====================================
   STATUS
===================================== */

export async function getPushStatus() {
  if (!pushIsSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false
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


  return {
    supported: true,

    permission:
      Notification.permission,

    subscribed:
      Boolean(subscription)
  }
}


/* =====================================
   ENABLE PUSH
===================================== */

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


  /*
    نحصل على مفتاح VAPID
    ونتأكد من صحته قبل طلب الاشتراك.
  */
  const publicKey =
    await getPublicKey()


  let permission =
    Notification.permission


  if (
    permission ===
    'default'
  ) {
    permission =
      await Notification
        .requestPermission()
  }


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


  /*
    نحذف أي اشتراك قديم،
    خصوصًا بعد تغيير مفاتيح VAPID.
  */
  if (subscription) {
    try {
      await subscription
        .unsubscribe()
    } catch (error) {
      console.warn(
        'Old push unsubscribe warning:',
        error
      )
    }
  }


  /*
    إنشاء اشتراك Push جديد.
  */
  try {
    subscription =
      await registration
        .pushManager
        .subscribe({
          userVisibleOnly: true,

          applicationServerKey:
            publicKey
        })
  } catch (error) {
    console.error(
      'Push subscribe error:',
      error
    )


    throw new Error(
      error?.message ||
        'تعذر إنشاء اشتراك الإشعارات على الجهاز.',
      {
        cause: error
      }
    )
  }


  /*
    إرسال الاشتراك للسيرفر
    حتى يتم حفظ الجهاز في Supabase.
  */
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


/* =====================================
   DISABLE PUSH
===================================== */

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


  /*
    نوقف الاشتراك في قاعدة البيانات أولًا.
  */
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


  /*
    ثم نلغي الاشتراك من الجهاز.
  */
  await subscription
    .unsubscribe()


  return {
    ok: true
  }
}


/* =====================================
   TEST PUSH
===================================== */

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