import {
  Coordinates,
  CalculationMethod,
  PrayerTimes
} from 'adhan'


function addMinutes(
  date,
  minutes
) {
  return new Date(
    date.getTime() +
    Number(minutes || 0) *
      60 *
      1000
  )
}


export function calculatePrayerSchedule({
  latitude,
  longitude,
  date = new Date(),
  morningOffsetMinutes = 20,
  eveningOffsetMinutes = 0
}) {
  const coordinates =
    new Coordinates(
      latitude,
      longitude
    )


  const parameters =
    CalculationMethod.UmmAlQura()


  const prayerTimes =
    new PrayerTimes(
      coordinates,
      date,
      parameters
    )


  return {
    fajr:
      prayerTimes.fajr,

    asr:
      prayerTimes.asr,

    morningReminder:
      addMinutes(
        prayerTimes.fajr,
        morningOffsetMinutes
      ),

    eveningReminder:
      addMinutes(
        prayerTimes.asr,
        eveningOffsetMinutes
      )
  }
}


export function getCurrentPosition() {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      if (
        !navigator.geolocation
      ) {
        reject(
          new Error(
            'GEOLOCATION_NOT_SUPPORTED'
          )
        )

        return
      }


      navigator.geolocation
        .getCurrentPosition(
          position => {
            resolve({
              latitude:
                position.coords
                  .latitude,

              longitude:
                position.coords
                  .longitude
            })
          },

          error => {
            reject(
              error
            )
          },

          {
            enableHighAccuracy:
              false,

            timeout:
              15000,

            maximumAge:
              30 * 60 * 1000
          }
        )
    }
  )
}