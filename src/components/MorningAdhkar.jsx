import AdhkarCard from './AdhkarCard'

export default function MorningAdhkar({
  items,
  progress,
  expandedId,
  getRemaining,
  onToggle,
  onCount,
  onReset
}) {
  const completedCards =
    items.filter(
      item => getRemaining(item) === 0
    ).length

  return (
    <>
      <section className="today-progress">
        <div>
          <span>إنجاز ورد الصباح</span>
          <strong>
            {completedCards} من {items.length} ذكرًا مكتملًا
          </strong>
        </div>

        <span className="progress-number">
          {progress}%
        </span>

        <div className="progress-line">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <div className="section-title">
        <div>
          <span>شروقٌ وذكر</span>
          <h3>أذكار الصباح</h3>
        </div>
      </div>

      <section className="adhkar-grid">
        {items.map(item => (
          <AdhkarCard
            key={item.id}
            item={item}
            remaining={getRemaining(item)}
            expanded={expandedId === item.id}
            onToggle={() => onToggle(item.id)}
            onCount={onCount}
            onReset={onReset}
          />
        ))}
      </section>
    </>
  )
}
