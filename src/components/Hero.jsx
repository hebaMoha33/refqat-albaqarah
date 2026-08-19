export default function Hero({
  period,
  dailyPercentage,
  morningPercentage,
  eveningPercentage,
  currentUser,
  streak,
  syncStatus
}) {
  return (
    <section className="hero">
      <div className="hero-content">
        <span className="hero-label">
          {period === 'morning'
            ? '✦ وردك الصباحي'
            : '✦ وردك المسائي'}
        </span>

        <h2>
          {period === 'morning'
            ? 'صباحٌ يبدأ'
            : 'مساءٌ يهدأ'}
          <br />
          <em>بذكر الله</em>
        </h2>

        <p>
          {period === 'morning'
            ? 'ابدأ يومك بقلب مطمئن، وألوان شروقٍ دافئة، وذكرٍ يملأ صباحك حياة وسكينة.'
            : 'اختم يومك بسكينة الذكر ودع ضجيج اليوم يهدأ.'}
        </p>

        <div className="daily-summary">
          <div className="daily-main">
            <span>إنجاز اليوم</span>
            <strong>{dailyPercentage}%</strong>
          </div>

          <div className="daily-summary-bar">
            <span
              style={{
                width: `${dailyPercentage}%`
              }}
            />
          </div>

          <div className="period-percentages">
            <div>
              <span>☀ الصباح</span>
              <strong>{morningPercentage}%</strong>
            </div>

            <div>
              <span>☾ المساء</span>
              <strong>{eveningPercentage}%</strong>
            </div>
          </div>
        </div>

        {currentUser && (
          <div className="streak-bar">
            <div>
              <span className="streak-fire">🔥</span>
              <div>
                <strong>{streak}</strong>
                <small>أيام استمرار</small>
              </div>
            </div>

            <span
              className={`sync-status ${syncStatus}`}
            >
              {syncStatus === 'saving' && 'جاري الحفظ...'}
              {syncStatus === 'saved' && 'محفوظ ✓'}
              {syncStatus === 'loading' && 'جاري المزامنة...'}
              {syncStatus === 'error' && 'تعذر الحفظ'}
              {syncStatus === 'local' && 'محفوظ على الجهاز'}
            </span>
          </div>
        )}
      </div>

      <div
        className="hero-geometry"
        aria-hidden="true"
      >
        <div className="geometry-aura" />

        <div className="geometry-outer">
          <span className="geo-point p1" />
          <span className="geo-point p2" />
          <span className="geo-point p3" />
          <span className="geo-point p4" />
          <span className="geo-point p5" />
          <span className="geo-point p6" />
          <span className="geo-point p7" />
          <span className="geo-point p8" />
        </div>

        <div className="geometry-diamond diamond-one" />
        <div className="geometry-diamond diamond-two" />
        <div className="geometry-circle circle-one" />
        <div className="geometry-circle circle-two" />

        <div className="geometry-star">
          <span>✦</span>
        </div>

        <div className="geometry-core">۞</div>

        <span className="floating-star star-one">✦</span>
        <span className="floating-star star-two">✧</span>
        <span className="floating-star star-three">✦</span>
      </div>
    </section>
  )
}
