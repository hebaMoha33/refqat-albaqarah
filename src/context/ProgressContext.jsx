/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  morningAdhkarList,
  eveningAdhkarList
} from '../data/adhkarLists'

import {
  apiRequest
} from '../lib/api'

import {
  getDateKey,
  loadLocalProgress,
  saveLocalProgress,
  getRemainingFrom,
  calculatePeriodPercentage,
  isPeriodComplete,
  mergePeriodProgress,
  calculateStreak
} from '../lib/appHelpers'

import {
  useAuth
} from './AuthContext'


const ProgressContext =
  createContext(null)


export function ProgressProvider({
  children
}) {
  const {
    currentUser,
    authChecked
  } = useAuth()


  const today =
    getDateKey()


  /*
    guest = تقدم الضيف فقط

    user:<uuid> = تقدم حساب محدد

    بهذه الطريقة لا ينتقل تقدم حساب
    إلى حساب آخر على نفس الجهاز.
  */
  const ownerKey =
    currentUser?.id
      ? `user:${currentUser.id}`
      : 'guest'


  const currentOwnerRef =
    useRef(ownerKey)


  /*
    مهم:
    لا نكتب currentOwnerRef.current أثناء render.
    نحدثه داخل Effect لأن React/ESLint يمنع
    تعديل ref مباشرة أثناء التصيير.
  */
  useEffect(() => {
    currentOwnerRef.current =
      ownerKey
  }, [ownerKey])


  /*
    هذا الـref يخبرنا لأي حساب
    ينتمي progress الموجود حاليًا.
  */
  const progressOwnerRef =
    useRef('guest')


  /*
    هذا الـref يمنع حفظ progress
    الخاص بالحساب السابق داخل الحساب الجديد
    أثناء لحظة تبديل الحسابات.
  */
  const cloudOwnerRef =
    useRef(null)


  const [
    period,
    setPeriod
  ] =
    useState('morning')


  const [
    progress,
    setProgress
  ] =
    useState(
      () =>
        loadLocalProgress(
          today,
          'guest'
        )
    )


  const [
    expandedId,
    setExpandedId
  ] =
    useState(null)


  const [
    cloudReady,
    setCloudReady
  ] =
    useState(false)


  const [
    history,
    setHistory
  ] =
    useState([])


  const [
    syncStatus,
    setSyncStatus
  ] =
    useState('local')


  /* =====================================
     PERCENTAGES
  ===================================== */

  const morningPercentage =
    useMemo(
      () =>
        calculatePeriodPercentage(
          progress,
          'morning'
        ),
      [progress]
    )


  const eveningPercentage =
    useMemo(
      () =>
        calculatePeriodPercentage(
          progress,
          'evening'
        ),
      [progress]
    )


  const dailyPercentage =
    Math.round(
      (
        morningPercentage +
        eveningPercentage
      ) / 2
    )


  const morningCompleted =
    isPeriodComplete(
      progress,
      'morning'
    )


  const eveningCompleted =
    isPeriodComplete(
      progress,
      'evening'
    )


  const dayCompleted =
    morningCompleted &&
    eveningCompleted


  const streak =
    useMemo(
      () =>
        calculateStreak(
          history,
          today,
          dayCompleted
        ),
      [
        history,
        today,
        dayCompleted
      ]
    )


  /* =====================================
     LOCAL SAVE

     لا نحفظ إلا إذا progress الحالي
     ينتمي فعلًا للحساب الحالي.
  ===================================== */

  useEffect(() => {
    if (
      progressOwnerRef.current !==
      ownerKey
    ) {
      return
    }

    saveLocalProgress(
      today,
      progress,
      ownerKey
    )
  }, [
    today,
    progress,
    ownerKey
  ])


  /* =====================================
     SWITCH USER + LOAD HIS OWN PROGRESS
  ===================================== */

  useEffect(() => {
    if (!authChecked) {
      return
    }


    let cancelled =
      false


    /*
      نغلق الحفظ السحابي فورًا.
      مهم جدًا عند الانتقال من حساب A إلى B.
    */
    cloudOwnerRef.current =
      null

    setCloudReady(false)
    setHistory([])


    /*
      نقرأ cache خاص بهذا الحساب فقط.
      لا نستخدم progress الحساب السابق.
    */
    const scopedLocal =
      loadLocalProgress(
        today,
        ownerKey
      )


    progressOwnerRef.current =
      ownerKey

    setProgress(
      scopedLocal
    )

    setExpandedId(null)


    /*
      الضيف لا يحتاج Cloud.
    */
    if (!currentUser?.id) {
      setSyncStatus('local')
      return
    }


    setSyncStatus('loading')


    async function loadCloudProgress() {
      try {
        const data =
          await apiRequest(
            `/api/progress?date=${encodeURIComponent(
              today
            )}`,
            {
              method: 'GET'
            }
          )


        if (
          cancelled ||
          currentOwnerRef.current !==
            ownerKey
        ) {
          return
        }


        /*
          الدمج هنا بين:
          local الخاص بنفس الحساب
          +
          cloud الخاص بنفس الحساب

          لذلك لا يوجد خلط بين المستخدمين.
        */
        const mergedProgress =
          data?.today
            ? {
                morning:
                  mergePeriodProgress(
                    scopedLocal
                      .morning,

                    data.today
                      .morning_progress ||
                      {},

                    morningAdhkarList
                  ),

                evening:
                  mergePeriodProgress(
                    scopedLocal
                      .evening,

                    data.today
                      .evening_progress ||
                      {},

                    eveningAdhkarList
                  )
              }
            : scopedLocal


        progressOwnerRef.current =
          ownerKey

        setProgress(
          mergedProgress
        )


        /*
          نحفظ الدمج محليًا فورًا
          لنفس الحساب.
        */
        saveLocalProgress(
          today,
          mergedProgress,
          ownerKey
        )


        setHistory(
          data?.history || []
        )


        /*
          لا نسمح للحفظ السحابي
          إلا بعد اكتمال تحميل الحساب الصحيح.
        */
        cloudOwnerRef.current =
          ownerKey

        setCloudReady(true)
        setSyncStatus('saved')

      } catch (error) {

        console.error(
          'LOAD CLOUD PROGRESS:',
          error
        )


        if (
          !cancelled &&
          currentOwnerRef.current ===
            ownerKey
        ) {
          /*
            حتى لو فشل cloud load،
            يبقى cache الحساب المحلي ظاهرًا.
            لكن لا نرسل شيئًا للسحابة
            حتى لا نخاطر بخلط الحسابات.
          */
          cloudOwnerRef.current =
            null

          setCloudReady(false)
          setSyncStatus('error')
        }
      }
    }


    loadCloudProgress()


    return () => {
      cancelled = true
    }

  }, [
    currentUser?.id,
    authChecked,
    today,
    ownerKey
  ])


  /* =====================================
     CLOUD SAVE HELPER
  ===================================== */

  async function saveCurrentProgressToCloud(
    showSaving = true
  ) {
    if (
      !currentUser?.id ||
      !cloudReady ||
      cloudOwnerRef.current !==
        ownerKey ||
      progressOwnerRef.current !==
        ownerKey ||
      currentOwnerRef.current !==
        ownerKey
    ) {
      return false
    }


    if (showSaving) {
      setSyncStatus(
        'saving'
      )
    }


    try {
      const saved =
        await apiRequest(
          '/api/progress',
          {
            method: 'POST',

            body:
              JSON.stringify({
                progress_date:
                  today,

                morning_progress:
                  progress.morning,

                evening_progress:
                  progress.evening,

                morning_percentage:
                  morningPercentage,

                evening_percentage:
                  eveningPercentage
              })
          }
        )


      /*
        ربما المستخدم خرج أثناء انتظار الطلب.
        لا نحدث state لو الحساب تغيّر.
      */
      if (
        currentOwnerRef.current !==
        ownerKey
      ) {
        return false
      }


      const row =
        saved?.today || {
          progress_date:
            today,

          morning_percentage:
            morningPercentage,

          evening_percentage:
            eveningPercentage,

          morning_completed:
            morningCompleted,

          evening_completed:
            eveningCompleted,

          day_completed:
            dayCompleted
        }


      setHistory(
        previous => {
          const others =
            previous.filter(
              item =>
                item
                  .progress_date !==
                today
            )

          return [
            row,
            ...others
          ]
        }
      )


      setSyncStatus(
        'saved'
      )

      return true

    } catch (error) {

      console.error(
        'SAVE CLOUD PROGRESS:',
        error
      )


      if (
        currentOwnerRef.current ===
        ownerKey
      ) {
        setSyncStatus(
          'error'
        )
      }


      return false
    }
  }


  /* =====================================
     AUTO SAVE

     250ms بعد آخر ضغطة.
  ===================================== */

  useEffect(() => {
    if (
      !currentUser?.id ||
      !cloudReady ||
      cloudOwnerRef.current !==
        ownerKey ||
      progressOwnerRef.current !==
        ownerKey
    ) {
      return
    }


    const snapshotOwner =
      ownerKey


    const timer =
      setTimeout(
        async () => {
          if (
            currentOwnerRef.current !==
              snapshotOwner ||
            cloudOwnerRef.current !==
              snapshotOwner ||
            progressOwnerRef.current !==
              snapshotOwner
          ) {
            return
          }


          setSyncStatus(
            'saving'
          )


          try {
            const saved =
              await apiRequest(
                '/api/progress',
                {
                  method: 'POST',

                  body:
                    JSON.stringify({
                      progress_date:
                        today,

                      morning_progress:
                        progress.morning,

                      evening_progress:
                        progress.evening,

                      morning_percentage:
                        morningPercentage,

                      evening_percentage:
                        eveningPercentage
                    })
                }
              )


            if (
              currentOwnerRef.current !==
                snapshotOwner
            ) {
              return
            }


            const row =
              saved?.today || {
                progress_date:
                  today,

                morning_percentage:
                  morningPercentage,

                evening_percentage:
                  eveningPercentage,

                morning_completed:
                  morningCompleted,

                evening_completed:
                  eveningCompleted,

                day_completed:
                  dayCompleted
              }


            setHistory(
              previous => {
                const others =
                  previous.filter(
                    item =>
                      item
                        .progress_date !==
                      today
                  )

                return [
                  row,
                  ...others
                ]
              }
            )


            setSyncStatus(
              'saved'
            )

          } catch (error) {

            console.error(
              'AUTO SAVE PROGRESS:',
              error
            )


            if (
              currentOwnerRef.current ===
                snapshotOwner
            ) {
              setSyncStatus(
                'error'
              )
            }
          }

        },
        250
      )


    return () =>
      clearTimeout(timer)

  }, [
    progress,
    currentUser?.id,
    cloudReady,
    ownerKey,
    today,
    morningPercentage,
    eveningPercentage,
    morningCompleted,
    eveningCompleted,
    dayCompleted
  ])


  /* =====================================
     PAGE CLOSE / REFRESH SAFETY
  ===================================== */

  useEffect(() => {
    if (
      !currentUser?.id ||
      !cloudReady ||
      cloudOwnerRef.current !==
        ownerKey ||
      progressOwnerRef.current !==
        ownerKey
    ) {
      return
    }


    function saveBeforeLeaving() {
      if (
        currentOwnerRef.current !==
        ownerKey
      ) {
        return
      }


      const body =
        JSON.stringify({
          progress_date:
            today,

          morning_progress:
            progress.morning,

          evening_progress:
            progress.evening,

          morning_percentage:
            morningPercentage,

          evening_percentage:
            eveningPercentage
        })


      fetch(
        '/api/progress',
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

          body
        }
      ).catch(
        () => {}
      )
    }


    window.addEventListener(
      'pagehide',
      saveBeforeLeaving
    )


    return () => {
      window.removeEventListener(
        'pagehide',
        saveBeforeLeaving
      )
    }

  }, [
    progress,
    currentUser?.id,
    cloudReady,
    ownerKey,
    today,
    morningPercentage,
    eveningPercentage
  ])


  /* =====================================
     ACTIONS
  ===================================== */

  function changePeriod(
    nextPeriod
  ) {
    setPeriod(
      nextPeriod
    )

    setExpandedId(
      null
    )
  }


  function toggleExpanded(
    itemId
  ) {
    setExpandedId(
      current =>
        current === itemId
          ? null
          : itemId
    )
  }


  function getRemaining(
    item,
    selectedPeriod = period
  ) {
    return getRemainingFrom(
      progress,
      selectedPeriod,
      item
    )
  }


  function countDhikr(
    item,
    selectedPeriod = period
  ) {
    if (
      progressOwnerRef.current !==
      ownerKey
    ) {
      return
    }


    const current =
      getRemaining(
        item,
        selectedPeriod
      )


    if (
      current <= 0
    ) {
      return
    }


    setProgress(
      previous => ({
        ...previous,

        [selectedPeriod]: {
          ...previous[
            selectedPeriod
          ],

          [item.id]:
            current - 1
        }
      })
    )
  }


  function resetDhikr(
    item,
    selectedPeriod = period
  ) {
    if (
      progressOwnerRef.current !==
      ownerKey
    ) {
      return
    }


    setProgress(
      previous => ({
        ...previous,

        [selectedPeriod]: {
          ...previous[
            selectedPeriod
          ],

          [item.id]:
            item.count
        }
      })
    )
  }


  /*
    يستخدم قبل تسجيل الخروج
    حتى نرسل آخر نسبة فورًا.
  */
  async function flushProgress() {
    if (
      progressOwnerRef.current ===
      ownerKey
    ) {
      saveLocalProgress(
        today,
        progress,
        ownerKey
      )
    }


    return (
      await saveCurrentProgressToCloud(
        false
      )
    )
  }


  const value = {
    today,

    period,
    progress,
    expandedId,

    history,
    syncStatus,
    cloudReady,

    morningPercentage,
    eveningPercentage,
    dailyPercentage,

    morningCompleted,
    eveningCompleted,
    dayCompleted,

    streak,

    changePeriod,
    toggleExpanded,
    getRemaining,
    countDhikr,
    resetDhikr,

    flushProgress
  }


  return (
    <ProgressContext.Provider
      value={value}
    >
      {children}
    </ProgressContext.Provider>
  )
}


export function useProgress() {
  const context =
    useContext(
      ProgressContext
    )

  if (!context) {
    throw new Error(
      'useProgress must be used inside ProgressProvider.'
    )
  }

  return context
}
