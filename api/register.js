import {
  getAdmin,
  normalizeUsername,
  isValidUsername,
  createPasswordHash,
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
    const displayName = String(
      body?.username || ''
    ).trim()

    const username = normalizeUsername(displayName)
    const password = String(body?.password || '')

    if (!isValidUsername(username)) {
      return res.status(400).json({
        message:
          'اسم المستخدم يجب أن يكون من 3 إلى 24 حرفًا بدون مسافات.'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'
      })
    }

    const supabase = getAdmin()

    const {
      data: existing,
      error: existingError
    } = await supabase
      .from('app_users')
      .select('id')
      .eq('username_normalized', username)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (existing) {
      return res.status(409).json({
        message: 'اسم المستخدم مستخدم بالفعل.'
      })
    }

    const { salt, hash } =
      createPasswordHash(password)

    const {
      data: newUser,
      error: insertError
    } = await supabase
      .from('app_users')
      .insert({
        username: displayName,
        username_normalized: username,
        display_name: displayName,
        password_salt: salt,
        password_hash: hash
      })
      .select('id,username,display_name,created_at')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({
          message: 'اسم المستخدم مستخدم بالفعل.'
        })
      }

      throw insertError
    }

    try {
      await createSession(newUser.id, res)
    } catch (sessionError) {
      await supabase
        .from('app_users')
        .delete()
        .eq('id', newUser.id)

      throw sessionError
    }

    return res.status(201).json({
      ok: true,
      user: safeUser(newUser)
    })
  } catch (error) {
    console.error('REGISTER:', error)

    return res.status(500).json({
      message:
        error?.message ||
        'تعذر إنشاء الحساب.'
    })
  }
}
