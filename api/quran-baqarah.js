import {
  callQuranFoundation
} from '../server/quranFoundation.js'


let cachedVerses = null


function normalizeVerses(
  rows
) {
  return (
    rows || []
  )
    .map(
      row => {
        const [
          chapter,
          verse
        ] =
          String(
            row.verse_key ||
            ''
          )
            .split(':')
            .map(Number)

        return {
          id:
            row.id,

          chapterNumber:
            chapter,

          ayahNumber:
            verse,

          verseKey:
            row.verse_key,

          text:
            row.text_uthmani
        }
      }
    )
    .filter(
      row =>
        row.chapterNumber === 2 &&
        row.ayahNumber >= 1 &&
        row.ayahNumber <= 286 &&
        row.text
    )
    .sort(
      (a, b) =>
        a.ayahNumber -
        b.ayahNumber
    )
}


export default async function handler(
  req,
  res
) {
  if (
    req.method !== 'GET'
  ) {
    return res
      .status(405)
      .json({
        message:
          'طريقة الطلب غير مسموحة.'
      })
  }


  try {
    if (!cachedVerses) {
      const data =
        await callQuranFoundation(
          '/content/api/v4/quran/verses/uthmani?chapter_number=2'
        )

      cachedVerses =
        normalizeVerses(
          data?.verses
        )

      if (
        cachedVerses.length !==
        286
      ) {
        throw new Error(
          `تم استلام ${cachedVerses.length} آية فقط بدل 286.`
        )
      }
    }


    res.setHeader(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=604800'
    )


    return res
      .status(200)
      .json({
        source:
          'Quran Foundation',

        script:
          'uthmani',

        chapterNumber:
          2,

        verses:
          cachedVerses
      })

  } catch (error) {

    console.error(
      'QURAN BAQARAH ERROR:',
      error
    )


    return res
      .status(500)
      .json({
        message:
          error?.message ||
          'تعذر تحميل سورة البقرة.'
      })
  }
}
