import process from 'node:process'

import {
  Buffer
} from 'node:buffer'

import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from 'node:crypto'

import {
  createClient
} from '@supabase/supabase-js'


/* =========================================
   CONSTANTS
========================================= */

export const COOKIE_NAME =
  'refqat_session'

export const SESSION_COOKIE_NAME =
  COOKIE_NAME

export const SESSION_DAYS =
  365

export const SESSION_MAX_AGE =
  60 * 60 * 24 * SESSION_DAYS


let adminClient =
  null


/* =========================================
   SUPABASE ADMIN
========================================= */

export function getAdmin() {
  if (adminClient) {
    return adminClient
  }


  const url =
    process.env.SUPABASE_URL

  const secretKey =
    process.env.SUPABASE_SECRET_KEY


  if (
    !url ||
    !secretKey
  ) {
    throw new Error(
      'Supabase server environment variables are missing.'
    )
  }


  adminClient =
    createClient(
      url,
      secretKey,
      {
        auth: {
          persistSession:
            false,

          autoRefreshToken:
            false,

          detectSessionInUrl:
            false
        }
      }
    )


  return adminClient
}


/* =========================================
   USERNAME
========================================= */

export function normalizeUsername(
  value = ''
) {
  return String(
    value || ''
  )
    .normalize(
      'NFKC'
    )
    .trim()
    .toLowerCase()
}


export function validUsername(
  value = ''
) {
  const username =
    normalizeUsername(
      value
    )


  return (
    /^[\p{L}\p{N}_-]{3,24}$/u
      .test(
        username
      )
  )
}


/*
  Alias للتوافق
*/
export const isValidUsername =
  validUsername


/* =========================================
   PASSWORD HASH
========================================= */

export function createPasswordHash(
  password,
  existingSalt = null
) {
  const passwordText =
    String(
      password || ''
    )


  if (
    passwordText.length <
    6
  ) {
    throw new Error(
      'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'
    )
  }


  const salt =
    existingSalt ||
    randomBytes(16)
      .toString(
        'hex'
      )


  const hash =
    scryptSync(
      passwordText,
      salt,
      64
    )
      .toString(
        'hex'
      )


  return {
    salt,
    hash
  }
}


/*
  Alias قد تستخدمه register.js
*/
export function hashPassword(
  password,
  salt = null
) {
  return createPasswordHash(
    password,
    salt
  )
}


/* =========================================
   VERIFY PASSWORD
========================================= */

export function verifyPassword(
  password,
  salt,
  expectedHash
) {
  try {
    if (
      !password ||
      !salt ||
      !expectedHash
    ) {
      return false
    }


    const actual =
      scryptSync(
        String(password),
        String(salt),
        64
      )


    const expected =
      Buffer.from(
        String(
          expectedHash
        ),
        'hex'
      )


    if (
      actual.length !==
      expected.length
    ) {
      return false
    }


    return timingSafeEqual(
      actual,
      expected
    )

  } catch (error) {

    console.error(
      'VERIFY PASSWORD:',
      error
    )


    return false
  }
}


/* =========================================
   SESSION TOKEN HASH
========================================= */

export function hashSessionToken(
  token
) {
  return createHash(
    'sha256'
  )
    .update(
      String(
        token || ''
      )
    )
    .digest(
      'hex'
    )
}


/* =========================================
   COOKIE PARSER
========================================= */

export function getSessionToken(
  req
) {
  const cookieHeader =
    String(
      req?.headers?.cookie ||
      ''
    )


  if (!cookieHeader) {
    return null
  }


  const cookies =
    cookieHeader
      .split(';')
      .map(
        item =>
          item.trim()
      )


  for (
    const cookie of
    cookies
  ) {
    const separator =
      cookie.indexOf('=')


    if (
      separator === -1
    ) {
      continue
    }


    const name =
      cookie
        .slice(
          0,
          separator
        )
        .trim()


    const value =
      cookie
        .slice(
          separator + 1
        )
        .trim()


    if (
      name ===
      COOKIE_NAME
    ) {
      try {
        return decodeURIComponent(
          value
        )
      } catch {
        return value
      }
    }
  }


  return null
}


