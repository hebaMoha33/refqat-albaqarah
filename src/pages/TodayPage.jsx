import {
  useEffect,
  useState
} from 'react'

import MorningAdhkar
  from '../components/MorningAdhkar'

import EveningAdhkar
  from '../components/EveningAdhkar'

import FloatingReminder
  from '../components/FloatingReminder'

import {
  morningAdhkarList,
  eveningAdhkarList
} from '../data/adhkarLists'

import {
  calculatePrayerSchedule,
  getCurrentPosition
} from '../utils/prayerSchedule'

import {
  useAuth
} from '../context/AuthContext'

import {
  useProgress
} from '../context/ProgressContext'


const SETTINGS_KEY =
  'refqat-reminder-settings-v1'


const DEFAULT_SETTINGS = {
  enabled: true,

  /*
    الصباح:
    20 دقيقة بعد الفجر
  */
  morningEnabled: true,
  morningOffsetMinutes: 20,

  /*
    المساء:
    20 دقيقة بعد العصر
  */
  eveningEnabled: true,
  eveningOffsetMinutes: 20,

  /*
    أوقات احتياطية فقط
    إذا لم يسمح المستخدم بالموقع
  */
  morningTime: '06:30',
  eveningTime: '15:30',

  /*
    سورة البقرة
  */
  baqarahEnabled: true,
  baqarahTime: '20:00',

  /*
    تذكير الاستمرار
  */
  streakEnabled: true,
  streakTime: '21:30',

  /*
    الشريط العائم
  */
  draggable: true,
  showCloseButton: true,

  defaultPosition:
    'top-right',

  height: 34,
  opacity: 96
}


/* =====================================
   SETTINGS
===================================== */

function loadSettings() {
  try {
    const saved =
      JSON.parse(
        localStorage.getItem(
          SETTINGS_KEY
        )
      )

    return {
      ...DEFAULT_SETTINGS,
      ...(saved || {})
    }
  } catch {
    return {
      ...DEFAULT_SETTINGS
    }
  }
}


/* =====================================
   DATE + TIME HELPERS
===================================== */

function timeToToday(
  value,
  now
) {
  if (
    !value ||
    !value.includes(':')
  ) {
    return null
  }


  const [
    hours,
    minutes
  ] =
    value
      .split(':')
      .map(Number)


  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null
  }


  const date =
    new Date(now)


  date.setHours(
    hours,
    minutes,
    0,
    0
  )


  return date
}


function dateKey(
  date
) {
  const year =
    date.getFullYear()


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    )


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    )


  return (
    `${year}-${month}-${day}`
  )
}


function dateFromKey(
  key
) {
  const [
    year,
    month,
    day
  ] =
    key
      .split('-')
      .map(Number)


  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0
  )
}


function dismissalKey(
  type,
  date
) {
  return (
    `refqat-reminder-dismissed:${dateKey(date)}:${type}`
  )
}


/* =====================================
   BAQARAH STATE
===================================== */

function normalizeBaqarahState(
  payload
) {
  const source =
    payload?.state ??
    payload?.readerState ??
    payload?.data ??
    payload ??
    {}


  const rawLastAyah =
    Number(
      source.last_ayah_number ??
      source.lastAyahNumber ??
      1
    )


  const rawPercentage =
    Number(
      source.reader_percentage ??
      source.readerPercentage ??
      0
    )


  const lastAyahNumber =
    Number.isFinite(
      rawLastAyah
    )
      ? Math.max(
          1,
          Math.min(
            286,
            rawLastAyah
          )
        )
      : 1


  const readerPercentage =
    Number.isFinite(
      rawPercentage
    )
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              rawPercentage
            )
          )
        )
      : 0


  return {
    lastAyahNumber,
    readerPercentage
  }
}


/* =====================================
   PAGE
===================================== */

