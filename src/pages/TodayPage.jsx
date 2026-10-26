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

import MorningLiveActivitySync
  from '../components/MorningLiveActivitySync'

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


const SETTINGS_STORAGE_KEY =
  'refqat-reminder-settings-v1'


const DEFAULT_SETTINGS = {
  enabled: true,

  morningEnabled: true,
  morningOffsetMinutes: 20,

  eveningEnabled: true,
  eveningOffsetMinutes: 20,

  morningTime: '06:30',
  eveningTime: '15:30',

  baqarahEnabled: true,
  baqarahTime: '20:00',

  streakEnabled: true,
  streakTime: '21:30',

  draggable: true,

  showCloseButton: true,

  defaultPosition:
    'top-right',

  height: 34,

  opacity: 96
}


/* =====================================
   LOAD SETTINGS
===================================== */

function loadSettings() {
  try {
    const saved =
      JSON.parse(
        localStorage.getItem(
          SETTINGS_STORAGE_KEY
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
   DATE KEY
===================================== */

function dateKey(date) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1
    )
      .padStart(
        2,
        '0'
      )

  const day =
    String(
      date.getDate()
    )
      .padStart(
        2,
        '0'
      )


  return `${year}-${month}-${day}`
}


/* =====================================
   DATE FROM KEY
===================================== */

function dateFromKey(key) {
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
    day
  )
}


/* =====================================
   TIME TO DATE
===================================== */

function timeToToday(
  value,
  baseDate
) {
  if (!value) {
    return null
  }


  const [
    hour,
    minute
  ] =
    value
      .split(':')
      .map(Number)


  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null
  }


  const result =
    new Date(
      baseDate
    )


  result.setHours(
    hour,
    minute,
    0,
    0
  )


  return result
}


/* =====================================
   DISMISS KEY
===================================== */

function dismissalKey(
  dayKey,
  type
) {
  return (
    `refqat-reminder-dismissed:${dayKey}:${type}`
  )
}


/* =====================================
   NORMALIZE BAQARAH
===================================== */

