import {
  useCallback,
  useEffect,
  useState
} from 'react'

import {
  apiRequest
} from '../lib/api'


export default function CommunityView() {
  const [
    community,
    setCommunity
  ] = useState(null)

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    error,
    setError
  ] = useState('')


  const fetchCommunity =
    useCallback(
      async () => {
        try {
          const data =
            await apiRequest(
              '/api/community',
              {
                method: 'GET'
              }
            )

          setCommunity(data)
          setError('')
        } catch (loadError) {
          console.error(
            'COMMUNITY:',
            loadError
          )

          setError(
            loadError?.message ||
            'تعذر تحميل الرفقة.'
          )
        } finally {
          setLoading(false)
        }
      },
      []
    )


  useEffect(() => {
    let active = true

    async function initialLoad() {
      try {
        const data =
          await apiRequest(
            '/api/community',
            {
              method: 'GET'
            }
          )

        if (!active) {
          return
        }

        setCommunity(data)
        setError('')
      } catch (loadError) {
        if (!active) {
          return
        }

        console.error(
          'COMMUNITY:',
          loadError
        )

        setError(
          loadError?.message ||
          'تعذر تحميل الرفقة.'
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    initialLoad()

    const timer =
      setInterval(
        () => {
          fetchCommunity()
        },
        30000
      )

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [fetchCommunity])


  async function handleRefresh() {
    setLoading(true)
    await fetchCommunity()
  }


  return (
    <section
      className="dashboard-page community-dashboard"
    >
      <div className="dashboard-heading">
        <div>
          <span>
            رفقة اليوم
          </span>

          <h3>
            تقدم المشتركين 🌿
          </h3>
        </div>

        <button
          className="refresh-button"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading
            ? 'جاري التحديث...'
            : 'تحديث'}
        </button>
      </div>


      {loading && !community ? (
        <div className="panel-loading">
          جاري تحميل الرفقة...
        </div>
      ) : error && !community ? (
        <div className="panel-error">
          {error}
        </div>
      ) : community ? (
        <>
          <div className="community-summary">
            <div>
              <span>
                المشتركون
              </span>

              <strong>
                {community.totalMembers || 0}
              </strong>
            </div>

            <div className="summary-completed">
              <span>
                أكملوا اليوم
              </span>

              <strong>
                {community.completedToday || 0}
              </strong>
            </div>

            <div className="summary-missed">
              <span>
                لم يكملوا
              </span>

              <strong>
                {community.incompleteToday || 0}
              </strong>
            </div>
          </div>


          {error && (
            <div className="panel-error compact-error">
              {error}
            </div>
          )}


          <div className="community-list">
            {(community.members || [])
              .map(member => {
                const completed =
                  Number(
                    member.percentage || 0
                  ) === 100

                return (
                  <article
                    key={member.id}
                    className={
                      `member-card ${
                        completed
                          ? 'completed'
                          : 'incomplete'
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
                      {(
                        member.display_name ||
                        member.username ||
                        'ر'
                      ).charAt(0)}
                    </div>


                    <div className="member-info">
                      <div className="member-name-row">
                        <strong>
                          {member.display_name ||
                            member.username}

                          {member.isMe
                            ? ' • أنتِ'
                            : ''}
                        </strong>

                        {completed ? (
                          <span className="completed-tag crown-tag">
                            👑 أكمل الورد
                          </span>
                        ) : (
                          <span className="not-started-tag">
                            لم يكمل بعد
                          </span>
                        )}
                      </div>


                      <div className="member-progress-line">
                        <span
                          style={{
                            width:
                              `${Number(
                                member.percentage || 0
                              )}%`
                          }}
                        />
                      </div>


                      <div className="member-details member-progress-details">
                        <span>
                          ☀ الصباح {Number(
                            member.morning || 0
                          )}%
                        </span>

                        <span>
                          ☾ المساء {Number(
                            member.evening || 0
                          )}%
                        </span>

                        <span>
                          ⭐ {Number(
                            member.points || 0
                          )} نقطة
                        </span>

                        <span>
                          ✓ {Number(
                            member.completedDays || 0
                          )} يوم مكتمل
                        </span>
                      </div>
                    </div>


                    <div className="member-percentage">
                      {Number(
                        member.percentage || 0
                      )}%
                    </div>
                  </article>
                )
              })}
          </div>
        </>
      ) : null}
    </section>
  )
}
