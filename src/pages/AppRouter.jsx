import {
  useEffect,
  useState
} from 'react'

import CompanionPage
  from './CompanionPage'

import HomePage
  from './HomePage'


function getCurrentRoute() {
  return (
    window.location.hash ||
    '#/'
  )
}


export default function AppRouter() {
  const [route, setRoute] =
    useState(getCurrentRoute)


  useEffect(() => {
    function syncRoute() {
      setRoute(
        getCurrentRoute()
      )
    }

    window.addEventListener(
      'hashchange',
      syncRoute
    )

    return () => {
      window.removeEventListener(
        'hashchange',
        syncRoute
      )
    }
  }, [])


  if (
    route === '#/companion'
  ) {
    return (
      <CompanionPage
        onBack={() => {
          window.location.hash = '#/'
        }}
      />
    )
  }


  return <HomePage />
}
