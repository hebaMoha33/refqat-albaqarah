/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */

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
  ] =
    useState(null)


  const [
    authChecked,
    setAuthChecked
  ] =
    useState(false)


  const [
    showLogin,
    setShowLogin
  ] =
    useState(false)


  const [
    authMode,
    setAuthMode
  ] =
    useState('login')


  const [
    authUsername,
    setAuthUsername
  ] =
    useState('')


  const [
    password,
    setPassword
  ] =
    useState('')


  const [
    confirmPassword,
    setConfirmPassword
  ] =
    useState('')


  const [
    authMessage,
    setAuthMessage
  ] =
    useState('')


  const [
    authLoading,
    setAuthLoading
  ] =
    useState(false)


  /* =====================================
     CHECK CURRENT SESSION
  ===================================== */

  useEffect(() => {
    let active = true


    async function checkSession() {
      try {
        const data =
          await apiRequest(
            '/api/auth?action=me',
            {
              method: 'GET'
            }
          )


        if (!active) {
          return
        }


        setCurrentUser(
          data?.user || null
        )

      } catch (error) {

        console.error(
          'AUTH ME:',
          error
        )


        if (active) {
          setCurrentUser(null)
        }

      } finally {

        if (active) {
          setAuthChecked(true)
        }
      }
    }


    checkSession()


    return () => {
      active = false
    }

  }, [])


  /* =====================================
     MODAL
  ===================================== */

  function openAuth(
    mode = 'login'
  ) {
    setAuthMode(
      mode === 'signup'
        ? 'signup'
        : 'login'
    )

    setAuthUsername('')
    setPassword('')
    setConfirmPassword('')
    setAuthMessage('')

    setShowLogin(true)
  }


  function closeAuth() {
    if (authLoading) {
      return
    }

    setShowLogin(false)
    setAuthMessage('')
  }


  function changeAuthMode(
    mode
  ) {
    setAuthMode(
      mode === 'signup'
        ? 'signup'
        : 'login'
    )

    setAuthMessage('')
    setPassword('')
    setConfirmPassword('')
  }


  /* =====================================
     LOGIN / REGISTER
  ===================================== */

  async function submitAuth(
    event
  ) {
    event?.preventDefault?.()


    if (authLoading) {
      return
    }


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
        'اسم المستخدم يجب أن يكون من 3 إلى 24 حرفًا، ويمكن استخدام الحروف والأرقام و _ أو -.'
      )

      return
    }


    if (
      String(password).length <
      6
    ) {
      setAuthMessage(
        'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'
      )

      return
    }


    if (
      authMode === 'signup' &&
      password !== confirmPassword
    ) {
      setAuthMessage(
        'كلمتا المرور غير متطابقتين.'
      )

      return
    }


    setAuthLoading(true)
    setAuthMessage('')


    try {
      const action =
        authMode === 'signup'
          ? 'register'
          : 'login'


      const data =
        await apiRequest(
          `/api/auth?action=${action}`,
          {
            method: 'POST',

            body:
              JSON.stringify({
                username,
                password
              })
          }
        )


      setCurrentUser(
        data?.user || null
      )


      setShowLogin(false)

      setAuthUsername('')
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
        'تعذر إكمال العملية.'
      )

    } finally {

      setAuthLoading(false)
    }
  }


  /* =====================================
     LOGOUT
  ===================================== */

  async function logout() {
    try {
      await apiRequest(
        '/api/auth?action=logout',
        {
          method: 'POST'
        }
      )

    } catch (error) {

      console.error(
        'LOGOUT:',
        error
      )

    } finally {

      setCurrentUser(null)

      setAuthChecked(true)

      setShowLogin(false)

      setAuthUsername('')
      setPassword('')
      setConfirmPassword('')
      setAuthMessage('')
    }
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
    useContext(
      AuthContext
    )


  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider.'
    )
  }


  return context
}