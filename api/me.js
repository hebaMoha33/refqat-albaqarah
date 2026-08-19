import {
  getCurrentUser
} from '../server/auth.js'

export default async function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate'
  )

  if (req.method !== 'GET') {
    return res.status(405).json({
      message: 'طريقة الطلب غير مسموحة.'
    })
  }

  try {
    const current = await getCurrentUser(req)

    return res.status(200).json({
      user: current?.user || null
    })
  } catch (error) {
    console.error('ME:', error)

    return res.status(500).json({
      user: null,
      message: 'تعذر قراءة جلسة المستخدم.'
    })
  }
}
