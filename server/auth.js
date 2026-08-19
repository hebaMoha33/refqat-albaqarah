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
const SESSION_MAX_AGE = 60 * 60 * 24 * 365

let adminClient = null

export function getAdmin() {
  if (adminClient) {
    return adminClient
  }

  const url = process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('SUPABASE_URL is missing.')
  }

  if (!key) {
    throw new Error('SUPABASE_SECRET_KEY is missing.')
  }

  adminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })

  return adminClient
}

export function normalizeUsername(value = '') {
  return String(value)
    .normalize('NFKC')
    .trim()
    .toLowerCase()
}

export function isValidUsername(username) {
  return /^[\p{L}\p{N}_-]{3,24}$/u
    .test(username)
}

export function createPasswordHash(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(
    String(password),
    salt,
    64
  ).toString('hex')

  return { salt, hash }
}

export function verifyPassword(
  password,
  salt,
  storedHash
) {
  try {
    const calculated = scryptSync(
      String(password),
      String(salt),
      64
    )

    const saved = Buffer.from(
      String(storedHash),
      'hex'
    )

    return (
      calculated.length === saved.length &&
      timingSafeEqual(calculated, saved)
    )
  } catch {
    return false
  }
}

function hashToken(token) {
  return createHash('sha256')
    .update(String(token))
    .digest('hex')
}

function parseCookies(req) {
  const header = req?.headers?.cookie || ''
  const cookies = {}

  header.split(';').forEach(part => {
    const index = part.indexOf('=')

    if (index === -1) {
      return
    }

    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()

    if (!key) {
      return
    }

    try {
      cookies[key] = decodeURIComponent(value)
    } catch {
      cookies[key] = value
    }
  })

  return cookies
}

function setSessionCookie(res, token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE}`
  ]

  if (process.env.VERCEL) {
    parts.push('Secure')
  }

  res.setHeader(
    'Set-Cookie',
    parts.join('; ')
  )
}

export function clearSessionCookie(res) {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ]

  if (process.env.VERCEL) {
    parts.push('Secure')
  }

  res.setHeader(
    'Set-Cookie',
    parts.join('; ')
  )
}

export function safeUser(user) {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    created_at: user.created_at
  }
}

export async function createSession(userId, res) {
  const supabase = getAdmin()
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE * 1000
  ).toISOString()

  const { data, error } = await supabase
    .from('app_sessions')
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt
    })
    .select('id,user_id,expires_at')
    .single()

  if (error) {
    console.error('CREATE SESSION:', error)
    throw new Error(
      `تعذر إنشاء الجلسة: ${error.message}`
    )
  }

  setSessionCookie(res, token)

  return data
}

export async function getCurrentUser(req) {
  const cookies = parseCookies(req)
  const token = cookies[COOKIE_NAME]

  if (!token) {
    return null
  }

  const tokenHash = hashToken(token)
  const supabase = getAdmin()

  const {
    data: session,
    error: sessionError
  } = await supabase
    .from('app_sessions')
    .select('id,user_id,expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (sessionError) {
    console.error('GET SESSION:', sessionError)
    throw sessionError
  }

  if (!session) {
    return null
  }

  const expires = new Date(
    session.expires_at
  ).getTime()

  if (
    !Number.isFinite(expires) ||
    expires <= Date.now()
  ) {
    await supabase
      .from('app_sessions')
      .delete()
      .eq('id', session.id)

    return null
  }

  const {
    data: user,
    error: userError
  } = await supabase
    .from('app_users')
    .select('id,username,display_name,created_at')
    .eq('id', session.user_id)
    .maybeSingle()

  if (userError) {
    console.error('GET USER:', userError)
    throw userError
  }

  if (!user) {
    return null
  }

  return {
    session,
    user: safeUser(user)
  }
}

export async function deleteSession(sessionId) {
  if (!sessionId) {
    return
  }

  const supabase = getAdmin()

  const { error } = await supabase
    .from('app_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    console.error('DELETE SESSION:', error)
  }
}

export async function readBody(req) {
  if (
    req.body &&
    typeof req.body === 'object'
  ) {
    return req.body
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }

  let raw = ''

  for await (const chunk of req) {
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
