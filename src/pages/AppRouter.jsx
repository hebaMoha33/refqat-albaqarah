import {
  useEffect,
  useState
} from 'react'

import HomePage
  from './HomePage'

import CompanionPage
  from './CompanionPage'

import BaqarahReaderPage
  from './BaqarahReaderPage'


function getRoute() {
  return (
    window.location.hash ||
    '#/'
  )
}


export default function AppRouter() {
  const [
    route,
    setRoute
  ] =
    useState(
      getRoute
    )


  useEffect(() => {
    function handleHashChange() {
      setRoute(
        getRoute()
      )
    }

    window.addEventListener(
      'hashchange',
      handleHashChange
    )

    return () => {
      window.removeEventListener(
        'hashchange',
        handleHashChange
      )
    }
  }, [])


  if (
    route.startsWith(
      '#/companion/read'
    )
  ) {
    return (
      <BaqarahReaderPage />
    )
  }


  if (
    route.startsWith(
      '#/companion'
    )
  ) {
    return (
      <CompanionPage
        onBack={() => {
          window.location.hash =
            '#/'
        }}
      />
    )
  }


  return (
    <HomePage />
  )
}
