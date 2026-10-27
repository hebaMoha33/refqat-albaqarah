import process from 'node:process'
import webpush from 'web-push'

import {
  getAdmin
} from '../server/auth.js'


/* =====================================
   CONSTANTS
===================================== */

const STALE_AFTER_MINUTES =
  90


/* =====================================
   VAPID
===================================== */

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
      'VAPID environment variables are missing.'
    )
  }


  webpush.setVapidDetails(
    subject,
    publicKey,
    privateKey
  )
}


/* =====================================
   CHECK CRON SECRET
===================================== */

function isAuthorizedCronRequest(
  req
) {
  const expectedSecret =
    process.env.CRON_SECRET


  const receivedSecret =
    req.headers[
      'x-cron-secret'
    ]


  if (
    !expectedSecret ||
    !receivedSecret
  ) {
    return false
  }


  return (
    receivedSecret ===
    expectedSecret
  )
}


/* =====================================
   NOTIFICATION PAYLOAD
===================================== */

function createPayload(
  type,
  reminderDate
) {
  if (
    type === 'morning'
  ) {
    return {
      title:
        'رفقة البقرة',

      body:
        'أذكار الصباح بانتظارك 🤍',

      tag:
        `adhkar-morning-${reminderDate}`,

      url:
        '/'
    }
  }


  return {
    title:
      'رفقة البقرة',

    body:
      'أذكار المساء بانتظارك 🤍',

    tag:
      `adhkar-evening-${reminderDate}`,

    url:
      '/'
  }
}


/* =====================================
   DISABLE DEAD SUBSCRIPTION
===================================== */

async function disableSubscription(
  admin,
  id
) {
  try {
    await admin
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
        id
      )

  } catch (error) {
    console.warn(
      'Could not disable subscription:',
      error
    )
  }
}


/* =====================================
   GET USER SUBSCRIPTIONS
===================================== */

async function getUserSubscriptions(
  admin,
  userId
) {
  const {
    data,
    error
  } =
    await admin
      .from(
        'push_subscriptions'
      )
      .select(`
        id,
        endpoint,
        p256dh,
        auth_key
      `)
      .eq(
        'user_id',
        userId
      )
      .eq(
        'is_active',
        true
      )


  if (error) {
    throw error
  }


  return data || []
}


/* =====================================
   SEND TO USER
===================================== */

async function sendToUser({
  admin,
  userId,
  payload
}) {
  const subscriptions =
    await getUserSubscriptions(
      admin,
      userId
    )


  /*
    لا يوجد أي جهاز مشترك.
    نعتبر المحاولة منتهية حتى
    لا يعيد Cron المحاولة كل دقيقة.
  */

  if (
    subscriptions.length ===
    0
  ) {
    return {
      subscriptionCount:
        0,

      sent:
        0,

      permanentFailures:
        0,

      temporaryFailures:
        0,

      completed:
        true
    }
  }


  let sent =
    0

  let permanentFailures =
    0

  let temporaryFailures =
    0


  for (
    const subscriptionRow
    of subscriptions
  ) {
    const subscription = {
      endpoint:
        subscriptionRow.endpoint,

      keys: {
        p256dh:
          subscriptionRow.p256dh,

        auth:
          subscriptionRow.auth_key
      }
    }


    try {
      await webpush
        .sendNotification(
          subscription,

          JSON.stringify(
            payload
          )
        )


      sent +=
        1

    } catch (error) {
      const statusCode =
        Number(
          error?.statusCode ||
          error?.statusCodeCode ||
          0
        )


      /*
        404 / 410 =
        الاشتراك لم يعد صالحًا.
      */

      if (
        statusCode === 404 ||
        statusCode === 410
      ) {
        permanentFailures +=
          1


        await disableSubscription(
          admin,
          subscriptionRow.id
        )


        continue
      }


      temporaryFailures +=
        1


      console.error(
        'Push send failed:',
        {
          subscriptionId:
            subscriptionRow.id,

          statusCode,

          message:
            error?.message
        }
      )
    }
  }


  /*
    إذا وصل الإشعار لجهاز واحد على الأقل
    لا نريد إعادة إرساله كل دقيقة.

    وإذا كانت كل الاشتراكات ميتة
    نعتبر المهمة منتهية أيضًا.

    أما إذا حدث فقط خطأ مؤقت
    فنجعل Cron يعيد المحاولة.
  */

  const completed =
    sent > 0 ||
    permanentFailures ===
      subscriptions.length


  return {
    subscriptionCount:
      subscriptions.length,

    sent,

    permanentFailures,

    temporaryFailures,

    completed
  }
}


/* =====================================
   CLAIM SCHEDULE
===================================== */

