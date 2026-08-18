import {
  morningAdhkar,
  eveningAdhkar
} from '../data/adhkar'


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
  dateString,
  amount
) {

  const [
    year,
    month,
    day
  ] =
    dateString
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


export function normalizeUsername(
  value = ''
) {

  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()

}


export function isValidUsername(
  value
) {

  return /^[\p{L}\p{N}_-]{3,24}$/u
    .test(
      normalizeUsername(value)
    )

}


export function createEmptyProgress() {

  return {
    morning: {},
    evening: {}
  }

}


export function loadLocalProgress(
  today
) {

  try {

    const key =
      `refqat-progress-v4-${today}`


    const value =
      localStorage.getItem(key)


    if (value) {

      const parsed =
        JSON.parse(value)


      return {

        morning:
          parsed?.morning ||
          {},

        evening:
          parsed?.evening ||
          {}

      }

    }

  } catch {

    // ignore

  }


  return createEmptyProgress()

}


export function saveLocalProgress(
  today,
  progress
) {

  localStorage.setItem(

    `refqat-progress-v4-${today}`,

    JSON.stringify(
      progress
    )

  )

}


export function getList(
  period
) {

  return period === 'morning'
    ? morningAdhkar
    : eveningAdhkar

}


export function getRemainingFrom(
  progress,
  period,
  item
) {

  const value =
    progress?.[period]?.[
      item.id
    ]


  if (
    typeof value !==
    'number'
  ) {

    return item.count

  }


  return Math.max(
    0,
    Math.min(
      item.count,
      value
    )
  )

}


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

        const remaining =
          getRemainingFrom(
            progress,
            period,
            item
          )


        const itemProgress =
          (
            item.count -
            remaining
          ) /
          item.count


        return (
          sum +
          itemProgress
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


export function mergePeriodProgress(
  localMap = {},
  cloudMap = {},
  list = []
) {

  const result = {}


  list.forEach(
    item => {

      const localValue =
        typeof localMap?.[
          item.id
        ] === 'number'
          ? localMap[item.id]
          : item.count


      const cloudValue =
        typeof cloudMap?.[
          item.id
        ] === 'number'
          ? cloudMap[item.id]
          : item.count


      const best =
        Math.min(
          localValue,
          cloudValue
        )


      if (
        best !==
        item.count
      ) {

        result[item.id] =
          best

      }

    }
  )


  return result

}


export function calculateStreak(
  history,
  today,
  todayCompleted
) {

  const completedDates =
    new Set(
      history
        .filter(
          row =>
            row.day_completed
        )
        .map(
          row =>
            row.progress_date
        )
    )


  if (
    todayCompleted
  ) {

    completedDates.add(
      today
    )

  }


  let cursor =
    todayCompleted
      ? today
      : addDays(
          today,
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