import {
  getAdmin,
  normalizeUsername,
  verifyPassword,
  createSession,
  readBody
} from '../server/auth.js'


export default async function handler(
  req,
  res
) {

  if (
    req.method !== 'POST'
  ) {

    return res
      .status(405)
      .json({
        message:
          'Method not allowed'
      })

  }


  try {

    const body =
      readBody(req)


    const username =
      normalizeUsername(
        body.username || ''
      )


    const password =
      body.password || ''


    const supabase =
      getAdmin()


    const {
      data: user
    } =
      await supabase
        .from('app_users')
        .select(`
          id,
          username,
          display_name,
          password_salt,
          password_hash
        `)
        .eq(
          'username_normalized',
          username
        )
        .maybeSingle()


    if (!user) {

      return res
        .status(401)
        .json({
          message:
            'اسم المستخدم أو كلمة المرور غير صحيحة.'
        })

    }


    const correct =
      verifyPassword(
        password,
        user.password_salt,
        user.password_hash
      )


    if (!correct) {

      return res
        .status(401)
        .json({
          message:
            'اسم المستخدم أو كلمة المرور غير صحيحة.'
        })

    }


    await createSession(
      res,
      user.id
    )


    return res
      .status(200)
      .json({

        ok: true,

        user: {
          id:
            user.id,

          username:
            user.username,

          display_name:
            user.display_name
        }

      })


  } catch (error) {

    console.error(
      'LOGIN:',
      error
    )


    return res
      .status(500)
      .json({
        message:
          'تعذر تسجيل الدخول.'
      })

  }

}