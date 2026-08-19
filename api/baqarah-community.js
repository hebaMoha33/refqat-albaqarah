import {
  getAdmin,
  getCurrentUser
} from '../server/auth.js'


function getRiyadhDateKey() {
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

    const supabase =
      getAdmin()

    const today =
      getRiyadhDateKey()

    const {
      data: users,
      error: usersError
    } =
      await supabase
        .from('app_users')
        .select(`
          id,
          username,
          display_name,
          created_at
        `)
        .order(
          'created_at',
          {
            ascending: true
          }
        )

    if (usersError) {
      throw usersError
    }

    const {
      data: todayRows,
      error: todayError
    } =
      await supabase
        .from(
          'baqarah_daily_progress'
        )
        .select(`
          user_id,
          percentage,
          star_level,
          completed,
          reader_percentage,
          paper_percentage,
          audio_percentage
        `)
        .eq(
          'progress_date',
          today
        )

    if (todayError) {
      throw todayError
    }

    const {
      data: allRows,
      error: allError
    } =
      await supabase
        .from(
          'baqarah_daily_progress'
        )
        .select(`
          user_id,
          percentage,
          completed,
          progress_date
        `)

    if (allError) {
      throw allError
    }

    const todayMap =
      new Map(
        (todayRows || []).map(
          row => [
            row.user_id,
            row
          ]
        )
      )

    const totalsMap =
      new Map()

    for (
      const row of
      allRows || []
    ) {
      const previous =
        totalsMap.get(
          row.user_id
        ) || {
          completedDays: 0,
          activeDays: 0,
          totalProgress: 0
        }

      const percentage =
        Number(
          row.percentage || 0
        )

      if (percentage > 0) {
        previous.activeDays += 1
      }

      if (row.completed) {
        previous.completedDays += 1
      }

      previous.totalProgress +=
        percentage

      totalsMap.set(
        row.user_id,
        previous
      )
    }

    const members =
      (users || []).map(
        user => {
          const todayRow =
            todayMap.get(
              user.id
            )

          const totals =
            totalsMap.get(
              user.id
            ) || {
              completedDays: 0,
              activeDays: 0,
              totalProgress: 0
            }

          const percentage =
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

            percentage,

            starLevel:
              Number(
                todayRow?.star_level ||
                0
              ),

            completed:
              percentage >= 100,

            status:
              percentage >= 100
                ? 'completed'
                : 'incomplete',

            readerPercentage:
              Number(
                todayRow
                  ?.reader_percentage ||
                0
              ),

            paperPercentage:
              Number(
                todayRow
                  ?.paper_percentage ||
                0
              ),

            audioPercentage:
              Number(
                todayRow
                  ?.audio_percentage ||
                0
              ),

            completedDays:
              totals.completedDays,

            activeDays:
              totals.activeDays,

            totalProgress:
              totals.totalProgress
          }
        }
      )

    members.sort(
      (a, b) =>
        b.percentage -
          a.percentage ||
        b.completedDays -
          a.completedDays ||
        b.totalProgress -
          a.totalProgress ||
        a.displayName.localeCompare(
          b.displayName,
          'ar'
        )
    )

    const ranked =
      members.map(
        (member, index) => ({
          ...member,
          rank: index + 1
        })
      )

    return res
      .status(200)
      .json({
        date: today,
        totalMembers:
          ranked.length,
        completedToday:
          ranked.filter(
            member =>
              member.completed
          ).length,
        members: ranked
      })

  } catch (error) {
    console.error(
      'BAQARAH COMMUNITY ERROR:',
      error
    )

    return res
      .status(500)
      .json({
        message:
          error?.message ||
          'تعذر تحميل رفقاء سورة البقرة.'
      })
  }
}
