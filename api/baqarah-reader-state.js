import {
  getAdmin,
  getCurrentUser,
  readBody
} from '../server/auth.js'


function getRiyadhDateKey() {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Asia/Riyadh',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit'
      }
    ).formatToParts(
      new Date()
    )


  const map =
    Object.fromEntries(
      parts.map(
        part => [
          part.type,
          part.value
        ]
      )
    )


  return (
    `${map.year}-${map.month}-${map.day}`
  )
}


function clampAyah(
  value
) {
  const number =
    Math.round(
      Number(value || 0)
    )

  return Math.min(
    286,
    Math.max(
      0,
      number
    )
  )
}


function percentageFromAyah(
  ayah
) {
  if (ayah <= 0) {
    return 0
  }

  if (ayah >= 286) {
    return 100
  }

  return Math.round(
    (
      ayah /
      286
    ) * 100
  )
}


async function ensureState(
  supabase,
  userId
) {
  const {
    data: existing,
    error
  } =
    await supabase
      .from(
        'baqarah_reading_state'
      )
      .select('*')
      .eq(
        'user_id',
        userId
      )
      .maybeSingle()


  if (error) {
    throw error
  }


  if (existing) {
    return existing
  }


  const {
    data: created,
    error: createError
  } =
    await supabase
      .from(
        'baqarah_reading_state'
      )
      .insert({
        user_id:
          userId,

        current_cycle:
          1,

        last_ayah_number:
          0,

        reader_percentage:
          0
      })
      .select('*')
      .single()


  if (createError) {
    throw createError
  }


  return created
}


async function upsertDailySnapshot(
  supabase,
  userId,
  dateKey,
  ayah,
  percentage
) {
  const {
    data: existing,
    error: existingError
  } =
    await supabase
      .from(
        'baqarah_daily_progress'
      )
      .select(`
        reader_percentage,
        last_ayah_number
      `)
      .eq(
        'user_id',
        userId
      )
      .eq(
        'progress_date',
        dateKey
      )
      .maybeSingle()


  if (existingError) {
    throw existingError
  }


  /*
    اليوم لا ينخفض:
    إذا وصل 100% ثم بدأ ختمة جديدة
    يبقى إنجاز ذلك اليوم 100%.
  */
  const dailyPercentage =
    Math.max(
      Number(
        existing
          ?.reader_percentage ||
        0
      ),
      percentage
    )


  const dailyAyah =
    dailyPercentage >= 100
      ? 286
      : Math.max(
          Number(
            existing
              ?.last_ayah_number ||
            0
          ),
          ayah
        )


  const {
    error: saveError
  } =
    await supabase
      .from(
        'baqarah_daily_progress'
      )
      .upsert(
        {
          user_id:
            userId,

          progress_date:
            dateKey,

          reader_percentage:
            dailyPercentage,

          last_ayah_number:
            dailyAyah,

          last_source:
            'reader',

          updated_at:
            new Date()
              .toISOString()
        },
        {
          onConflict:
            'user_id,progress_date'
        }
      )


  if (saveError) {
    throw saveError
  }
}


async function getCompletionCounts(
  supabase,
  userId,
  today
) {
  const year =
    Number(
      today.slice(0, 4)
    )

  const month =
    Number(
      today.slice(5, 7)
    )

  const day =
    Number(
      today.slice(8, 10)
    )

  const todayDate =
    new Date(
      year,
      month - 1,
      day
    )

  const weekStartDate =
    new Date(
      todayDate
    )

  weekStartDate.setDate(
    weekStartDate.getDate() -
    6
  )

  const weekStart =
    [
      weekStartDate
        .getFullYear(),

      String(
        weekStartDate
          .getMonth() + 1
      ).padStart(2, '0'),

      String(
        weekStartDate
          .getDate()
      ).padStart(2, '0')
    ].join('-')


  const {
    data: rows,
    error
  } =
    await supabase
      .from(
        'baqarah_reading_completions'
      )
      .select(`
        completion_date
      `)
      .eq(
        'user_id',
        userId
      )


  if (error) {
    throw error
  }


  const all =
    rows || []


  return {
    today:
      all.filter(
        row =>
          row.completion_date ===
          today
      ).length,

    week:
      all.filter(
        row =>
          row.completion_date >=
            weekStart &&
          row.completion_date <=
            today
      ).length,

    month:
      all.filter(
        row =>
          row.completion_date
            .startsWith(
              today.slice(0, 7)
            )
      ).length,

    year:
      all.filter(
        row =>
          row.completion_date
            .startsWith(
              today.slice(0, 4)
            )
      ).length,

    all:
      all.length
  }
}


