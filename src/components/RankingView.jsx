import {
  useEffect,
  useState
} from 'react'

import {
  apiRequest
} from '../lib/api'


const periods = [
  ['week', 'أسبوع'],
  ['month', 'شهر'],
  ['year', 'سنة'],
  ['all', 'الكل']
]


export default function RankingView() {
  const [
    period,
    setPeriod
  ] = useState('month')

  const [
    data,
    setData
  ] = useState(null)

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    error,
    setError
  ] = useState('')


  useEffect(() => {
    let active = true

    async function fetchRanking() {
      try {
        const result =
          await apiRequest(
            `/api/leaderboard?period=${period}&scope=all`,
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
          'RANKING:',
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

    fetchRanking()

    return () => {
      active = false
    }
  }, [period])


  function changePeriod(
    nextPeriod
  ) {
    if (nextPeriod === period) {
      return
    }

    setLoading(true)
    setError('')
    setPeriod(nextPeriod)
  }


  return (
    <section
      className="dashboard-page ranking-dashboard"
    >
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


      <div className="filter-tabs ranking-period-tabs">
        {periods.map(
          ([value, label]) => (
            <button
              key={value}
              className={
                period === value
                  ? 'active'
                  : ''
              }
              onClick={() =>
                changePeriod(value)
              }
            >
              {label}
            </button>
          )
        )}
      </div>


      {loading ? (
        <div className="panel-loading">
          جاري حساب الترتيب...
        </div>
      ) : error ? (
        <div className="panel-error">
          {error}
        </div>
      ) : (
        <div className="ranking-list">
          {(data?.ranking || [])
            .map(member => {
              const todayMorning =
                Number(
                  member.todayMorning || 0
                )

              const todayEvening =
                Number(
                  member.todayEvening || 0
                )

              const todayPercentage =
                Number(
                  member.todayPercentage || 0
                )

              const completedToday =
                todayPercentage === 100

              return (
                <article
                  key={member.id}
                  className={
                    `ranking-card ${
                      member.isMe
                        ? 'me'
                        : ''
                    } ${
                      completedToday
                        ? 'ranking-completed'
                        : 'ranking-incomplete'
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


                  <div className="ranking-name ranking-name-expanded">
                    <div className="ranking-title-line">
                      <strong>
                        {member.display_name ||
                          member.username}
                      </strong>

                      {completedToday && (
                        <span className="completed-tag crown-tag">
                          👑 أكمل اليوم
                        </span>
                      )}
                    </div>


                    <div className="ranking-today-progress">
                      <div>
                        <span>
                          ☀ {todayMorning}%
                        </span>

                        <span>
                          ☾ {todayEvening}%
                        </span>

                        <b>
                          اليوم {todayPercentage}%
                        </b>
                      </div>

                      <div className="member-progress-line">
                        <span
                          style={{
                            width:
                              `${todayPercentage}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>


                  <div className="ranking-meta">
                    <span>
                      ⭐ {Number(
                        member.points || 0
                      )}
                    </span>

                    <span>
                      ✓ {Number(
                        member.completedDays || 0
                      )}
                    </span>

                    <span>
                      🔥 {Number(
                        member.currentStreak || 0
                      )}
                    </span>
                  </div>
                </article>
              )
            })}
        </div>
      )}
    </section>
  )
}
