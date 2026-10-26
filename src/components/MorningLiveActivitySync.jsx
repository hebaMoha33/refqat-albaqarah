import {
  useEffect,
  useRef
} from 'react'

import {
  endMorningLiveActivity,
  isLiveActivityPlatform,
  startMorningLiveActivity,
  updateMorningLiveActivity
} from '../utils/liveActivity'


export default function MorningLiveActivitySync({
  enabled = true,
  active = false,
  completed = 0,
  total = 34
}) {
  const startedRef =
    useRef(false)

  const previousProgressRef =
    useRef(-1)


  useEffect(() => {
    if (
      !enabled ||
      !isLiveActivityPlatform()
    ) {
      return
    }


    const safeTotal =
      Math.max(
        Number(total) || 1,
        1
      )


    const safeCompleted =
      Math.min(
        Math.max(
          Number(completed) || 0,
          0
        ),
        safeTotal
      )


    const progress =
      Math.round(
        (
          safeCompleted /
          safeTotal
        ) *
        100
      )


    async function syncLiveActivity() {
      try {

        /*
          إذا لم يكن وقت أذكار الصباح
          أو انتهى التذكير
        */
        if (!active) {

          if (startedRef.current) {
            await endMorningLiveActivity()

            startedRef.current =
              false

            previousProgressRef.current =
              -1
          }

          return
        }


        /*
          إذا اكتمل الورد
          ننهي Live Activity
        */
        if (
          safeCompleted >=
          safeTotal
        ) {
          await endMorningLiveActivity()

          startedRef.current =
            false

          previousProgressRef.current =
            100

          return
        }


        /*
          أول مرة:
          نبدأ Live Activity
        */
        if (!startedRef.current) {

          await startMorningLiveActivity({
            completed:
              safeCompleted,

            total:
              safeTotal,

            progress
          })


          startedRef.current =
            true

          previousProgressRef.current =
            progress

          return
        }


        /*
          لا نرسل تحديثًا
          إذا لم تتغير النسبة
        */
        if (
          previousProgressRef.current ===
          progress
        ) {
          return
        }


        /*
          تحديث Dynamic Island
        */
        await updateMorningLiveActivity({
          completed:
            safeCompleted,

          total:
            safeTotal,

          progress
        })


        previousProgressRef.current =
          progress

      } catch (error) {
        console.error(
          'Morning Live Activity sync error:',
          error
        )
      }
    }


    syncLiveActivity()

  }, [
    enabled,
    active,
    completed,
    total
  ])


  return null
}