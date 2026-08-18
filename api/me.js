import {
  getCurrentUser
} from '../server/auth.js'


export default async function handler(
  req,
  res
) {

  if (
    req.method !== 'GET'
  ) {

    return res
      .status(405)
      .json({
        message:
          'Method not allowed'
      })

  }


  try {

    const result =
      await getCurrentUser(
        req
      )


    if (!result) {

      return res
        .status(401)
        .json({
          user: null
        })

    }


    return res
      .status(200)
      .json({
        user:
          result.user
      })


  } catch (error) {

    console.error(
      'ME:',
      error
    )


    return res
      .status(500)
      .json({
        user: null
      })

  }

}