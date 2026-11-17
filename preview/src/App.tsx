import { useEffect, useState } from 'react'
import ProventaLanding from './ProventaLanding'
import SignInPage from './SignInPage'
import SignUpPage from './SignUpPage'
import DashboardPage from './DashboardPage'
import './App.css'

type Route =
  | { page: 'home' }
  | { page: 'signin' }
  | { page: 'signup' }
  | { page: 'dashboard'; section: string }

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  if (hash === 'signin' || hash === 'sign-in' || hash === 'login') {
    return { page: 'signin' }
  }
  if (hash === 'signup' || hash === 'sign-up' || hash === 'register') {
    return { page: 'signup' }
  }
  if (hash === 'dashboard' || hash.startsWith('dashboard/')) {
    const section = hash.split('/')[1] ?? ''
    return { page: 'dashboard', section: section || 'overview' }
  }
  return { page: 'home' }
}

function App() {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onHashChange = () => {
      setRoute(readRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route.page === 'signin') return <SignInPage />
  if (route.page === 'signup') return <SignUpPage />
  if (route.page === 'dashboard') {
    return <DashboardPage section={route.section} />
  }

  return (
    <ProventaLanding
      heading="Stop Guessing. Start Knowing Where You Stand."
      description="Proventa turns claimed skills into verified capability, matches you with relevant opportunities, identifies what you're missing, and builds a preparation path to get you there."
      accent="#F3924B"
      background="#0B0D10"
      textColor="#F4EBDD"
      subtleText="#A7A39D"
      surface="#121519"
      hairline="rgba(244,235,221,0.12)"
      signupUrl="#/signup"
      signinUrl="#/signin"
      onAuth={(kind) => {
        window.location.hash = kind === 'signup' ? '#/signup' : '#/signin'
      }}
    />
  )
}

export default App
