import {
  useEffect
} from 'react'


export default function useReminderScheduleSync({
  reminderDate,
  morningAt,
  eveningAt,
  enabled = true
}) {
  const morningIso =
    morningAt instanceof Date &&
    !Number.isNaN(
      morningAt.getTime()
    )
      ? morningAt.toISOString()
      : null


  const eveningIso =
    eveningAt instanceof Date &&
    !Number.isNaN(
      eveningAt.getTime()
    )
      ? eveningAt.toISOString()
      : null


  useEffect(() => {
    if (
      !enabled ||
      !reminderDate ||
      (
        !morningIso &&
        !eveningIso
      )
    ) {
      return
    }


    const controller =
      new AbortController()


    async function syncSchedule() {
      try {
        const response =
          await fetch(
            '/api/reminder-schedule',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              credentials:
                'include',

              signal:
                controller.signal,

              body:
                JSON.stringify({
                  reminderDate,

                  morningAt:
                    morningIso,

                  eveningAt:
                    eveningIso
                })
            }
          )


        /*
          401 يعني المستخدم
          غير مسجل الدخول.
          لا نريد إظهار خطأ للمستخدم.
        */
        if (
          response.status ===
          401
        ) {
          return
        }


        if (
          !response.ok
        ) {
          const result =
            await response
              .json()
              .catch(
                () => null
              )


          console.warn(
            'Reminder schedule sync failed:',
            result
          )

          return
        }


        const result =
          await response.json()


        console.log(
          'Reminder schedule synced:',
          result?.schedule
        )

      } catch (error) {
        if (
          error?.name ===
          'AbortError'
        ) {
          return
        }


        console.warn(
          'Reminder schedule sync error:',
          error
        )
      }
    }


    syncSchedule()


    return () => {
      controller.abort()
    }

  }, [
    enabled,
    reminderDate,
    morningIso,
    eveningIso
  ])
}