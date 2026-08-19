import {
  getAdmin,
  normalizeUsername,
  verifyPassword,
  createSession,
  readBody,
  safeUser
} from '../server/auth.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'طريقة الطلب غير مسموحة.'
    })
  }

  try {
    const body = await readBody(req)
    const username = normalizeUsername(body?.username)
    const password = String(body?.password || '')

    if (!username || !password) {
      return res.status(400).json({
        message: 'أدخلي اسم المستخدم وكلمة المرور.'
      })
    }

    const supabase = getAdmin()

    const { data: user, error } = await supabase
      .from('app_users')
      .select(`
        id,
        username,
        username_normalized,
        display_name,
        password_salt,
        password_hash,
        created_at
      `)
      .eq('username_normalized', username)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!user) {
      return res.status(401).json({
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة.'
      })
    }

    const valid = verifyPassword(
      password,
      user.password_salt,
      user.password_hash
    )

    if (!valid) {
      return res.status(401).json({
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة.'
      })
    }

    await createSession(user.id, res)

    return res.status(200).json({
      ok: true,
      user: safeUser(user)
    })
  } catch (error) {
    console.error('LOGIN:', error)

    return res.status(500).json({
      message:
        error?.message ||
        'تعذر تسجيل الدخول.'
    })
  }
}
