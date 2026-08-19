import {
  getAdmin,
  getCurrentUser,
  readBody
} from '../server/auth.js'

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value || '')
  )
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    const current = await getCurrentUser(req)

    if (!current?.user?.id) {
      return res.status(401).json({
        message: 'يجب تسجيل الدخول.'
      })
    }

    const supabase = getAdmin()
    const userId = current.user.id

    if (req.method === 'GET') {
      const date = String(
        req.query?.date || ''
      )

      if (!validDate(date)) {
        return res.status(400).json({
          message: 'التاريخ غير صحيح.'
        })
      }

      const {
        data: today,
        error: todayError
      } = await supabase
        .from('adhkar_daily_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('progress_date', date)
        .maybeSingle()

      if (todayError) {
        throw todayError
      }

      const {
        data: history,
        error: historyError
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
        .eq('user_id', userId)
        .order('progress_date', {
          ascending: false
        })
        .limit(400)

      if (historyError) {
        throw historyError
      }

      return res.status(200).json({
        today: today || null,
        history: history || []
      })
    }

    if (req.method === 'POST') {
      const body = await readBody(req)
      const date = String(
        body?.progress_date || ''
      )

      if (!validDate(date)) {
        return res.status(400).json({
          message: 'التاريخ غير صحيح.'
        })
      }

      const morningPercentage = Math.max(
        0,
        Math.min(
          100,
          Number(body?.morning_percentage || 0)
        )
      )

      const eveningPercentage = Math.max(
        0,
        Math.min(
          100,
          Number(body?.evening_percentage || 0)
        )
      )

      const payload = {
        user_id: userId,
        progress_date: date,
        morning_progress:
          body?.morning_progress || {},
        evening_progress:
          body?.evening_progress || {},
        morning_percentage:
          Math.round(morningPercentage),
        evening_percentage:
          Math.round(eveningPercentage),
        morning_completed:
          morningPercentage === 100,
        evening_completed:
          eveningPercentage === 100,
        updated_at:
          new Date().toISOString()
      }

      const {
        data,
        error
      } = await supabase
        .from('adhkar_daily_progress')
        .upsert(
          payload,
          {
            onConflict:
              'user_id,progress_date'
          }
        )
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return res.status(200).json({
        ok: true,
        today: data
      })
    }

    return res.status(405).json({
      message: 'طريقة الطلب غير مسموحة.'
    })
  } catch (error) {
    console.error('PROGRESS:', error)

    return res.status(500).json({
      message:
        error?.message ||
        'تعذر حفظ التقدم.'
    })
  }
}
