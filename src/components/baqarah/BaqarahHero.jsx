import {
  useBaqarah
} from '../../context/BaqarahContext'

import BaqarahStars
  from './BaqarahStars'


export default function BaqarahHero() {
  const {
    progress,

    loading,

    /*
      إنجاز اليوم الكلي.
      قد يكون 100 بسبب المصحف الورقي.
    */
    percentage,
    completed,

    /*
      متابعة القراءة الفعلية الحالية.
    */
    currentReadingPercentage,
    currentReadingAyah,
    currentReadingStarLevel,
    currentCycle
  } =
    useBaqarah()


  const paperPercentage =
    Number(
      progress
        ?.paper_percentage ||
      0
    )


  const audioPercentage =
    Number(
      progress
        ?.audio_percentage ||
      0
    )


  return (
    <section className="baqarah-hero">

      <div className="baqarah-hero-glow baqarah-hero-glow-one" />
      <div className="baqarah-hero-glow baqarah-hero-glow-two" />


      <div className="baqarah-hero-copy">
        <span className="baqarah-eyebrow">
          ✦ ورد سورة البقرة
        </span>


        <h1>
          سورة
          {' '}
          <em>
            البقرة
          </em>
        </h1>


        <p>
          اقرأ على مهل، واحفظ موضعك،
          واستمر كل يوم مع رفقاء البقرة.
        </p>


        {completed && (
          <div className="baqarah-completed-badge">
            👑 إنجاز اليوم مكتمل 100%
          </div>
        )}
      </div>


      <div className="baqarah-progress-panel">

        <div className="baqarah-progress-main">
          <span>
            متابعة القراءة الحالية
          </span>

          <strong>
            {loading
              ? '...'
              : `${currentReadingPercentage}%`}
          </strong>
        </div>


        <div className="baqarah-progress-track">
          <span
            style={{
              width:
                `${currentReadingPercentage}%`
            }}
          />
        </div>


        <BaqarahStars
          starLevel={
            currentReadingStarLevel
          }
        />


        <div className="baqarah-source-summary">

          <div>
            <span>
              آخر موضع
            </span>

            <strong>
              آية
              {' '}
              {currentReadingAyah}
            </strong>
          </div>


          <div>
            <span>
              الختمة الحالية
            </span>

            <strong>
              #{currentCycle}
            </strong>
          </div>


          <div>
            <span>
              إنجاز اليوم
            </span>

            <strong>
              {percentage}%
            </strong>
          </div>

        </div>


        {percentage >
          currentReadingPercentage && (
          <div className="baqarah-completed-badge">
            إنجاز اليوم
            {' '}
            {percentage}%
            {' '}
            لأن لديك تقدمًا مسجلًا بطريقة أخرى
            {paperPercentage >=
              percentage
              ? ' (المصحف الورقي)'
              : audioPercentage >=
                  percentage
                ? ' (الاستماع)'
                : ''}
          </div>
        )}

      </div>

    </section>
  )
}
