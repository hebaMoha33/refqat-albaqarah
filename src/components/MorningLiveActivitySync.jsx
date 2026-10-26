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
  total = 0,
  progress = 0
}) {
  const startedRef =
    useRef(false)

  const previousStateRef =
    useRef({
      completed: -1,
      total: -1,
      progress: -1
    })


  useEffect(() => {
    if (
      !enabled ||
      !isLiveActivityPlatform()
    ) {
      return
    }


    const safeTotal =
      Math.max(
        Number(total) || 0,
        0
      )


    const safeCompleted =
      Math.min(
        Math.max(
          Number(completed) || 0,
          0
        ),
        safeTotal
      )


    const safeProgress =
      Math.min(
        Math.max(
          Math.round(
            Number(progress) || 0
          ),
          0
        ),
        100
      )


    async function syncLiveActivity() {
      try {

        /*
          =====================================
          NOT ACTIVE
          =====================================
        */

        if (!active) {

          if (
            startedRef.current
          ) {
            await endMorningLiveActivity()
          }


          startedRef.current =
            false


          previousStateRef.current = {
            completed: -1,
            total: -1,
            progress: -1
          }


          return
        }


        /*
          =====================================
          COMPLETED
          =====================================
        */

        if (
          safeProgress >= 100 ||
          (
            safeTotal > 0 &&
            safeCompleted >= safeTotal
          )
        ) {
          await endMorningLiveActivity()


          startedRef.current =
            false


          previousStateRef.current = {
            completed:
              safeCompleted,

            total:
              safeTotal,

            progress:
              100
          }


          return
        }


        /*
          =====================================
          START
          =====================================
        */

        if (
          !startedRef.current
        ) {
          await startMorningLiveActivity({
            completed:
              safeCompleted,

            total:
              safeTotal,

            progress:
              safeProgress
          })


          startedRef.current =
            true


          previousStateRef.current = {
            completed:
              safeCompleted,

            total:
              safeTotal,

            progress:
              safeProgress
          }


          return
        }


        /*
          =====================================
          NO CHANGE
          =====================================
        */

        const previous =
          previousStateRef.current


        if (
          previous.completed ===
            safeCompleted &&
          previous.total ===
            safeTotal &&
          previous.progress ===
            safeProgress
        ) {
          return
        }


        /*
          =====================================
          UPDATE
          =====================================
        */

        await updateMorningLiveActivity({
          completed:
            safeCompleted,

          total:
            safeTotal,

          progress:
            safeProgress
        })


        previousStateRef.current = {
          completed:
            safeCompleted,

          total:
            safeTotal,

          progress:
            safeProgress
        }

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
    total,
    progress
  ])


  return null
}