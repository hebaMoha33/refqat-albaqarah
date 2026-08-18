import {
  getAdmin,
  getCurrentUser
} from '../server/auth.js'


function getToday() {
  const date = new Date()

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}


export default async function handler(req, res) {

  if (req.method !== 'GET') {
    return res.status(405).json({
      message: 'طريقة الطلب غير مسموحة.'
    })
  }

  try {

    const current =
      await getCurrentUser(req)

    if (!current) {
      return res.status(401).json({
        message: 'يجب تسجيل الدخول.'
      })
    }

    const supabase = getAdmin()
    const today = getToday()


    /* =====================================
       كل المشتركين
       أي شخص يسجل جديد يظهر هنا
    ===================================== */

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

    if (usersError) {
      throw usersError
    }


    /* =====================================
       تقدم اليوم
    ===================================== */

    const {
      data: todayRows,
      error: todayError
    } =
      await supabase
        .from('adhkar_daily_progress')
        .select(`
          user_id,
          morning_percentage,
          evening_percentage,
          morning_completed,
          evening_completed,
          day_completed
        `)
        .eq('progress_date', today)

    if (todayError) {
      throw todayError
    }


    /* =====================================
       كل التقدم
       لحساب النقاط المتراكمة
    ===================================== */

    const {
      data: allProgress,
      error: progressError
    } =
      await supabase
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


    /* =====================================
       خريطة تقدم اليوم
    ===================================== */

    const todayMap = new Map()

    ;(todayRows || []).forEach(row => {
      todayMap.set(
        row.user_id,
        row
      )
    })


    /* =====================================
       النقاط المتراكمة
    ===================================== */

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

      totals.set(
        row.user_id,
        previous
      )
    })


    /* =====================================
       دمج كل المشتركين
       حتى الذي لم يبدأ يظهر
    ===================================== */

    const members =
      (users || []).map(user => {

        const todayProgress =
          todayMap.get(user.id)

        const morning =
          Number(
            todayProgress?.morning_percentage || 0
          )

        const evening =
          Number(
            todayProgress?.evening_percentage || 0
          )

        const percentage =
          Math.round(
            (morning + evening) / 2
          )

        const accumulated =
          totals.get(user.id) || {
            points: 0,
            completedDays: 0
          }


        /*
          completed:
          أكمل الصباح والمساء 100%

          incomplete:
          أي شخص أقل من 100%
          حتى لو كان 0%
        */

        const status =
          percentage === 100
            ? 'completed'
            : 'incomplete'


        return {

          id:
            user.id,

          username:
            user.username,

          display_name:
            user.display_name,

          isMe:
            user.id === current.user.id,

          morning,
          evening,
          percentage,
          status,

          points:
            accumulated.points,

          completedDays:
            accumulated.completedDays
        }
      })


    /* =====================================
       الترتيب

       1- أعلى نسبة اليوم
       2- أعلى نقاط متراكمة
       3- أكثر أيام مكتملة
    ===================================== */

    members.sort((a, b) => {

      if (
        b.percentage !==
        a.percentage
      ) {
        return (
          b.percentage -
          a.percentage
        )
      }

      if (
        b.points !==
        a.points
      ) {
        return (
          b.points -
          a.points
        )
      }

      return (
        b.completedDays -
        a.completedDays
      )
    })


    const rankedMembers =
      members.map(
        (member, index) => ({
          ...member,
          rank: index + 1
        })
      )


    /* =====================================
       الرد النهائي
    ===================================== */

    return res.status(200).json({

      today,

      totalMembers:
        rankedMembers.length,

      completedToday:
        rankedMembers.filter(
          member =>
            member.status === 'completed'
        ).length,

      incompleteToday:
        rankedMembers.filter(
          member =>
            member.status === 'incomplete'
        ).length,

      notStartedToday:
        rankedMembers.filter(
          member =>
            member.percentage === 0
        ).length,

      members:
        rankedMembers
    })


  } catch (error) {

    console.error(
      'COMMUNITY ERROR:',
      error
    )

    return res.status(500).json({
      message:
        error?.message ||
        'تعذر تحميل بيانات الرفقة.'
    })
  }
}