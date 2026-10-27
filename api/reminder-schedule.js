import {
  getAdmin,
  getCurrentUser
} from '../server/auth.js'


function isValidDayKey(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  )
}


function normalizeDateTime(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const parsed =
    new Date(value)

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return undefined
  }

  return parsed.toISOString()
}


export default async function handler(
  req,
  res
) {
  try {
    /* =====================================
       AUTH
    ===================================== */

    const auth =
      await getCurrentUser(req)


    const user =
      auth?.user


    if (!user?.id) {
      return res
        .status(401)
        .json({
          ok: false,

          error:
            'يجب تسجيل الدخول أولًا.'
        })
    }


    const admin =
      getAdmin()


    /* =====================================
       POST
       SAVE / UPDATE TODAY SCHEDULE
    ===================================== */

    if (
      req.method === 'POST'
    ) {
      const {
        reminderDate,
        morningAt,
        eveningAt
      } =
        req.body || {}


      if (
        !isValidDayKey(
          reminderDate
        )
      ) {
        return res
          .status(400)
          .json({
            ok: false,

            error:
              'تاريخ التذكير غير صحيح.'
          })
      }


      const normalizedMorning =
        normalizeDateTime(
          morningAt
        )


      const normalizedEvening =
        normalizeDateTime(
          eveningAt
        )


      if (
        normalizedMorning ===
        undefined
      ) {
        return res
          .status(400)
          .json({
            ok: false,

            error:
              'موعد أذكار الصباح غير صحيح.'
          })
      }


      if (
        normalizedEvening ===
        undefined
      ) {
        return res
          .status(400)
          .json({
            ok: false,

            error:
              'موعد أذكار المساء غير صحيح.'
          })
      }


      /* =================================
         READ EXISTING ROW

         مهم حتى لا نعيد morning_sent
         إلى false كل مرة تفتحين التطبيق.
      ================================= */

      const {
        data: existing,
        error: existingError
      } =
        await admin
          .from(
            'adhkar_reminder_schedule'
          )
          .select(`
            id,
            morning_at,
            evening_at,
            morning_sent,
            evening_sent
          `)
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'reminder_date',
            reminderDate
          )
          .maybeSingle()


      if (existingError) {
        console.error(
          'Reminder schedule read error:',
          existingError
        )

        return res
          .status(500)
          .json({
            ok: false,

            error:
              'تعذر قراءة جدول التذكيرات.'
          })
      }


      /* =================================
         KEEP SENT STATE

         إذا الموعد نفسه:
         نحافظ على sent = true.

         إذا تغير الموعد:
         نسمح بإرسال الموعد الجديد.
      ================================= */

      let morningSent =
        false

      let eveningSent =
        false


      if (existing) {
        const oldMorning =
          existing.morning_at
            ? new Date(
                existing.morning_at
              ).toISOString()
            : null


        const oldEvening =
          existing.evening_at
            ? new Date(
                existing.evening_at
              ).toISOString()
            : null


        morningSent =
          oldMorning ===
          normalizedMorning
            ? Boolean(
                existing.morning_sent
              )
            : false


        eveningSent =
          oldEvening ===
          normalizedEvening
            ? Boolean(
                existing.evening_sent
              )
            : false
      }


      /* =================================
         UPSERT
      ================================= */

      const {
        data,
        error
      } =
        await admin
          .from(
            'adhkar_reminder_schedule'
          )
          .upsert(
            {
              user_id:
                user.id,

              reminder_date:
                reminderDate,

              morning_at:
                normalizedMorning,

              evening_at:
                normalizedEvening,

              morning_sent:
                morningSent,

              evening_sent:
                eveningSent,

              updated_at:
                new Date()
                  .toISOString()
            },
            {
              onConflict:
                'user_id,reminder_date'
            }
          )
          .select(`
            id,
            reminder_date,
            morning_at,
            evening_at,
            morning_sent,
            evening_sent
          `)
          .single()


      if (error) {
        console.error(
          'Reminder schedule save error:',
          error
        )

        return res
          .status(500)
          .json({
            ok: false,

            error:
              'تعذر حفظ مواعيد التذكير.'
          })
      }


      return res
        .status(200)
        .json({
          ok: true,

          schedule:
            data
        })
    }


    /* =====================================
       GET
       USEFUL FOR CHECKING TODAY
    ===================================== */

    if (
      req.method === 'GET'
    ) {
      const reminderDate =
        req.query?.date


      if (
        !isValidDayKey(
          reminderDate
        )
      ) {
        return res
          .status(400)
          .json({
            ok: false,

            error:
              'أرسلي التاريخ بصيغة YYYY-MM-DD.'
          })
      }


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
            reminder_date,
            morning_at,
            evening_at,
            morning_sent,
            evening_sent
          `)
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'reminder_date',
            reminderDate
          )
          .maybeSingle()


      if (error) {
        console.error(
          'Reminder schedule get error:',
          error
        )

        return res
          .status(500)
          .json({
            ok: false,

            error:
              'تعذر قراءة موعد التذكير.'
          })
      }


      return res
        .status(200)
        .json({
          ok: true,

          schedule:
            data || null
        })
    }


    /* =====================================
       METHOD NOT ALLOWED
    ===================================== */

    res.setHeader(
      'Allow',
      'GET, POST'
    )


    return res
      .status(405)
      .json({
        ok: false,

        error:
          'طريقة الطلب غير مدعومة.'
      })

  } catch (error) {
    console.error(
      'Reminder schedule API error:',
      error
    )


    return res
      .status(500)
      .json({
        ok: false,

        error:
          'حدث خطأ أثناء حفظ التذكير.'
      })
  }
}