export default async function handler(
  req,
  res
) {
  res.setHeader(
    'Cache-Control',
    'no-store'
  )


  try {
    const current =
      await getCurrentUser(req)


    if (!current?.user?.id) {
      return res
        .status(401)
        .json({
          message:
            'يجب تسجيل الدخول أولًا.'
        })
    }


    const userId =
      current.user.id

    const supabase =
      getAdmin()

    const today =
      getRiyadhDateKey()


    if (
      req.method === 'GET'
    ) {
      const state =
        await ensureState(
          supabase,
          userId
        )


      const counts =
        await getCompletionCounts(
          supabase,
          userId,
          today
        )


      const {
        data: todayRow,
        error: todayError
      } =
        await supabase
          .from(
            'baqarah_daily_progress'
          )
          .select(`
            reader_percentage,
            last_ayah_number,
            percentage,
            star_level,
            completed
          `)
          .eq(
            'user_id',
            userId
          )
          .eq(
            'progress_date',
            today
          )
          .maybeSingle()


      if (todayError) {
        throw todayError
      }


      return res
        .status(200)
        .json({
          state,

          todayProgress:
            todayRow || null,

          completions:
            counts
        })
    }


    if (
      req.method === 'POST'
    ) {
      const body =
        await readBody(req)


      const state =
        await ensureState(
          supabase,
          userId
        )


      if (
        body?.action ===
        'new_cycle'
      ) {
        if (
          Number(
            state.reader_percentage ||
            0
          ) < 100
        ) {
          return res
            .status(400)
            .json({
              message:
                'لا يمكن بدء ختمة جديدة قبل إكمال الحالية.'
            })
        }


        const {
          data: resetState,
          error: resetError
        } =
          await supabase
            .from(
              'baqarah_reading_state'
            )
            .update({
              current_cycle:
                Number(
                  state.current_cycle ||
                  1
                ) + 1,

              last_ayah_number:
                0,

              reader_percentage:
                0,

              started_at:
                new Date()
                  .toISOString(),

              updated_at:
                new Date()
                  .toISOString()
            })
            .eq(
              'user_id',
              userId
            )
            .select('*')
            .single()


        if (resetError) {
          throw resetError
        }


        const counts =
          await getCompletionCounts(
            supabase,
            userId,
            today
          )


        return res
          .status(200)
          .json({
            ok: true,

            state:
              resetState,

            completions:
              counts
          })
      }


      const ayah =
        clampAyah(
          body
            ?.last_ayah_number
        )


      /*
        لا نرجّع الموضع للخلف.
        إذا تحرك المستخدم لأعلى فقط للمراجعة
        يبقى آخر موضع إنجاز محفوظ كما هو.
      */
      const bestAyah =
        Math.max(
          Number(
            state
              .last_ayah_number ||
            0
          ),
          ayah
        )


      const percentage =
        percentageFromAyah(
          bestAyah
        )


      const {
        data: savedState,
        error: stateError
      } =
        await supabase
          .from(
            'baqarah_reading_state'
          )
          .update({
            last_ayah_number:
              bestAyah,

            reader_percentage:
              percentage,

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            'user_id',
            userId
          )
          .select('*')
          .single()


      if (stateError) {
        throw stateError
      }


      await upsertDailySnapshot(
        supabase,
        userId,
        today,
        bestAyah,
        percentage
      )


      if (
        bestAyah >= 286
      ) {
        const {
          error: completionError
        } =
          await supabase
            .from(
              'baqarah_reading_completions'
            )
            .upsert(
              {
                user_id:
                  userId,

                cycle_number:
                  Number(
                    state.current_cycle ||
                    1
                  ),

                completion_date:
                  today,

                completed_at:
                  new Date()
                    .toISOString()
              },
              {
                onConflict:
                  'user_id,cycle_number',

                ignoreDuplicates:
                  true
              }
            )


        if (completionError) {
          throw completionError
        }
      }


      const counts =
        await getCompletionCounts(
          supabase,
          userId,
          today
        )


      return res
        .status(200)
        .json({
          ok: true,

          state:
            savedState,

          completions:
            counts
        })
    }


    return res
      .status(405)
      .json({
        message:
          'طريقة الطلب غير مسموحة.'
      })

  } catch (error) {

    console.error(
      'BAQARAH READER STATE ERROR:',
      error
    )


    return res
      .status(500)
      .json({
        message:
          error?.message ||
          'تعذر حفظ موضع القراءة.'
      })
  }
}
