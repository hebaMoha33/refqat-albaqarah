import {
  useEffect,
  useState
} from 'react'

import AdhkarQuickActions
  from '../components/AdhkarQuickActions'

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
  useProgress
} from '../context/ProgressContext'


const SETTINGS_STORAGE_KEY =
  'refqat-reminder-settings-v1'


const DEFAULT_SETTINGS = {
  enabled: true,

  morningEnabled: true,

  morningOffsetMinutes:
    20,

  eveningEnabled: true,

  eveningOffsetMinutes:
    20,

  morningTime:
    '06:30',

  eveningTime:
    '15:30',

  baqarahEnabled:
    true,

  baqarahTime:
    '20:00',

  streakEnabled:
    true,

  streakTime:
    '21:30',

  draggable:
    true,

  showCloseButton:
    true,

  defaultPosition:
    'top-right',

  height:
    34,

  opacity:
    96
}


/* =====================================
   SETTINGS
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

function dateKey(
  date
) {
  const year =
    date.getFullYear()


  const month =
    String(
      date.getMonth() +
        1
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


  return (
    `${year}-${month}-${day}`
  )
}


/* =====================================
   DATE FROM KEY
===================================== */

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
    day
  )
}


/* =====================================
   TIME TO TODAY
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
   PAGE
===================================== */

export default function TodayPage() {
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
    dismissVersion,
    setDismissVersion
  ] =
    useState(0)


  /*
    نجبر React على إعادة
    قراءة حالة الإخفاء.
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
     SETTINGS UPDATE
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
     PRAYER TIMES
  ===================================== */

  useEffect(() => {
    let cancelled =
      false


    async function loadPrayerSchedule() {
      try {
        const location =
          await getCurrentPosition()


        if (
          cancelled
        ) {
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
    settings
      .morningOffsetMinutes,
    settings
      .eveningOffsetMinutes
  ])


  /* =====================================
     CURRENT PERIOD
  ===================================== */

  const periodPercentage =
    period ===
    'morning'
      ? morningPercentage
      : eveningPercentage


  const currentAdhkarItems =
    period ===
    'morning'
      ? morningAdhkarList
      : eveningAdhkarList


  /* =====================================
     MORNING COUNTS
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
     RESET CURRENT PERIOD
  ===================================== */

  function resetCurrentAdhkar() {
    currentAdhkarItems
      .forEach(
        item => {
          resetDhikr(
            item,
            period
          )
        }
      )
  }


  /* =====================================
     REMINDER TIMES
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


  /* =====================================
     MORNING DUE
  ===================================== */

  const morningDue =
    settings.enabled &&
    settings.morningEnabled &&
    Boolean(
      morningStart
    ) &&
    now >=
      morningStart &&
    morningPercentage <
      100 &&
    !morningDismissed


  /* =====================================
     EVENING DUE
  ===================================== */

  const eveningDue =
    settings.enabled &&
    settings.eveningEnabled &&
    Boolean(
      eveningStart
    ) &&
    now >=
      eveningStart &&
    eveningPercentage <
      100 &&
    !eveningDismissed


  /* =====================================
     OPEN MORNING
  ===================================== */

  function openMorning() {
    changePeriod(
      'morning'
    )


    window.setTimeout(
      () => {
        document
          .getElementById(
            'adhkar-list-start'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start'
          })
      },
      50
    )
  }


  /* =====================================
     OPEN EVENING
  ===================================== */

  function openEvening() {
    changePeriod(
      'evening'
    )


    window.setTimeout(
      () => {
        document
          .getElementById(
            'adhkar-list-start'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start'
          })
      },
      50
    )
  }


  /* =====================================
     ONE UNIFIED REMINDER
  ===================================== */

  const reminderItems =
    []


  if (
    morningDue
  ) {
    reminderItems.push({
      id:
        'morning',

      title:
        'أذكار الصباح',

      waitingText:
        'أذكار الصباح بانتظارك',

      progress:
        morningPercentage,

      started:
        morningPercentage >
        0,

      onOpen:
        openMorning
    })
  }


  if (
    eveningDue
  ) {
    reminderItems.push({
      id:
        'evening',

      title:
        'أذكار المساء',

      waitingText:
        'أذكار المساء بانتظارك',

      progress:
        eveningPercentage,

      started:
        eveningPercentage >
        0,

      onOpen:
        openEvening
    })
  }


  /* =====================================
     CLOSE CURRENT VISIBLE ITEMS
  ===================================== */

  function closeVisibleReminder() {
    reminderItems.forEach(
      item => {
        localStorage.setItem(
          dismissalKey(
            todayKey,
            item.id
          ),
          '1'
        )
      }
    )


    setDismissVersion(
      previous =>
        previous + 1
    )
  }


  return (
    <>

      {/* =================================
          iOS LIVE ACTIVITY
      ================================= */}

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


      {/* =================================
          ONE FLOATING REMINDER
      ================================= */}

      <FloatingReminder
        items={
          reminderItems
        }

        theme={
          period
        }

        visible={
          reminderItems.length >
          0
        }

        draggable={
          settings.draggable
        }

        showCloseButton={
          settings
            .showCloseButton
        }

        opacity={
          settings.opacity
        }

        defaultPosition={
          settings
            .defaultPosition
        }

        positionStorageKey="refqat-floating-adhkar-reminder-position"

        onClose={
          closeVisibleReminder
        }
      />


      {/* =================================
          PERIOD SWITCH
      ================================= */}

      <div
        className="period-switch"
      >

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


      {/* =================================
          START
      ================================= */}

      <div
        id="adhkar-list-start"
        aria-hidden="true"
      />


      {/* =================================
          ADHKAR
      ================================= */}

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


      {/* =================================
          END
      ================================= */}

      <div
        id="adhkar-list-end"
        aria-hidden="true"
      />


      {/* =================================
          QUICK ACTIONS
      ================================= */}

      <AdhkarQuickActions
        period={
          period
        }

        items={
          currentAdhkarItems
        }

        getRemaining={
          item =>
            getRemaining(
              item,
              period
            )
        }

        onResetAll={
          resetCurrentAdhkar
        }
      />

    </>
  )
}