async function claimReminder({
  admin,
  row,
  type
}) {
  const sentColumn =
    type === 'morning'
      ? 'morning_sent'
      : 'evening_sent'


  const {
    data,
    error
  } =
    await admin
      .from(
        'adhkar_reminder_schedule'
      )
      .update({
        [sentColumn]:
          true,

        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        'id',
        row.id
      )
      .eq(
        sentColumn,
        false
      )
      .select(
        'id'
      )
      .maybeSingle()


  if (error) {
    throw error
  }


  /*
    null يعني Cron آخر
    سبق وأخذ هذه المهمة.
  */

  return Boolean(
    data?.id
  )
}


/* =====================================
   RELEASE FOR RETRY
===================================== */

async function releaseReminder({
  admin,
  row,
  type
}) {
  const sentColumn =
    type === 'morning'
      ? 'morning_sent'
      : 'evening_sent'


  await admin
    .from(
      'adhkar_reminder_schedule'
    )
    .update({
      [sentColumn]:
        false,

      updated_at:
        new Date()
          .toISOString()
    })
    .eq(
      'id',
      row.id
    )
}


/* =====================================
   PROCESS ONE REMINDER
===================================== */

async function processReminder({
  admin,
  row,
  type,
  now
}) {
  const scheduledValue =
    type === 'morning'
      ? row.morning_at
      : row.evening_at


  if (!scheduledValue) {
    return {
      status:
        'missing-time'
    }
  }


  const scheduledAt =
    new Date(
      scheduledValue
    )


  if (
    Number.isNaN(
      scheduledAt.getTime()
    )
  ) {
    return {
      status:
        'invalid-time'
    }
  }


  /*
    لو بقي تذكير قديم جدًا بسبب
    توقف Cron أو مشكلة سابقة،
    لا نريد إرسال أذكار الصباح
    مثلًا بعد ساعات طويلة.
  */

  const ageMinutes =
    (
      now.getTime() -
      scheduledAt.getTime()
    ) /
    60000


  const claimed =
    await claimReminder({
      admin,
      row,
      type
    })


  if (!claimed) {
    return {
      status:
        'already-claimed'
    }
  }


  /*
    نغلق التذكير القديم بدون إرساله.
  */

  if (
    ageMinutes >
    STALE_AFTER_MINUTES
  ) {
    return {
      status:
        'stale-skipped'
    }
  }


  const payload =
    createPayload(
      type,
      row.reminder_date
    )


  const result =
    await sendToUser({
      admin,

      userId:
        row.user_id,

      payload
    })


  /*
    خطأ مؤقت فقط:
    نعيد sent إلى false لكي
    يجرب Cron مرة أخرى.
  */

  if (
    !result.completed
  ) {
    await releaseReminder({
      admin,
      row,
      type
    })


    return {
      status:
        'retry',

      ...result
    }
  }


  return {
    status:
      'sent',

    ...result
  }
}


/* =====================================
   LOAD DUE ROWS
===================================== */

async function loadDueRows({
  admin,
  type,
  nowIso
}) {
  const timeColumn =
    type === 'morning'
      ? 'morning_at'
      : 'evening_at'


  const sentColumn =
    type === 'morning'
      ? 'morning_sent'
      : 'evening_sent'


  const {
    data,
    error
  } =
    await admin
      .from(
        'adhkar_reminder_schedule'
      )
      .select(`
        id,
        user_id,
        reminder_date,
        morning_at,
        evening_at,
        morning_sent,
        evening_sent
      `)
      .eq(
        sentColumn,
        false
      )
      .not(
        timeColumn,
        'is',
        null
      )
      .lte(
        timeColumn,
        nowIso
      )
      .order(
        timeColumn,
        {
          ascending:
            true
        }
      )
      .limit(
        100
      )


  if (error) {
    throw error
  }


  return data || []
}


/* =====================================
   API
===================================== */

export default async function handler(
  req,
  res
) {
  if (
    req.method !== 'POST'
  ) {
    res.setHeader(
      'Allow',
      'POST'
    )


    return res
      .status(405)
      .json({
        ok:
          false,

        error:
          'Method not allowed.'
      })
  }


  /* =================================
     SECURITY
  ================================= */

  if (
    !isAuthorizedCronRequest(
      req
    )
  ) {
    return res
      .status(401)
      .json({
        ok:
          false,

        error:
          'Unauthorized cron request.'
      })
  }


  try {
    configureWebPush()


    const admin =
      getAdmin()


    const now =
      new Date()


    const nowIso =
      now.toISOString()


    /* =================================
       FIND DUE REMINDERS
    ================================= */

    const [
      morningRows,
      eveningRows
    ] =
      await Promise.all([
        loadDueRows({
          admin,

          type:
            'morning',

          nowIso
        }),

        loadDueRows({
          admin,

          type:
            'evening',

          nowIso
        })
      ])


    const results =
      []


    /* =================================
       MORNING
    ================================= */

    for (
      const row
      of morningRows
    ) {
      try {
        const result =
          await processReminder({
            admin,
            row,

            type:
              'morning',

            now
          })


        results.push({
          id:
            row.id,

          type:
            'morning',

          ...result
        })

      } catch (error) {
        console.error(
          'Morning reminder error:',
          row.id,
          error
        )


        results.push({
          id:
            row.id,

          type:
            'morning',

          status:
            'error',

          error:
            error?.message ||
            'Unknown error'
        })
      }
    }


    /* =================================
       EVENING
    ================================= */

    for (
      const row
      of eveningRows
    ) {
      try {
        const result =
          await processReminder({
            admin,
            row,

            type:
              'evening',

            now
          })


        results.push({
          id:
            row.id,

          type:
            'evening',

          ...result
        })

      } catch (error) {
        console.error(
          'Evening reminder error:',
          row.id,
          error
        )


        results.push({
          id:
            row.id,

          type:
            'evening',

          status:
            'error',

          error:
            error?.message ||
            'Unknown error'
        })
      }
    }


    return res
      .status(200)
      .json({
        ok:
          true,

        checkedAt:
          nowIso,

        due: {
          morning:
            morningRows.length,

          evening:
            eveningRows.length
        },

        results
      })

  } catch (error) {
    console.error(
      'Due reminder API error:',
      error
    )


    return res
      .status(500)
      .json({
        ok:
          false,

        error:
          error?.message ||
          'Reminder processing failed.'
      })
  }
}