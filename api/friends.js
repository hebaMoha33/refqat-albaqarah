import {
  getAdmin,
  getCurrentUser,
  readBody,
  normalizeUsername
} from '../server/auth.js'


async function getFriendshipData(
  supabase,
  userId
) {

  const {
    data: rows,
    error
  } =
    await supabase
      .from(
        'app_friendships'
      )
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at,
        accepted_at
      `)
      .or(
        `requester_id.eq.${userId},addressee_id.eq.${userId}`
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      )


  if (error) {
    throw error
  }


  return rows || []

}


async function getUsers(
  supabase,
  ids
) {

  const uniqueIds =
    [
      ...new Set(ids)
    ]


  if (
    uniqueIds.length === 0
  ) {

    return new Map()

  }


  const {
    data,
    error
  } =
    await supabase
      .from(
        'app_users'
      )
      .select(`
        id,
        username,
        display_name,
        created_at
      `)
      .in(
        'id',
        uniqueIds
      )


  if (error) {
    throw error
  }


  return new Map(
    (data || [])
      .map(
        user => [
          user.id,
          user
        ]
      )
  )

}


function todayKey() {

  const now =
    new Date()


  return [
    now.getFullYear(),
    String(
      now.getMonth() + 1
    ).padStart(2, '0'),
    String(
      now.getDate()
    ).padStart(2, '0')
  ].join('-')

}


async function getTodayProgress(
  supabase,
  ids
) {

  if (
    ids.length === 0
  ) {

    return new Map()

  }


  const {
    data,
    error
  } =
    await supabase
      .from(
        'adhkar_daily_progress'
      )
      .select(`
        user_id,
        morning_percentage,
        evening_percentage,
        morning_completed,
        evening_completed,
        day_completed
      `)
      .in(
        'user_id',
        ids
      )
      .eq(
        'progress_date',
        todayKey()
      )


  if (error) {
    throw error
  }


  return new Map(
    (data || [])
      .map(
        row => [
          row.user_id,
          row
        ]
      )
  )

}


async function listFriends(
  supabase,
  userId
) {

  const relationships =
    await getFriendshipData(
      supabase,
      userId
    )


  const ids =
    relationships
      .flatMap(
        row => [
          row.requester_id,
          row.addressee_id
        ]
      )
      .filter(
        id =>
          id !== userId
      )


  const userMap =
    await getUsers(
      supabase,
      ids
    )


  const acceptedIds =
    relationships
      .filter(
        row =>
          row.status ===
          'accepted'
      )
      .map(
        row =>
          row.requester_id ===
            userId
            ? row.addressee_id
            : row.requester_id
      )


  const progressMap =
    await getTodayProgress(
      supabase,
      acceptedIds
    )


  const friends =
    relationships
      .filter(
        row =>
          row.status ===
          'accepted'
      )
      .map(
        row => {

          const friendId =
            row.requester_id ===
              userId
              ? row.addressee_id
              : row.requester_id


          const user =
            userMap.get(
              friendId
            )


          const progress =
            progressMap.get(
              friendId
            )


          const morning =
            Number(
              progress
                ?.morning_percentage ||
              0
            )


          const evening =
            Number(
              progress
                ?.evening_percentage ||
              0
            )


          return {

            friendshipId:
              row.id,

            id:
              friendId,

            username:
              user?.username,

            display_name:
              user?.display_name,

            today: {

              morning,

              evening,

              percentage:
                Math.round(
                  (
                    morning +
                    evening
                  ) / 2
                ),

              completed:
                Boolean(
                  progress
                    ?.day_completed
                )

            }

          }

        }
      )


  const incoming =
    relationships
      .filter(
        row =>
          row.status ===
            'pending' &&
          row.addressee_id ===
            userId
      )
      .map(
        row => {

          const user =
            userMap.get(
              row.requester_id
            )


          return {

            friendshipId:
              row.id,

            id:
              row.requester_id,

            username:
              user?.username,

            display_name:
              user?.display_name,

            created_at:
              row.created_at

          }

        }
      )


  const outgoing =
    relationships
      .filter(
        row =>
          row.status ===
            'pending' &&
          row.requester_id ===
            userId
      )
      .map(
        row => {

          const user =
            userMap.get(
              row.addressee_id
            )


          return {

            friendshipId:
              row.id,

            id:
              row.addressee_id,

            username:
              user?.username,

            display_name:
              user?.display_name,

            created_at:
              row.created_at

          }

        }
      )


  return {

    friends,

    incoming,

    outgoing

  }

}


async function searchUsers(
  supabase,
  currentUserId,
  query
) {

  const normalized =
    normalizeUsername(
      query
    )


  if (
    normalized.length < 2
  ) {

    return []

  }


  const clean =
    normalized
      .replace(
        /[%_]/g,
        ''
      )


  const {
    data,
    error
  } =
    await supabase
      .from(
        'app_users'
      )
      .select(`
        id,
        username,
        display_name
      `)
      .ilike(
        'username_normalized',
        `%${clean}%`
      )
      .neq(
        'id',
        currentUserId
      )
      .limit(10)


  if (error) {
    throw error
  }


  const relationships =
    await getFriendshipData(
      supabase,
      currentUserId
    )


  return (data || [])
    .map(
      user => {

        const relation =
          relationships
            .find(
              row =>
                (
                  row.requester_id ===
                    currentUserId &&
                  row.addressee_id ===
                    user.id
                ) ||
                (
                  row.addressee_id ===
                    currentUserId &&
                  row.requester_id ===
                    user.id
                )
            )


        return {

          ...user,

          friendship:
            relation
              ? {
                  id:
                    relation.id,

                  status:
                    relation.status,

                  direction:
                    relation
                      .requester_id ===
                      currentUserId
                      ? 'outgoing'
                      : 'incoming'
                }
              : null

        }

      }
    )

}


async function sendRequest(
  supabase,
  userId,
  friendId
) {

  if (
    !friendId ||
    friendId === userId
  ) {

    throw new Error(
      'لا يمكن إضافة هذا المستخدم.'
    )

  }


  const {
    data: existing,
    error: existingError
  } =
    await supabase
      .from(
        'app_friendships'
      )
      .select(`
        id,
        requester_id,
        addressee_id,
        status
      `)
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`
      )
      .maybeSingle()


  if (existingError) {
    throw existingError
  }


  if (existing) {

    if (
      existing.status ===
      'accepted'
    ) {

      throw new Error(
        'هذا المستخدم صديق لديك بالفعل.'
      )

    }


    if (
      existing.status ===
        'pending' &&
      existing.addressee_id ===
        userId
    ) {

      const {
        error
      } =
        await supabase
          .from(
            'app_friendships'
          )
          .update({

            status:
              'accepted',

            accepted_at:
              new Date()
                .toISOString()

          })
          .eq(
            'id',
            existing.id
          )


      if (error) {
        throw error
      }


      return {
        accepted: true
      }

    }


    throw new Error(
      'طلب الصداقة موجود بالفعل.'
    )

  }


  const {
    error
  } =
    await supabase
      .from(
        'app_friendships'
      )
      .insert({

        requester_id:
          userId,

        addressee_id:
          friendId,

        status:
          'pending'

      })


  if (error) {
    throw error
  }


  return {
    requested: true
  }

}


