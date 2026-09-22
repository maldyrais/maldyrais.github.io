import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { reportWarning } from '../lib/errorReporting'
import SiteStatusPage from './SiteStatusPage'
import PageLoader from './PageLoader'
import { contentPathFromPathname } from '../i18n/routes'

const LIVE = 'live'
const STATUS_CACHE_MS = 60_000
const PUBLIC_STATUS_ROUTES = ['__global__', '/', '/about', '/works', '/nihongo-gakushu']

let statusSnapshot = null
let statusRequest = null

function pageRouteFor(pathname) {
  const contentPath = contentPathFromPathname(pathname)
  const clean = contentPath && contentPath !== '/'
    ? contentPath.replace(/\/+$/, '')
    : '/'

  if (clean === '/works' || clean.startsWith('/works/')) return '/works'
  if (clean === '/about' || clean.startsWith('/about/')) return '/about'
  if (clean === '/nihongo-gakushu' || clean.startsWith('/nihongo-gakushu/')) {
    return '/nihongo-gakushu'
  }

  return clean || '/'
}

function pickBlockingRow(rows, pageRoute) {
  const globalRow = rows.find((row) => row.route === '__global__')
  const pageRow = rows.find((row) => row.route === pageRoute)

  if (globalRow && globalRow.status !== LIVE) return globalRow
  if (pageRow && pageRow.status !== LIVE) return pageRow
  return null
}

function snapshotIsFresh(snapshot) {
  return Boolean(snapshot && Date.now() - snapshot.checkedAt < STATUS_CACHE_MS)
}

async function loadStatusSnapshot() {
  if (snapshotIsFresh(statusSnapshot)) return statusSnapshot
  if (statusRequest) return statusRequest

  statusRequest = Promise.all([
    supabase.auth.getSession(),
    supabase
      .from('site_pages')
      .select('route, label, status, message_id, message_en, message_ja, available_at, updated_at')
      .in('route', PUBLIC_STATUS_ROUTES),
  ])
    .then(([sessionResult, statusResult]) => {
      if (statusResult.error) throw statusResult.error

      statusSnapshot = {
        checkedAt: Date.now(),
        hasUser: Boolean(sessionResult.data?.session?.user),
        rows: statusResult.data ?? [],
      }

      return statusSnapshot
    })
    .finally(() => {
      statusRequest = null
    })

  return statusRequest
}

export default function SiteGate({ children }) {
  const { pathname } = useLocation()
  const pageRoute = useMemo(() => pageRouteFor(pathname), [pathname])

  const initialSnapshot = statusSnapshot
  const [checking, setChecking] = useState(() => !initialSnapshot)
  const [blockingRow, setBlockingRow] = useState(() => (
    initialSnapshot?.hasUser
      ? null
      : pickBlockingRow(initialSnapshot?.rows ?? [], pageRoute)
  ))

  useEffect(() => {
    let cancelled = false

    // Reuse the last known result immediately. This is what prevents
    // route-to-route navigation from becoming a blank network wait.
    if (statusSnapshot) {
      setBlockingRow(
        statusSnapshot.hasUser
          ? null
          : pickBlockingRow(statusSnapshot.rows ?? [], pageRoute),
      )
      setChecking(false)
    } else {
      setChecking(true)
    }

    // Fresh snapshots require no network work at all.
    if (snapshotIsFresh(statusSnapshot)) {
      return () => { cancelled = true }
    }

    // Stale-while-revalidate: if we already have a snapshot, keep the
    // current page visible while refreshing it in the background.
    loadStatusSnapshot()
      .then((snapshot) => {
        if (cancelled) return
        setBlockingRow(
          snapshot.hasUser
            ? null
            : pickBlockingRow(snapshot.rows ?? [], pageRoute),
        )
        setChecking(false)
      })
      .catch((error) => {
        if (cancelled) return

        // Fail open. A temporary status endpoint problem should not make
        // the portfolio feel unavailable.
        reportWarning('site-status.check', error)
        setBlockingRow(null)
        setChecking(false)
      })

    return () => { cancelled = true }
  }, [pageRoute])

  if (checking) {
    return <PageLoader label="Mengecek halaman" />
  }

  if (blockingRow) {
    return <SiteStatusPage page={blockingRow} />
  }

  return children
}
