import loginHandler
  from '../server/authActions/login.js'

import logoutHandler
  from '../server/authActions/logout.js'

import meHandler
  from '../server/authActions/me.js'

import registerHandler
  from '../server/authActions/register.js'


export default async function handler(
  req,
  res
) {
  const action =
    String(
      req.query?.action || ''
    )
      .trim()
      .toLowerCase()


  if (
    action === 'login'
  ) {
    return loginHandler(
      req,
      res
    )
  }


  if (
    action === 'logout'
  ) {
    return logoutHandler(
      req,
      res
    )
  }


  if (
    action === 'me'
  ) {
    return meHandler(
      req,
      res
    )
  }


  if (
    action === 'register'
  ) {
    return registerHandler(
      req,
      res
    )
  }


  return res
    .status(404)
    .json({
      message:
        'عملية الحساب غير موجودة.'
    })
}