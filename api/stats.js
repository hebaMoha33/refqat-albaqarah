import {
  getAdmin,
  getCurrentUser
} from '../server/auth.js'


function dateKey(date) {

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


function addDays(
  date,
  amount
) {

  const result =
    new Date(date)

  result.setDate(
    result.getDate() +
    amount
  )

  return result
}


function startOfWeek(
  date
) {

  const result =
    new Date(date)

  const day =
    result.getDay()

  /*
    الأسبوع:
    السبت → الجمعة
  */

  const diff =
    day === 6
      ? 0
      : day + 1

  result.setDate(
    result.getDate() -
    diff
  )

  result.setHours(
    0,
    0,
    0,
    0
  )

  return result
}


function endOfWeek(
  date
) {

  const start =
    startOfWeek(date)

  return addDays(
    start,
    6
  )

}


function getRange(
  period,
  year,
  month
) {

  const now =
    new Date()


  if (
    period === 'week'
  ) {

    return {
      from:
        dateKey(
          startOfWeek(now)
        ),

      to:
        dateKey(
          endOfWeek(now)
        )
    }

  }


  if (
    period === 'year'
  ) {

    const selectedYear =
      Number(year) ||
      now.getFullYear()


    return {

      from:
        `${selectedYear}-01-01`,

      to:
        `${selectedYear}-12-31`

    }

  }


  if (
    period === 'all'
  ) {

    return {
      from: null,
      to: null
    }

  }


  const selectedYear =
    Number(year) ||
    now.getFullYear()


  const selectedMonth =
    Number(month) ||
    now.getMonth() + 1


  const firstDay =
    new Date(
      selectedYear,
      selectedMonth - 1,
      1
    )


  const lastDay =
    new Date(
      selectedYear,
      selectedMonth,
      0
    )


  return {

    from:
      dateKey(firstDay),

    to:
      dateKey(lastDay)

  }

}


function calculateStreaks(
  rows
) {

  const completedDates =
    rows
      .filter(
        row =>
          row.day_completed
      )
      .map(
        row =>
          row.progress_date
      )
      .sort()


  if (
    completedDates.length === 0
  ) {

    return {
      current: 0,
      longest: 0
    }

  }


  let longest = 1
  let running = 1


  for (
    let index = 1;
    index <
      completedDates.length;
    index += 1
  ) {

    const previous =
      new Date(
        `${completedDates[
          index - 1
        ]}T12:00:00`
      )


    previous.setDate(
      previous.getDate() + 1
    )


    if (
      dateKey(previous) ===
      completedDates[index]
    ) {

      running += 1

      longest =
        Math.max(
          longest,
          running
        )

    } else {

      running = 1

    }

  }


  const completedSet =
    new Set(
      completedDates
    )


  const today =
    new Date()


  const todayKey =
    dateKey(today)


  let cursor =
    completedSet.has(
      todayKey
    )
      ? today
      : addDays(
          today,
          -1
        )


  let current = 0


  while (
    completedSet.has(
      dateKey(cursor)
    )
  ) {

    current += 1

    cursor =
      addDays(
        cursor,
        -1
      )

  }


  return {
    current,
    longest
  }

}


function summarize(
  rows
) {

  const totalPoints =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        Number(
          row.morning_percentage ||
          0
        ) +
        Number(
          row.evening_percentage ||
          0
        ),
      0
    )


  const completedDays =
    rows.filter(
      row =>
        row.day_completed
    ).length


  const partialDays =
    rows.filter(
      row =>
        !row.day_completed &&
        (
          Number(
            row.morning_percentage
          ) > 0 ||
          Number(
            row.evening_percentage
          ) > 0
        )
    ).length


  const activeDays =
    rows.filter(
      row =>
        Number(
          row.morning_percentage
        ) > 0 ||
        Number(
          row.evening_percentage
        ) > 0
    ).length


  const average =
    rows.length
      ? Math.round(
          totalPoints /
          (
            rows.length *
            2
          )
        )
      : 0


  return {

    totalPoints,

    completedDays,

    partialDays,

    activeDays,

    averagePercentage:
      average

  }

}


function monthlySummary(
  rows,
  year
) {

  const result =
    Array.from(
      {
        length: 12
      },
      (
        _,
        index
      ) => ({

        month:
          index + 1,

        totalPoints: 0,

        completedDays: 0,

        partialDays: 0,

        activeDays: 0

      })
    )


  rows.forEach(
    row => {

      if (
        !row.progress_date
          ?.startsWith(
            `${year}-`
          )
      ) {

        return

      }


      const month =
        Number(
          row.progress_date
            .slice(
              5,
              7
            )
        )


      const item =
        result[
          month - 1
        ]


      if (!item) {
        return
      }


      const points =
        Number(
          row.morning_percentage ||
          0
        ) +
        Number(
          row.evening_percentage ||
          0
        )


      item.totalPoints +=
        points


      if (
        row.day_completed
      ) {

        item.completedDays += 1

      } else if (
        points > 0
      ) {

        item.partialDays += 1

      }


      if (
        points > 0
      ) {

        item.activeDays += 1

      }

    }
  )


  return result
}


export default async function handler(
  req,
  res
) {

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


    if (!current) {

      return res
        .status(401)
        .json({
          message:
            'يجب تسجيل الدخول.'
        })

    }


    const supabase =
      getAdmin()


    const period =
      req.query.period ||
      'month'


    const now =
      new Date()


    const selectedYear =
      Number(
        req.query.year
      ) ||
      now.getFullYear()


    const selectedMonth =
      Number(
        req.query.month
      ) ||
      now.getMonth() + 1


    const range =
      getRange(
        period,
        selectedYear,
        selectedMonth
      )


    /*
      سجل كامل لحساب
      الاستمرار الحالي والأطول.
    */

    const {
      data: allRows,
      error: allError
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
          current.user.id
        )
        .order(
          'progress_date',
          {
            ascending: true
          }
        )


    if (allError) {

      throw allError

    }


    let selectedRows =
      allRows || []


    if (
      range.from
    ) {

      selectedRows =
        selectedRows.filter(
          row =>
            row.progress_date >=
              range.from &&
            row.progress_date <=
              range.to
        )

    }


    const summary =
      summarize(
        selectedRows
      )


    const streaks =
      calculateStreaks(
        allRows || []
      )


    const yearRows =
      (allRows || [])
        .filter(
          row =>
            row.progress_date
              ?.startsWith(
                `${selectedYear}-`
              )
        )


    return res
      .status(200)
      .json({

        period,

        range,

        year:
          selectedYear,

        month:
          selectedMonth,

        summary: {

          ...summary,

          currentStreak:
            streaks.current,

          longestStreak:
            streaks.longest

        },

        days:
          selectedRows
            .slice()
            .sort(
              (
                a,
                b
              ) =>
                b.progress_date
                  .localeCompare(
                    a.progress_date
                  )
            ),

        months:
          monthlySummary(
            yearRows,
            selectedYear
          )

      })


  } catch (error) {

    console.error(
      'STATS ERROR:',
      error
    )


    return res
      .status(500)
      .json({
        message:
          'تعذر تحميل الإحصائيات.'
      })

  }

}