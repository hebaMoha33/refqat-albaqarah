import {
  getAdmin,
  getCurrentUser
} from '../server/auth.js'

function pad(value) {
  return String(value).padStart(2, '0')
}

function key(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function addDays(dateString, amount) {
  const [y, m, d] = dateString
    .split('-')
    .map(Number)

  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + amount)

  return key(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  )
}

function todayRiyadh() {
  const parts = new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
  ).formatToParts(new Date())

  const values = Object.fromEntries(
    parts.map(part => [part.type, part.value])
  )

  return `${values.year}-${values.month}-${values.day}`
}

function getRange(period, year, month) {
  const nowKey = todayRiyadh()
  const [nowYear, nowMonth] = nowKey
    .split('-')
    .map(Number)

  const selectedYear =
    Number(year) || nowYear

  const selectedMonth =
    Number(month) || nowMonth

  if (period === 'month') {
    const days = new Date(
      selectedYear,
      selectedMonth,
      0
    ).getDate()

    return {
      from: key(selectedYear, selectedMonth, 1),
      to: key(selectedYear, selectedMonth, days),
      year: selectedYear,
      month: selectedMonth
    }
  }

  if (period === 'year') {
    return {
      from: `${selectedYear}-01-01`,
      to: `${selectedYear}-12-31`,
      year: selectedYear,
      month: selectedMonth
    }
  }

  if (period === 'week') {
    const [y, m, d] = nowKey
      .split('-')
      .map(Number)

    const date = new Date(y, m - 1, d)
    const day = date.getDay()
    const daysFromSaturday = (day + 1) % 7
    const from = addDays(nowKey, -daysFromSaturday)

    return {
      from,
      to: addDays(from, 6),
      year: selectedYear,
      month: selectedMonth
    }
  }

  return {
    from: '2000-01-01',
    to: '2999-12-31',
    year: selectedYear,
    month: selectedMonth
  }
}

function calculateStreak(rows) {
  const today = todayRiyadh()
  const completed = new Set(
    rows
      .filter(row => row.day_completed)
      .map(row => row.progress_date)
  )

  let cursor = completed.has(today)
    ? today
    : addDays(today, -1)

  let current = 0

  while (completed.has(cursor)) {
    current += 1
    cursor = addDays(cursor, -1)
  }

  const sorted = [...completed].sort()
  let longest = 0
  let running = 0
  let previous = null

  sorted.forEach(date => {
    if (
      previous &&
      addDays(previous, 1) === date
    ) {
      running += 1
    } else {
      running = 1
    }

    longest = Math.max(longest, running)
    previous = date
  })

  return {
    current,
    longest
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      message: 'طريقة الطلب غير مسموحة.'
    })
  }

  try {
    const current = await getCurrentUser(req)

    if (!current?.user?.id) {
      return res.status(401).json({
        message: 'يجب تسجيل الدخول.'
      })
    }

    const period = String(
      req.query?.period || 'month'
    )

    const range = getRange(
      period,
      req.query?.year,
      req.query?.month
    )

    const supabase = getAdmin()

    const {
      data: allRows,
      error
    } = await supabase
      .from('adhkar_daily_progress')
      .select(`
        progress_date,
        morning_percentage,
        evening_percentage,
        morning_completed,
        evening_completed,
        day_completed
      `)
      .eq('user_id', current.user.id)
      .order('progress_date', {
        ascending: true
      })

    if (error) {
      throw error
    }

    const rows = allRows || []

    const selected = rows.filter(row => (
      row.progress_date >= range.from &&
      row.progress_date <= range.to
    ))

    let totalPoints = 0
    let completedDays = 0
    let partialDays = 0
    let activeDays = 0
    let totalDailyPercentage = 0

    selected.forEach(row => {
      const morning = Number(
        row.morning_percentage || 0
      )

      const evening = Number(
        row.evening_percentage || 0
      )

      const average = Math.round(
        (morning + evening) / 2
      )

      totalPoints += morning + evening
      totalDailyPercentage += average

      if (row.day_completed) {
        completedDays += 1
      } else if (average > 0) {
        partialDays += 1
      }

      if (average > 0) {
        activeDays += 1
      }
    })

    const streak = calculateStreak(rows)

    const months = Array.from(
      { length: 12 },
      (_, index) => ({
        month: index + 1,
        totalPoints: 0,
        completedDays: 0,
        partialDays: 0,
        activeDays: 0
      })
    )

    rows
      .filter(row =>
        row.progress_date.startsWith(
          `${range.year}-`
        )
      )
      .forEach(row => {
        const monthNumber = Number(
          row.progress_date.slice(5, 7)
        )

        const item = months[monthNumber - 1]
        const morning = Number(
          row.morning_percentage || 0
        )
        const evening = Number(
          row.evening_percentage || 0
        )
        const average = Math.round(
          (morning + evening) / 2
        )

        item.totalPoints += morning + evening

        if (row.day_completed) {
          item.completedDays += 1
        } else if (average > 0) {
          item.partialDays += 1
        }

        if (average > 0) {
          item.activeDays += 1
        }
      })

    return res.status(200).json({
      period,
      range: {
        from: range.from,
        to: range.to
      },
      year: range.year,
      month: range.month,
      summary: {
        totalPoints,
        completedDays,
        partialDays,
        activeDays,
        averagePercentage:
          selected.length > 0
            ? Math.round(
                totalDailyPercentage /
                selected.length
              )
            : 0,
        currentStreak: streak.current,
        longestStreak: streak.longest
      },
      days: selected,
      months
    })
  } catch (error) {
    console.error('STATS:', error)

    return res.status(500).json({
      message:
        error?.message ||
        'تعذر تحميل الإحصائيات.'
    })
  }
}
