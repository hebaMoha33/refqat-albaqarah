import {
  getAdmin,
  getCurrentUser
} from '../server/auth.js'


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


function addDays(
  date,
  number
) {

  const result =
    new Date(date)

  result.setDate(
    result.getDate() +
    number
  )

  return result
}


function rangeFor(
  period
) {

  const now =
    new Date()


  if (
    period === 'week'
  ) {

    const day =
      now.getDay()


    const diff =
      day === 6
        ? 0
        : day + 1


    const from =
      addDays(
        now,
        -diff
      )


    const to =
      addDays(
        from,
        6
      )


    return {

      from:
        dateKey(from),

      to:
        dateKey(to)

    }

  }


  if (
    period === 'year'
  ) {

    const year =
      now.getFullYear()


    return {

      from:
        `${year}-01-01`,

      to:
        `${year}-12-31`

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


  const year =
    now.getFullYear()


  const month =
    now.getMonth()


  return {

    from:
      dateKey(
        new Date(
          year,
          month,
          1
        )
      ),

    to:
      dateKey(
        new Date(
          year,
          month + 1,
          0
        )
      )

  }

}


function currentStreak(
  completedDates
) {

  const set =
    new Set(
      completedDates
    )


  const today =
    new Date()


  let cursor =
    set.has(
      dateKey(today)
    )
      ? today
      : addDays(
          today,
          -1
        )


  let result = 0


  while (
    set.has(
      dateKey(cursor)
    )
  ) {

    result += 1

    cursor =
      addDays(
        cursor,
        -1
      )

  }


  return result

}


async function getFriendIds(
  supabase,
  userId
) {

  const {
    data,
    error
  } =
    await supabase
      .from(
        'app_friendships'
      )
      .select(`
        requester_id,
        addressee_id,
        status
      `)
      .eq(
        'status',
        'accepted'
      )
      .or(
        `requester_id.eq.${userId},addressee_id.eq.${userId}`
      )


  if (error) {
    throw error
  }


  return (data || [])
    .map(
      row =>
        row.requester_id ===
          userId
          ? row.addressee_id
          : row.requester_id
    )

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
      String(
        req.query.period ||
        'month'
      )


    const scope =
      String(
        req.query.scope ||
        'friends'
      )


    const range =
      rangeFor(period)


    let allowedIds = null


    if (
      scope === 'friends'
    ) {

      const friendIds =
        await getFriendIds(
          supabase,
          current.user.id
        )


      allowedIds = [
        current.user.id,
        ...friendIds
      ]

    }


    /* =====================================
       USERS
    ===================================== */

    let usersQuery =
      supabase
        .from('app_users')
        .select(`
          id,
          username,
          display_name
        `)


    if (
      allowedIds
    ) {

      usersQuery =
        usersQuery.in(
          'id',
          allowedIds
        )

    }


    const {
      data: users,
      error: usersError
    } =
      await usersQuery


    if (usersError) {
      throw usersError
    }


    const userIds =
      (users || [])
        .map(
          user =>
            user.id
        )


    if (
      userIds.length === 0
    ) {

      return res
        .status(200)
        .json({
          period,
          scope,
          ranking: [],
          myRank: null
        })

    }


    /* =====================================
       SELECTED PERIOD
    ===================================== */

    let progressQuery =
      supabase
        .from(
          'adhkar_daily_progress'
        )
        .select(`
          user_id,
          progress_date,
          morning_percentage,
          evening_percentage,
          day_completed
        `)
        .in(
          'user_id',
          userIds
        )


    if (
      range.from
    ) {

      progressQuery =
        progressQuery
          .gte(
            'progress_date',
            range.from
          )
          .lte(
            'progress_date',
            range.to
          )

    }


    const {
      data: periodRows,
      error: progressError
    } =
      await progressQuery


    if (progressError) {
      throw progressError
    }


    /*
      نحتاج السجل الكامل
      فقط لحساب الاستمرار الحالي.
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
          user_id,
          progress_date,
          day_completed
        `)
        .in(
          'user_id',
          userIds
        )


    if (allError) {
      throw allError
    }


    const stats =
      new Map()


    ;(users || [])
      .forEach(
        user => {

          stats.set(
            user.id,
            {

              id:
                user.id,

              username:
                user.username,

              display_name:
                user.display_name,

              points: 0,

              completedDays: 0,

              activeDays: 0,

              currentStreak: 0

            }
          )

        }
      )


    ;(periodRows || [])
      .forEach(
        row => {

          const item =
            stats.get(
              row.user_id
            )


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


          item.points +=
            points


          if (
            points > 0
          ) {

            item.activeDays += 1

          }


          if (
            row.day_completed
          ) {

            item.completedDays += 1

          }

        }
      )


    stats.forEach(
      item => {

        const completedDates =
          (allRows || [])
            .filter(
              row =>
                row.user_id ===
                  item.id &&
                row.day_completed
            )
            .map(
              row =>
                row.progress_date
            )


        item.currentStreak =
          currentStreak(
            completedDates
          )

      }
    )


    const ranking =
      Array.from(
        stats.values()
      )
        .sort(
          (
            a,
            b
          ) => {

            if (
              b.points !==
              a.points
            ) {

              return (
                b.points -
                a.points
              )

            }


            if (
              b.completedDays !==
              a.completedDays
            ) {

              return (
                b.completedDays -
                a.completedDays
              )

            }


            return (
              b.currentStreak -
              a.currentStreak
            )

          }
        )
        .map(
          (
            item,
            index
          ) => ({

            ...item,

            rank:
              index + 1,

            isMe:
              item.id ===
              current.user.id

          })
        )


    const myEntry =
      ranking.find(
        item =>
          item.isMe
      )


    return res
      .status(200)
      .json({

        period,

        scope,

        range,

        ranking,

        myRank:
          myEntry
            ? myEntry.rank
            : null

      })


  } catch (error) {

    console.error(
      'LEADERBOARD ERROR:',
      error
    )


    return res
      .status(500)
      .json({
        message:
          'تعذر تحميل الترتيب.'
      })

  }

}