import {
  useEffect,
  useState
} from 'react'

import {
  Capacitor
} from '@capacitor/core'

import {
  App
} from '@capacitor/app'


function getInitialState() {
  if (
    Capacitor.isNativePlatform()
  ) {
    return true
  }

  return !document.hidden
}


export default function useAppVisibility() {
  const [
    isAppActive,
    setIsAppActive
  ] =
    useState(
      getInitialState
    )


  useEffect(() => {
    let cancelled =
      false

    let listenerHandle =
      null


    async function setup() {
      /*
        Native iOS / Android
      */
      if (
        Capacitor.isNativePlatform()
      ) {
        try {
          const state =
            await App.getState()

          if (!cancelled) {
            setIsAppActive(
              Boolean(
                state.isActive
              )
            )
          }


          listenerHandle =
            await App.addListener(
              'appStateChange',
              state => {
                setIsAppActive(
                  Boolean(
                    state.isActive
                  )
                )
              }
            )
        } catch (error) {
          console.warn(
            'App state error:',
            error
          )
        }

        return
      }


      /*
        Web / PWA
      */

      function handleVisibility() {
        setIsAppActive(
          !document.hidden
        )
      }


      document.addEventListener(
        'visibilitychange',
        handleVisibility
      )


      listenerHandle = {
        remove() {
          document.removeEventListener(
            'visibilitychange',
            handleVisibility
          )
        }
      }
    }


    setup()


    return () => {
      cancelled =
        true

      listenerHandle
        ?.remove?.()
    }
  }, [])


  return {
    isAppActive,

    isNative:
      Capacitor
        .isNativePlatform(),

    platform:
      Capacitor
        .getPlatform()
  }
}