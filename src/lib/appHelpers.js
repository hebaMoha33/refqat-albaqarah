import {
  morningAdhkarList,
  eveningAdhkarList
} from '../data/adhkarLists'


/* =========================================
   DATE
========================================= */

export function getDateKey(
  date = new Date()
) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, '0'),
    String(
      date.getDate()
    ).padStart(2, '0')
  ].join('-')
}


export function addDays(
  dateKey,
  amount
) {
  const [
    year,
    month,
    day
  ] =
    String(dateKey)
      .split('-')
      .map(Number)

  const date =
    new Date(
      year,
      month - 1,
      day
    )

  date.setDate(
    date.getDate() +
    amount
  )

  return getDateKey(date)
}


/* =========================================
   USERNAME
========================================= */

export function normalizeUsername(
  value = ''
) {
  return String(value)
    .normalize('NFKC')
    .trim()
    .toLowerCase()
}


export function isValidUsername(
  username
) {
  return /^[\p{L}\p{N}_-]{3,24}$/u
    .test(username)
}


/* =========================================
   PROGRESS SHAPE
========================================= */

export function createEmptyProgress() {
  return {
    morning: {},
    evening: {}
  }
}


export function getList(
  period
) {
  return period === 'evening'
    ? eveningAdhkarList
    : morningAdhkarList
}


/* =========================================
   ACCOUNT-SCOPED LOCAL STORAGE

   مهم:
   كل حساب له مفتاح مستقل.
   لا نستخدم نفس localStorage لكل المستخدمين.
========================================= */

function safeOwnerKey(
  ownerKey = 'guest'
) {
  return String(
    ownerKey || 'guest'
  )
    .replace(
      /[^a-zA-Z0-9:_-]/g,
      '_'
    )
}


function getProgressStorageKey(
  dateKey,
  ownerKey = 'guest'
) {
  return (
    `refqat-progress-v6-${safeOwnerKey(
      ownerKey
    )}-${dateKey}`
  )
}


export function loadLocalProgress(
  dateKey,
  ownerKey = 'guest'
) {
  try {
    const raw =
      localStorage.getItem(
        getProgressStorageKey(
          dateKey,
          ownerKey
        )
      )

    if (!raw) {
      return createEmptyProgress()
    }

    const parsed =
      JSON.parse(raw)

    return {
      morning:
        parsed?.morning &&
        typeof parsed.morning ===
          'object'
          ? parsed.morning
          : {},

      evening:
        parsed?.evening &&
        typeof parsed.evening ===
          'object'
          ? parsed.evening
          : {}
    }
  } catch (error) {
    console.error(
      'LOAD LOCAL PROGRESS:',
      error
    )

    return createEmptyProgress()
  }
}


export function saveLocalProgress(
  dateKey,
  progress,
  ownerKey = 'guest'
) {
  try {
    localStorage.setItem(
      getProgressStorageKey(
        dateKey,
        ownerKey
      ),
      JSON.stringify({
        morning:
          progress?.morning || {},

        evening:
          progress?.evening || {}
      })
    )
  } catch (error) {
    console.error(
      'SAVE LOCAL PROGRESS:',
      error
    )
  }
}


/* =========================================
   COUNTERS
========================================= */

export function getRemainingFrom(
  progress,
  period,
  item
) {
  const originalCount =
    Math.max(
      1,
      Number(item?.count || 1)
    )

  const stored =
    progress?.[period]?.[
      item.id
    ]

  if (
    stored === undefined ||
    stored === null ||
    stored === ''
  ) {
    return originalCount
  }

  const number =
    Number(stored)

  if (!Number.isFinite(number)) {
    return originalCount
  }

  return Math.min(
    originalCount,
    Math.max(
      0,
      Math.round(number)
    )
  )
}


/* =========================================
   PERCENTAGES
========================================= */

export function calculatePeriodPercentage(
  progress,
  period
) {
  const list =
    getList(period)

  if (!list.length) {
    return 0
  }

  const total =
    list.reduce(
      (
        sum,
        item
      ) => {
        const count =
          Math.max(
            1,
            Number(
              item.count || 1
            )
          )

        const remaining =
          getRemainingFrom(
            progress,
            period,
            item
          )

        const completed =
          count - remaining

        const itemPercentage =
          completed / count

        return (
          sum +
          itemPercentage
        )
      },
      0
    )

  return Math.round(
    (
      total /
      list.length
    ) * 100
  )
}


export function isPeriodComplete(
  progress,
  period
) {
  const list =
    getList(period)

  return (
    list.length > 0 &&
    list.every(
      item =>
        getRemainingFrom(
          progress,
          period,
          item
        ) === 0
    )
  )
}


/* =========================================
   MERGE SAME ACCOUNT ONLY

   الأقل في remaining يعني إنجازًا أكبر.
   هذا الدمج آمن فقط لأن التخزين المحلي
   أصبح منفصلًا لكل user_id.
========================================= */

export function mergePeriodProgress(
  localPeriod = {},
  cloudPeriod = {},
  list = []
) {
  const merged = {}

  for (
    const item of list
  ) {
    const count =
      Math.max(
        1,
        Number(
          item.count || 1
        )
      )

    const localValue =
      localPeriod?.[
        item.id
      ]

    const cloudValue =
      cloudPeriod?.[
        item.id
      ]

    const localRemaining =
      Number.isFinite(
        Number(localValue)
      )
        ? Math.min(
            count,
            Math.max(
              0,
              Number(localValue)
            )
          )
        : count

    const cloudRemaining =
      Number.isFinite(
        Number(cloudValue)
      )
        ? Math.min(
            count,
            Math.max(
              0,
              Number(cloudValue)
            )
          )
        : count

    const bestRemaining =
      Math.min(
        localRemaining,
        cloudRemaining
      )

    if (
      bestRemaining !== count
    ) {
      merged[item.id] =
        bestRemaining
    }
  }

  return merged
}


/* =========================================
   STREAK
========================================= */

export function calculateStreak(
  history = [],
  todayKey = getDateKey(),
  todayCompleted = false
) {
  const completedDates =
    new Set(
      (history || [])
        .filter(
          row =>
            row?.day_completed
        )
        .map(
          row =>
            row.progress_date
        )
    )

  if (todayCompleted) {
    completedDates.add(
      todayKey
    )
  }

  let cursor =
    completedDates.has(
      todayKey
    )
      ? todayKey
      : addDays(
          todayKey,
          -1
        )

  let streak = 0

  while (
    completedDates.has(
      cursor
    )
  ) {
    streak += 1

    cursor =
      addDays(
        cursor,
        -1
      )
  }

  return streak
}
