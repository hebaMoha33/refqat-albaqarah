import {
  getAdmin,
  getCurrentUser,
  readBody
} from '../server/auth.js'


function validDate(
  value
) {

  return /^\d{4}-\d{2}-\d{2}$/
    .test(
      value || ''
    )

}


function percentage(
  value
) {

  const number =
    Number(value)


  if (
    Number.isNaN(number)
  ) {
    return 0
  }


  return Math.max(
    0,
    Math.min(
      100,
      Math.round(number)
    )
  )

}


export default async function handler(
  req,
  res
) {

  try {

    const current =
      await getCurrentUser(
        req
      )


    if (!current) {

      return res
        .status(401)
        .json({
          message:
            'غير مسجل الدخول.'
        })

    }


    const userId =
      current.user.id


    const supabase =
      getAdmin()


    /* =====================================
       GET
    ===================================== */

    if (
      req.method === 'GET'
    ) {

      const date =
        req.query.date


      if (
        !validDate(date)
      ) {

        return res
          .status(400)
          .json({
            message:
              'التاريخ غير صحيح.'
          })

      }


      const {
        data: todayRow
      } =
        await supabase
          .from(
            'adhkar_daily_progress'
          )
          .select('*')
          .eq(
            'user_id',
            userId
          )
          .eq(
            'progress_date',
            date
          )
          .maybeSingle()


      const {
        data: history
      } =
        await supabase
          .from(
            'adhkar_daily_progress'
          )
          .select(`
            progress_date,
            morning_percentage,
            evening_percentage,
            morning_completed,
            evening_completed,
            day_completed
          `)
          .eq(
            'user_id',
            userId
          )
          .order(
            'progress_date',
            {
              ascending: false
            }
          )
          .limit(120)


      return res
        .status(200)
        .json({

          today:
            todayRow || null,

          history:
            history || []

        })

    }


    /* =====================================
       POST
    ===================================== */

    if (
      req.method === 'POST'
    ) {

      const body =
        readBody(req)


      const date =
        body.progress_date


      if (
        !validDate(date)
      ) {

        return res
          .status(400)
          .json({
            message:
              'التاريخ غير صحيح.'
          })

      }


      const morningPercentage =
        percentage(
          body.morning_percentage
        )


      const eveningPercentage =
        percentage(
          body.evening_percentage
        )


      const {
        error
      } =
        await supabase
          .from(
            'adhkar_daily_progress'
          )
          .upsert(
            {

              user_id:
                userId,

              progress_date:
                date,

              morning_progress:
                body.morning_progress ||
                {},

              evening_progress:
                body.evening_progress ||
                {},

              morning_percentage:
                morningPercentage,

              evening_percentage:
                eveningPercentage,

              morning_completed:
                morningPercentage ===
                100,

              evening_completed:
                eveningPercentage ===
                100,

              updated_at:
                new Date()
                  .toISOString()

            },
            {
              onConflict:
                'user_id,progress_date'
            }
          )


      if (error) {

        console.error(error)


        return res
          .status(500)
          .json({
            message:
              'تعذر حفظ التقدم.'
          })

      }


      return res
        .status(200)
        .json({
          ok: true
        })

    }


    return res
      .status(405)
      .json({
        message:
          'Method not allowed'
      })


  } catch (error) {

    console.error(
      'PROGRESS:',
      error
    )


    return res
      .status(500)
      .json({
        message:
          'حدث خطأ.'
      })

  }

}