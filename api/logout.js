import {
  getAdmin,
  getCurrentUser,
  clearSessionCookie
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

    const current =
      await getCurrentUser(
        req
      )


    if (
      current?.sessionId
    ) {

      const supabase =
        getAdmin()


      await supabase
        .from('app_sessions')
        .delete()
        .eq(
          'id',
          current.sessionId
        )

    }


    clearSessionCookie(res)


    return res
      .status(200)
      .json({
        ok: true
      })


  } catch {

    clearSessionCookie(res)


    return res
      .status(200)
      .json({
        ok: true
      })

  }

}