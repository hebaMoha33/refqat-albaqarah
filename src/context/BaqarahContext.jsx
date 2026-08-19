/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */

import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import {
  apiRequest
} from '../lib/api'

import {
  useAuth
} from './AuthContext'


const BaqarahContext =
  createContext(null)


function emptyProgress() {
  return {
    reader_percentage: 0,
    last_ayah_number: 0,

    paper_percentage: 0,

    audio_percentage: 0,
    audio_position_seconds: 0,

    percentage: 0,
    star_level: 0,
    completed: false,

    last_source: null,
    completed_at: null
  }
}


function emptyReaderState() {
  return {
    current_cycle: 1,
    last_ayah_number: 0,
    reader_percentage: 0
  }
}


function starLevelFromPercentage(
  percentage
) {
  if (percentage >= 100) {
    return 4
  }

  if (percentage >= 75) {
    return 3
  }

  if (percentage >= 50) {
    return 2
  }

  if (percentage >= 25) {
    return 1
  }

  return 0
}


export function BaqarahProvider({
  children
}) {
  const {
    currentUser
  } = useAuth()


  /*
    progress:
    إنجاز اليوم في جدول baqarah_daily_progress.
    قد يكون سببه القراءة أو المصحف الورقي أو الصوت.
  */
  const [
    progress,
    setProgress
  ] =
    useState(
      emptyProgress
    )


  /*
    readerState:
    موضع الختمة الحالية المستمر.
    هذا هو الرقم الصحيح الذي يجب عرضه
    عند قول "متابعة القراءة".
  */
  const [
    readerState,
    setReaderState
  ] =
    useState(
      emptyReaderState
    )


  const [
    history,
    setHistory
  ] =
    useState([])


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
    useState(false)


  const [
    saving,
    setSaving
  ] =
    useState(false)


  const [
    error,
    setError
  ] =
    useState('')


  const [
    message,
    setMessage
  ] =
    useState('')


  /* =====================================
     DAILY OVERALL PROGRESS
  ===================================== */

  const percentage =
    Number(
      progress?.percentage ||
      Math.max(
        Number(
          progress
            ?.reader_percentage ||
          0
        ),

        Number(
          progress
            ?.paper_percentage ||
          0
        ),

        Number(
          progress
            ?.audio_percentage ||
          0
        )
      )
    )


  const starLevel =
    Number(
      progress?.star_level ||
      starLevelFromPercentage(
        percentage
      )
    )


  const completed =
    Boolean(
      progress?.completed ||
      percentage >= 100
    )


  /* =====================================
     CURRENT READING FOLLOW-UP

     هذا مستقل عن المصحف الورقي.
     لذلك لو paper = 100%
     والقراءة الحالية = 26%
     ستظل "متابعة القراءة" = 26%.
  ===================================== */

  const currentReadingPercentage =
    Number(
      readerState
        ?.reader_percentage ||
      0
    )


  const currentReadingAyah =
    Number(
      readerState
        ?.last_ayah_number ||
      0
    )


  const currentCycle =
    Number(
      readerState
        ?.current_cycle ||
      1
    )


  const currentReadingStarLevel =
    starLevelFromPercentage(
      currentReadingPercentage
    )


  /* =====================================
     LOAD TODAY + CURRENT READER STATE
  ===================================== */

  useEffect(() => {
    if (!currentUser?.id) {
      setProgress(
        emptyProgress()
      )

      setReaderState(
        emptyReaderState()
      )

      setHistory([])

      setCompletions({
        today: 0,
        week: 0,
        month: 0,
        year: 0,
        all: 0
      })

      setError('')
      setMessage('')
      setLoading(false)

      return
    }


    let active =
      true


    async function load() {
      setLoading(true)
      setError('')


      try {
        const [
          dailyData,
          readerData
        ] =
          await Promise.all([
            apiRequest(
              '/api/baqarah-progress',
              {
                method: 'GET'
              }
            ),

            apiRequest(
              '/api/baqarah-reader-state',
              {
                method: 'GET'
              }
            )
          ])


        if (!active) {
          return
        }


        setProgress(
          dailyData?.today ||
          emptyProgress()
        )


        setHistory(
          dailyData?.history ||
          []
        )


        setReaderState(
          readerData?.state ||
          emptyReaderState()
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

      } catch (loadError) {

        if (!active) {
          return
        }


        console.error(
          'LOAD BAQARAH:',
          loadError
        )


        setError(
          loadError?.message ||
          'تعذر تحميل تقدم سورة البقرة.'
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
    }

  }, [
    currentUser?.id
  ])


  /* =====================================
     HISTORY HELPER
  ===================================== */

  function mergeHistoryRow(
    saved
  ) {
    if (!saved?.progress_date) {
      return
    }


    setHistory(
      previous => {
        const others =
          previous.filter(
            row =>
              row.progress_date !==
              saved.progress_date
          )


        return [
          saved,
          ...others
        ]
      }
    )
  }


  /* =====================================
     PAPER STARS
  ===================================== */

  async function selectPaperStar(
    selectedPercentage
  ) {
    if (!currentUser?.id) {
      return {
        ok: false,
        needsAuth: true
      }
    }


    const allowed = [
      25,
      50,
      75,
      100
    ]


    if (
      !allowed.includes(
        Number(
          selectedPercentage
        )
      )
    ) {
      return {
        ok: false
      }
    }


    setSaving(true)
    setError('')
    setMessage('')


    try {
      const data =
        await apiRequest(
          '/api/baqarah-progress',
          {
            method: 'POST',

            body:
              JSON.stringify({
                paper_percentage:
                  Number(
                    selectedPercentage
                  ),

                last_source:
                  'paper'
              })
          }
        )


      const saved =
        data?.progress


      if (saved) {
        setProgress(saved)

        mergeHistoryRow(
          saved
        )
      }


      const savedPercentage =
        Number(
          saved?.percentage ||
          selectedPercentage
        )


      setMessage(
        savedPercentage >= 100
          ? 'تم تسجيل إتمام سورة البقرة اليوم 👑'
          : `تم حفظ تقدمك عند ${savedPercentage}%`
      )


      return {
        ok: true,
        progress: saved
      }

    } catch (saveError) {

      console.error(
        'SAVE PAPER PROGRESS:',
        saveError
      )


      setError(
        saveError?.message ||
        'تعذر حفظ التقدم.'
      )


      return {
        ok: false
      }

    } finally {

      setSaving(false)
    }
  }


  function clearMessage() {
    setMessage('')
  }


  const value = {
    /*
      Daily progress
    */
    progress,
    history,

    percentage,
    starLevel,
    completed,

    /*
      Persistent reader follow-up
    */
    readerState,

    currentReadingPercentage,
    currentReadingAyah,
    currentReadingStarLevel,
    currentCycle,

    completions,

    /*
      UI state
    */
    loading,
    saving,

    error,
    message,

    /*
      Actions
    */
    selectPaperStar,
    clearMessage
  }


  return (
    <BaqarahContext.Provider
      value={value}
    >
      {children}
    </BaqarahContext.Provider>
  )
}


export function useBaqarah() {
  const context =
    useContext(
      BaqarahContext
    )


  if (!context) {
    throw new Error(
      'useBaqarah must be used inside BaqarahProvider.'
    )
  }


  return context
}
