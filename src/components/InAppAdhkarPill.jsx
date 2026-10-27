import './InAppAdhkarPill.css'


function normalizeProgress(value) {
  return Math.min(
    Math.max(
      Math.round(
        Number(value) || 0
      ),
      0
    ),
    100
  )
}


export default function InAppAdhkarPill({
  items = [],
  theme = 'morning'
}) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return null
  }


  return (
    <div
      className={`
        in-app-adhkar-pill
        in-app-adhkar-pill--${theme}
      `}
    >
      {items.map(
        (item, index) => {
          const progress =
            normalizeProgress(
              item.progress
            )

          const isMorning =
            item.id === 'morning'

          return (
            <div
              key={item.id}
              className="in-app-adhkar-pill-item-wrap"
            >
              {index > 0 && (
                <span
                  className="in-app-adhkar-pill-divider"
                />
              )}

              <button
                type="button"
                className="in-app-adhkar-pill-item"
                onClick={
                  item.onOpen
                }
                aria-label={
                  item.title
                }
              >
                <span
                  className="in-app-adhkar-pill-icon"
                  aria-hidden="true"
                >
                  {isMorning
                    ? '☀'
                    : '☾'}
                </span>

                <span
                  className="in-app-adhkar-pill-name"
                >
                  {isMorning
                    ? 'الصباح'
                    : 'المساء'}
                </span>

                <span
                  className="in-app-adhkar-pill-percent"
                >
                  {progress}%
                </span>
              </button>
            </div>
          )
        }
      )}
    </div>
  )
}