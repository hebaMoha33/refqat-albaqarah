import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  apiRequest
} from '../lib/api'


const months = [
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


const weekdays = [
  'السبت',
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة'
]


function dateKey(
  year,
  month,
  day
) {
  return [
    year,
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-')
}


function getTodayKey() {
  const date =
    new Date()

  return dateKey(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  )
}


function getMonthCells(
  year,
  month,
  rows
) {
  const map =
    new Map(
      (rows || []).map(
        row => [
          row.progress_date,
          row
        ]
      )
    )


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


  /*
    ترتيب الجدول يبدأ بالسبت.
    JavaScript:
    الأحد = 0
    السبت = 6
  */
  const leading =
    (
      firstDay.getDay() + 1
    ) % 7


  const cells = []


  for (
    let index = 0;
    index < leading;
    index += 1
  ) {
    cells.push(null)
  }


  for (
    let day = 1;
    day <= daysInMonth;
    day += 1
  ) {
    const key =
      dateKey(
        year,
        month,
        day
      )

    const row =
      map.get(key)


    cells.push({
      day,
      key,

      morning:
        Number(
          row?.morning_percentage ||
          0
        ),

      evening:
        Number(
          row?.evening_percentage ||
          0
        ),

      completed:
        Boolean(
          row?.day_completed
        )
    })
  }


  while (
    cells.length % 7 !== 0
  ) {
    cells.push(null)
  }


  return cells
}


export default function ProgressCalendar() {
  const now =
    new Date()


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


  /*
    يبدأ true حتى يتم أول تحميل.
    بهذه الطريقة لا نحتاج setLoading(true)
    مباشرة داخل useEffect.
  */
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


  /* =====================================
     LOAD CALENDAR DATA
  ===================================== */

  useEffect(() => {
    let active = true


    async function fetchProgress() {
      try {
        const query =
          view === 'year'
            ? `/api/stats?period=year&year=${year}`
            : `/api/stats?period=month&year=${year}&month=${month}`


        const result =
          await apiRequest(
            query,
            {
              method: 'GET'
            }
          )


        if (!active) {
          return
        }


        setData(result)
        setError('')

      } catch (loadError) {

        if (!active) {
          return
        }


        console.error(
          'PROGRESS CALENDAR:',
          loadError
        )


        setError(
          loadError?.message ||
          'تعذر تحميل التقدم.'
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
    view,
    year,
    month
  ])


  const monthCells =
    useMemo(
      () =>
        getMonthCells(
          year,
          month,
          data?.days || []
        ),
      [
        year,
        month,
        data
      ]
    )


  function changeView(
    nextView
  ) {
    if (
      nextView === view
    ) {
      return
    }


    setLoading(true)
    setError('')
    setView(nextView)
  }


  function previousMonth() {
    setLoading(true)
    setError('')


    if (
      month === 1
    ) {
      setMonth(12)

      setYear(
        value =>
          value - 1
      )
    } else {
      setMonth(
        value =>
          value - 1
      )
    }
  }


  function nextMonth() {
    setLoading(true)
    setError('')


    if (
      month === 12
    ) {
      setMonth(1)

      setYear(
        value =>
          value + 1
      )
    } else {
      setMonth(
        value =>
          value + 1
      )
    }
  }


  function previousYear() {
    setLoading(true)
    setError('')

    setYear(
      value =>
        value - 1
    )
  }


  function nextYear() {
    setLoading(true)
    setError('')

    setYear(
      value =>
        value + 1
    )
  }


  const today =
    getTodayKey()


  return (
    <section
      className="dashboard-page progress-dashboard"
    >
      <div className="dashboard-heading">
        <div>
          <span>
            متابعتي
          </span>

          <h3>
            تقدمي بالتقويم 🌿
          </h3>
        </div>
      </div>


      <div className="progress-view-tabs">
        <button
          className={
            view === 'month'
              ? 'active'
              : ''
          }
          onClick={() =>
            changeView('month')
          }
        >
          التقويم الشهري
        </button>


        <button
          className={
            view === 'year'
              ? 'active'
              : ''
          }
          onClick={() =>
            changeView('year')
          }
        >
          السنة
        </button>
      </div>


      {view === 'month' && (
        <div className="calendar-toolbar">
          <button
            onClick={
              previousMonth
            }
            aria-label="الشهر السابق"
          >
            ‹
          </button>


          <strong>
            {months[month - 1]}
            {' '}
            {year}
          </strong>


          <button
            onClick={
              nextMonth
            }
            aria-label="الشهر التالي"
          >
            ›
          </button>
        </div>
      )}


      {view === 'year' && (
        <div className="calendar-toolbar year-toolbar">
          <button
            onClick={
              previousYear
            }
            aria-label="السنة السابقة"
          >
            ‹
          </button>


          <strong>
            {year}
          </strong>


          <button
            onClick={
              nextYear
            }
            aria-label="السنة التالية"
          >
            ›
          </button>
        </div>
      )}


      {loading ? (
        <div className="panel-loading">
          جاري تحميل تقدمك...
        </div>
      ) : error ? (
        <div className="panel-error">
          {error}
        </div>
      ) : (
        <>
          <div className="stats-grid calendar-stats">

            <div className="stat-card">
              <span>
                النقاط
              </span>

              <strong>
                {data?.summary?.totalPoints || 0}
              </strong>
            </div>


            <div className="stat-card">
              <span>
                أيام مكتملة
              </span>

              <strong>
                {data?.summary?.completedDays || 0}
              </strong>
            </div>


            <div className="stat-card">
              <span>
                الاستمرار الحالي
              </span>

              <strong>
                🔥 {data?.summary?.currentStreak || 0}
              </strong>
            </div>


            <div className="stat-card">
              <span>
                متوسط الإنجاز
              </span>

              <strong>
                {data?.summary?.averagePercentage || 0}%
              </strong>
            </div>

          </div>


          {view === 'month' ? (
            <div className="calendar-shell">

              <div className="calendar-weekdays">
                {weekdays.map(
                  day => (
                    <span key={day}>
                      {day}
                    </span>
                  )
                )}
              </div>


              <div className="calendar-grid">

                {monthCells.map(
                  (
                    cell,
                    index
                  ) => {

                  if (!cell) {
                    return (
                      <div
                        className="calendar-cell empty-cell"
                        key={`empty-${index}`}
                      />
                    )
                  }


                  const average =
                    Math.round(
                      (
                        cell.morning +
                        cell.evening
                      ) / 2
                    )


                  const isPastOrToday =
                    cell.key <= today


                  const status =
                    cell.completed
                      ? 'complete'
                      : average > 0
                        ? 'partial'
                        : isPastOrToday
                          ? 'missed'
                          : 'future'


                  return (
                    <div
                      className={
                        `calendar-cell ${status}`
                      }
                      key={cell.key}
                    >
                      <div className="calendar-date">

                        <strong>
                          {cell.day}
                        </strong>


                        {cell.key === today && (
                          <small>
                            اليوم
                          </small>
                        )}

                      </div>


                      <div className="calendar-period-value morning-value">
                        <span>
                          ☀
                        </span>

                        <b>
                          {cell.morning}%
                        </b>
                      </div>


                      <div className="calendar-period-value evening-value">
                        <span>
                          ☾
                        </span>

                        <b>
                          {cell.evening}%
                        </b>
                      </div>


                      <div className="calendar-total">
                        {average}%
                      </div>
                    </div>
                  )
                })}

              </div>
            </div>
          ) : (
            <div className="months-grid year-months-grid">

              {(data?.months || [])
                .map(
                  item => (
                    <article
                      className="month-card year-month-card"
                      key={
                        item.month
                      }
                    >
                      <span>
                        {months[
                          item.month - 1
                        ]}
                      </span>

                      <strong>
                        {item.totalPoints || 0}
                      </strong>

                      <small>
                        {item.completedDays || 0}
                        {' يوم مكتمل'}
                      </small>

                      <small>
                        {item.activeDays || 0}
                        {' يوم نشاط'}
                      </small>
                    </article>
                  )
                )}

            </div>
          )}
        </>
      )}
    </section>
  )
}
