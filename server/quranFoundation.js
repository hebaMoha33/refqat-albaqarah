import process from 'node:process'

import {
  Buffer
} from 'node:buffer'


let cachedToken = null
let tokenExpiresAt = 0


function getConfig() {
  const clientId =
    process.env.QF_CLIENT_ID

  const clientSecret =
    process.env.QF_CLIENT_SECRET


  if (
    !clientId ||
    !clientSecret
  ) {
    throw new Error(
      'Quran Foundation credentials are missing.'
    )
  }


  return {
    clientId,
    clientSecret,

    oauthBase:
      'https://oauth2.quran.foundation',

    apiBase:
      'https://apis.quran.foundation'
  }
}


/* =========================================
   ACCESS TOKEN
========================================= */

async function getAccessToken(
  forceRefresh = false
) {
  const {
    clientId,
    clientSecret,
    oauthBase
  } =
    getConfig()


  const now =
    Date.now()


  /*
    إذا كان لدينا Token صالح
    نستخدمه بدل طلب Token جديد.
  */
  if (
    !forceRefresh &&
    cachedToken &&
    tokenExpiresAt >
      now + 60_000
  ) {
    return cachedToken
  }


  const basic =
    Buffer
      .from(
        `${clientId}:${clientSecret}`
      )
      .toString(
        'base64'
      )


  const response =
    await fetch(
      `${oauthBase}/oauth2/token`,
      {
        method:
          'POST',

        headers: {
          Authorization:
            `Basic ${basic}`,

          'Content-Type':
            'application/x-www-form-urlencoded'
        },

        body:
          'grant_type=client_credentials&scope=content'
      }
    )


  const data =
    await response
      .json()
      .catch(
        () => ({})
      )


  if (!response.ok) {
    throw new Error(
      data?.message ||
      'تعذر تسجيل الدخول إلى مصدر القرآن.'
    )
  }


  cachedToken =
    data.access_token


  const expiresIn =
    Number(
      data.expires_in ||
      3600
    )


  tokenExpiresAt =
    now +
    expiresIn * 1000


  return cachedToken
}


/* =========================================
   QURAN FOUNDATION REQUEST
========================================= */

export async function callQuranFoundation(
  path
) {
  const {
    clientId,
    apiBase
  } =
    getConfig()


  async function execute(
    forceRefresh
  ) {
    const token =
      await getAccessToken(
        forceRefresh
      )


    return fetch(
      `${apiBase}${path}`,
      {
        headers: {
          'x-auth-token':
            token,

          'x-client-id':
            clientId
        }
      }
    )
  }


  /*
    المحاولة الأولى
  */
  let response =
    await execute(
      false
    )


  /*
    إذا انتهت صلاحية Token
    نطلب واحدًا جديدًا ونحاول مرة ثانية.
  */
  if (
    response.status ===
    401
  ) {
    response =
      await execute(
        true
      )
  }


  const data =
    await response
      .json()
      .catch(
        () => ({})
      )


  if (!response.ok) {
    throw new Error(
      data?.message ||
      'تعذر تحميل نص القرآن.'
    )
  }


  return data
}