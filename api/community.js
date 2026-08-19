import {
  getAdmin,
  getCurrentUser
} from '../server/auth.js'

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

    const supabase = getAdmin()
    const today = todayRiyadh()

    const {
      data: users,
      error: usersError
    } = await supabase
      .from('app_users')
      .select('id,username,display_name,created_at')
      .order('created_at', { ascending: true })

    if (usersError) {
      throw usersError
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
      data: allProgress,
      error: progressError
    } = await supabase
      .from('adhkar_daily_progress')
      .select(`
        user_id,
        morning_percentage,
        evening_percentage,
        day_completed
      `)

    if (progressError) {
      throw progressError
    }

    const todayMap = new Map(
      (todayRows || []).map(row => [
        row.user_id,
        row
      ])
    )

    const totals = new Map()

    ;(allProgress || []).forEach(row => {
      const previous =
        totals.get(row.user_id) || {
          points: 0,
          completedDays: 0
        }

      previous.points +=
        Number(row.morning_percentage || 0) +
        Number(row.evening_percentage || 0)

      if (row.day_completed) {
        previous.completedDays += 1
      }

      totals.set(row.user_id, previous)
    })

    const members = (users || []).map(user => {
      const row = todayMap.get(user.id)
      const morning = Number(
        row?.morning_percentage || 0
      )
      const evening = Number(
        row?.evening_percentage || 0
      )
      const percentage = Math.round(
        (morning + evening) / 2
      )

      const total =
        totals.get(user.id) || {
          points: 0,
          completedDays: 0
        }

      return {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        isMe: user.id === current.user.id,
        morning,
        evening,
        percentage,
        status:
          percentage === 100
            ? 'completed'
            : 'incomplete',
        points: total.points,
        completedDays: total.completedDays
      }
    })

    members.sort((a, b) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage
      }

      if (b.points !== a.points) {
        return b.points - a.points
      }

      return b.completedDays - a.completedDays
    })

    const ranked = members.map(
      (member, index) => ({
        ...member,
        rank: index + 1
      })
    )

    return res.status(200).json({
      today,
      totalMembers: ranked.length,
      completedToday:
        ranked.filter(
          member =>
            member.percentage === 100
        ).length,
      incompleteToday:
        ranked.filter(
          member =>
            member.percentage < 100
        ).length,
      members: ranked
    })
  } catch (error) {
    console.error('COMMUNITY:', error)

    return res.status(500).json({
      message:
        error?.message ||
        'تعذر تحميل بيانات الرفقة.'
    })
  }
}
