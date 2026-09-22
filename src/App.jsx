import { lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom'
import AdminRoute from './auth/AdminRoute'
import SeoManager from './components/SeoManager'
import SiteGate from './components/SiteGate'
import PageLoader from './components/PageLoader'
import ScrollMotion from './components/ScrollMotion'
import { useLanguage } from './i18n/LanguageContext'
import {
  SUPPORTED_LANGUAGES,
  contentPathFromPathname,
} from './i18n/routes'

const loadHome = () => import('./pages/Home')
const loadAbout = () => import('./pages/About')
const loadWorks = () => import('./pages/Works')
const loadNihongoGakushu = () => import('./pages/NihongoGakushu')
const loadAdminLogin = () => import('./pages/admin/AdminLogin')
const loadAdminDashboard = () => import('./pages/admin/AdminDashboard')

const Home = lazy(loadHome)
const About = lazy(loadAbout)
const Works = lazy(loadWorks)
const NihongoGakushu = lazy(loadNihongoGakushu)
const AdminLogin = lazy(loadAdminLogin)
const AdminDashboard = lazy(loadAdminDashboard)

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

function preloadPublicRoutes() {
  const run = () => {
    Promise.allSettled([
      loadHome(),
      loadAbout(),
      loadWorks(),
      loadNihongoGakushu(),
    ])
  }

  if (typeof window === 'undefined') return undefined

  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(run, { timeout: 1800 })
    return () => window.cancelIdleCallback?.(id)
  }

  const timer = window.setTimeout(run, 700)
  return () => window.clearTimeout(timer)
}

function ScrollToTop() {
  const location = useLocation()
  const { pathname } = location

  useLayoutEffect(() => {
    if (location.state?.modalRoute || location.state?.preserveScroll) return undefined
    const root = document.documentElement

    const previousBehavior = root.style.getPropertyValue('scroll-behavior')
    const previousBehaviorPriority = root.style.getPropertyPriority('scroll-behavior')

    root.style.setProperty('scroll-behavior', 'auto', 'important')

    const forceTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }

    forceTop()

    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      forceTop()
      secondFrame = window.requestAnimationFrame(forceTop)
    })

    const settleTimer = window.setTimeout(forceTop, 90)

    if (contentPathFromPathname(pathname) === '/') {
      root.classList.remove('about-route-active')
    }

    const restoreTimer = window.setTimeout(() => {
      if (previousBehavior) {
        root.style.setProperty('scroll-behavior', previousBehavior, previousBehaviorPriority)
      } else {
        root.style.removeProperty('scroll-behavior')
      }
    }, 110)

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      window.clearTimeout(settleTimer)
      window.clearTimeout(restoreTimer)

      if (previousBehavior) {
        root.style.setProperty('scroll-behavior', previousBehavior, previousBehaviorPriority)
      } else {
        root.style.removeProperty('scroll-behavior')
      }
    }
  }, [pathname, location.state])

  return null
}

function RouteFallback() {
  return <PageLoader label="Menyiapkan halaman" />
}

function LocalizedRoute({ children }) {
  const { lang } = useParams()

  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return <Navigate to="/id/" replace />
  }

  return children
}

function LegacyPublicRedirect() {
  const location = useLocation()
  const { path } = useLanguage()

  return (
    <Navigate
      to={path(`${location.pathname}${location.search}${location.hash}`)}
      replace
    />
  )
}

export default function App() {
  useEffect(() => preloadPublicRoutes(), [])

  return (
    <>
      <SeoManager />
      <ScrollToTop />
      <ScrollMotion />

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/:lang"
            element={(
              <LocalizedRoute>
                <SiteGate><Home /></SiteGate>
              </LocalizedRoute>
            )}
          />
          <Route
            path="/:lang/about/*"
            element={(
              <LocalizedRoute>
                <SiteGate><About /></SiteGate>
              </LocalizedRoute>
            )}
          />
          <Route
            path="/:lang/works/*"
            element={(
              <LocalizedRoute>
                <SiteGate><Works /></SiteGate>
              </LocalizedRoute>
            )}
          />
          <Route
            path="/:lang/nihongo-gakushu"
            element={(
              <LocalizedRoute>
                <SiteGate><NihongoGakushu /></SiteGate>
              </LocalizedRoute>
            )}
          />

          {/* Backward compatibility for old public URLs. */}
          <Route path="/" element={<LegacyPublicRedirect />} />
          <Route path="/about/*" element={<LegacyPublicRedirect />} />
          <Route path="/works/*" element={<LegacyPublicRedirect />} />
          <Route path="/nihongo-gakushu" element={<LegacyPublicRedirect />} />

          {/* Admin intentionally stays language-neutral. */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={(
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            )}
          />
        </Routes>
      </Suspense>
    </>
  )
}
