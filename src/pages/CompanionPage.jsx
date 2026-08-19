import {
  useState
} from 'react'

import '../baqarah.css'
import '../baqarah-dashboard.css'
import '../baqarah-read-card.css'

import {
  BaqarahProvider
} from '../context/BaqarahContext'

import {
  useAuth
} from '../context/AuthContext'

import AuthModal
  from '../components/AuthModal'

import BaqarahHeader
  from '../components/baqarah/BaqarahHeader'

import BaqarahHero
  from '../components/baqarah/BaqarahHero'

import BaqarahPaperCard
  from '../components/baqarah/BaqarahPaperCard'

import BaqarahReadCard
  from '../components/baqarah/BaqarahReadCard'

import BaqarahTabs
  from '../components/baqarah/BaqarahTabs'

import BaqarahProgressCalendar
  from '../components/baqarah/BaqarahProgressCalendar'

import BaqarahCommunityView
  from '../components/baqarah/BaqarahCommunityView'

import BaqarahRankingView
  from '../components/baqarah/BaqarahRankingView'


function CompanionContent({
  onBack
}) {
  const [
    activeTab,
    setActiveTab
  ] =
    useState('today')


  const {
    currentUser,

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
    submitAuth
  } =
    useAuth()


  const visibleTab =
    currentUser
      ? activeTab
      : 'today'


  return (
    <main className="app morning baqarah-page">

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


      <div className="baqarah-shell">

        <BaqarahHeader
          onBack={onBack}
        />


        <BaqarahTabs
          activeTab={visibleTab}
          currentUser={currentUser}
          onChange={setActiveTab}
          onNeedAuth={() =>
            openAuth('login')
          }
        />


        {visibleTab === 'today' && (
          <>
            <BaqarahHero />

            <BaqarahReadCard />

            <BaqarahPaperCard />
          </>
        )}


        {visibleTab ===
          'progress' &&
          currentUser && (
          <BaqarahProgressCalendar />
        )}


        {visibleTab ===
          'community' &&
          currentUser && (
          <BaqarahCommunityView />
        )}


        {visibleTab ===
          'ranking' &&
          currentUser && (
          <BaqarahRankingView />
        )}

      </div>


      <AuthModal
        open={showLogin}
        mode={authMode}
        username={authUsername}
        password={password}
        confirmPassword={
          confirmPassword
        }
        message={authMessage}
        loading={authLoading}
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
        onSubmit={submitAuth}
        onClose={closeAuth}
      />

    </main>
  )
}


export default function CompanionPage({
  onBack
}) {
  return (
    <BaqarahProvider>
      <CompanionContent
        onBack={onBack}
      />
    </BaqarahProvider>
  )
}
