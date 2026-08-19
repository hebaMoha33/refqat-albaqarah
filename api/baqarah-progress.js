import {
  getAdmin,
  getCurrentUser,
  readBody
} from '../server/auth.js'


/* =========================================
   DATE
========================================= */

function getRiyadhDateKey() {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Asia/Riyadh',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit'
      }
    ).formatToParts(
      new Date()
    )


  const map =
    Object.fromEntries(
      parts.map(
        part => [
          part.type,
          part.value
        ]
      )
    )


  return (
    `${map.year}-${map.month}-${map.day}`
  )
}


function isValidDateKey(
  value
) {
  return /^\d{4}-\d{2}-\d{2}$/
    .test(
      String(value || '')
    )
}


/* =========================================
   NUMBERS
========================================= */

function clamp(
  value,
  min,
  max
) {
  const number =
    Number(value)


  if (!Number.isFinite(number)) {
    return min
  }


  return Math.min(
    max,
    Math.max(
      min,
      Math.round(number)
    )
  )
}


function validPaperPercentage(
  value
) {
  const number =
    Number(value)


  return [
    0,
    25,
    50,
    75,
    100
  ].includes(number)
}


/* =========================================
   HANDLER
========================================= */

export default async function handler(
  req,
  res
) {

  res.setHeader(
    'Cache-Control',
    'no-store'
  )


  try {

    const current =
      await getCurrentUser(
        req
      )


    if (!current?.user?.id) {

      return res
        .status(401)
        .json({
          message:
            'يجب تسجيل الدخول أولًا.'
        })
    }


    const userId =
      current.user.id


    const supabase =
      getAdmin()


    /* =====================================
       GET
    ===================================== */

    if (
      req.method === 'GET'
    ) {

      const requestedDate =
        String(
          req.query?.date ||
          getRiyadhDateKey()
        )


      if (
        !isValidDateKey(
          requestedDate
        )
      ) {

        return res
          .status(400)
          .json({
            message:
              'صيغة التاريخ غير صحيحة.'
          })
      }


      /* تقدم اليوم */

      const {
        data: today,
        error: todayError
      } =
        await supabase
          .from(
            'baqarah_daily_progress'
          )
          .select(`
            id,
            user_id,
            progress_date,

            reader_percentage,
            last_ayah_number,

            paper_percentage,

            audio_percentage,
            audio_position_seconds,

            percentage,
            star_level,
            completed,

            last_source,
            completed_at,

            created_at,
            updated_at
          `)
          .eq(
            'user_id',
            userId
          )
          .eq(
            'progress_date',
            requestedDate
          )
          .maybeSingle()


      if (todayError) {
        throw todayError
      }


      /* التاريخ السابق */

      const {
        data: history,
        error: historyError
      } =
        await supabase
          .from(
            'baqarah_daily_progress'
          )
          .select(`
            progress_date,

            reader_percentage,
            last_ayah_number,

            paper_percentage,

            audio_percentage,

            percentage,
            star_level,
            completed,

            last_source,
            completed_at
          `)
          .eq(
            'user_id',
            userId
          )
          .order(
            'progress_date',
            {
              ascending:
                false
            }
          )
          .limit(400)


      if (historyError) {
        throw historyError
      }


      return res
        .status(200)
        .json({

          today:
            today || null,

          history:
            history || []

        })
    }


    /* =====================================
       POST
    ===================================== */

    if (
      req.method === 'POST'
    ) {

      const body =
        await readBody(req)


      const progressDate =
        String(
          body?.progress_date ||
          getRiyadhDateKey()
        )


      if (
        !isValidDateKey(
          progressDate
        )
      ) {

        return res
          .status(400)
          .json({
            message:
              'صيغة التاريخ غير صحيحة.'
          })
      }


      /* =================================
         CURRENT DATABASE ROW
      ================================= */

      const {
        data: existing,
        error: existingError
      } =
        await supabase
          .from(
            'baqarah_daily_progress'
          )
          .select(`
            id,

            reader_percentage,
            last_ayah_number,

            paper_percentage,

            audio_percentage,
            audio_position_seconds,

            percentage,
            completed,
            completed_at,

            last_source
          `)
          .eq(
            'user_id',
            userId
          )
          .eq(
            'progress_date',
            progressDate
          )
          .maybeSingle()


      if (existingError) {
        throw existingError
      }


      /* =================================
         READER
      ================================= */

      const incomingReader =
        body?.reader_percentage !==
          undefined
          ? clamp(
              body.reader_percentage,
              0,
              100
            )
          : null


      /*
        نسبة القراءة لا ترجع للخلف.
      */
      const readerPercentage =
        incomingReader === null
          ? Number(
              existing
                ?.reader_percentage ||
              0
            )
          : Math.max(
              Number(
                existing
                  ?.reader_percentage ||
                0
              ),
              incomingReader
            )


      /*
        last_ayah_number يمثل
        آخر موضع وقف عنده المستخدم.

        لذلك يسمح بتغييره حتى لو
        تحرك للأعلى في الصفحة.
      */
      const lastAyahNumber =
        body?.last_ayah_number !==
          undefined
          ? clamp(
              body.last_ayah_number,
              0,
              286
            )
          : Number(
              existing
                ?.last_ayah_number ||
              0
            )


      /* =================================
         PAPER
      ================================= */

      let paperPercentage =
        Number(
          existing
            ?.paper_percentage ||
          0
        )


      if (
        body?.paper_percentage !==
        undefined
      ) {

        if (
          !validPaperPercentage(
            body.paper_percentage
          )
        ) {

          return res
            .status(400)
            .json({
              message:
                'اختيار المصحف الورقي يجب أن يكون 0 أو 25 أو 50 أو 75 أو 100.'
            })
        }


        /*
          أيضًا المصحف الورقي
          لا يرجع إنجاز المستخدم للخلف.
        */
        paperPercentage =
          Math.max(
            paperPercentage,
            Number(
              body.paper_percentage
            )
          )
      }


      /* =================================
         AUDIO
      ================================= */

      const incomingAudio =
        body?.audio_percentage !==
          undefined
          ? clamp(
              body.audio_percentage,
              0,
              100
            )
          : null


      const audioPercentage =
        incomingAudio === null
          ? Number(
              existing
                ?.audio_percentage ||
              0
            )
          : Math.max(
              Number(
                existing
                  ?.audio_percentage ||
                0
              ),
              incomingAudio
            )


      const audioPosition =
        body
          ?.audio_position_seconds !==
          undefined
          ? Math.max(
              0,
              Math.round(
                Number(
                  body
                    .audio_position_seconds ||
                  0
                )
              )
            )
          : Number(
              existing
                ?.audio_position_seconds ||
              0
            )


      /* =================================
         SOURCE
      ================================= */

      const allowedSources =
        [
          'reader',
          'paper',
          'audio'
        ]


      const lastSource =
        allowedSources.includes(
          body?.last_source
        )
          ? body.last_source
          : (
              existing
                ?.last_source ||
              null
            )


      /* =================================
         FINAL PERCENTAGE
      ================================= */

      const finalPercentage =
        Math.max(
          readerPercentage,
          paperPercentage,
          audioPercentage
        )


      const completedNow =
        finalPercentage >=
        100


      let completedAt =
        existing
          ?.completed_at ||
        null


      if (
        completedNow &&
        !existing?.completed
      ) {
        completedAt =
          new Date()
            .toISOString()
      }


      /* =================================
         UPSERT
      ================================= */

      const {
        data: saved,
        error: saveError
      } =
        await supabase
          .from(
            'baqarah_daily_progress'
          )
          .upsert(
            {
              user_id:
                userId,

              progress_date:
                progressDate,

              reader_percentage:
                readerPercentage,

              last_ayah_number:
                lastAyahNumber,

              paper_percentage:
                paperPercentage,

              audio_percentage:
                audioPercentage,

              audio_position_seconds:
                audioPosition,

              last_source:
                lastSource,

              completed_at:
                completedAt,

              updated_at:
                new Date()
                  .toISOString()
            },
            {
              onConflict:
                'user_id,progress_date'
            }
          )
          .select(`
            id,
            user_id,
            progress_date,

            reader_percentage,
            last_ayah_number,

            paper_percentage,

            audio_percentage,
            audio_position_seconds,

            percentage,
            star_level,
            completed,

            last_source,
            completed_at,

            created_at,
            updated_at
          `)
          .single()


      if (saveError) {
        throw saveError
      }


      return res
        .status(200)
        .json({

          ok: true,

          progress:
            saved

        })
    }


    /* =====================================
       OTHER METHODS
    ===================================== */

    return res
      .status(405)
      .json({
        message:
          'طريقة الطلب غير مسموحة.'
      })


  } catch (error) {

    console.error(
      'BAQARAH PROGRESS ERROR:',
      error
    )


    return res
      .status(500)
      .json({
        message:
          error?.message ||
          'تعذر حفظ تقدم سورة البقرة.'
      })
  }
}