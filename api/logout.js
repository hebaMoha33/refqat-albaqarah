import {
  getCurrentUser,
  deleteSession,
  clearSessionCookie
} from '../server/auth.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'طريقة الطلب غير مسموحة.'
    })
  }

  try {
    const current = await getCurrentUser(req)

    if (current?.session?.id) {
      await deleteSession(current.session.id)
    }

    clearSessionCookie(res)

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('LOGOUT:', error)
    clearSessionCookie(res)
    return res.status(200).json({ ok: true })
  }
}
