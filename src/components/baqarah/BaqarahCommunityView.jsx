import {
  useEffect,
  useState
} from 'react'

import {
  apiRequest
} from '../../lib/api'


function starText(
  level
) {
  const safe =
    Math.max(
      0,
      Math.min(
        4,
        Number(level || 0)
      )
    )

  return (
    '★'.repeat(safe) +
    '☆'.repeat(4 - safe)
  )
}


export default function BaqarahCommunityView() {
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


  useEffect(() => {
    let active =
      true

    async function load() {
      try {
        const result =
          await apiRequest(
            '/api/baqarah-community',
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
          'LOAD BAQARAH COMMUNITY:',
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

    load()

    return () => {
      active = false
    }

  }, [])


  return (
    <section className="baqarah-dashboard-card">

      <div className="baqarah-section-heading">
        <div>
          <span>
            رفقاء سورة البقرة
          </span>

          <h2>
            الرفقة اليوم
          </h2>
        </div>

        <div className="baqarah-community-total">
          <strong>
            {
              data?.completedToday ||
              0
            }
          </strong>

          <span>
            أتموا اليوم
          </span>
        </div>
      </div>


      {loading && (
        <div className="baqarah-state-message">
          جاري تحميل الرفقة...
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
        <div className="baqarah-members-list">
          {(data?.members || []).map(
            member => (
              <article
                key={member.id}
                className={
                  `baqarah-member-row ${
                    member.completed
                      ? 'complete'
                      : 'incomplete'
                  } ${
                    member.isMe
                      ? 'me'
                      : ''
                  }`
                }
              >
                <div className="baqarah-member-rank">
                  {member.completed
                    ? '👑'
                    : member.rank}
                </div>

                <div className="baqarah-member-name">
                  <strong>
                    {
                      member.displayName
                    }
                    {member.isMe
                      ? ' • أنت'
                      : ''}
                  </strong>

                  <small>
                    {starText(
                      member.starLevel
                    )}
                  </small>
                </div>

                <div className="baqarah-member-progress">
                  <strong>
                    {
                      member.percentage
                    }%
                  </strong>

                  <div>
                    <span
                      style={{
                        width:
                          `${member.percentage}%`
                      }}
                    />
                  </div>
                </div>

                <div className="baqarah-member-history">
                  <span>
                    {
                      member.completedDays
                    }
                  </span>

                  <small>
                    ختمة
                  </small>
                </div>
              </article>
            )
          )}
        </div>
      )}

    </section>
  )
}
