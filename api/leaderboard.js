import {
  getAdmin,
  getCurrentUser
} from '../server/auth.js'

function pad(value) {
  return String(value).padStart(2, '0')
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
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

function addDays(dateString, amount) {
  const [y, m, d] = dateString
    .split('-')
    .map(Number)

  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + amount)

  return dateKey(date)
}

function rangeFor(period) {
  const today = todayRiyadh()
  const [year, month, day] = today
    .split('-')
    .map(Number)

  if (period === 'week') {
    const date = new Date(year, month - 1, day)
    const fromSaturday = (date.getDay() + 1) % 7
    const from = addDays(today, -fromSaturday)

    return {
      from,
      to: addDays(from, 6)
    }
  }

  if (period === 'month') {
    const last = new Date(year, month, 0).getDate()

    return {
      from: `${year}-${pad(month)}-01`,
      to: `${year}-${pad(month)}-${pad(last)}`
    }
  }

  if (period === 'year') {
    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`
    }
  }

  return {
    from: '2000-01-01',
    to: '2999-12-31'
  }
}

function streakForUser(rows, userId) {
  const today = todayRiyadh()
  const completed = new Set(
    rows
      .filter(row =>
        row.user_id === userId &&
        row.day_completed
      )
      .map(row => row.progress_date)
  )

  let cursor = completed.has(today)
    ? today
    : addDays(today, -1)

  let streak = 0

  while (completed.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
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

    const range = rangeFor(period)
    const today = todayRiyadh()
    const supabase = getAdmin()

    const {
      data: users,
      error: usersError
    } = await supabase
      .from('app_users')
      .select('id,username,display_name')

    if (usersError) {
      throw usersError
    }

    const {
      data: selectedRows,
      error: selectedError
    } = await supabase
      .from('adhkar_daily_progress')
      .select(`
        user_id,
        progress_date,
        morning_percentage,
        evening_percentage,
        day_completed
      `)
      .gte('progress_date', range.from)
      .lte('progress_date', range.to)

    if (selectedError) {
      throw selectedError
    }

    const {
      data: todayRows,
      error: todayError
    } = await supabase
      .from('adhkar_daily_progress')
      .select(`
        user_id,
        morning_percentage,
        evening_percentage,
        day_completed
      `)
      .eq('progress_date', today)

    if (todayError) {
      throw todayError
    }

    const {
      data: allCompletedRows,
      error: completedError
    } = await supabase
      .from('adhkar_daily_progress')
      .select('user_id,progress_date,day_completed')
      .eq('day_completed', true)

    if (completedError) {
      throw completedError
    }

    const todayMap = new Map(
      (todayRows || []).map(row => [
        row.user_id,
        row
      ])
    )

    const totals = new Map()

    ;(selectedRows || []).forEach(row => {
      const previous =
        totals.get(row.user_id) || {
          points: 0,
          completedDays: 0,
          activeDays: 0
        }

      const morning = Number(
        row.morning_percentage || 0
      )
      const evening = Number(
        row.evening_percentage || 0
      )

      previous.points += morning + evening

      if (row.day_completed) {
        previous.completedDays += 1
      }

      if (morning > 0 || evening > 0) {
        previous.activeDays += 1
      }

      totals.set(row.user_id, previous)
    })

    const ranking = (users || []).map(user => {
      const total =
        totals.get(user.id) || {
          points: 0,
          completedDays: 0,
          activeDays: 0
        }

      const todayRow = todayMap.get(user.id)
      const todayMorning = Number(
        todayRow?.morning_percentage || 0
      )
      const todayEvening = Number(
        todayRow?.evening_percentage || 0
      )
      const todayPercentage = Math.round(
        (todayMorning + todayEvening) / 2
      )

      return {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        points: total.points,
        completedDays: total.completedDays,
        activeDays: total.activeDays,
        currentStreak: streakForUser(
          allCompletedRows || [],
          user.id
        ),
        todayMorning,
        todayEvening,
        todayPercentage,
        isMe: user.id === current.user.id
      }
    })

    ranking.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points
      }

      if (b.completedDays !== a.completedDays) {
        return b.completedDays - a.completedDays
      }

      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak
      }

      return b.todayPercentage - a.todayPercentage
    })

    const ranked = ranking.map(
      (member, index) => ({
        ...member,
        rank: index + 1
      })
    )

    return res.status(200).json({
      period,
      range,
      ranking: ranked,
      myRank:
        ranked.find(
          member => member.isMe
        )?.rank || null
    })
  } catch (error) {
    console.error('LEADERBOARD:', error)

    return res.status(500).json({
      message:
        error?.message ||
        'تعذر تحميل الترتيب.'
    })
  }
}
