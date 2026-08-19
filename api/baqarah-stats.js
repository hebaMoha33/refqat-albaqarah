import {
  getAdmin,
  getCurrentUser
} from '../server/auth.js'


const MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر'
]


/* =========================================
   DATE HELPERS
========================================= */

function dateKey(
  date
) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, '0'),
    String(
      date.getDate()
    ).padStart(2, '0')
  ].join('-')
}


function getRiyadhNow() {
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          'Asia/Riyadh',

        year:
          'numeric',

        month:
          'numeric',

        day:
          'numeric'
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


  return new Date(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day)
  )
}


function addDays(
  key,
  amount
) {
  const [
    year,
    month,
    day
  ] =
    key
      .split('-')
      .map(Number)


  const date =
    new Date(
      year,
      month - 1,
      day
    )


  date.setDate(
    date.getDate() +
    amount
  )


  return dateKey(date)
}


/* =========================================
   STREAK
========================================= */

function calculateStreak(
  rows,
  today
) {

  const completedDates =
    new Set(
      rows
        .filter(
          row =>
            row.completed
        )
        .map(
          row =>
            row.progress_date
        )
    )


  let cursor =
    completedDates.has(today)
      ? today
      : addDays(
          today,
          -1
        )


  let streak = 0


  while (
    completedDates.has(
      cursor
    )
  ) {

    streak += 1

    cursor =
      addDays(
        cursor,
        -1
      )
  }


  return streak
}


/* =========================================
   HANDLER
========================================= */

export default async function handler(
  req,
  res
) {

  res.setHeader(
    'Cache-Control',
    'no-store'
  )


  if (
    req.method !== 'GET'
  ) {

    return res
      .status(405)
      .json({
        message:
          'طريقة الطلب غير مسموحة.'
      })
  }


  try {

    const current =
      await getCurrentUser(
        req
      )


    if (!current?.user?.id) {

      return res
        .status(401)
        .json({
          message:
            'يجب تسجيل الدخول.'
        })
    }


    const userId =
      current.user.id


    const supabase =
      getAdmin()


    const now =
      getRiyadhNow()


    const selectedYear =
      Number(
        req.query?.year ||
        now.getFullYear()
      )


    const selectedMonth =
      Number(
        req.query?.month ||
        (
          now.getMonth() + 1
        )
      )


    /* =====================================
       ALL USER HISTORY
    ===================================== */

    const {
      data: rows,
      error
    } =
      await supabase
        .from(
          'baqarah_daily_progress'
        )
        .select(`
          progress_date,

          reader_percentage,
          paper_percentage,
          audio_percentage,

          percentage,
          star_level,
          completed,

          last_source,
          completed_at
        `)
        .eq(
          'user_id',
          userId
        )
        .order(
          'progress_date',
          {
            ascending:
              true
          }
        )


    if (error) {
      throw error
    }


    const allRows =
      rows || []


    const today =
      dateKey(now)


    /* =====================================
       MONTH DAYS
    ===================================== */

    const monthPrefix =
      `${selectedYear}-${String(
        selectedMonth
      ).padStart(2, '0')}-`


    const monthDays =
      allRows.filter(
        row =>
          row.progress_date
            .startsWith(
              monthPrefix
            )
      )


    /* =====================================
       MONTH SUMMARY
    ===================================== */

    const monthCompleted =
      monthDays.filter(
        row =>
          row.completed
      ).length


    const monthActive =
      monthDays.filter(
        row =>
          Number(
            row.percentage ||
            0
          ) > 0
      ).length


    const monthAverage =
      monthDays.length
        ? Math.round(
            monthDays.reduce(
              (
                total,
                row
              ) =>
                total +
                Number(
                  row.percentage ||
                  0
                ),
              0
            ) /
            monthDays.length
          )
        : 0


    /* =====================================
       YEAR MONTHS
    ===================================== */

    const yearMonths =
      MONTH_NAMES.map(
        (
          name,
          index
        ) => {

          const monthNumber =
            index + 1


          const prefix =
            `${selectedYear}-${String(
              monthNumber
            ).padStart(2, '0')}-`


          const monthRows =
            allRows.filter(
              row =>
                row.progress_date
                  .startsWith(
                    prefix
                  )
            )


          const completedDays =
            monthRows.filter(
              row =>
                row.completed
            ).length


          const activeDays =
            monthRows.filter(
              row =>
                Number(
                  row.percentage ||
                  0
                ) > 0
            ).length


          const average =
            monthRows.length
              ? Math.round(
                  monthRows.reduce(
                    (
                      total,
                      row
                    ) =>
                      total +
                      Number(
                        row.percentage ||
                        0
                      ),
                    0
                  ) /
                  monthRows.length
                )
              : 0


          return {

            month:
              monthNumber,

            name,

            completedDays,

            activeDays,

            averagePercentage:
              average

          }
        }
      )


    /* =====================================
       YEAR TOTAL
    ===================================== */

    const yearPrefix =
      `${selectedYear}-`


    const yearRows =
      allRows.filter(
        row =>
          row.progress_date
            .startsWith(
              yearPrefix
            )
      )


    const yearCompleted =
      yearRows.filter(
        row =>
          row.completed
      ).length


    /* =====================================
       ALL TIME
    ===================================== */

    const totalCompleted =
      allRows.filter(
        row =>
          row.completed
      ).length


    const currentStreak =
      calculateStreak(
        allRows,
        today
      )


    /* =====================================
       RESULT
    ===================================== */

    return res
      .status(200)
      .json({

        year:
          selectedYear,

        month:
          selectedMonth,

        monthSummary: {

          completedDays:
            monthCompleted,

          activeDays:
            monthActive,

          averagePercentage:
            monthAverage

        },

        yearSummary: {

          completedDays:
            yearCompleted

        },

        allTime: {

          completedDays:
            totalCompleted,

          currentStreak

        },

        days:
          monthDays,

        months:
          yearMonths

      })


  } catch (error) {

    console.error(
      'BAQARAH STATS ERROR:',
      error
    )


    return res
      .status(500)
      .json({
        message:
          error?.message ||
          'تعذر تحميل إحصائيات سورة البقرة.'
      })
  }
}