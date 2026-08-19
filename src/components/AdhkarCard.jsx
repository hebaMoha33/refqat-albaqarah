function formatDhikrText(text) {
  return String(text || '')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export default function AdhkarCard({
  item,
  remaining,
  expanded,
  onToggle,
  onCount,
  onReset
}) {
  const done = remaining === 0

  const angle =
    ((item.count - remaining) / item.count) * 360

  return (
    <article
      className={`dhikr-card ${done ? 'done' : ''}`}
      onClick={onToggle}
    >
      <div className="dhikr-card-top">
        <div>
          <span className="repeat">
            {item.count === 1
              ? 'مرة واحدة'
              : `${item.count} مرة`}
          </span>

          <h4>{item.title}</h4>

          {item.subtitle && (
            <span className="subtitle">
              {item.subtitle}
            </span>
          )}
        </div>

        {done && (
          <span className="done-pill">
            ✓ تم
          </span>
        )}
      </div>

      <div className="dhikr-text">
        {formatDhikrText(item.text)}
      </div>

      <div className="counter-section">
        <button
          className={`counter ${done ? 'counter-done' : ''}`}
          style={{
            '--angle': `${angle}deg`
          }}
          onClick={event => {
            event.stopPropagation()
            onCount(item)
          }}
        >
          <span>
            {done ? '✓' : remaining}
          </span>
        </button>

        <small>
          {done
            ? 'تقبّل الله منك'
            : 'اضغطي للعد'}
        </small>

        {remaining !== item.count && (
          <button
            className="reset"
            onClick={event => {
              event.stopPropagation()
              onReset(item)
            }}
          >
            إعادة العداد
          </button>
        )}
      </div>

      <div
        className={`dhikr-note ${expanded ? 'open' : ''}`}
      >
        <div className="note-title">
          ✦ الفضل والتعليق
        </div>

        <p>{item.note}</p>

        {item.source && (
          <span className="source-tag">
            {item.source}
          </span>
        )}
      </div>

      <div className="open-note">
        <span>
          {expanded
            ? 'إخفاء التعليق'
            : 'عرض الفضل والمصدر'}
        </span>
        <span className={expanded ? 'arrow open' : 'arrow'}>
          ⌄
        </span>
      </div>
    </article>
  )
}
