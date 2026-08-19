const levels = [
  {
    level: 1,
    percentage: 25
  },
  {
    level: 2,
    percentage: 50
  },
  {
    level: 3,
    percentage: 75
  },
  {
    level: 4,
    percentage: 100
  }
]


export default function BaqarahStars({
  starLevel = 0,
  interactive = false,
  selected = 0,
  disabled = false,
  onSelect
}) {
  return (
    <div
      className={
        `baqarah-stars ${
          interactive
            ? 'interactive'
            : ''
        }`
      }
    >
      {levels.map(
        item => {

          const active =
            starLevel >=
            item.level

          const chosen =
            Number(selected) ===
            item.percentage


          const content = (
            <>
              <span
                className="baqarah-star-symbol"
                aria-hidden="true"
              >
                {active || chosen
                  ? '★'
                  : '☆'}
              </span>

              <strong>
                {item.percentage}%
              </strong>
            </>
          )


          if (!interactive) {
            return (
              <div
                className={
                  `baqarah-star-step ${
                    active
                      ? 'active'
                      : ''
                  }`
                }
                key={
                  item.percentage
                }
              >
                {content}
              </div>
            )
          }


          return (
            <button
              type="button"
              className={
                `baqarah-star-step ${
                  active
                    ? 'active'
                    : ''
                } ${
                  chosen
                    ? 'chosen'
                    : ''
                }`
              }
              key={
                item.percentage
              }
              disabled={
                disabled
              }
              onClick={() =>
                onSelect?.(
                  item.percentage
                )
              }
            >
              {content}
            </button>
          )
        }
      )}
    </div>
  )
}
