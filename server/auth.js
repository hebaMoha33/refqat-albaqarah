import { createClient } from '@supabase/supabase-js'

import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash
} from 'node:crypto'

import process from 'node:process'
import { Buffer } from 'node:buffer'


/* =========================================
   SETTINGS
========================================= */

const COOKIE_NAME =
  'refqat_session'

const SESSION_DAYS =
  365

let adminClient = null


/* =========================================
   SUPABASE SERVER CLIENT
========================================= */

export function getAdmin() {

  if (adminClient) {
    return adminClient
  }


  const url =
    process.env.SUPABASE_URL


  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY


  if (!url || !key) {

    throw new Error(
      'Supabase server environment variables are missing.'
    )

  }


  adminClient =
    createClient(
      url,
      key,
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

  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()

}


/* =========================================
   VALIDATE USERNAME
========================================= */

export function validUsername(
  value
) {

  const username =
    normalizeUsername(value)


  return /^[\p{L}\p{N}_-]{3,24}$/u
    .test(username)

}


/* =========================================
   PASSWORD HASH
========================================= */

export function createPasswordHash(
  password
) {

  const salt =
    randomBytes(16)
      .toString('hex')


  const hash =
    scryptSync(
      password,
      salt,
      64
    )
      .toString('hex')


  return {
    salt,
    hash
  }

}


/* =========================================
   VERIFY PASSWORD
========================================= */

export function verifyPassword(
  password,
  salt,
  storedHash
) {

  try {

    const supplied =
      scryptSync(
        password,
        salt,
        64
      )


    const stored =
      Buffer.from(
        storedHash,
        'hex'
      )


    if (
      supplied.length !==
      stored.length
    ) {

      return false

    }


    return timingSafeEqual(
      supplied,
      stored
    )

  } catch (error) {

    console.error(
      'Password verification error:',
      error
    )


    return false

  }

}


/* =========================================
   HASH SESSION TOKEN
========================================= */

function hashToken(
  token
) {

  return createHash(
    'sha256'
  )
    .update(token)
    .digest('hex')

}


/* =========================================
   CREATE RANDOM SESSION TOKEN
========================================= */

function createRawToken() {

  return randomBytes(32)
    .toString('base64url')

}


/* =========================================
   SESSION EXPIRY
========================================= */

function sessionExpiry() {

  const milliseconds =
    SESSION_DAYS *
    24 *
    60 *
    60 *
    1000


  return new Date(
    Date.now() +
    milliseconds
  )

}


/* =========================================
   READ SESSION TOKEN FROM COOKIE
========================================= */

export function getSessionToken(
  req
) {

  const rawCookies =
    req.headers?.cookie ||
    ''


  const cookies =
    rawCookies.split(';')


  for (
    const cookie of cookies
  ) {

    const [
      key,
      ...rest
    ] =
      cookie
        .trim()
        .split('=')


    if (
      key ===
      COOKIE_NAME
    ) {

      return decodeURIComponent(
        rest.join('=')
      )

    }

  }


  return null

}


/* =========================================
   SET SESSION COOKIE
========================================= */

export function setSessionCookie(
  res,
  token
) {

  const maxAge =
    SESSION_DAYS *
    24 *
    60 *
    60


  const secure =
    process.env.VERCEL
      ? '; Secure'
      : ''


  const cookie =
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`


  res.setHeader(
    'Set-Cookie',
    cookie
  )

}


/* =========================================
   CLEAR SESSION COOKIE
========================================= */

export function clearSessionCookie(
  res
) {

  const secure =
    process.env.VERCEL
      ? '; Secure'
      : ''


  const cookie =
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`


  res.setHeader(
    'Set-Cookie',
    cookie
  )

}


/* =========================================
   CREATE SESSION
========================================= */

export async function createSession(
  res,
  userId
) {

  const supabase =
    getAdmin()


  const rawToken =
    createRawToken()


  const tokenHash =
    hashToken(
      rawToken
    )


  const expiresAt =
    sessionExpiry()


  const {
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
            .toISOString()

      })


  if (error) {

    console.error(
      'Create session error:',
      error
    )


    throw error

  }


  setSessionCookie(
    res,
    rawToken
  )


  return rawToken

}


/* =========================================
   GET CURRENT USER
========================================= */

export async function getCurrentUser(
  req
) {

  const token =
    getSessionToken(req)


  if (!token) {

    return null

  }


  const tokenHash =
    hashToken(token)


  const supabase =
    getAdmin()


  const {
    data: session,
    error: sessionError
  } =
    await supabase
      .from('app_sessions')
      .select(`
        id,
        user_id,
        expires_at
      `)
      .eq(
        'token_hash',
        tokenHash
      )
      .maybeSingle()


  if (
    sessionError ||
    !session
  ) {

    return null

  }


  /* =====================================
     CHECK EXPIRATION
  ===================================== */

  const expiresAt =
    new Date(
      session.expires_at
    )


  const now =
    new Date()


  if (
    expiresAt <= now
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


  /* =====================================
     LOAD USER
  ===================================== */

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


  if (
    userError ||
    !user
  ) {

    return null

  }


  return {

    user,

    sessionId:
      session.id

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
      'Delete session error:',
      error
    )

  }

}


/* =========================================
   DELETE EXPIRED SESSIONS
========================================= */

export async function deleteExpiredSessions() {

  const supabase =
    getAdmin()


  const {
    error
  } =
    await supabase
      .from('app_sessions')
      .delete()
      .lt(
        'expires_at',
        new Date()
          .toISOString()
      )


  if (error) {

    console.error(
      'Delete expired sessions error:',
      error
    )

  }

}


/* =========================================
   READ REQUEST BODY
========================================= */

export function readBody(
  req
) {

  if (
    req.body &&
    typeof req.body ===
    'object'
  ) {

    return req.body

  }


  if (
    typeof req.body ===
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


  return {}

}


/* =========================================
   SAFE USER OBJECT
========================================= */

export function safeUser(
  user
) {

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