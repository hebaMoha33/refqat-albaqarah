import {
  useEffect,
  useMemo,
  useState
} from 'react'

import './App.css'
import './CommunityTabs.css'

import {
  morningAdhkar,
  eveningAdhkar
} from './data/adhkar'

import refqatLogo
  from './assets/refqat-logo.jpeg'

import {
  getDateKey,
  loadLocalProgress,
  saveLocalProgress,
  getRemainingFrom,
  calculatePeriodPercentage,
  isPeriodComplete,
  mergePeriodProgress,
  calculateStreak,
  normalizeUsername,
  isValidUsername
} from './lib/appHelpers'


/* =========================================
   API
========================================= */

async function apiRequest(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      {
        credentials: 'include',

        ...options,

        headers: {
          'Content-Type':
            'application/json',

          ...(options.headers || {})
        }
      }
    )

  let data = {}

  try {
    data =
      await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      'حدث خطأ في الاتصال.'
    )
  }

  return data
}


/* =========================================
   DHIKR TEXT
========================================= */

function formatDhikrText(text) {

  return String(text || '')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}


/* =========================================
   MONTHS
========================================= */

const arabicMonths = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر'
]


/* =========================================
   APP
========================================= */

function App() {

  const today =
    getDateKey()


  /* =====================================
     MAIN TAB
  ===================================== */

  const [
    mainTab,
    setMainTab
  ] =
    useState('today')


  /* =====================================
     PERIOD
  ===================================== */

  const [
    period,
    setPeriod
  ] =
    useState('morning')


  /* =====================================
     PROGRESS
  ===================================== */

  const [
    progress,
    setProgress
  ] =
    useState(
      () =>
        loadLocalProgress(today)
    )


  const [
    expandedId,
    setExpandedId
  ] =
    useState(null)


  /* =====================================
     USER
  ===================================== */

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
    cloudReady,
    setCloudReady
  ] =
    useState(false)


  const [
    history,
    setHistory
  ] =
    useState([])


  const [
    syncStatus,
    setSyncStatus
  ] =
    useState('local')


  /* =====================================
     AUTH MODAL
  ===================================== */

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
     COMMUNITY
  ===================================== */

  const [
    community,
    setCommunity
  ] =
    useState(null)


  const [
    communityLoading,
    setCommunityLoading
  ] =
    useState(false)


  const [
    communityError,
    setCommunityError
  ] =
    useState('')


  /* =====================================
     STATS
  ===================================== */

  const [
    stats,
    setStats
  ] =
    useState(null)


  const [
    statsLoading,
    setStatsLoading
  ] =
    useState(false)


  const [
    statsPeriod,
    setStatsPeriod
  ] =
    useState('month')


  /* =====================================
     LEADERBOARD
  ===================================== */

  const [
    leaderboard,
    setLeaderboard
  ] =
    useState(null)


  const [
    leaderboardLoading,
    setLeaderboardLoading
  ] =
    useState(false)


  const [
    leaderboardPeriod,
    setLeaderboardPeriod
  ] =
    useState('month')


  const [
    leaderboardScope,
    setLeaderboardScope
  ] =
    useState('all')


  /* =====================================
     CURRENT ADHKAR
  ===================================== */

  const adhkar =
    period === 'morning'
      ? morningAdhkar
      : eveningAdhkar


  /* =====================================
     PERCENTAGES
  ===================================== */

  const morningPercentage =
    useMemo(
      () =>
        calculatePeriodPercentage(
          progress,
          'morning'
        ),
      [progress]
    )


  const eveningPercentage =
    useMemo(
      () =>
        calculatePeriodPercentage(
          progress,
          'evening'
        ),
      [progress]
    )


  const dailyPercentage =
    Math.round(
      (
        morningPercentage +
        eveningPercentage
      ) / 2
    )


  const currentPercentage =
    period === 'morning'
      ? morningPercentage
      : eveningPercentage


  const morningCompleted =
    isPeriodComplete(
      progress,
      'morning'
    )


  const eveningCompleted =
    isPeriodComplete(
      progress,
      'evening'
    )


  const dayCompleted =
    morningCompleted &&
    eveningCompleted


  const currentPeriodCompleted =
    period === 'morning'
      ? morningCompleted
      : eveningCompleted


  const completedCards =
    adhkar.filter(
      item =>
        getRemainingFrom(
          progress,
          period,
          item
        ) === 0
    ).length


  const streak =
    useMemo(
      () =>
        calculateStreak(
          history,
          today,
          dayCompleted
        ),
      [
        history,
        today,
        dayCompleted
      ]
    )


  /* =====================================
     LOCAL SAVE
  ===================================== */

  useEffect(() => {

    saveLocalProgress(
      today,
      progress
    )

  }, [
    progress,
    today
  ])


  /* =====================================
     CHECK LOGIN
  ===================================== */

  useEffect(() => {

    let cancelled =
      false


    async function checkUser() {

      try {

        const response =
          await fetch(
            '/api/me',
            {
              method: 'GET',
              credentials: 'include'
            }
          )


        if (cancelled) {
          return
        }


        if (
          response.status === 401
        ) {

          setCurrentUser(null)
          setAuthChecked(true)

          return
        }


        if (!response.ok) {

          setCurrentUser(null)
          setAuthChecked(true)

          return
        }


        const data =
          await response.json()


        setCurrentUser(
          data?.user || null
        )

        setAuthChecked(true)

      } catch (error) {

        console.error(
          'CHECK USER:',
          error
        )

        if (!cancelled) {

          setCurrentUser(null)
          setAuthChecked(true)
        }
      }
    }


    checkUser()


    return () => {
      cancelled = true
    }

  }, [])


  /* =====================================
     CLOUD PROGRESS
  ===================================== */

  useEffect(() => {

    if (!authChecked) {
      return
    }


    if (!currentUser?.id) {

      setCloudReady(false)
      setHistory([])
      setSyncStatus('local')

      return
    }


    let cancelled =
      false


    async function loadCloud() {

      setCloudReady(false)
      setSyncStatus('loading')


      try {

        const data =
          await apiRequest(
            `/api/progress?date=${encodeURIComponent(
              today
            )}`,
            {
              method: 'GET'
            }
          )


        if (cancelled) {
          return
        }


        if (data?.today) {

          setProgress(
            localProgress => ({

              morning:
                mergePeriodProgress(
                  localProgress.morning,
                  data.today
                    .morning_progress ||
                    {},
                  morningAdhkar
                ),

              evening:
                mergePeriodProgress(
                  localProgress.evening,
                  data.today
                    .evening_progress ||
                    {},
                  eveningAdhkar
                )
            })
          )
        }


        setHistory(
          data?.history || []
        )

        setCloudReady(true)
        setSyncStatus('saved')

      } catch (error) {

        console.error(
          'LOAD CLOUD:',
          error
        )

        if (!cancelled) {

          setCloudReady(true)
          setSyncStatus('error')
        }
      }
    }


    loadCloud()


    return () => {
      cancelled = true
    }

  }, [
    currentUser?.id,
    authChecked,
    today
  ])


  /* =====================================
     SAVE CLOUD
  ===================================== */

  useEffect(() => {

    if (
      !currentUser?.id ||
      !cloudReady
    ) {
      return
    }


    const timer =
      setTimeout(
        async () => {

          try {

            setSyncStatus(
              'saving'
            )


            await apiRequest(
              '/api/progress',
              {
                method: 'POST',

                body:
                  JSON.stringify({

                    progress_date:
                      today,

                    morning_progress:
                      progress.morning,

                    evening_progress:
                      progress.evening,

                    morning_percentage:
                      morningPercentage,

                    evening_percentage:
                      eveningPercentage
                  })
              }
            )


            const currentRow = {

              progress_date:
                today,

              morning_percentage:
                morningPercentage,

              evening_percentage:
                eveningPercentage,

              morning_completed:
                morningCompleted,

              evening_completed:
                eveningCompleted,

              day_completed:
                dayCompleted
            }


            setHistory(
              previous => {

                const others =
                  previous.filter(
                    row =>
                      row.progress_date !==
                      today
                  )

                return [
                  currentRow,
                  ...others
                ]
              }
            )


            setSyncStatus(
              'saved'
            )

          } catch (error) {

            console.error(
              'SAVE PROGRESS:',
              error
            )

            setSyncStatus(
              'error'
            )
          }

        },
        700
      )


    return () =>
      clearTimeout(timer)

  }, [
    progress,
    currentUser?.id,
    cloudReady,
    today,
    morningPercentage,
    eveningPercentage,
    morningCompleted,
    eveningCompleted,
    dayCompleted
  ])


  /* =====================================
     COMMUNITY
  ===================================== */

  async function loadCommunity() {

    if (!currentUser) {
      return
    }


    setCommunityLoading(true)
    setCommunityError('')


    try {

      const data =
        await apiRequest(
          '/api/community',
          {
            method: 'GET'
          }
        )


      setCommunity(data)

    } catch (error) {

      console.error(
        'COMMUNITY:',
        error
      )

      setCommunityError(
        error?.message ||
        'تعذر تحميل الرفقة.'
      )

    } finally {

      setCommunityLoading(false)
    }
  }


  /* =====================================
     STATS
  ===================================== */

  async function loadStats(
    selectedPeriod =
      statsPeriod
  ) {

    if (!currentUser) {
      return
    }


    setStatsLoading(true)


    try {

      const data =
        await apiRequest(
          `/api/stats?period=${selectedPeriod}`,
          {
            method: 'GET'
          }
        )


      setStats(data)

    } catch (error) {

      console.error(
        'STATS:',
        error
      )

    } finally {

      setStatsLoading(false)
    }
  }


  /* =====================================
     LEADERBOARD
  ===================================== */

  async function loadLeaderboard(
    selectedPeriod =
      leaderboardPeriod,

    selectedScope =
      leaderboardScope
  ) {

    if (!currentUser) {
      return
    }


    setLeaderboardLoading(true)


    try {

      const data =
        await apiRequest(
          `/api/leaderboard?period=${selectedPeriod}&scope=${selectedScope}`,
          {
            method: 'GET'
          }
        )


      setLeaderboard(data)

    } catch (error) {

      console.error(
        'LEADERBOARD:',
        error
      )

    } finally {

      setLeaderboardLoading(false)
    }
  }


  /* =====================================
     TAB CHANGE
  ===================================== */

  function openMainTab(tab) {

    // اليوم متاح للجميع، أما بقية الأقسام فتحتاج حسابًا
    if (
      tab !== 'today' &&
      !currentUser
    ) {
      openAuth('login')
      return
    }


    setMainTab(tab)


    if (
      tab === 'community'
    ) {
      loadCommunity()
    }


    if (
      tab === 'progress'
    ) {
      loadStats()
    }


    if (
      tab === 'ranking'
    ) {
      loadLeaderboard()
    }
  }


  /* =====================================
     PERIOD
  ===================================== */

  function changePeriod(
    newPeriod
  ) {

    setPeriod(newPeriod)
    setExpandedId(null)
  }


  /* =====================================
     COUNTER
  ===================================== */

  function getRemaining(item) {

    return getRemainingFrom(
      progress,
      period,
      item
    )
  }


  function countDhikr(
    event,
    item
  ) {

    event.stopPropagation()


    const current =
      getRemaining(item)


    if (
      current <= 0
    ) {
      return
    }


    setProgress(
      previous => ({

        ...previous,

        [period]: {

          ...previous[period],

          [item.id]:
            current - 1
        }
      })
    )
  }


  function resetDhikr(
    event,
    item
  ) {

    event.stopPropagation()


    setProgress(
      previous => ({

        ...previous,

        [period]: {

          ...previous[period],

          [item.id]:
            item.count
        }
      })
    )
  }


  /* =====================================
     AUTH
  ===================================== */

  function openAuth(
    mode = 'login'
  ) {

    setAuthMode(mode)
    setAuthMessage('')
    setPassword('')
    setConfirmPassword('')
    setShowLogin(true)
  }


  async function handleAuthSubmit(
    event
  ) {

    event.preventDefault()


    const username =
      normalizeUsername(
        authUsername
      )


    if (
      !isValidUsername(username)
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
      password !== confirmPassword
    ) {

      setAuthMessage(
        'كلمتا المرور غير متطابقتين.'
      )

      return
    }


    setAuthLoading(true)


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
                  authUsername.trim(),

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

      setCloudReady(false)
      setAuthMessage('')
      setShowLogin(false)

      setPassword('')
      setConfirmPassword('')


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
          body: JSON.stringify({})
        }
      )

    } catch (error) {

      console.error(
        'LOGOUT:',
        error
      )
    }


    setCurrentUser(null)
    setCloudReady(false)
    setHistory([])
    setCommunity(null)
    setStats(null)
    setLeaderboard(null)
    setMainTab('today')
    setSyncStatus('local')
  }


  /* =====================================
     RENDER
  ===================================== */

  return (

    <main
      className={
        `app ${period}`
      }
    >


      {/* BACKGROUND */}

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


      {/* HEADER */}

      <header className="topbar">

        <div className="brand">

          <button
            className="brand-logo"
            aria-label="رفقة البقرة"
          >

            <img
              src={refqatLogo}
              alt="رفقة البقرة"
            />

          </button>


          <div className="brand-copy">

            <h1>
              رفقة البقرة
            </h1>

            <span>
              نقرأها كل يوم..
              لنحيا بالقرآن
            </span>

          </div>

        </div>


        {!authChecked ? (

          <span>
            ...
          </span>

        ) : !currentUser ? (

          <button
            className="login-btn"
            onClick={() =>
              openAuth('login')
            }
          >
            تسجيل الدخول
          </button>

        ) : (

          <div className="logged-user">

            <div className="user-chip">

              <span className="user-avatar">

                {
                  (
                    currentUser
                      ?.display_name ||
                    currentUser
                      ?.username ||
                    'ر'
                  ).charAt(0)
                }

              </span>


              <span className="user-name">

                {
                  currentUser
                    ?.display_name ||
                  currentUser
                    ?.username
                }

              </span>

            </div>


            <button
              className="logout-btn"
              onClick={logout}
            >
              خروج
            </button>

          </div>

        )}

      </header>


   {/* =========================================
    HERO
========================================= */}

<section className="hero">

  <div className="hero-content">

    <span className="hero-label">

      {period === 'morning'
        ? '✦ وردك الصباحي'
        : '✦ وردك المسائي'}

    </span>


    <h2>

      {period === 'morning'
        ? 'صباحٌ يبدأ'
        : 'مساءٌ يهدأ'}

      <br />

      <em>
        بذكر الله
      </em>

    </h2>


    <p>

      {period === 'morning'
        ? 'ابدأ يومك بقلب مطمئن وذكرٍ يملأ صباحك حياة وسكينة.'
        : 'اختم يومك بسكينة الذكر ودع ضجيج اليوم يهدأ.'}

    </p>


    {/* =====================================
        DAILY SUMMARY
    ===================================== */}

    <div className="daily-summary">

      <div className="daily-main">

        <span>
          إنجاز اليوم
        </span>

        <strong>
          {dailyPercentage}%
        </strong>

      </div>


      <div className="daily-summary-bar">

        <span
          style={{
            width:
              `${dailyPercentage}%`
          }}
        />

      </div>


      <div className="period-percentages">

        <div>

          <span>
            ☀ الصباح
          </span>

          <strong>
            {morningPercentage}%
          </strong>

        </div>


        <div>

          <span>
            ☾ المساء
          </span>

          <strong>
            {eveningPercentage}%
          </strong>

        </div>

      </div>

    </div>


    {/* =====================================
        STREAK
    ===================================== */}

    {currentUser && (

      <div className="streak-bar">

        <div>

          <span className="streak-fire">
            🔥
          </span>


          <div>

            <strong>
              {streak}
            </strong>

            <small>
              أيام استمرار
            </small>

          </div>

        </div>


        <span
          className={
            `sync-status ${syncStatus}`
          }
        >

          {syncStatus === 'saving' &&
            'جاري الحفظ...'}

          {syncStatus === 'saved' &&
            'محفوظ ✓'}

          {syncStatus === 'loading' &&
            'جاري المزامنة...'}

          {syncStatus === 'error' &&
            'تعذر الحفظ'}

        </span>

      </div>

    )}

  </div>


  {/* =====================================
      ANIMATED ISLAMIC GEOMETRY
  ===================================== */}

  <div
    className="hero-geometry"
    aria-hidden="true"
  >

    <div className="geometry-aura" />


    <div className="geometry-outer">

      <span className="geo-point p1" />
      <span className="geo-point p2" />
      <span className="geo-point p3" />
      <span className="geo-point p4" />
      <span className="geo-point p5" />
      <span className="geo-point p6" />
      <span className="geo-point p7" />
      <span className="geo-point p8" />

    </div>


    <div className="geometry-diamond diamond-one" />

    <div className="geometry-diamond diamond-two" />


    <div className="geometry-circle circle-one" />

    <div className="geometry-circle circle-two" />


    <div className="geometry-star">

      <span>✦</span>

    </div>


    <div className="geometry-core">
      ۞
    </div>


    <span className="floating-star star-one">
      ✦
    </span>

    <span className="floating-star star-two">
      ✧
    </span>

    <span className="floating-star star-three">
      ✦
    </span>

  </div>

</section>


      {/* =====================================
          MAIN NAVIGATION
      ===================================== */}

      <nav className="main-tabs" aria-label="التنقل الرئيسي">

        <button
          type="button"
          className={mainTab === 'today' ? 'active' : ''}
          onClick={() => openMainTab('today')}
        >
          <span className="main-tab-icon">☀</span>
          <span>اليوم</span>
        </button>


        <button
          type="button"
          className={mainTab === 'progress' ? 'active' : ''}
          onClick={() => openMainTab('progress')}
        >
          <span className="main-tab-icon">◔</span>
          <span>تقدمي</span>
        </button>


        <button
          type="button"
          className={mainTab === 'community' ? 'active' : ''}
          onClick={() => openMainTab('community')}
        >
          <span className="main-tab-icon">♧</span>
          <span>الرفقة</span>
        </button>


        <button
          type="button"
          className={mainTab === 'ranking' ? 'active' : ''}
          onClick={() => openMainTab('ranking')}
        >
          <span className="main-tab-icon">♕</span>
          <span>الترتيب</span>
        </button>

      </nav>


      {/* =====================================
          TODAY
      ===================================== */}

      {mainTab === 'today' && (

        <section className="main-content">


          <div className="period-switch">

            <button
              className={
                period === 'morning'
                  ? 'period active'
                  : 'period'
              }
              onClick={() =>
                changePeriod('morning')
              }
            >
              ☀
              <span>
                أذكار الصباح
              </span>
            </button>


            <button
              className={
                period === 'evening'
                  ? 'period active'
                  : 'period'
              }
              onClick={() =>
                changePeriod('evening')
              }
            >
              ☾
              <span>
                أذكار المساء
              </span>
            </button>

          </div>


          <section className="today-progress">

            <div>

              <span>
                إنجاز ورد
                {' '}
                {period === 'morning'
                  ? 'الصباح'
                  : 'المساء'}
              </span>

              <strong>
                {completedCards}
                {' من '}
                {adhkar.length}
                {' ذكرًا مكتملًا'}
              </strong>

            </div>


            <span className="progress-number">
              {currentPercentage}%
            </span>


            <div className="progress-line">

              <div
                className="progress-fill"
                style={{
                  width:
                    `${currentPercentage}%`
                }}
              />

            </div>

          </section>


          {!currentUser && (

            <section className="save-streak-card">

              <div className="save-streak-icon">
                🌿
              </div>


              <div className="save-streak-copy">

                <span>
                  رفقة البقرة
                </span>

                <h3>
                  احفظ استمرارك
                </h3>

                <p>
                  أنشئي حسابًا باسم مستخدم
                  وكلمة مرور ليتم حفظ تقدمك.
                </p>


                {currentPeriodCompleted && (

                  <small>
                    ✓ الورد مكتمل
                  </small>

                )}

              </div>


              <div className="save-streak-actions">

                <button
                  className="save-primary"
                  onClick={() =>
                    openAuth('signup')
                  }
                >
                  احفظ استمراري
                </button>


                <button
                  className="save-secondary"
                  onClick={() =>
                    openAuth('login')
                  }
                >
                  لدي حساب
                </button>

              </div>

            </section>

          )}


          <div className="section-title">

            <div>

              <span>
                {period === 'morning'
                  ? 'صباحٌ مطمئن'
                  : 'مساءٌ ساكن'}
              </span>

              <h3>
                {period === 'morning'
                  ? 'أذكار الصباح'
                  : 'أذكار المساء'}
              </h3>

            </div>

          </div>


          <section className="adhkar-grid">

            {adhkar.map(item => {

              const remaining =
                getRemaining(item)

              const done =
                remaining === 0

              const angle =
                (
                  (
                    item.count -
                    remaining
                  ) /
                  item.count
                ) * 360

              const expanded =
                expandedId ===
                item.id


              return (

                <article
                  key={item.id}
                  className={
                    `dhikr-card ${
                      done
                        ? 'done'
                        : ''
                    }`
                  }
                  onClick={() =>
                    setExpandedId(
                      expanded
                        ? null
                        : item.id
                    )
                  }
                >

                  <div className="dhikr-card-top">

                    <div>

                      <span className="repeat">
                        {item.count}
                        {' مرة'}
                      </span>

                      <h4>
                        {item.title}
                      </h4>

                    </div>


                    {done && (
                      <span className="done-pill">
                        ✓ تم
                      </span>
                    )}

                  </div>


                  <div className="dhikr-text">

                    {
                      formatDhikrText(
                        item.text
                      )
                    }

                  </div>


                  <div className="counter-section">

                    <button
                      className={
                        `counter ${
                          done
                            ? 'counter-done'
                            : ''
                        }`
                      }
                      style={{
                        '--angle':
                          `${angle}deg`
                      }}
                      onClick={
                        event =>
                          countDhikr(
                            event,
                            item
                          )
                      }
                    >

                      <span>
                        {done
                          ? '✓'
                          : remaining}
                      </span>

                    </button>


                    <small>
                      {done
                        ? 'تقبّل الله منك'
                        : 'اضغطي للعد'}
                    </small>


                    {remaining !==
                      item.count && (

                      <button
                        className="reset"
                        onClick={
                          event =>
                            resetDhikr(
                              event,
                              item
                            )
                        }
                      >
                        إعادة العداد
                      </button>

                    )}

                  </div>


                  <div
                    className={
                      `dhikr-note ${
                        expanded
                          ? 'open'
                          : ''
                      }`
                    }
                  >

                    <div className="note-title">
                      ✦ الفضل والتعليق
                    </div>

                    <p>
                      {item.note}
                    </p>

                    {item.source && (
                      <span className="source-tag">
                        {item.source}
                      </span>
                    )}

                  </div>


                  <div className="open-note">

                    {expanded
                      ? 'إخفاء التعليق'
                      : 'عرض الفضل والمصدر'}

                  </div>

                </article>

              )
            })}

          </section>

        </section>

      )}


      {/* =====================================
          PROGRESS
      ===================================== */}

      {currentUser &&
       mainTab === 'progress' && (

        <section className="dashboard-page">

          <div className="dashboard-heading">

            <div>
              <span>
                متابعتي
              </span>

              <h3>
                تقدمي 🌿
              </h3>
            </div>

          </div>


          <div className="filter-tabs">

            {[
              ['week', 'الأسبوع'],
              ['month', 'الشهر'],
              ['year', 'السنة'],
              ['all', 'الكل']
            ].map(
              ([value, label]) => (

              <button
                key={value}
                className={
                  statsPeriod === value
                    ? 'active'
                    : ''
                }
                onClick={() => {

                  setStatsPeriod(value)
                  loadStats(value)
                }}
              >
                {label}
              </button>

            ))}

          </div>


          {statsLoading ? (

            <div className="panel-loading">
              جاري تحميل تقدمك...
            </div>

          ) : stats ? (

            <>

              <div className="stats-grid">

                <div className="stat-card">
                  <span>
                    النقاط
                  </span>

                  <strong>
                    {stats.summary?.totalPoints || 0}
                  </strong>
                </div>


                <div className="stat-card">
                  <span>
                    الأيام المكتملة
                  </span>

                  <strong>
                    {stats.summary?.completedDays || 0}
                  </strong>
                </div>


                <div className="stat-card">
                  <span>
                    الاستمرار الحالي
                  </span>

                  <strong>
                    🔥 {stats.summary?.currentStreak || 0}
                  </strong>
                </div>


                <div className="stat-card">
                  <span>
                    أطول استمرار
                  </span>

                  <strong>
                    🏆 {stats.summary?.longestStreak || 0}
                  </strong>
                </div>

              </div>


              <div className="days-list">

                {(stats.days || [])
                  .map(row => (

                  <div
                    className={
                      `progress-day ${
                        row.day_completed
                          ? 'complete'
                          : (
                            row.morning_percentage > 0 ||
                            row.evening_percentage > 0
                          )
                            ? 'partial'
                            : 'empty'
                      }`
                    }
                    key={
                      row.progress_date
                    }
                  >

                    <strong>
                      {row.progress_date}
                    </strong>

                    <span>
                      ☀ {row.morning_percentage}%
                    </span>

                    <span>
                      ☾ {row.evening_percentage}%
                    </span>

                    <b>
                      {row.day_completed
                        ? '✓'
                        : '•'}
                    </b>

                  </div>

                ))}

              </div>


              {statsPeriod === 'year' && (

                <div className="months-grid">

                  {(stats.months || [])
                    .map(item => (

                    <div
                      className="month-card"
                      key={
                        item.month
                      }
                    >

                      <span>
                        {
                          arabicMonths[
                            item.month - 1
                          ]
                        }
                      </span>

                      <strong>
                        {item.totalPoints}
                      </strong>

                      <small>
                        {item.completedDays}
                        {' يوم مكتمل'}
                      </small>

                    </div>

                  ))}

                </div>

              )}

            </>

          ) : (

            <button
              className="load-button"
              onClick={() =>
                loadStats()
              }
            >
              عرض تقدمي
            </button>

          )}

        </section>

      )}


      {/* =====================================
          COMMUNITY
      ===================================== */}

      {currentUser &&
       mainTab === 'community' && (

        <section className="dashboard-page">

          <div className="dashboard-heading">

            <div>
              <span>
                رفقة اليوم
              </span>

              <h3>
                من سبق اليوم؟ 🌿
              </h3>
            </div>


            <button
              className="refresh-button"
              onClick={
                loadCommunity
              }
            >
              تحديث
            </button>

          </div>


          {communityLoading ? (

            <div className="panel-loading">
              جاري تحميل الرفقة...
            </div>

          ) : communityError ? (

            <div className="panel-error">
              {communityError}
            </div>

          ) : community ? (

            <>

              <div className="community-summary">

                <div>
                  <span>
                    المشتركون
                  </span>

                  <strong>
                    {community.totalMembers}
                  </strong>
                </div>


                <div className="summary-completed">

                  <span>
                    أكملوا اليوم
                  </span>

                  <strong>
                    {community.completedToday}
                  </strong>

                </div>


                <div className="summary-incomplete">

                  <span>
                    لم يكملوا بعد
                  </span>

                  <strong>
                    {community.incompleteToday ?? ((community.inProgressToday || 0) + (community.notStartedToday || 0))}
                  </strong>

                </div>

              </div>


              <div className="community-list">

                {community.members.map(
                  member => (

                  <article
                    key={member.id}
                    className={
                      `member-card ${
                        member.status
                      } ${
                        member.isMe
                          ? 'me'
                          : ''
                      }`
                    }
                  >

                    <div className="member-rank">

                      {member.rank === 1
                        ? '🥇'
                        : member.rank === 2
                          ? '🥈'
                          : member.rank === 3
                            ? '🥉'
                            : member.rank}

                    </div>


                    <div className="member-avatar">

                      {
                        (
                          member.display_name ||
                          member.username ||
                          'ر'
                        ).charAt(0)
                      }

                    </div>


                    <div className="member-info">

                      <div className="member-name-row">

                        <strong>

                          {
                            member.display_name ||
                            member.username
                          }

                          {member.isMe &&
                            ' • أنتِ'}

                        </strong>


                        {member.status ===
                          'completed' && (

                          <span className="completed-tag">
                            ✓ أكمل الورد
                          </span>

                        )}


                        {member.status ===
                          'in_progress' && (

                          <span className="working-tag">
                            لم يكتمل بعد
                          </span>

                        )}


                        {member.status ===
                          'not_started' && (

                          <span className="not-started-tag">
                            لم يبدأ
                          </span>

                        )}

                      </div>


                      <div className="member-progress-line">

                        <span
                          style={{
                            width:
                              `${member.percentage}%`
                          }}
                        />

                      </div>


                      <div className="member-details">

                        <span>
                          ☀ {member.morning}%
                        </span>

                        <span>
                          ☾ {member.evening}%
                        </span>

                        <span>
                          ⭐ {member.points}
                        </span>

                        <span>
                          ✓ {member.completedDays} يوم
                        </span>

                      </div>

                    </div>


                    <div className="member-percentage">
                      {member.percentage}%
                    </div>

                  </article>

                ))}

              </div>

            </>

          ) : (

            <button
              className="load-button"
              onClick={
                loadCommunity
              }
            >
              عرض الرفقة
            </button>

          )}

        </section>

      )}


      {/* =====================================
          RANKING
      ===================================== */}

      {currentUser &&
       mainTab === 'ranking' && (

        <section className="dashboard-page">

          <div className="dashboard-heading">

            <div>
              <span>
                المنافسة الإيجابية
              </span>

              <h3>
                الترتيب 🏆
              </h3>
            </div>

          </div>


          <div className="ranking-controls">

            <div className="filter-tabs">

              {[
                ['week', 'أسبوع'],
                ['month', 'شهر'],
                ['year', 'سنة'],
                ['all', 'الكل']
              ].map(
                ([value, label]) => (

                <button
                  key={value}
                  className={
                    leaderboardPeriod ===
                    value
                      ? 'active'
                      : ''
                  }
                  onClick={() => {

                    setLeaderboardPeriod(value)

                    loadLeaderboard(
                      value,
                      leaderboardScope
                    )
                  }}
                >
                  {label}
                </button>

              ))}

            </div>


            <div className="scope-tabs">

              <button
                className={
                  leaderboardScope === 'all'
                    ? 'active'
                    : ''
                }
                onClick={() => {

                  setLeaderboardScope('all')

                  loadLeaderboard(
                    leaderboardPeriod,
                    'all'
                  )
                }}
              >
                كل الرفقة
              </button>


              <button
                className={
                  leaderboardScope === 'friends'
                    ? 'active'
                    : ''
                }
                onClick={() => {

                  setLeaderboardScope('friends')

                  loadLeaderboard(
                    leaderboardPeriod,
                    'friends'
                  )
                }}
              >
                أصدقائي
              </button>

            </div>

          </div>


          {leaderboardLoading ? (

            <div className="panel-loading">
              جاري حساب الترتيب...
            </div>

          ) : leaderboard ? (

            <div className="ranking-list">

              {(leaderboard.ranking || [])
                .map(member => (

                <article
                  key={member.id}
                  className={
                    `ranking-card ${
                      member.isMe
                        ? 'me'
                        : ''
                    }`
                  }
                >

                  <div className="ranking-position">

                    {member.rank === 1
                      ? '🥇'
                      : member.rank === 2
                        ? '🥈'
                        : member.rank === 3
                          ? '🥉'
                          : `#${member.rank}`}

                  </div>


                  <div className="ranking-name">

                    <strong>
                      {
                        member.display_name ||
                        member.username
                      }
                    </strong>

                    {member.isMe && (
                      <small>
                        أنتِ
                      </small>
                    )}

                  </div>


                  <div className="ranking-meta">

                    <span>
                      ⭐ {member.points}
                    </span>

                    <span>
                      ✓ {member.completedDays}
                    </span>

                    <span>
                      🔥 {member.currentStreak}
                    </span>

                  </div>

                </article>

              ))}

            </div>

          ) : (

            <button
              className="load-button"
              onClick={() =>
                loadLeaderboard()
              }
            >
              عرض الترتيب
            </button>

          )}

        </section>

      )}


      {/* =====================================
          LOGIN MODAL
      ===================================== */}

      {showLogin && (

        <div
          className="modal-overlay"
          onClick={() =>
            setShowLogin(false)
          }
        >

          <section
            className="login-modal"
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <button
              className="close"
              onClick={() =>
                setShowLogin(false)
              }
            >
              ×
            </button>


            <div className="login-logo">

              <img
                src={refqatLogo}
                alt="رفقة البقرة"
              />

            </div>


            <span className="modal-label">
              رفقة البقرة
            </span>


            <h2>
              {authMode === 'login'
                ? 'أهلًا بعودتك'
                : 'احفظ استمرارك'}
            </h2>


            <div className="auth-tabs">

              <button
                type="button"
                className={
                  authMode === 'login'
                    ? 'active'
                    : ''
                }
                onClick={() => {

                  setAuthMode('login')
                  setAuthMessage('')
                }}
              >
                تسجيل الدخول
              </button>


              <button
                type="button"
                className={
                  authMode === 'signup'
                    ? 'active'
                    : ''
                }
                onClick={() => {

                  setAuthMode('signup')
                  setAuthMessage('')
                }}
              >
                إنشاء حساب
              </button>

            </div>


            <form
              onSubmit={
                handleAuthSubmit
              }
            >

              <label>
                اسم المستخدم
              </label>


              <input
                type="text"
                value={authUsername}
                onChange={
                  event =>
                    setAuthUsername(
                      event.target.value
                    )
                }
                autoComplete="username"
                required
              />


              <label>
                كلمة المرور
              </label>


              <input
                type="password"
                value={password}
                onChange={
                  event =>
                    setPassword(
                      event.target.value
                    )
                }
                autoComplete={
                  authMode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                required
              />


              {authMode === 'signup' && (

                <>

                  <label>
                    تأكيد كلمة المرور
                  </label>

                  <input
                    type="password"
                    value={
                      confirmPassword
                    }
                    onChange={
                      event =>
                        setConfirmPassword(
                          event.target.value
                        )
                    }
                    autoComplete="new-password"
                    required
                  />

                </>

              )}


              <button
                className="modal-login"
                disabled={authLoading}
              >

                {authLoading
                  ? 'لحظة...'
                  : authMode === 'login'
                    ? 'تسجيل الدخول'
                    : 'احفظ استمراري'}

              </button>

            </form>


            {authMessage && (

              <div className="auth-message">
                {authMessage}
              </div>

            )}


            <button
              type="button"
              className="continue-guest"
              onClick={() =>
                setShowLogin(false)
              }
            >
              متابعة بدون حساب
            </button>

          </section>

        </div>

      )}

    </main>
  )
}


export default App