async function respondRequest(
  supabase,
  userId,
  friendshipId,
  status
) {

  const {
    data: relation,
    error
  } =
    await supabase
      .from(
        'app_friendships'
      )
      .select(`
        id,
        addressee_id,
        status
      `)
      .eq(
        'id',
        friendshipId
      )
      .maybeSingle()


  if (error) {
    throw error
  }


  if (
    !relation ||
    relation.addressee_id !==
      userId ||
    relation.status !==
      'pending'
  ) {

    throw new Error(
      'طلب الصداقة غير موجود.'
    )

  }


  if (
    status ===
    'accepted'
  ) {

    const {
      error: updateError
    } =
      await supabase
        .from(
          'app_friendships'
        )
        .update({

          status:
            'accepted',

          accepted_at:
            new Date()
              .toISOString()

        })
        .eq(
          'id',
          friendshipId
        )


    if (updateError) {
      throw updateError
    }

  } else {

    const {
      error: deleteError
    } =
      await supabase
        .from(
          'app_friendships'
        )
        .delete()
        .eq(
          'id',
          friendshipId
        )


    if (deleteError) {
      throw deleteError
    }

  }

}


async function removeFriend(
  supabase,
  userId,
  friendshipId
) {

  const {
    data: relation,
    error
  } =
    await supabase
      .from(
        'app_friendships'
      )
      .select(`
        id,
        requester_id,
        addressee_id
      `)
      .eq(
        'id',
        friendshipId
      )
      .maybeSingle()


  if (error) {
    throw error
  }


  if (
    !relation ||
    (
      relation.requester_id !==
        userId &&
      relation.addressee_id !==
        userId
    )
  ) {

    throw new Error(
      'الصداقة غير موجودة.'
    )

  }


  const {
    error: deleteError
  } =
    await supabase
      .from(
        'app_friendships'
      )
      .delete()
      .eq(
        'id',
        friendshipId
      )


  if (deleteError) {
    throw deleteError
  }

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
            'يجب تسجيل الدخول.'
        })

    }


    const supabase =
      getAdmin()


    const userId =
      current.user.id


    /* =====================================
       GET
    ===================================== */

    if (
      req.method === 'GET'
    ) {

      const query =
        String(
          req.query.q ||
          ''
        )
          .trim()


      if (query) {

        const results =
          await searchUsers(
            supabase,
            userId,
            query
          )


        return res
          .status(200)
          .json({
            results
          })

      }


      const data =
        await listFriends(
          supabase,
          userId
        )


      return res
        .status(200)
        .json(data)

    }


    /* =====================================
       POST
    ===================================== */

    if (
      req.method === 'POST'
    ) {

      const body =
        readBody(req)


      const action =
        body.action


      if (
        action ===
        'request'
      ) {

        const result =
          await sendRequest(
            supabase,
            userId,
            body.userId
          )


        return res
          .status(200)
          .json({
            ok: true,
            ...result
          })

      }


      if (
        action ===
        'accept'
      ) {

        await respondRequest(
          supabase,
          userId,
          body.friendshipId,
          'accepted'
        )


        return res
          .status(200)
          .json({
            ok: true
          })

      }


      if (
        action ===
        'reject'
      ) {

        await respondRequest(
          supabase,
          userId,
          body.friendshipId,
          'rejected'
        )


        return res
          .status(200)
          .json({
            ok: true
          })

      }


      if (
        action ===
        'remove'
      ) {

        await removeFriend(
          supabase,
          userId,
          body.friendshipId
        )


        return res
          .status(200)
          .json({
            ok: true
          })

      }


      return res
        .status(400)
        .json({
          message:
            'العملية غير معروفة.'
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
      'FRIENDS ERROR:',
      error
    )


    return res
      .status(500)
      .json({
        message:
          error?.message ||
          'تعذر تنفيذ العملية.'
      })

  }

}