/* =========================================
   COOKIE BUILDERS
========================================= */

export function buildSessionCookie(
  token
) {
  const secure =
    process.env.VERCEL_ENV ===
      'production' ||
    process.env.NODE_ENV ===
      'production'


  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(
      token
    )}`,

    'Path=/',

    'HttpOnly',

    'SameSite=Lax',

    `Max-Age=${SESSION_MAX_AGE}`
  ]


  if (secure) {
    parts.push(
      'Secure'
    )
  }


  return parts.join(
    '; '
  )
}


export function buildClearSessionCookie() {
  const secure =
    process.env.VERCEL_ENV ===
      'production' ||
    process.env.NODE_ENV ===
      'production'


  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ]


  if (secure) {
    parts.push(
      'Secure'
    )
  }


  return parts.join(
    '; '
  )
}


/* =========================================
   COOKIE SETTERS
========================================= */

export function setSessionCookie(
  res,
  token
) {
  if (
    !res ||
    typeof res.setHeader !==
      'function'
  ) {
    return
  }


  res.setHeader(
    'Set-Cookie',
    buildSessionCookie(
      token
    )
  )
}


export function clearSessionCookie(
  res
) {
  if (
    !res ||
    typeof res.setHeader !==
      'function'
  ) {
    return
  }


  res.setHeader(
    'Set-Cookie',
    buildClearSessionCookie()
  )
}


/*
  Aliases احتياطية
*/
export const sessionCookie =
  buildSessionCookie

export const clearCookie =
  buildClearSessionCookie


/* =========================================
   CREATE SESSION
========================================= */

export async function createSession(
  firstArgument,
  secondArgument
) {
  /*
    ندعم:

    createSession(userId)

    createSession(userId, res)

    createSession(res, userId)
  */


  let userId =
    null

  let res =
    null


  if (
    typeof firstArgument ===
    'string'
  ) {
    userId =
      firstArgument

    res =
      secondArgument || null
  }


  else if (
    firstArgument &&
    typeof firstArgument.setHeader ===
      'function'
  ) {
    res =
      firstArgument

    userId =
      secondArgument
  }


  if (!userId) {
    throw new Error(
      'User ID is required to create a session.'
    )
  }


  const supabase =
    getAdmin()


  const token =
    randomBytes(48)
      .toString(
        'hex'
      )


  const tokenHash =
    hashSessionToken(
      token
    )


  const expiresAt =
    new Date(
      Date.now() +
      SESSION_MAX_AGE *
        1000
    )
      .toISOString()


  const {
    data: session,
    error
  } =
    await supabase
      .from(
        'app_sessions'
      )
      .insert({
        user_id:
          userId,

        token_hash:
          tokenHash,

        expires_at:
          expiresAt
      })
      .select(`
        id,
        user_id,
        created_at,
        expires_at
      `)
      .single()


  if (error) {
    throw error
  }


  /*
    إذا مررنا res
    نضع Cookie تلقائيًا.
  */

  if (res) {
    setSessionCookie(
      res,
      token
    )
  }


  return {
    token,
    tokenHash,

    expiresAt,

    session
  }
}


/* =========================================
   SAFE USER
========================================= */

export function safeUser(
  value
) {
  if (!value) {
    return null
  }


  /*
    يدعم تمرير:
    user مباشرة

    أو:
    { user, session }
  */

  const user =
    value?.user ||
    value


  if (!user?.id) {
    return null
  }


  return {
    id:
      user.id,

    username:
      user.username,

    username_normalized:
      user.username_normalized,

    display_name:
      user.display_name ||
      user.username,

    /*
      Alias للواجهة لو احتاجته.
    */
    displayName:
      user.display_name ||
      user.username,

    created_at:
      user.created_at
  }
}


/* =========================================
   CURRENT SESSION + USER
========================================= */

export async function getCurrentUser(
  req
) {
  const token =
    getSessionToken(
      req
    )


  if (!token) {
    return {
      user: null,
      session: null
    }
  }


  const supabase =
    getAdmin()


  const tokenHash =
    hashSessionToken(
      token
    )


  const {
    data: session,
    error: sessionError
  } =
    await supabase
      .from(
        'app_sessions'
      )
      .select(`
        id,
        user_id,
        token_hash,
        created_at,
        expires_at
      `)
      .eq(
        'token_hash',
        tokenHash
      )
      .maybeSingle()


  if (sessionError) {
    throw sessionError
  }


  if (!session) {
    return {
      user: null,
      session: null
    }
  }


  const expiresAt =
    new Date(
      session.expires_at
    )
      .getTime()


  if (
    !Number.isFinite(
      expiresAt
    ) ||
    expiresAt <=
      Date.now()
  ) {

    await supabase
      .from(
        'app_sessions'
      )
      .delete()
      .eq(
        'id',
        session.id
      )


    return {
      user: null,
      session: null
    }
  }


  const {
    data: user,
    error: userError
  } =
    await supabase
      .from(
        'app_users'
      )
      .select(`
        id,
        username,
        username_normalized,
        display_name,
        created_at
      `)
      .eq(
        'id',
        session.user_id
      )
      .maybeSingle()


  if (userError) {
    throw userError
  }


  if (!user) {

    await supabase
      .from(
        'app_sessions'
      )
      .delete()
      .eq(
        'id',
        session.id
      )


    return {
      user: null,
      session: null
    }
  }


  return {
    user:
      safeUser(
        user
      ),

    session: {
      id:
        session.id,

      user_id:
        session.user_id,

      created_at:
        session.created_at,

      expires_at:
        session.expires_at
    }
  }
}


/*
  Alias احتياطي
*/
export const getSessionUser =
  getCurrentUser


/* =========================================
   DELETE SESSION
========================================= */

export async function deleteSession(
  firstArgument,
  secondArgument
) {
  /*
    يدعم:

    deleteSession(req)

    deleteSession(req, res)

    deleteSession(res, req)

    deleteSession(token)

    deleteSession(token, res)
  */


  let req =
    null

  let res =
    null

  let token =
    null


  if (
    typeof firstArgument ===
    'string'
  ) {
    token =
      firstArgument

    res =
      secondArgument || null
  }


  else if (
    firstArgument?.headers
  ) {
    req =
      firstArgument

    res =
      secondArgument || null
  }


  else if (
    firstArgument &&
    typeof firstArgument.setHeader ===
      'function'
  ) {
    res =
      firstArgument

    req =
      secondArgument || null
  }


  if (
    !token &&
    req
  ) {
    token =
      getSessionToken(
        req
      )
  }


  if (token) {
    const supabase =
      getAdmin()


    const tokenHash =
      hashSessionToken(
        token
      )


    const {
      error
    } =
      await supabase
        .from(
          'app_sessions'
        )
        .delete()
        .eq(
          'token_hash',
          tokenHash
        )


    if (error) {
      throw error
    }
  }


  if (res) {
    clearSessionCookie(
      res
    )
  }


  return {
    ok: true
  }
}


/* =========================================
   DELETE CURRENT SESSION
========================================= */

export async function deleteCurrentSession(
  req,
  res = null
) {
  return deleteSession(
    req,
    res
  )
}


/* =========================================
   REQUEST BODY
========================================= */

export async function readBody(
  req
) {
  /*
    في Vercel يكون req.body غالبًا
    جاهزًا بالفعل.
  */


  if (
    req?.body &&
    typeof req.body ===
      'object' &&
    !Buffer.isBuffer(
      req.body
    )
  ) {
    return req.body
  }


  if (
    typeof req?.body ===
    'string'
  ) {
    try {
      return JSON.parse(
        req.body
      )
    } catch {
      return {}
    }
  }


  const chunks = []


  try {
    for await (
      const chunk of req
    ) {
      chunks.push(
        Buffer.from(
          chunk
        )
      )
    }
  } catch {
    return {}
  }


  if (
    chunks.length ===
    0
  ) {
    return {}
  }


  const text =
    Buffer
      .concat(
        chunks
      )
      .toString(
        'utf8'
      )


  if (!text) {
    return {}
  }


  try {
    return JSON.parse(
      text
    )
  } catch {
    return {}
  }
}