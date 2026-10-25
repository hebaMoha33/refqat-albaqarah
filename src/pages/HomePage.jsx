import {
  useState
} from 'react'

import Header
  from '../components/Header'

import Hero
  from '../components/Hero'

import MainTabs
  from '../components/MainTabs'

import AuthModal
  from '../components/AuthModal'

import TodayPage
  from './TodayPage'

import ProgressPage
  from './ProgressPage'

import CommunityPage
  from './CommunityPage'

import RankingPage
  from './RankingPage'

import ReminderSettingsPage
  from './ReminderSettingsPage'

import {
  useAuth
} from '../context/AuthContext'

import {
  useProgress
} from '../context/ProgressContext'


export default function HomePage() {
  const [
    mainTab,
    setMainTab
  ] =
    useState('today')


  const {
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
  } = useAuth()


  const {
    period,

    dailyPercentage,
    morningPercentage,
    eveningPercentage,

    streak,
    syncStatus,

    flushProgress
  } = useProgress()


  const visibleTab =
    currentUser
      ? mainTab
      : 'today'


  function openCompanionPage() {
    window.location.hash =
      '#/companion'
  }


  function openSettings() {
    if (!currentUser) {
      openAuth('login')
      return
    }

    setMainTab('settings')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }


  function closeSettings() {
    setMainTab('today')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }


  /*
    قبل تسجيل الخروج نحاول إرسال
    آخر تقدم إلى Supabase فورًا.
  */
  async function handleLogout() {
    await flushProgress()

    await logout()

    setMainTab('today')
  }


  return (
    <main
      className={
        `app ${period}`
      }
    >
      <div
        className="background-motion"
        aria-hidden="true"
      >
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="ambient ambient-three" />
        <div className="ambient ambient-four" />
        <div className="ambient ambient-five" />
      </div>


      <div
        className="islamic-pattern"
        aria-hidden="true"
      />


      <Header
        currentUser={
          currentUser
        }
        authChecked={
          authChecked
        }
        settingsOpen={
          visibleTab === 'settings'
        }
        onLogin={
          openAuth
        }
        onLogout={
          handleLogout
        }
        onLogoClick={
          openCompanionPage
        }
        onSettings={
          openSettings
        }
      />


      {visibleTab !== 'settings' && (
        <>
          <Hero
            period={period}
            dailyPercentage={
              dailyPercentage
            }
            morningPercentage={
              morningPercentage
            }
            eveningPercentage={
              eveningPercentage
            }
            currentUser={
              currentUser
            }
            streak={
              streak
            }
            syncStatus={
              syncStatus
            }
          />


          <MainTabs
            activeTab={
              visibleTab
            }
            currentUser={
              currentUser
            }
            onChange={
              setMainTab
            }
            onNeedAuth={() =>
              openAuth('login')
            }
          />
        </>
      )}


      {visibleTab ===
        'today' && (
        <TodayPage />
      )}


      {visibleTab ===
        'progress' &&
        currentUser && (
          <ProgressPage />
        )}


      {visibleTab ===
        'community' &&
        currentUser && (
          <CommunityPage />
        )}


      {visibleTab ===
        'ranking' &&
        currentUser && (
          <RankingPage />
        )}


      {visibleTab ===
        'settings' &&
        currentUser && (
          <ReminderSettingsPage
            onBack={
              closeSettings
            }
          />
        )}


      <AuthModal
        open={
          showLogin
        }
        mode={
          authMode
        }
        username={
          authUsername
        }
        password={
          password
        }
        confirmPassword={
          confirmPassword
        }
        message={
          authMessage
        }
        loading={
          authLoading
        }
        onModeChange={
          changeAuthMode
        }
        onUsernameChange={
          setAuthUsername
        }
        onPasswordChange={
          setPassword
        }
        onConfirmPasswordChange={
          setConfirmPassword
        }
        onSubmit={
          submitAuth
        }
        onClose={
          closeAuth
        }
      />
    </main>
  )
}