function normalizeBaqarahState(
  payload
) {
  const source =
    payload?.state ||
    payload?.readerState ||
    payload?.data ||
    payload ||
    {}


  const rawAyah =
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
    Math.min(
      Math.max(
        Number.isFinite(rawAyah)
          ? Math.round(rawAyah)
          : 1,
        1
      ),
      286
    )


  const readerPercentage =
    Math.min(
      Math.max(
        Number.isFinite(
          rawPercentage
        )
          ? Math.round(
              rawPercentage
            )
          : 0,
        0
      ),
      100
    )


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
  } =
    useAuth()


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
  } =
    useProgress()


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
      () =>
        new Date()
    )


  const [
    prayerSchedule,
    setPrayerSchedule
  ] =
    useState(null)


  const [
    baqarahState,
    setBaqarahState
  ] =
    useState({
      lastAyahNumber: 1,
      readerPercentage: 0
    })


  const [
    dismissVersion,
    setDismissVersion
  ] =
    useState(0)


  /*
    يجعل React يعرف أن dismissVersion
    مستخدم في الحسابات أدناه.
  */
  void dismissVersion


  /* =====================================
     CLOCK
  ===================================== */

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setNow(
            new Date()
          )
        },
        30000
      )


    return () => {
      window.clearInterval(
        timer
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
        event?.detail
      ) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...event.detail
        })

        return
      }


      setSettings(
        loadSettings()
      )
    }


    function handleStorage(
      event
    ) {
      if (
        event.key ===
        SETTINGS_STORAGE_KEY
      ) {
        setSettings(
          loadSettings()
        )
      }
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
     TODAY
  ===================================== */

  const todayKey =
    dateKey(
      now
    )


  /* =====================================
     PRAYER SCHEDULE
  ===================================== */

  useEffect(() => {
    let cancelled =
      false


    async function loadPrayerSchedule() {
      try {
        const location =
          await getCurrentPosition()


        if (cancelled) {
          return
        }


        const calculationDate =
          dateFromKey(
            todayKey
          )


        const schedule =
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


        if (
          !cancelled
        ) {
          setPrayerSchedule(
            schedule
          )
        }

      } catch (error) {
        console.warn(
          'Prayer schedule fallback:',
          error
        )


        if (
          !cancelled
        ) {
          setPrayerSchedule(
            null
          )
        }
      }
    }


    loadPrayerSchedule()


    return () => {
      cancelled =
        true
    }

  }, [
    todayKey,
    settings.morningOffsetMinutes,
    settings.eveningOffsetMinutes
  ])


  /* =====================================
     BAQARAH STATE
  ===================================== */

  useEffect(() => {
    let cancelled =
      false


    async function loadBaqarahState() {
      if (
        !currentUser
      ) {
        if (
          !cancelled
        ) {
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
              method:
                'GET',

              credentials:
                'include',

              cache:
                'no-store'
            }
          )


        if (!response.ok) {
          throw new Error(
            `Baqarah state ${response.status}`
          )
        }


        const payload =
          await response.json()


        if (
          !cancelled
        ) {
          setBaqarahState(
            normalizeBaqarahState(
              payload
            )
          )
        }

      } catch (error) {
        console.warn(
          'Baqarah state error:',
          error
        )
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
      cancelled =
        true


      window.removeEventListener(
        'focus',
        handleFocus
      )
    }

  }, [
    currentUser
  ])


  /* =====================================
     REAL MORNING COUNTS
  ===================================== */

  const morningTotalItems =
    morningAdhkarList.length


  const morningCompletedItems =
    morningAdhkarList.reduce(
      (
        total,
        item
      ) => {
        const remaining =
          Number(
            getRemaining(
              item,
              'morning'
            )
          )


        if (
          Number.isFinite(
            remaining
          ) &&
          remaining <= 0
        ) {
          return total + 1
        }


        return total
      },
      0
    )


  /* =====================================
     PERIOD PERCENTAGE
  ===================================== */

  const periodPercentage =
    period ===
    'morning'
      ? morningPercentage
      : eveningPercentage


  /* =====================================
     REMINDER START TIMES
  ===================================== */

  const baseDate =
    dateFromKey(
      todayKey
    )


  const morningStart =
    prayerSchedule
      ?.morningReminder ||
    timeToToday(
      settings.morningTime,
      baseDate
    )


  const eveningStart =
    prayerSchedule
      ?.eveningReminder ||
    timeToToday(
      settings.eveningTime,
      baseDate
    )


  const baqarahStart =
    timeToToday(
      settings.baqarahTime,
      baseDate
    )


  const streakStart =
    timeToToday(
      settings.streakTime,
      baseDate
    )


  /* =====================================
     DISMISSED
  ===================================== */

  const morningDismissed =
    localStorage.getItem(
      dismissalKey(
        todayKey,
        'morning'
      )
    ) === '1'


  const eveningDismissed =
    localStorage.getItem(
      dismissalKey(
        todayKey,
        'evening'
      )
    ) === '1'


  const baqarahDismissed =
    localStorage.getItem(
      dismissalKey(
        todayKey,
        'baqarah'
      )
    ) === '1'


  const streakDismissed =
    localStorage.getItem(
      dismissalKey(
        todayKey,
        'streak'
      )
    ) === '1'


  /* =====================================
     DUE STATES
  ===================================== */

  const morningDue =
    settings.enabled &&
    settings.morningEnabled &&
    Boolean(morningStart) &&
    now >= morningStart &&
    morningPercentage < 100 &&
    !morningDismissed


  const eveningDue =
    settings.enabled &&
    settings.eveningEnabled &&
    Boolean(eveningStart) &&
    now >= eveningStart &&
    eveningPercentage < 100 &&
    !eveningDismissed


  const baqarahDue =
    settings.enabled &&
    settings.baqarahEnabled &&
    Boolean(currentUser) &&
    Boolean(baqarahStart) &&
    now >= baqarahStart &&
    baqarahState.readerPercentage <
      100 &&
    !baqarahDismissed


  const streakDue =
    settings.enabled &&
    settings.streakEnabled &&
    Boolean(streakStart) &&
    now >= streakStart &&
    (
      morningPercentage < 100 ||
      eveningPercentage < 100
    ) &&
    !streakDismissed


  /* =====================================
     STACK OFFSETS
  ===================================== */

  const reminderGap =
    Math.max(
      Number(
        settings.height
      ) || 34,
      34
    ) + 10


  const morningOffset =
    0


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
     DISMISS
  ===================================== */

  function dismissReminder(
    type
  ) {
    localStorage.setItem(
      dismissalKey(
        todayKey,
        type
      ),
      '1'
    )


    setDismissVersion(
      previous =>
        previous + 1
    )
  }


  /* =====================================
     OPEN
  ===================================== */

  function openMorning() {
    changePeriod(
      'morning'
    )


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }


  function openEvening() {
    changePeriod(
      'evening'
    )


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }


  function openBaqarah() {
    if (
      !currentUser
    ) {
      openAuth?.()
      return
    }


    window.location.hash =
      '#/companion/read'
  }


  function openStreak() {
    if (
      morningPercentage < 100
    ) {
      openMorning()
      return
    }


    openEvening()
  }


  /* =====================================
     STREAK TEXT
  ===================================== */

  let streakText =
    'ورد اليوم لم يكتمل بعد'


  if (
    morningPercentage < 100 &&
    eveningPercentage >= 100
  ) {
    streakText =
      'أذكار الصباح لم تكتمل بعد'
  }


  if (
    eveningPercentage < 100 &&
    morningPercentage >= 100
  ) {
    streakText =
      'أذكار المساء لم تكتمل بعد'
  }


  return (
    <>
      {/* =====================================
          iOS LIVE ACTIVITY
      ===================================== */}

      <MorningLiveActivitySync
        enabled={
          settings.enabled &&
          settings.morningEnabled
        }

        active={
          morningDue
        }

        completed={
          morningCompletedItems
        }

        total={
          morningTotalItems
        }

        progress={
          morningPercentage
        }
      />


      {/* =====================================
          FLOATING REMINDERS
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
          settings.showCloseButton
        }

        height={
          settings.height
        }

        opacity={
          settings.opacity
        }

        defaultPosition={
          settings.defaultPosition
        }

        stackOffset={
          morningOffset
        }

        positionStorageKey="
          refqat-floating-reminder-position-morning
        "

        onOpen={
          openMorning
        }

        onClose={() =>
          dismissReminder(
            'morning'
          )
        }
      />


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
          settings.showCloseButton
        }

        height={
          settings.height
        }

        opacity={
          settings.opacity
        }

        defaultPosition={
          settings.defaultPosition
        }

        stackOffset={
          eveningOffset
        }

        positionStorageKey="
          refqat-floating-reminder-position-evening
        "

        onOpen={
          openEvening
        }

        onClose={() =>
          dismissReminder(
            'evening'
          )
        }
      />


      <FloatingReminder
        type="baqarah"

        text={
          `سورة البقرة • تابعي من الآية ${baqarahState.lastAyahNumber}`
        }

        progress={
          baqarahState.readerPercentage
        }

        visible={
          baqarahDue
        }

        draggable={
          settings.draggable
        }

        showCloseButton={
          settings.showCloseButton
        }

        height={
          settings.height
        }

        opacity={
          settings.opacity
        }

        defaultPosition={
          settings.defaultPosition
        }

        stackOffset={
          baqarahOffset
        }

        positionStorageKey="
          refqat-floating-reminder-position-baqarah
        "

        onOpen={
          openBaqarah
        }

        onClose={() =>
          dismissReminder(
            'baqarah'
          )
        }
      />


      <FloatingReminder
        type="streak"

        text={
          streakText
        }

        progress={
          null
        }

        visible={
          streakDue
        }

        draggable={
          settings.draggable
        }

        showCloseButton={
          settings.showCloseButton
        }

        height={
          settings.height
        }

        opacity={
          settings.opacity
        }

        defaultPosition={
          settings.defaultPosition
        }

        stackOffset={
          streakOffset
        }

        positionStorageKey="
          refqat-floating-reminder-position-streak
        "

        onOpen={
          openStreak
        }

        onClose={() =>
          dismissReminder(
            'streak'
          )
        }
      />


      {/* =====================================
          PERIOD SWITCH
      ===================================== */}

      <div className="period-switch">

        <button
          type="button"

          className={
            period ===
            'morning'
              ? 'period active'
              : 'period'
          }

          onClick={() =>
            changePeriod(
              'morning'
            )
          }
        >
          <span>
            ☀
          </span>

          الصباح
        </button>


        <button
          type="button"

          className={
            period ===
            'evening'
              ? 'period active'
              : 'period'
          }

          onClick={() =>
            changePeriod(
              'evening'
            )
          }
        >
          <span>
            ☾
          </span>

          المساء
        </button>

      </div>


      {/* =====================================
          ADHKAR
      ===================================== */}

      {period ===
      'morning' ? (

        <MorningAdhkar
          items={
            morningAdhkarList
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
            eveningAdhkarList
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

    </>
  )
}