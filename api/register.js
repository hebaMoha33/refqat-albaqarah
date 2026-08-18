import {
  getAdmin,
  normalizeUsername,
  validUsername,
  createPasswordHash,
  createSession,
  readBody
} from '../server/auth.js'


export default async function handler(
  req,
  res
) {

  /* =====================================
     METHOD
  ===================================== */

  if (
    req.method !== 'POST'
  ) {

    return res
      .status(405)
      .json({
        message:
          'طريقة الطلب غير مسموحة.'
      })

  }


  let createdUserId = null


  try {

    /* =====================================
       BODY
    ===================================== */

    const body =
      readBody(req)


    const rawUsername =
      String(
        body?.username || ''
      )
        .trim()


    const username =
      normalizeUsername(
        rawUsername
      )


    const password =
      String(
        body?.password || ''
      )


    /* =====================================
       VALIDATION
    ===================================== */

    if (
      !validUsername(
        username
      )
    ) {

      return res
        .status(400)
        .json({
          message:
            'اسم المستخدم يجب أن يكون من 3 إلى 24 حرفًا بدون مسافات.'
        })

    }


    if (
      password.length < 6
    ) {

      return res
        .status(400)
        .json({
          message:
            'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'
        })

    }


    /* =====================================
       SUPABASE SERVER
    ===================================== */

    let supabase


    try {

      supabase =
        getAdmin()

    } catch (error) {

      console.error(
        'GET ADMIN ERROR:',
        error
      )


      return res
        .status(500)
        .json({
          message:
            `مشكلة في اتصال الخادم بـ Supabase: ${error.message}`
        })

    }


    /* =====================================
       CHECK USERNAME
    ===================================== */

    const {
      data: existingUser,
      error: lookupError
    } =
      await supabase
        .from('app_users')
        .select('id')
        .eq(
          'username_normalized',
          username
        )
        .maybeSingle()


    if (lookupError) {

      console.error(
        'LOOKUP ERROR:',
        lookupError
      )


      return res
        .status(500)
        .json({
          message:
            `تعذر الوصول إلى جدول المستخدمين: ${lookupError.message}`
        })

    }


    if (existingUser) {

      return res
        .status(409)
        .json({
          message:
            'اسم المستخدم مستخدم بالفعل. اختاري اسمًا آخر أو سجلي الدخول.'
        })

    }


    /* =====================================
       PASSWORD
    ===================================== */

    let passwordData


    try {

      passwordData =
        createPasswordHash(
          password
        )

    } catch (error) {

      console.error(
        'PASSWORD HASH ERROR:',
        error
      )


      return res
        .status(500)
        .json({
          message:
            `تعذر تجهيز كلمة المرور: ${error.message}`
        })

    }


    /* =====================================
       CREATE USER
    ===================================== */

    const {
      data: user,
      error: createUserError
    } =
      await supabase
        .from('app_users')
        .insert({

          username:
            rawUsername,

          username_normalized:
            username,

          display_name:
            rawUsername,

          password_salt:
            passwordData.salt,

          password_hash:
            passwordData.hash

        })
        .select(`
          id,
          username,
          display_name,
          created_at
        `)
        .single()


    if (createUserError) {

      console.error(
        'CREATE USER ERROR:',
        createUserError
      )


      return res
        .status(500)
        .json({
          message:
            `تعذر إنشاء المستخدم في قاعدة البيانات: ${createUserError.message}`
        })

    }


    if (
      !user?.id
    ) {

      return res
        .status(500)
        .json({
          message:
            'تم تنفيذ الطلب لكن لم يتم إرجاع معرف المستخدم.'
        })

    }


    createdUserId =
      user.id


    /* =====================================
       CREATE SESSION
    ===================================== */

    try {

      await createSession(
        res,
        user.id
      )

    } catch (sessionError) {

      console.error(
        'CREATE SESSION ERROR:',
        sessionError
      )


      /*
        إذا فشلت الجلسة،
        نحذف المستخدم الذي
        أنشئ للتو حتى لا يبقى
        حساب ناقص.
      */

      await supabase
        .from('app_users')
        .delete()
        .eq(
          'id',
          user.id
        )


      createdUserId = null


      return res
        .status(500)
        .json({
          message:
            `تم الاتصال بقاعدة البيانات لكن تعذر إنشاء جلسة الدخول: ${sessionError.message}`
        })

    }


    /* =====================================
       SUCCESS
    ===================================== */

    return res
      .status(201)
      .json({

        ok: true,

        user: {

          id:
            user.id,

          username:
            user.username,

          display_name:
            user.display_name,

          created_at:
            user.created_at

        }

      })


  } catch (error) {

    console.error(
      'REGISTER UNEXPECTED ERROR:',
      error
    )


    /*
      تنظيف احتياطي
    */

    if (
      createdUserId
    ) {

      try {

        const supabase =
          getAdmin()


        await supabase
          .from('app_users')
          .delete()
          .eq(
            'id',
            createdUserId
          )

      } catch {

        // لا شيء

      }

    }


    return res
      .status(500)
      .json({
        message:
          `خطأ غير متوقع أثناء إنشاء الحساب: ${error?.message || 'Unknown error'}`
      })

  }

}