export default function TodayPage() {
  const {
    currentUser,
    openAuth
  } = useAuth()


  const {
    period,
    expandedId,

    morningPercentage,
    eveningPercentage,

    changePeriod,
    toggleExpanded,
    getRemaining,
    countDhikr,
    resetDhikr
  } = useProgress()


  const [
    settings,
    setSettings
  ] =
    useState(
      loadSettings
    )


  const [
    now,
    setNow
  ] =
    useState(
      () => new Date()
    )


  const [
    prayerSchedule,
    setPrayerSchedule
  ] =
    useState(null)


  /*
    نحتاج فقط setter لإجبار React
    على إعادة الرسم بعد إغلاق تذكير.
  */
  const [
    ,
    forceDismissalRefresh
  ] =
    useState(0)


  const [
    baqarahState,
    setBaqarahState
  ] =
    useState({
      lastAyahNumber: 1,
      readerPercentage: 0
    })


  const todayKey =
    dateKey(now)


  /* =====================================
     CLOCK
  ===================================== */

  useEffect(() => {
    function updateClock() {
      setNow(
        new Date()
      )
    }


    const timer =
      window.setInterval(
        updateClock,
        30000
      )


    function handleVisibility() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        updateClock()
      }
    }


    window.addEventListener(
      'focus',
      updateClock
    )


    document.addEventListener(
      'visibilitychange',
      handleVisibility
    )


    return () => {
      window.clearInterval(
        timer
      )


      window.removeEventListener(
        'focus',
        updateClock
      )


      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      )
    }
  }, [])


  /* =====================================
     SETTINGS CHANGES
  ===================================== */

  useEffect(() => {
    function handleSettingsChange(
      event
    ) {
      if (
        !event?.detail
      ) {
        return
      }


      setSettings(
        event.detail
      )


      setNow(
        new Date()
      )
    }


    function handleStorage(
      event
    ) {
      if (
        event.key !==
        SETTINGS_KEY
      ) {
        return
      }


      setSettings(
        loadSettings()
      )


      setNow(
        new Date()
      )
    }


    window.addEventListener(
      'refqat-reminder-settings-change',
      handleSettingsChange
    )


    window.addEventListener(
      'storage',
      handleStorage
    )


    return () => {
      window.removeEventListener(
        'refqat-reminder-settings-change',
        handleSettingsChange
      )


      window.removeEventListener(
        'storage',
        handleStorage
      )
    }
  }, [])


  /* =====================================
     PRAYER TIMES
     الموقع يطلب مرة في اليوم
     أو عند تغيير فارق الدقائق
  ===================================== */

  useEffect(() => {
    let cancelled =
      false


    async function loadPrayerTimes() {
      try {
        const location =
          await getCurrentPosition()


        /*
          نستخدم todayKey فعليًا هنا،
          حتى لا يعتمد effect على now
          الذي يتغير كل 30 ثانية.
        */
        const calculationDate =
          dateFromKey(
            todayKey
          )


        const result =
          calculatePrayerSchedule({
            latitude:
              location.latitude,

            longitude:
              location.longitude,

            date:
              calculationDate,

            morningOffsetMinutes:
              settings
                .morningOffsetMinutes,

            eveningOffsetMinutes:
              settings
                .eveningOffsetMinutes
          })


        if (!cancelled) {
          setPrayerSchedule(
            result
          )
        }
      } catch {
        /*
          إذا رُفض الموقع أو فشل،
          نعود للأوقات الاحتياطية.
        */

        if (!cancelled) {
          setPrayerSchedule(
            null
          )
        }
      }
    }


    loadPrayerTimes()


    return () => {
      cancelled = true
    }
  }, [
    todayKey,
    settings.morningOffsetMinutes,
    settings.eveningOffsetMinutes
  ])


  /* =====================================
     BAQARAH READER STATE
  ===================================== */

  useEffect(() => {
    let cancelled =
      false


    async function loadBaqarahState() {
      if (!currentUser) {
        if (!cancelled) {
          setBaqarahState({
            lastAyahNumber: 1,
            readerPercentage: 0
          })
        }

        return
      }


      try {
        const response =
          await fetch(
            '/api/baqarah-reader-state',
            {
              method: 'GET',
              credentials: 'include'
            }
          )


        if (!response.ok) {
          return
        }


        const payload =
          await response.json()


        if (!cancelled) {
          setBaqarahState(
            normalizeBaqarahState(
              payload
            )
          )
        }
      } catch {
        /*
          لا نوقف الصفحة إذا
          فشل تحميل حالة البقرة.
        */
      }
    }


    loadBaqarahState()


    function handleFocus() {
      loadBaqarahState()
    }


    window.addEventListener(
      'focus',
      handleFocus
    )


    return () => {
      cancelled = true


      window.removeEventListener(
        'focus',
        handleFocus
      )
    }
  }, [
    currentUser
  ])


  /* =====================================
     CURRENT ADHKAR PAGE
  ===================================== */

  const items =
    period === 'morning'
      ? morningAdhkarList
      : eveningAdhkarList


  const periodPercentage =
    period === 'morning'
      ? morningPercentage
      : eveningPercentage


  /* =====================================
     REMINDER START TIMES
  ===================================== */

  const morningStart =
    prayerSchedule
      ?.morningReminder ??
    timeToToday(
      settings.morningTime,
      now
    )


  const eveningStart =
    prayerSchedule
      ?.eveningReminder ??
    timeToToday(
      settings.eveningTime,
      now
    )


  const baqarahStart =
    timeToToday(
      settings.baqarahTime,
      now
    )


  const streakStart =
    timeToToday(
      settings.streakTime,
      now
    )


  /* =====================================
     DISMISSED TODAY?
  ===================================== */

  const morningDismissed =
    localStorage.getItem(
      dismissalKey(
        'morning',
        now
      )
    ) === '1'


  const eveningDismissed =
    localStorage.getItem(
      dismissalKey(
        'evening',
        now
      )
    ) === '1'


  const baqarahDismissed =
    localStorage.getItem(
      dismissalKey(
        'baqarah',
        now
      )
    ) === '1'


  const streakDismissed =
    localStorage.getItem(
      dismissalKey(
        'streak',
        now
      )
    ) === '1'


  /* =====================================
     SHOULD EACH REMINDER SHOW?
  ===================================== */

  const morningDue =
    Boolean(
      settings.enabled &&
      settings.morningEnabled &&
      morningStart &&
      now >= morningStart &&
      morningPercentage < 100 &&
      !morningDismissed
    )


  const eveningDue =
    Boolean(
      settings.enabled &&
      settings.eveningEnabled &&
      eveningStart &&
      now >= eveningStart &&
      eveningPercentage < 100 &&
      !eveningDismissed
    )


  const baqarahDue =
    Boolean(
      settings.enabled &&
      settings.baqarahEnabled &&
      currentUser &&
      baqarahStart &&
      now >= baqarahStart &&
      baqarahState.readerPercentage <
        100 &&
      !baqarahDismissed
    )


  const adhkarIncomplete =
    morningPercentage < 100 ||
    eveningPercentage < 100


  const streakDue =
    Boolean(
      settings.enabled &&
      settings.streakEnabled &&
      streakStart &&
      now >= streakStart &&
      adhkarIncomplete &&
      !streakDismissed
    )


  /* =====================================
     STACKING

     بدون stackIndex المتغير،
     وبالتالي لا يوجد
     no-useless-assignment.
  ===================================== */

  const reminderGap =
    Math.max(
      Number(
        settings.height
      ) || 34,
      34
    ) + 10


  const morningOffset = 0


  const eveningOffset =
    morningDue
      ? reminderGap
      : 0


  const baqarahOffset =
    (
      Number(
        morningDue
      ) +
      Number(
        eveningDue
      )
    ) *
    reminderGap


  const streakOffset =
    (
      Number(
        morningDue
      ) +
      Number(
        eveningDue
      ) +
      Number(
        baqarahDue
      )
    ) *
    reminderGap


  /* =====================================
     CLOSE REMINDER
  ===================================== */

  function closeReminder(
    type
  ) {
    localStorage.setItem(
      dismissalKey(
        type,
        now
      ),
      '1'
    )


    forceDismissalRefresh(
      previous =>
        previous + 1
    )
  }


  /* =====================================
     OPEN ADHKAR
  ===================================== */

  function openAdhkarReminder(
    type
  ) {
    changePeriod(
      type
    )


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }


  /* =====================================
     OPEN BAQARAH
  ===================================== */

  function openBaqarahReminder() {
    window.location.hash =
      '#/companion/read'
  }


  /* =====================================
     OPEN STREAK
  ===================================== */

  function openStreakReminder() {
    /*
      إذا المساء ناقص
      نفتحه أولًا.

      وإلا نفتح الصباح.
    */

    if (
      eveningPercentage < 100
    ) {
      changePeriod(
        'evening'
      )
    } else {
      changePeriod(
        'morning'
      )
    }


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }


  /* =====================================
     STREAK TEXT
  ===================================== */

  let streakText =
    'ورد اليوم لم يكتمل بعد'


  if (
    morningPercentage < 100 &&
    eveningPercentage < 100
  ) {
    streakText =
      'باقي أذكار الصباح والمساء'
  } else if (
    morningPercentage < 100
  ) {
    streakText =
      'باقي أذكار الصباح'
  } else if (
    eveningPercentage < 100
  ) {
    streakText =
      'باقي أذكار المساء'
  }


  return (
    <section className="main-content">

      {/* =====================================
          MORNING REMINDER
      ===================================== */}

      <FloatingReminder
        type="morning"

        text="أذكار الصباح بانتظارك"

        progress={
          morningPercentage
        }

        visible={
          morningDue
        }

        draggable={
          settings.draggable
        }

        showCloseButton={
          settings
            .showCloseButton
        }

        defaultPosition={
          settings
            .defaultPosition
        }

        height={
          settings.height
        }

        opacity={
          settings.opacity
        }

        stackOffset={
          morningOffset
        }

        positionStorageKey="refqat-floating-reminder-position-morning"

        onOpen={() =>
          openAdhkarReminder(
            'morning'
          )
        }

        onClose={() =>
          closeReminder(
            'morning'
          )
        }
      />


      {/* =====================================
          EVENING REMINDER
      ===================================== */}

      <FloatingReminder
        type="evening"

        text="أذكار المساء بانتظارك"

        progress={
          eveningPercentage
        }

        visible={
          eveningDue
        }

        draggable={
          settings.draggable
        }

        showCloseButton={
          settings
            .showCloseButton
        }

        defaultPosition={
          settings
            .defaultPosition
        }

        height={
          settings.height
        }

        opacity={
          settings.opacity
        }

        stackOffset={
          eveningOffset
        }

        positionStorageKey="refqat-floating-reminder-position-evening"

        onOpen={() =>
          openAdhkarReminder(
            'evening'
          )
        }

        onClose={() =>
          closeReminder(
            'evening'
          )
        }
      />


      {/* =====================================
          BAQARAH REMINDER
      ===================================== */}

      <FloatingReminder
        type="baqarah"

        text={
          `سورة البقرة • تابعي من الآية ${baqarahState.lastAyahNumber}`
        }

        progress={
          baqarahState
            .readerPercentage
        }

        visible={
          baqarahDue
        }

        draggable={
          settings.draggable
        }

        showCloseButton={
          settings
            .showCloseButton
        }

        defaultPosition={
          settings
            .defaultPosition
        }

        height={
          settings.height
        }

        opacity={
          settings.opacity
        }

        stackOffset={
          baqarahOffset
        }

        positionStorageKey="refqat-floating-reminder-position-baqarah"

        onOpen={
          openBaqarahReminder
        }

        onClose={() =>
          closeReminder(
            'baqarah'
          )
        }
      />


      {/* =====================================
          STREAK REMINDER
      ===================================== */}

      <FloatingReminder
        type={
          eveningPercentage < 100
            ? 'evening'
            : 'morning'
        }

        text={
          streakText
        }

        progress={null}

        visible={
          streakDue
        }

        draggable={
          settings.draggable
        }

        showCloseButton={
          settings
            .showCloseButton
        }

        defaultPosition={
          settings
            .defaultPosition
        }

        height={
          settings.height
        }

        opacity={
          settings.opacity
        }

        stackOffset={
          streakOffset
        }

        positionStorageKey="refqat-floating-reminder-position-streak"

        onOpen={
          openStreakReminder
        }

        onClose={() =>
          closeReminder(
            'streak'
          )
        }
      />


      {/* =====================================
          PERIOD SWITCH
      ===================================== */}

      <div className="period-switch">

        <button
          className={
            period === 'morning'
              ? 'period active'
              : 'period'
          }

          onClick={() =>
            changePeriod(
              'morning'
            )
          }
        >
          <span className="period-icon sun-icon">
            ☀
          </span>

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
            changePeriod(
              'evening'
            )
          }
        >
          <span className="period-icon moon-icon">
            ☾
          </span>

          <span>
            أذكار المساء
          </span>
        </button>

      </div>


      {/* =====================================
          LOGIN CARD
      ===================================== */}

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
              وكلمة مرور ليتم حفظ تقدمك
              يومًا بعد يوم.
            </p>

          </div>


          <div className="save-streak-actions">

            <button
              className="save-primary"

              onClick={() =>
                openAuth(
                  'signup'
                )
              }
            >
              احفظ استمراري
            </button>


            <button
              className="save-secondary"

              onClick={() =>
                openAuth(
                  'login'
                )
              }
            >
              لدي حساب
            </button>

          </div>

        </section>
      )}


      {/* =====================================
          ADHKAR
      ===================================== */}

      {period === 'morning' ? (

        <MorningAdhkar
          items={
            items
          }

          progress={
            periodPercentage
          }

          expandedId={
            expandedId
          }

          getRemaining={
            item =>
              getRemaining(
                item,
                'morning'
              )
          }

          onToggle={
            toggleExpanded
          }

          onCount={
            item =>
              countDhikr(
                item,
                'morning'
              )
          }

          onReset={
            item =>
              resetDhikr(
                item,
                'morning'
              )
          }
        />

      ) : (

        <EveningAdhkar
          items={
            items
          }

          progress={
            periodPercentage
          }

          expandedId={
            expandedId
          }

          getRemaining={
            item =>
              getRemaining(
                item,
                'evening'
              )
          }

          onToggle={
            toggleExpanded
          }

          onCount={
            item =>
              countDhikr(
                item,
                'evening'
              )
          }

          onReset={
            item =>
              resetDhikr(
                item,
                'evening'
              )
          }
        />

      )}

    </section>
  )
}