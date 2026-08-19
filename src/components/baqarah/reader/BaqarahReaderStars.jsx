const MILESTONES = [
  {
    level: 1,
    percentage: 25,
    ayah: 72
  },
  {
    level: 2,
    percentage: 50,
    ayah: 143
  },
  {
    level: 3,
    percentage: 75,
    ayah: 215
  },
  {
    level: 4,
    percentage: 100,
    ayah: 286
  }
]


export default function BaqarahReaderStars({
  percentage = 0
}) {
  return (
    <div className="baqarah-reader-stars">

      {MILESTONES.map(
        item => {
          const active =
            percentage >=
            item.percentage

          return (
            <div
              key={
                item.percentage
              }
              className={
                `baqarah-reader-star ${
                  active
                    ? 'active'
                    : ''
                }`
              }
            >
              <span>
                {active
                  ? '★'
                  : '☆'}
              </span>

              <strong>
                {item.percentage}%
              </strong>

              <small>
                حتى آية
                {' '}
                {item.ayah}
              </small>
            </div>
          )
        }
      )}

    </div>
  )
}
