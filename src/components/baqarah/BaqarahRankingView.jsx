import {
  useEffect,
  useState
} from 'react'

import {
  apiRequest
} from '../../lib/api'


const PERIODS = [
  {
    id: 'day',
    label: 'اليوم'
  },
  {
    id: 'week',
    label: 'الأسبوع'
  },
  {
    id: 'month',
    label: 'الشهر'
  },
  {
    id: 'year',
    label: 'السنة'
  },
  {
    id: 'all',
    label: 'الكل'
  }
]


export default function BaqarahRankingView() {
  const [
    period,
    setPeriod
  ] =
    useState('month')

  const [
    members,
    setMembers
  ] =
    useState([])

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
    لا نستخدم setLoading(true) مباشرة داخل useEffect
    حتى لا يظهر خطأ react-hooks/set-state-in-effect.

    loading يبدأ true أول مرة،
    وعند تغيير الفترة نفعله من changePeriod().
  */
  useEffect(() => {
    let active =
      true

    async function load() {
      try {
        const result =
          await apiRequest(
            `/api/baqarah-leaderboard?period=${period}`,
            {
              method: 'GET'
            }
          )

        if (!active) {
          return
        }

        setMembers(
          result?.members ||
          []
        )

        setError('')

      } catch (loadError) {

        if (!active) {
          return
        }

        console.error(
          'LOAD BAQARAH RANKING:',
          loadError
        )

        setError(
          loadError?.message ||
          'تعذر تحميل الترتيب.'
        )

      } finally {

        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }

  }, [
    period
  ])


  function changePeriod(
    nextPeriod
  ) {
    if (
      nextPeriod === period
    ) {
      return
    }

    setLoading(true)
    setError('')
    setPeriod(nextPeriod)
  }


  return (
    <section className="baqarah-dashboard-card">

      <div className="baqarah-section-heading">
        <div>
          <span>
            منافسة الاستمرار
          </span>

          <h2>
            ترتيب سورة البقرة
          </h2>
        </div>
      </div>


      <div className="baqarah-ranking-periods">
        {PERIODS.map(
          item => (
            <button
              type="button"
              key={item.id}
              className={
                period === item.id
                  ? 'active'
                  : ''
              }
              onClick={() =>
                changePeriod(
                  item.id
                )
              }
            >
              {item.label}
            </button>
          )
        )}
      </div>


      {loading && (
        <div className="baqarah-state-message">
          جاري تحميل الترتيب...
        </div>
      )}


      {!loading &&
       error && (
        <div className="baqarah-state-message error">
          {error}
        </div>
      )}


      {!loading &&
       !error && (
        <div className="baqarah-ranking-list">
          {members.map(
            member => (
              <article
                key={member.id}
                className={
                  `baqarah-ranking-row ${
                    member.isMe
                      ? 'me'
                      : ''
                  }`
                }
              >
                <div className="baqarah-ranking-position">
                  {member.rank === 1
                    ? '🥇'
                    : member.rank === 2
                      ? '🥈'
                      : member.rank === 3
                        ? '🥉'
                        : member.rank}
                </div>

                <div className="baqarah-ranking-name">
                  <strong>
                    {
                      member.displayName
                    }
                    {member.isMe
                      ? ' • أنت'
                      : ''}
                  </strong>

                  <small>
                    اليوم
                    {' '}
                    {
                      member.todayPercentage
                    }%
                  </small>
                </div>

                <div className="baqarah-ranking-stat">
                  <strong>
                    {
                      period === 'day'
                        ? `${member.todayPercentage}%`
                        : member.completedDays
                    }
                  </strong>

                  <span>
                    {period === 'day'
                      ? 'إنجاز اليوم'
                      : 'أيام مكتملة'}
                  </span>
                </div>

                <div className="baqarah-ranking-stat">
                  <strong>
                    {
                      member.currentStreak
                    }
                  </strong>

                  <span>
                    استمرار
                  </span>
                </div>

                <div className="baqarah-ranking-stat">
                  <strong>
                    {
                      member.points
                    }
                  </strong>

                  <span>
                    نقاط
                  </span>
                </div>
              </article>
            )
          )}
        </div>
      )}

    </section>
  )
}
