const STAR_AYAT = {
  72: 25,
  143: 50,
  215: 75,
  286: 100
}


export default function BaqarahVerse({
  verse,
  currentAyah
}) {
  const milestone =
    STAR_AYAT[
      verse.ayahNumber
    ]


  return (
    <>
      <span
        id={
          `baqarah-ayah-${verse.ayahNumber}`
        }
        data-ayah={
          verse.ayahNumber
        }
        className={
          `baqarah-verse ${
            currentAyah ===
            verse.ayahNumber
              ? 'current'
              : ''
          }`
        }
        translate="no"
      >
        <span
          className="baqarah-verse-text notranslate"
          translate="no"
        >
          {verse.text}
        </span>

        <span
          className="baqarah-ayah-number"
          aria-label={
            `الآية ${verse.ayahNumber}`
          }
        >
          {verse.ayahNumber}
        </span>

        {' '}
      </span>


      {milestone && (
        <span
          className="baqarah-inline-milestone"
          aria-label={
            `وصلت إلى ${milestone}%`
          }
        >
          ★
          {' '}
          {milestone}%
        </span>
      )}
    </>
  )
}
