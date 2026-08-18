import { createClient } from '@supabase/supabase-js'
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash
} from 'node:crypto'

import process from 'node:process'
import { Buffer } from 'node:buffer'


const COOKIE_NAME = 'refqat_session'

const SESSION_DAYS = 365

const SESSION_MAX_AGE =
  60 * 60 * 24 * SESSION_DAYS


let adminClient = null


/* =========================================
   SUPABASE ADMIN
========================================= */

export function getAdmin() {

  if (adminClient) {
    return adminClient
  }


  const supabaseUrl =
    process.env.SUPABASE_URL


  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY


  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL is missing.'
    )
  }


  if (!supabaseSecret) {
    throw new Error(
      'SUPABASE_SECRET_KEY is missing.'
    )
  }


  adminClient =
    createClient(
      supabaseUrl,
      supabaseSecret,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
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

  return String(value)
    .normalize('NFKC')
    .trim()
    .toLowerCase()
}


export function isValidUsername(
  username
) {

  return /^[\p{L}\p{N}_-]{3,24}$/u
    .test(username)
}


/* =========================================
   PASSWORD
========================================= */

export function createPasswordHash(
  password
) {

  const salt =
    randomBytes(16)
      .toString('hex')


  const hash =
    scryptSync(
      String(password),
      salt,
      64
    ).toString('hex')


  return {
    salt,
    hash
  }
}


export function verifyPassword(
  password,
  salt,
  storedHash
) {

  try {

    const calculatedHash =
      scryptSync(
        String(password),
        String(salt),
        64
      )


    const savedHash =
      Buffer.from(
        String(storedHash),
        'hex'
      )


    if (
      calculatedHash.length !==
      savedHash.length
    ) {
      return false
    }


    return timingSafeEqual(
      calculatedHash,
      savedHash
    )

  } catch {

    return false
  }
}


/* =========================================
   TOKEN
========================================= */

function hashToken(token) {

  return createHash('sha256')
    .update(String(token))
    .digest('hex')
}


/* =========================================
   COOKIE
========================================= */

function parseCookies(req) {

  const cookieHeader =
    req?.headers?.cookie || ''


  const cookies = {}


  cookieHeader
    .split(';')
    .forEach(part => {

      const separator =
        part.indexOf('=')


      if (separator === -1) {
        return
      }


      const key =
        part
          .slice(0, separator)
          .trim()


      const value =
        part
          .slice(separator + 1)
          .trim()


      if (!key) {
        return
      }


      try {

        cookies[key] =
          decodeURIComponent(value)

      } catch {

        cookies[key] =
          value
      }

    })


  return cookies
}


function setSessionCookie(
  res,
  token
) {

  const secure =
    process.env.VERCEL
      ? '; Secure'
      : ''


  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE}`,
    secure
      ? 'Secure'
      : ''
  ]
    .filter(Boolean)
    .join('; ')


  res.setHeader(
    'Set-Cookie',
    cookie
  )
}


export function clearSessionCookie(
  res
) {

  const secure =
    process.env.VERCEL
      ? '; Secure'
      : ''


  const cookie = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secure
      ? 'Secure'
      : ''
  ]
    .filter(Boolean)
    .join('; ')


  res.setHeader(
    'Set-Cookie',
    cookie
  )
}


/* =========================================
   SAFE USER
========================================= */

export function safeUser(user) {

  if (!user) {
    return null
  }


  return {

    id:
      user.id,

    username:
      user.username,

    display_name:
      user.display_name,

    created_at:
      user.created_at
  }
}


/* =========================================
   DELETE EXPIRED SESSIONS
========================================= */

export async function deleteExpiredSessions() {

  try {

    const supabase =
      getAdmin()


    await supabase
      .from('app_sessions')
      .delete()
      .lt(
        'expires_at',
        new Date().toISOString()
      )

  } catch (error) {

    console.error(
      'DELETE EXPIRED SESSIONS:',
      error
    )
  }
}


/* =========================================
   CREATE SESSION
========================================= */

export async function createSession(
  userId,
  res
) {

  const supabase =
    getAdmin()


  const token =
    randomBytes(32)
      .toString('base64url')


  const tokenHash =
    hashToken(token)


  const expiresAt =
    new Date(
      Date.now() +
      SESSION_MAX_AGE * 1000
    ).toISOString()


  const {
    data,
    error
  } =
    await supabase
      .from('app_sessions')
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
        expires_at
      `)
      .single()


  if (error) {

    console.error(
      'CREATE SESSION DB ERROR:',
      error
    )

    throw new Error(
      `تعذر إنشاء الجلسة: ${error.message}`
    )
  }


  setSessionCookie(
    res,
    token
  )


  return data
}


/* =========================================
   GET CURRENT USER
========================================= */

export async function getCurrentUser(
  req
) {

  const cookies =
    parseCookies(req)


  const token =
    cookies[COOKIE_NAME]


  if (!token) {

    return null
  }


  const tokenHash =
    hashToken(token)


  const supabase =
    getAdmin()


  /* ابحث عن الجلسة */

  const {
    data: session,
    error: sessionError
  } =
    await supabase
      .from('app_sessions')
      .select(`
        id,
        user_id,
        token_hash,
        expires_at
      `)
      .eq(
        'token_hash',
        tokenHash
      )
      .maybeSingle()


  if (sessionError) {

    console.error(
      'GET SESSION ERROR:',
      sessionError
    )

    throw sessionError
  }


  if (!session) {

    console.log(
      'SESSION NOT FOUND'
    )

    return null
  }


  /* تأكد أن الجلسة لم تنتهِ */

  const expires =
    new Date(
      session.expires_at
    ).getTime()


  if (
    !Number.isFinite(expires) ||
    expires <= Date.now()
  ) {

    await supabase
      .from('app_sessions')
      .delete()
      .eq(
        'id',
        session.id
      )


    return null
  }


  /* اجلب المستخدم */

  const {
    data: user,
    error: userError
  } =
    await supabase
      .from('app_users')
      .select(`
        id,
        username,
        display_name,
        created_at
      `)
      .eq(
        'id',
        session.user_id
      )
      .maybeSingle()


  if (userError) {

    console.error(
      'GET USER ERROR:',
      userError
    )

    throw userError
  }


  if (!user) {

    console.log(
      'USER FOR SESSION NOT FOUND'
    )

    return null
  }


  return {

    session: {
      id:
        session.id,

      user_id:
        session.user_id,

      expires_at:
        session.expires_at
    },

    user:
      safeUser(user)

  }
}


/* =========================================
   DELETE SESSION
========================================= */

export async function deleteSession(
  sessionId
) {

  if (!sessionId) {
    return
  }


  const supabase =
    getAdmin()


  const {
    error
  } =
    await supabase
      .from('app_sessions')
      .delete()
      .eq(
        'id',
        sessionId
      )


  if (error) {

    console.error(
      'DELETE SESSION ERROR:',
      error
    )
  }
}


/* =========================================
   READ REQUEST BODY
========================================= */

export async function readBody(req) {

  if (
    req.body &&
    typeof req.body === 'object'
  ) {

    return req.body
  }


  if (
    typeof req.body === 'string'
  ) {

    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }


  let raw = ''


  for await (
    const chunk of req
  ) {

    raw += chunk
  }


  if (!raw) {
    return {}
  }


  try {

    return JSON.parse(raw)

  } catch {

    return {}
  }
}