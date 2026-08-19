/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import {
  apiRequest
} from '../lib/api'

import {
  normalizeUsername,
  isValidUsername
} from '../lib/appHelpers'


const AuthContext =
  createContext(null)


export function AuthProvider({
  children
}) {
  const [
    currentUser,
    setCurrentUser
  ] = useState(null)

  const [
    authChecked,
    setAuthChecked
  ] = useState(false)

  const [
    showLogin,
    setShowLogin
  ] = useState(false)

  const [
    authMode,
    setAuthMode
  ] = useState('login')

  const [
    authUsername,
    setAuthUsername
  ] = useState('')

  const [
    password,
    setPassword
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword
  ] = useState('')

  const [
    authMessage,
    setAuthMessage
  ] = useState('')

  const [
    authLoading,
    setAuthLoading
  ] = useState(false)


  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        const response =
          await fetch(
            '/api/me',
            {
              method: 'GET',
              credentials:
                'include',
              cache:
                'no-store'
            }
          )

        const data =
          await response
            .json()
            .catch(
              () => ({})
            )

        if (cancelled) {
          return
        }

        setCurrentUser(
          response.ok
            ? data?.user || null
            : null
        )
      } catch (error) {
        console.error(
          'CHECK SESSION:',
          error
        )

        if (!cancelled) {
          setCurrentUser(null)
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true)
        }
      }
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [])


  function openAuth(
    mode = 'login'
  ) {
    setAuthMode(mode)
    setAuthMessage('')
    setPassword('')
    setConfirmPassword('')
    setShowLogin(true)
  }


  function closeAuth() {
    setShowLogin(false)
    setAuthMessage('')
    setPassword('')
    setConfirmPassword('')
  }


  function changeAuthMode(
    mode
  ) {
    setAuthMode(mode)
    setAuthMessage('')
    setPassword('')
    setConfirmPassword('')
  }


  async function submitAuth(
    event
  ) {
    event.preventDefault()

    const username =
      normalizeUsername(
        authUsername
      )

    if (
      !isValidUsername(
        username
      )
    ) {
      setAuthMessage(
        'اسم المستخدم يجب أن يكون من 3 إلى 24 حرفًا بدون مسافات.'
      )
      return
    }

    if (
      password.length < 6
    ) {
      setAuthMessage(
        'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'
      )
      return
    }

    if (
      authMode === 'signup' &&
      password !==
        confirmPassword
    ) {
      setAuthMessage(
        'كلمتا المرور غير متطابقتين.'
      )
      return
    }

    setAuthLoading(true)
    setAuthMessage('')

    try {
      const endpoint =
        authMode === 'signup'
          ? '/api/register'
          : '/api/login'

      const data =
        await apiRequest(
          endpoint,
          {
            method: 'POST',

            body:
              JSON.stringify({
                username:
                  authUsername
                    .trim(),

                password
              })
          }
        )

      if (!data?.user) {
        throw new Error(
          'لم يتم العثور على بيانات الحساب.'
        )
      }

      setCurrentUser(
        data.user
      )

      setShowLogin(false)
      setPassword('')
      setConfirmPassword('')
      setAuthMessage('')
    } catch (error) {
      console.error(
        'AUTH:',
        error
      )

      setAuthMessage(
        error?.message ||
        'تعذر إتمام العملية.'
      )
    } finally {
      setAuthLoading(false)
    }
  }


  async function logout() {
    try {
      await apiRequest(
        '/api/logout',
        {
          method: 'POST',
          body:
            JSON.stringify({})
        }
      )
    } catch (error) {
      console.error(
        'LOGOUT:',
        error
      )
    }

    setCurrentUser(null)
    setShowLogin(false)
    setAuthMessage('')
    setPassword('')
    setConfirmPassword('')
  }


  const value = {
    currentUser,
    authChecked,

    showLogin,
    authMode,
    authUsername,
    password,
    confirmPassword,
    authMessage,
    authLoading,

    setAuthUsername,
    setPassword,
    setConfirmPassword,

    openAuth,
    closeAuth,
    changeAuthMode,
    submitAuth,
    logout
  }


  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth() {
  const context =
    useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider.'
    )
  }

  return context
}
