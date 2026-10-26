import webpush from 'web-push'
import process from 'node:process'
import {
  getAdmin,
  getCurrentUser
} from '../server/auth.js'


function configureWebPush() {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY

  const privateKey =
    process.env.VAPID_PRIVATE_KEY

  const subject =
    process.env.VAPID_SUBJECT


  if (
    !publicKey ||
    !privateKey ||
    !subject
  ) {
    throw new Error(
      'VAPID environment variables are missing'
    )
  }


  webpush.setVapidDetails(
    subject,
    publicKey,
    privateKey
  )


  return {
    publicKey
  }
}


function getAction(req) {
  try {
    const url =
      new URL(
        req.url,
        'http://localhost'
      )

    return url.searchParams.get(
      'action'
    )
  } catch {
    return null
  }
}


function getBody(req) {
  if (!req.body) {
    return {}
  }


  if (
    typeof req.body ===
    'object'
  ) {
    return req.body
  }


  try {
    return JSON.parse(
      req.body
    )
  } catch {
    return {}
  }
}


function sendJson(
  res,
  status,
  data
) {
  return res
    .status(status)
    .json(data)
}


export default async function handler(
  req,
  res
) {
  try {
    const action =
      getAction(req)


    /* ===============================
       PUBLIC VAPID KEY
    ================================ */

    if (
      req.method === 'GET' &&
      action === 'public-key'
    ) {
      const {
        publicKey
      } = configureWebPush()


      return sendJson(
        res,
        200,
        {
          ok: true,
          publicKey
        }
      )
    }


    /* ===============================
       CURRENT USER
    ================================ */

    const user =
      await getCurrentUser(req)


    if (!user?.id) {
      return sendJson(
        res,
        401,
        {
          ok: false,
          error:
            'يجب تسجيل الدخول أولًا.'
        }
      )
    }


    const supabase =
      getAdmin()


    /* ===============================
       SUBSCRIBE
    ================================ */

    if (
      req.method === 'POST' &&
      action === 'subscribe'
    ) {
      const body =
        getBody(req)


      const subscription =
        body.subscription ||
        body


      const endpoint =
        subscription?.endpoint


      const p256dh =
        subscription?.keys?.p256dh


      const authKey =
        subscription?.keys?.auth


      if (
        !endpoint ||
        !p256dh ||
        !authKey
      ) {
        return sendJson(
          res,
          400,
          {
            ok: false,
            error:
              'بيانات الاشتراك غير مكتملة.'
          }
        )
      }


      const now =
        new Date()
          .toISOString()


      const {
        error
      } =
        await supabase
          .from(
            'push_subscriptions'
          )
          .upsert(
            {
              user_id:
                user.id,

              endpoint,

              p256dh,

              auth_key:
                authKey,

              platform:
                body.platform ||
                null,

              user_agent:
                req.headers[
                  'user-agent'
                ] ||
                null,

              is_active:
                true,

              updated_at:
                now,

              last_seen_at:
                now
            },
            {
              onConflict:
                'endpoint'
            }
          )


      if (error) {
        console.error(
          'Push subscribe error:',
          error
        )


        return sendJson(
          res,
          500,
          {
            ok: false,
            error:
              'تعذر حفظ اشتراك الإشعارات.'
          }
        )
      }


      return sendJson(
        res,
        200,
        {
          ok: true
        }
      )
    }


    /* ===============================
       UNSUBSCRIBE
    ================================ */

    if (
      req.method === 'POST' &&
      action === 'unsubscribe'
    ) {
      const body =
        getBody(req)


      const endpoint =
        body.endpoint


      if (!endpoint) {
        return sendJson(
          res,
          400,
          {
            ok: false,
            error:
              'Endpoint غير موجود.'
          }
        )
      }


      const {
        error
      } =
        await supabase
          .from(
            'push_subscriptions'
          )
          .update({
            is_active:
              false,

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'endpoint',
            endpoint
          )


      if (error) {
        console.error(
          'Push unsubscribe error:',
          error
        )


        return sendJson(
          res,
          500,
          {
            ok: false,
            error:
              'تعذر إيقاف الإشعارات.'
          }
        )
      }


      return sendJson(
        res,
        200,
        {
          ok: true
        }
      )
    }


    /* ===============================
       TEST PUSH
    ================================ */

    if (
      req.method === 'POST' &&
      action === 'test'
    ) {
      configureWebPush()


      const {
        data,
        error
      } =
        await supabase
          .from(
            'push_subscriptions'
          )
          .select(
            'id, endpoint, p256dh, auth_key'
          )
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'is_active',
            true
          )


      if (error) {
        console.error(
          'Push subscriptions fetch error:',
          error
        )


        return sendJson(
          res,
          500,
          {
            ok: false,
            error:
              'تعذر قراءة أجهزة الإشعارات.'
          }
        )
      }


      if (
        !data ||
        data.length === 0
      ) {
        return sendJson(
          res,
          400,
          {
            ok: false,
            error:
              'لا يوجد جهاز مسجل للإشعارات.'
          }
        )
      }


      const payload =
        JSON.stringify({
          title:
            'رفقة البقرة 🌿',

          body:
            'تم تفعيل الإشعارات بنجاح 🤍',

          tag:
            `refqat-test-${Date.now()}`,

          url:
            '/'
        })


      let sent = 0
      let failed = 0


      for (
        const item
        of data
      ) {
        const subscription = {
          endpoint:
            item.endpoint,

          keys: {
            p256dh:
              item.p256dh,

            auth:
              item.auth_key
          }
        }


        try {
          await webpush
            .sendNotification(
              subscription,
              payload
            )

          sent += 1
        } catch (pushError) {
          failed += 1


          console.error(
            'Push send error:',
            pushError
          )


          if (
            pushError?.statusCode === 404 ||
            pushError?.statusCode === 410
          ) {
            await supabase
              .from(
                'push_subscriptions'
              )
              .update({
                is_active:
                  false,

                updated_at:
                  new Date()
                    .toISOString()
              })
              .eq(
                'id',
                item.id
              )
          }
        }
      }


      return sendJson(
        res,
        200,
        {
          ok:
            sent > 0,

          sent,

          failed
        }
      )
    }


    return sendJson(
      res,
      404,
      {
        ok: false,
        error:
          'Push action غير معروف.'
      }
    )

  } catch (error) {
    console.error(
      'Push API error:',
      error
    )


    return sendJson(
      res,
      500,
      {
        ok: false,
        error:
          'حدث خطأ في خدمة الإشعارات.'
      }
    )
  }
}