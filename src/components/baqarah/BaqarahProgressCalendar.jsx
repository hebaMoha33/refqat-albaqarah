import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  apiRequest
} from '../../lib/api'

import {
  getDateKey
} from '../../lib/appHelpers'

import {
  useBaqarah
} from '../../context/BaqarahContext'


const MONTHS = [
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


const WEEKDAYS = [
  'السبت',
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة'
]


function pad(
  value
) {
  return String(value)
    .padStart(2, '0')
}


function starsFor(
  percentage
) {
  if (percentage >= 100) {
    return '★★★★'
  }

  if (percentage >= 75) {
    return '★★★☆'
  }

  if (percentage >= 50) {
    return '★★☆☆'
  }

  if (percentage >= 25) {
    return '★☆☆☆'
  }

  return '☆☆☆☆'
}


function getDayStatus(
  dateKey,
  percentage,
  today
) {
  if (dateKey > today) {
    return 'future'
  }

  if (percentage >= 100) {
    return 'complete'
  }

  if (percentage > 0) {
    return 'partial'
  }

  return 'missed'
}


export default function BaqarahProgressCalendar() {
  const now =
    new Date()

  const today =
    getDateKey(now)

  const {
    progress
  } =
    useBaqarah()

  const [
    view,
    setView
  ] =
    useState('month')

  const [
    year,
    setYear
  ] =
    useState(
      now.getFullYear()
    )

  const [
    month,
    setMonth
  ] =
    useState(
      now.getMonth() + 1
    )

  const [
    data,
    setData
  ] =
    useState(null)

  const [
    loading,
    setLoading
  ] =
    useState(true)

  const [
    error,
    setError
  ] =
    useState('')


  /*
    مهم:
    لا نستخدم setLoading(true) مباشرة داخل useEffect
    حتى لا يظهر خطأ react-hooks/set-state-in-effect.
  */
  useEffect(() => {
    let active =
      true

    async function fetchProgress() {
      try {
        const result =
          await apiRequest(
            `/api/baqarah-stats?year=${year}&month=${month}`,
            {
              method: 'GET'
            }
          )

        if (!active) {
          return
        }

        setData(result)
        setError('')

      } catch (fetchError) {

        if (!active) {
          return
        }

        console.error(
          'LOAD BAQARAH CALENDAR:',
          fetchError
        )

        setError(
          fetchError?.message ||
          'تعذر تحميل التقويم.'
        )

      } finally {

        if (active) {
          setLoading(false)
        }
      }
    }

    fetchProgress()

    return () => {
      active = false
    }

  }, [
    year,
    month,
    progress?.updated_at,
    progress?.percentage
  ])


  const rowsMap =
    useMemo(
      () =>
        new Map(
          (data?.days || []).map(
            row => [
              row.progress_date,
              row
            ]
          )
        ),
      [data]
    )


  const monthCells =
    useMemo(
      () => {
        const firstDay =
          new Date(
            year,
            month - 1,
            1
          )

        const daysInMonth =
          new Date(
            year,
            month,
            0
          ).getDate()

        const leadingEmpty =
          (
            firstDay.getDay() +
            1
          ) % 7

        const cells = []

        for (
          let index = 0;
          index < leadingEmpty;
          index += 1
        ) {
          cells.push({
            type: 'empty',
            key: `empty-${index}`
          })
        }

        for (
          let day = 1;
          day <= daysInMonth;
          day += 1
        ) {
          const key =
            `${year}-${pad(month)}-${pad(day)}`

          const row =
            rowsMap.get(key)

          const percentage =
            Number(
              row?.percentage ||
              0
            )

          cells.push({
            type: 'day',
            key,
            day,
            percentage,
            status:
              getDayStatus(
                key,
                percentage,
                today
              )
          })
        }

        return cells
      },
      [
        year,
        month,
        rowsMap,
        today
      ]
    )


  function previous() {
    setLoading(true)

    if (view === 'year') {
      setYear(
        value =>
          value - 1
      )
      return
    }

    if (month === 1) {
      setMonth(12)
      setYear(
        value =>
          value - 1
      )
      return
    }

    setMonth(
      value =>
        value - 1
    )
  }


  function next() {
    setLoading(true)

    if (view === 'year') {
      setYear(
        value =>
          value + 1
      )
      return
    }

    if (month === 12) {
      setMonth(1)
      setYear(
        value =>
          value + 1
      )
      return
    }

    setMonth(
      value =>
        value + 1
    )
  }


  function changeView(
    nextView
  ) {
    setLoading(true)
    setView(nextView)
  }


  function openMonth(
    monthNumber
  ) {
    setLoading(true)
    setMonth(monthNumber)
    setView('month')
  }


  return (
    <section className="baqarah-dashboard-card baqarah-calendar-card">

      <div className="baqarah-section-heading">
        <div>
          <span>
            سجل سورة البقرة
          </span>

          <h2>
            تقدمي
          </h2>
        </div>

        <div className="baqarah-view-switch">
          <button
            type="button"
            className={
              view === 'month'
                ? 'active'
                : ''
            }
            onClick={() =>
              changeView('month')
            }
          >
            شهر
          </button>

          <button
            type="button"
            className={
              view === 'year'
                ? 'active'
                : ''
            }
            onClick={() =>
              changeView('year')
            }
          >
            سنة
          </button>
        </div>
      </div>


      <div className="baqarah-calendar-toolbar">
        <button
          type="button"
          onClick={previous}
          aria-label="السابق"
        >
          ‹
        </button>

        <strong>
          {view === 'month'
            ? `${MONTHS[month - 1]} ${year}`
            : year}
        </strong>

        <button
          type="button"
          onClick={next}
          aria-label="التالي"
        >
          ›
        </button>
      </div>


      {loading && (
        <div className="baqarah-state-message">
          جاري تحميل التقدم...
        </div>
      )}


      {!loading &&
       error && (
        <div className="baqarah-state-message error">
          {error}
        </div>
      )}


      {!loading &&
       !error &&
       view === 'month' && (
        <>
          <div className="baqarah-calendar-summary">
            <div>
              <span>
                الأيام المكتملة
              </span>

              <strong>
                {
                  data
                    ?.monthSummary
                    ?.completedDays ||
                  0
                }
              </strong>
            </div>

            <div>
              <span>
                أيام النشاط
              </span>

              <strong>
                {
                  data
                    ?.monthSummary
                    ?.activeDays ||
                  0
                }
              </strong>
            </div>

            <div>
              <span>
                متوسط الشهر
              </span>

              <strong>
                {
                  data
                    ?.monthSummary
                    ?.averagePercentage ||
                  0
                }%
              </strong>
            </div>

            <div>
              <span>
                الاستمرار الحالي
              </span>

              <strong>
                {
                  data
                    ?.allTime
                    ?.currentStreak ||
                  0
                }
              </strong>
            </div>
          </div>


          <div className="baqarah-weekdays">
            {WEEKDAYS.map(
              day => (
                <span key={day}>
                  {day}
                </span>
              )
            )}
          </div>


          <div className="baqarah-month-grid">
            {monthCells.map(
              cell => {
                if (
                  cell.type ===
                  'empty'
                ) {
                  return (
                    <div
                      key={cell.key}
                      className="baqarah-day-cell empty"
                    />
                  )
                }

                return (
                  <div
                    key={cell.key}
                    className={
                      `baqarah-day-cell ${cell.status}`
                    }
                  >
                    <span className="baqarah-day-number">
                      {cell.day}
                    </span>

                    <strong>
                      {cell.percentage}%
                    </strong>

                    <small>
                      {starsFor(
                        cell.percentage
                      )}
                    </small>

                    {cell.percentage >=
                      100 && (
                      <em>
                        👑
                      </em>
                    )}
                  </div>
                )
              }
            )}
          </div>
        </>
      )}


      {!loading &&
       !error &&
       view === 'year' && (
        <div className="baqarah-year-grid">
          {(data?.months || []).map(
            item => (
              <button
                type="button"
                key={item.month}
                className="baqarah-year-month"
                onClick={() =>
                  openMonth(
                    item.month
                  )
                }
              >
                <span>
                  {item.name}
                </span>

                <strong>
                  {
                    item
                      .averagePercentage ||
                    0
                  }%
                </strong>

                <small>
                  {
                    item
                      .completedDays ||
                    0
                  }
                  {' '}
                  يوم مكتمل
                </small>
              </button>
            )
          )}
        </div>
      )}

    </section>
  )
}
