import {
  getAdmin,
  getCurrentUser
} from '../server/auth.js'


function getRiyadhToday() {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'Asia/Riyadh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
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

  return `${map.year}-${map.month}-${map.day}`
}


function addDays(
  dateKey,
  amount
) {
  const [
    year,
    month,
    day
  ] =
    dateKey
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


function inPeriod(
  dateKey,
  period,
  today
) {
  if (period === 'day') {
    return dateKey === today
  }

  if (period === 'week') {
    const start =
      addDays(
        today,
        -6
      )

    return (
      dateKey >= start &&
      dateKey <= today
    )
  }

  if (period === 'month') {
    return dateKey.startsWith(
      today.slice(0, 7)
    )
  }

  if (period === 'year') {
    return dateKey.startsWith(
      today.slice(0, 4)
    )
  }

  return true
}


function calculateCurrentStreak(
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


export default async function handler(
  req,
  res
) {
  res.setHeader(
    'Cache-Control',
    'no-store'
  )

  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({
        message:
          'طريقة الطلب غير مسموحة.'
      })
  }

  try {
    const current =
      await getCurrentUser(req)

    if (!current?.user?.id) {
      return res
        .status(401)
        .json({
          message:
            'يجب تسجيل الدخول.'
        })
    }

    const allowedPeriods =
      [
        'day',
        'week',
        'month',
        'year',
        'all'
      ]

    const period =
      allowedPeriods.includes(
        req.query?.period
      )
        ? req.query.period
        : 'month'

    const today =
      getRiyadhToday()

    const supabase =
      getAdmin()

    const {
      data: users,
      error: usersError
    } =
      await supabase
        .from('app_users')
        .select(`
          id,
          username,
          display_name
        `)

    if (usersError) {
      throw usersError
    }

    const {
      data: rows,
      error: rowsError
    } =
      await supabase
        .from(
          'baqarah_daily_progress'
        )
        .select(`
          user_id,
          progress_date,
          percentage,
          star_level,
          completed
        `)
        .order(
          'progress_date',
          {
            ascending: true
          }
        )

    if (rowsError) {
      throw rowsError
    }

    const rowsByUser =
      new Map()

    for (
      const row of
      rows || []
    ) {
      const list =
        rowsByUser.get(
          row.user_id
        ) || []

      list.push(row)

      rowsByUser.set(
        row.user_id,
        list
      )
    }

    const ranking =
      (users || []).map(
        user => {
          const userRows =
            rowsByUser.get(
              user.id
            ) || []

          const todayRow =
            userRows.find(
              row =>
                row.progress_date ===
                today
            )

          const periodRows =
            userRows.filter(
              row =>
                inPeriod(
                  row.progress_date,
                  period,
                  today
                )
            )

          const completedDays =
            periodRows.filter(
              row =>
                row.completed
            ).length

          const activeDays =
            periodRows.filter(
              row =>
                Number(
                  row.percentage ||
                  0
                ) > 0
            ).length

          const points =
            periodRows.reduce(
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
            )

          const todayPercentage =
            Number(
              todayRow?.percentage ||
              0
            )

          return {
            id: user.id,
            username:
              user.username,
            displayName:
              user.display_name ||
              user.username,

            isMe:
              user.id ===
              current.user.id,

            todayPercentage,
            todayStarLevel:
              Number(
                todayRow?.star_level ||
                0
              ),

            completedDays,
            activeDays,
            points,

            currentStreak:
              calculateCurrentStreak(
                userRows,
                today
              )
          }
        }
      )

    ranking.sort(
      (a, b) => {
        if (period === 'day') {
          return (
            b.todayPercentage -
              a.todayPercentage ||
            b.currentStreak -
              a.currentStreak ||
            a.displayName.localeCompare(
              b.displayName,
              'ar'
            )
          )
        }

        return (
          b.completedDays -
            a.completedDays ||
          b.points -
            a.points ||
          b.currentStreak -
            a.currentStreak ||
          a.displayName.localeCompare(
            b.displayName,
            'ar'
          )
        )
      }
    )

    return res
      .status(200)
      .json({
        date: today,
        period,
        members:
          ranking.map(
            (
              member,
              index
            ) => ({
              ...member,
              rank: index + 1
            })
          )
      })

  } catch (error) {
    console.error(
      'BAQARAH LEADERBOARD ERROR:',
      error
    )

    return res
      .status(500)
      .json({
        message:
          error?.message ||
          'تعذر تحميل ترتيب سورة البقرة.'
      })
  }
}
