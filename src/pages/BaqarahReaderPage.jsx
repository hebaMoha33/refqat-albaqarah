import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import '../baqarah-reader.css'

import {
  apiRequest
} from '../lib/api'

import baqarahVerses
  from '../data/baqarah.json'

import BaqarahReaderStars
  from '../components/baqarah/reader/BaqarahReaderStars'

import BaqarahVerse
  from '../components/baqarah/reader/BaqarahVerse'


function percentageFromAyah(
  ayah
) {
  if (ayah <= 0) {
    return 0
  }

  if (ayah >= 286) {
    return 100
  }

  return Math.round(
    (
      ayah /
      286
    ) * 100
  )
}


export default function BaqarahReaderPage() {
  const verses =
    baqarahVerses


  const [
    state,
    setState
  ] =
    useState(null)


  const [
    todayProgress,
    setTodayProgress
  ] =
    useState(null)


  const [
    completions,
    setCompletions
  ] =
    useState({
      today: 0,
      week: 0,
      month: 0,
      year: 0,
      all: 0
    })


  const [
    loading,
    setLoading
  ] =
    useState(true)


  const [
    error,
    setError
  ] =
    useState('')


  const [
    saving,
    setSaving
  ] =
    useState(false)


  const [
    currentAyah,
    setCurrentAyah
  ] =
    useState(0)


  const restoredRef =
    useRef(false)

  const saveTimerRef =
    useRef(null)

  const latestSeenRef =
    useRef(0)

  const lastSavedRef =
    useRef(0)

  const savingPromiseRef =
    useRef(null)

  const rafRef =
    useRef(null)


  const persistentPercentage =
    Number(
      state?.reader_percentage ||
      percentageFromAyah(
        state?.last_ayah_number ||
        0
      )
    )


  const todayPercentage =
    Number(
      todayProgress
        ?.reader_percentage ||
      0
    )


  const currentCycle =
    Number(
      state?.current_cycle ||
      1
    )


  const completedCurrentCycle =
    persistentPercentage >= 100


  /* =====================================
     LOAD USER STATE
  ===================================== */

  useEffect(() => {
    let active =
      true


    async function load() {
      try {
        const readerData =
          await apiRequest(
            '/api/baqarah-reader-state',
            {
              method: 'GET'
            }
          )


        if (!active) {
          return
        }


        const savedAyah =
          Number(
            readerData
              ?.state
              ?.last_ayah_number ||
            0
          )


        setState(
          readerData?.state ||
          null
        )


        setTodayProgress(
          readerData?.todayProgress ||
          null
        )


        setCompletions(
          readerData?.completions ||
          {
            today: 0,
            week: 0,
            month: 0,
            year: 0,
            all: 0
          }
        )


        setCurrentAyah(
          savedAyah
        )


        latestSeenRef.current =
          savedAyah


        lastSavedRef.current =
          savedAyah


        setError('')

      } catch (loadError) {

        if (!active) {
          return
        }


        console.error(
          'LOAD BAQARAH READER:',
          loadError
        )


        setError(
          loadError?.message ||
          'تعذر تحميل موضع القراءة المحفوظ.'
        )

      } finally {

        if (active) {
          setLoading(false)
        }
      }
    }


    load()


    return () => {
      active = false


      if (
        saveTimerRef.current
      ) {
        clearTimeout(
          saveTimerRef.current
        )
      }


      if (
        rafRef.current
      ) {
        cancelAnimationFrame(
          rafRef.current
        )
      }
    }

  }, [])


  /* =====================================
     RESTORE LAST POSITION
  ===================================== */

  useEffect(() => {
    if (
      restoredRef.current ||
      !state
    ) {
      return
    }


    restoredRef.current =
      true


    const lastAyah =
      Number(
        state.last_ayah_number ||
        0
      )


    if (lastAyah <= 0) {
      return
    }


    requestAnimationFrame(
      () => {
        const element =
          document
            .getElementById(
              `baqarah-ayah-${lastAyah}`
            )


        element?.scrollIntoView({
          behavior: 'instant',
          block: 'center'
        })
      }
    )

  }, [
    state
  ])


  /* =====================================
     SAVE POSITION
  ===================================== */

  const savePosition =
    useCallback(
      async (
        ayah,
        force = false
      ) => {
        const safeAyah =
          Math.min(
            286,
            Math.max(
              0,
              Number(ayah || 0)
            )
          )


        if (
          safeAyah <= 0 ||
          completedCurrentCycle
        ) {
          return null
        }


        if (
          !force &&
          safeAyah <=
            lastSavedRef.current
        ) {
          return null
        }


        if (
          savingPromiseRef.current
        ) {
          await savingPromiseRef.current
        }


        setSaving(true)


        const request =
          apiRequest(
            '/api/baqarah-reader-state',
            {
              method: 'POST',

              body:
                JSON.stringify({
                  last_ayah_number:
                    safeAyah
                })
            }
          )


        savingPromiseRef.current =
          request


        try {
          const result =
            await request


          const savedState =
            result?.state ||
            null


          const savedAyah =
            Number(
              savedState
                ?.last_ayah_number ||
              safeAyah
            )


          lastSavedRef.current =
            Math.max(
              lastSavedRef.current,
              savedAyah
            )


          setState(
            savedState
          )


          setCompletions(
            result?.completions ||
            {
              today: 0,
              week: 0,
              month: 0,
              year: 0,
              all: 0
            }
          )


          const savedPercentage =
            Number(
              savedState
                ?.reader_percentage ||
              percentageFromAyah(
                savedAyah
              )
            )


          setTodayProgress(
            previous => ({
              ...(previous || {}),

              reader_percentage:
                Math.max(
                  Number(
                    previous
                      ?.reader_percentage ||
                    0
                  ),
                  savedPercentage
                ),

              last_ayah_number:
                Math.max(
                  Number(
                    previous
                      ?.last_ayah_number ||
                    0
                  ),
                  savedAyah
                )
            })
          )


          return result

        } catch (saveError) {

          console.error(
            'SAVE READER POSITION:',
            saveError
          )


          setError(
            saveError?.message ||
            'تعذر حفظ موضع القراءة.'
          )


          return null

        } finally {

          savingPromiseRef.current =
            null

          setSaving(false)
        }
      },
      [
        completedCurrentCycle
      ]
    )


  function scheduleSave(
    ayah
  ) {
    if (
      saveTimerRef.current
    ) {
      clearTimeout(
        saveTimerRef.current
      )
    }


    saveTimerRef.current =
      setTimeout(
        () => {
          savePosition(
            ayah
          )
        },
        350
      )
  }


  /* =====================================
     CONTINUOUS MUSHAF SCROLL TRACKER

     نعتبر الآية مقروءة عندما يمر آخرها
     فوق خط القراءة الموجود عند 68% من الشاشة.
  ===================================== */

  useEffect(() => {
    if (
      loading ||
      completedCurrentCycle
    ) {
      return
    }


    const elements =
      Array.from(
        document.querySelectorAll(
          '.baqarah-verse[data-ayah]'
        )
      )


    if (!elements.length) {
      return
    }


    function detectCurrentAyah() {
      rafRef.current =
        null


      const readingLine =
        window.innerHeight *
        0.68


      let bestAyah =
        latestSeenRef.current


      let visibleAyah =
        currentAyah


      for (
        const element of elements
      ) {
        const ayah =
          Number(
            element.dataset.ayah
          )


        const rect =
          element
            .getBoundingClientRect()


        /*
          آخر الآية تجاوز خط القراءة:
          إذن نعتبرها وصلت.
        */
        if (
          rect.bottom <=
          readingLine
        ) {
          bestAyah =
            Math.max(
              bestAyah,
              ayah
            )
        }


        /*
          الآية التي يمر خط القراءة داخلها
          هي الآية الحالية بصريًا.
        */
        if (
          rect.top <=
            readingLine &&
          rect.bottom >=
            readingLine
        ) {
          visibleAyah =
            ayah
        }
      }


      if (
        visibleAyah > 0
      ) {
        setCurrentAyah(
          visibleAyah
        )
      }


      if (
        bestAyah >
        latestSeenRef.current
      ) {
        latestSeenRef.current =
          bestAyah


        /*
          نحدث الواجهة فورًا قبل انتظار Supabase.
        */
        setState(
          previous => ({
            ...(previous || {}),
            last_ayah_number:
              bestAyah,
            reader_percentage:
              percentageFromAyah(
                bestAyah
              )
          })
        )


        setTodayProgress(
          previous => ({
            ...(previous || {}),
            reader_percentage:
              Math.max(
                Number(
                  previous
                    ?.reader_percentage ||
                  0
                ),
                percentageFromAyah(
                  bestAyah
                )
              ),
            last_ayah_number:
              Math.max(
                Number(
                  previous
                    ?.last_ayah_number ||
                  0
                ),
                bestAyah
              )
          })
        )


        scheduleSave(
          bestAyah
        )
      }
    }


    function onScroll() {
      if (
        rafRef.current
      ) {
        return
      }


      rafRef.current =
        requestAnimationFrame(
          detectCurrentAyah
        )
    }


    detectCurrentAyah()


    window.addEventListener(
      'scroll',
      onScroll,
      {
        passive: true
      }
    )


    window.addEventListener(
      'resize',
      onScroll
    )


    return () => {
      window.removeEventListener(
        'scroll',
        onScroll
      )


      window.removeEventListener(
        'resize',
        onScroll
      )


      if (
        rafRef.current
      ) {
        cancelAnimationFrame(
          rafRef.current
        )
      }
    }

  }, [
    loading,
    completedCurrentCycle,
    currentAyah,
    savePosition
  ])


  /* =====================================
     SAVE BEFORE LEAVING / REFRESH
  ===================================== */

  useEffect(() => {
    function flushWithKeepalive() {
      const ayah =
        latestSeenRef.current


      if (
        ayah <= 0 ||
        ayah <=
          lastSavedRef.current ||
        completedCurrentCycle
      ) {
        return
      }


      fetch(
        '/api/baqarah-reader-state',
        {
          method: 'POST',

          credentials:
            'include',

          keepalive:
            true,

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              last_ayah_number:
                ayah
            })
        }
      ).catch(
        () => {}
      )
    }


    window.addEventListener(
      'pagehide',
      flushWithKeepalive
    )


    return () => {
      window.removeEventListener(
        'pagehide',
        flushWithKeepalive
      )
    }

  }, [
    completedCurrentCycle
  ])


  /* =====================================
     NEW CYCLE
  ===================================== */

  async function startNewCycle() {
    setSaving(true)
    setError('')


    try {
      const result =
        await apiRequest(
          '/api/baqarah-reader-state',
          {
            method: 'POST',

            body:
              JSON.stringify({
                action:
                  'new_cycle'
              })
          }
        )


      setState(
        result?.state ||
        null
      )


      setCompletions(
        result?.completions ||
        {
          today: 0,
          week: 0,
          month: 0,
          year: 0,
          all: 0
        }
      )


      setCurrentAyah(0)


      latestSeenRef.current =
        0


      lastSavedRef.current =
        0


      restoredRef.current =
        true


      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })

    } catch (cycleError) {

      console.error(
        'START NEW BAQARAH CYCLE:',
        cycleError
      )


      setError(
        cycleError?.message ||
        'تعذر بدء ختمة جديدة.'
      )

    } finally {

      setSaving(false)
    }
  }


  const headerStats =
    useMemo(
      () => [
        {
          label:
            'ختمات هذا الأسبوع',

          value:
            completions.week
        },

        {
          label:
            'هذا الشهر',

          value:
            completions.month
        },

        {
          label:
            'هذه السنة',

          value:
            completions.year
        }
      ],
      [
        completions
      ]
    )


  async function goBack() {
    if (
      saveTimerRef.current
    ) {
      clearTimeout(
        saveTimerRef.current
      )

      saveTimerRef.current =
        null
    }


    const latestAyah =
      latestSeenRef.current


    if (
      latestAyah >
      lastSavedRef.current
    ) {
      await savePosition(
        latestAyah,
        true
      )
    }


    window.location.hash =
      '#/companion'
  }


  if (loading) {
    return (
      <main className="baqarah-reader-page">
        <div className="baqarah-reader-loading">
          جاري تحميل موضع القراءة...
        </div>
      </main>
    )
  }


  return (
    <main className="baqarah-reader-page">

      <header className="baqarah-reader-header">

        <button
          type="button"
          className="baqarah-reader-back"
          onClick={goBack}
        >
          ← سورة البقرة
        </button>


        <div className="baqarah-reader-title">
          <span>
            رفقة البقرة
          </span>

          <h1>
            سورة البقرة
          </h1>

          <small>
            النص محفوظ داخل التطبيق من بيانات مجمع الملك فهد
          </small>
        </div>


        <div className="baqarah-reader-save-status">
          {saving
            ? 'جاري الحفظ...'
            : error
              ? 'تعذر الحفظ'
              : 'موضعك محفوظ'}
        </div>

      </header>


      <section className="baqarah-reader-progress-card">

        <div className="baqarah-reader-main-progress">

          <div>
            <span>
              موضعك في الختمة
              {' '}
              #{currentCycle}
            </span>

            <strong>
              {persistentPercentage}%
            </strong>

            <small>
              آخر آية:
              {' '}
              {
                state
                  ?.last_ayah_number ||
                0
              }
              {' '}
              من 286
            </small>
          </div>


          <div>
            <span>
              إنجاز اليوم
            </span>

            <strong>
              {todayPercentage}%
            </strong>

            <small>
              يُحسب بأعلى موضع وصلت إليه اليوم
            </small>
          </div>

        </div>


        <BaqarahReaderStars
          percentage={
            persistentPercentage
          }
        />


        <div className="baqarah-reader-completion-stats">
          {headerStats.map(
            item => (
              <div key={item.label}>
                <span>
                  {item.label}
                </span>

                <strong>
                  {item.value}
                </strong>
              </div>
            )
          )}
        </div>


        {completedCurrentCycle && (
          <div className="baqarah-reader-completed">
            <div>
              <span>
                👑
              </span>

              <strong>
                أتممت الختمة
                {' '}
                #{currentCycle}
              </strong>

              <small>
                تم تسجيلها ضمن الأسبوع والشهر والسنة.
              </small>
            </div>


            <button
              type="button"
              disabled={saving}
              onClick={
                startNewCycle
              }
            >
              ابدأ ختمة جديدة
            </button>
          </div>
        )}

      </section>


      <section
        className="baqarah-mushaf"
        translate="no"
      >

        <div className="baqarah-mushaf-heading">

          <span>
            سُورَةُ الْبَقَرَةِ
          </span>


          <strong>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </strong>


          <small>
            قراءة متصلة على هيئة المصحف
          </small>

        </div>


        <div
          className="baqarah-mushaf-text"
          dir="rtl"
        >
          {verses.map(
            verse => (
              <BaqarahVerse
                key={
                  verse.verseKey
                }
                verse={verse}
                currentAyah={
                  currentAyah
                }
              />
            )
          )}
        </div>

      </section>

    </main>
  )
}
