import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { reportWarning } from '../../lib/errorReporting'

function isBlank(value) {
  return value == null || String(value).trim() === ''
}

function countMissingTranslations(works) {
  return works.filter((work) => (
    isBlank(work.title_ja) ||
    isBlank(work.description_ja)
  )).length
}

function countMissingImages(works) {
  return works.filter((work) => (
    isBlank(work.image_path) &&
    isBlank(work.image_url)
  )).length
}

function statusLabel(status) {
  if (status === 'live') return 'Live'
  if (status === 'maintenance') return 'Maintenance'
  if (status === 'coming_soon') return 'Coming Soon'
  if (status === 'hidden') return 'Hidden'
  return status || 'Unknown'
}

export default function AdminOverview({ onNavigate, user }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [works, setWorks] = useState([])
  const [activities, setActivities] = useState([])
  const [profile, setProfile] = useState(null)
  const [sitePages, setSitePages] = useState([])

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    const [worksResult, activitiesResult, profileResult, statusResult] = await Promise.all([
      supabase
        .from('works')
        .select('id, title_id, title_en, title_ja, description_id, description_en, description_ja, image_path, image_url, is_published, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('activities')
        .select('id, is_published, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('profile')
        .select('id, name, bio_id, email, instagram_url, behance_url, github_url, linkedin_url, avatar_path, avatar_url, is_published')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('site_pages')
        .select('route, label, status, updated_at')
        .order('route', { ascending: true }),
    ])

    const errors = [
      worksResult.error,
      activitiesResult.error,
      profileResult.error,
      statusResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      reportWarning('admin.overview.partial-load', errors)
      setError('Sebagian data dashboard gagal dimuat. Panel CMS lain tetap bisa dipakai.')
    }

    if (!worksResult.error) setWorks(worksResult.data ?? [])
    if (!activitiesResult.error) setActivities(activitiesResult.data ?? [])
    if (!profileResult.error) setProfile(profileResult.data ?? null)
    if (!statusResult.error) setSitePages(statusResult.data ?? [])

    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const publishedWorks = works.filter((work) => work.is_published).length
    const drafts = works.length - publishedWorks
    const publishedActivities = activities.filter((activity) => activity.is_published).length
    const nonLivePages = sitePages.filter((page) => (
      page.route !== '__global__' && page.status !== 'live'
    )).length

    return {
      works: works.length,
      publishedWorks,
      drafts,
      activities: activities.length,
      publishedActivities,
      nonLivePages,
    }
  }, [works, activities, sitePages])

  const globalStatus = sitePages.find((page) => page.route === '__global__')
  const siteIsLive = !globalStatus || globalStatus.status === 'live'

  const health = useMemo(() => {
    const items = []

    if (!profile) {
      items.push({
        tone: 'warn',
        text: 'Profil belum terbaca dari database.',
        action: 'profile',
      })
    } else {
      if (isBlank(profile.bio_id)) {
        items.push({
          tone: 'warn',
          text: 'Bio Indonesia masih kosong.',
          action: 'profile',
        })
      }

      if (isBlank(profile.avatar_path) && isBlank(profile.avatar_url)) {
        items.push({
          tone: 'warn',
          text: 'Avatar profil belum diatur.',
          action: 'profile',
        })
      }

      const hasContact = [
        profile.email,
        profile.instagram_url,
        profile.behance_url,
        profile.github_url,
        profile.linkedin_url,
      ].some((value) => !isBlank(value))

      if (!hasContact) {
        items.push({
          tone: 'warn',
          text: 'Belum ada kontak atau social link publik.',
          action: 'profile',
        })
      }
    }

    const missingImages = countMissingImages(works)
    if (missingImages > 0) {
      items.push({
        tone: 'warn',
        text: `${missingImages} karya belum punya gambar utama.`,
        action: 'works',
      })
    }

    const missingJapanese = countMissingTranslations(works)
    if (missingJapanese > 0) {
      items.push({
        tone: 'info',
        text: `${missingJapanese} karya belum lengkap copy Jepang.`,
        action: 'works',
      })
    }

    if (stats.drafts > 0) {
      items.push({
        tone: 'info',
        text: `${stats.drafts} karya masih draft.`,
        action: 'works',
      })
    }

    if (stats.nonLivePages > 0) {
      items.push({
        tone: 'info',
        text: `${stats.nonLivePages} halaman publik sedang tidak Live.`,
        action: 'status',
      })
    }

    if (items.length === 0) {
      items.push({
        tone: 'good',
        text: 'Konten utama terlihat siap untuk dipublish.',
        action: null,
      })
    }

    return items
  }, [profile, works, stats.drafts, stats.nonLivePages])

  const visiblePages = sitePages.filter((page) => page.route !== '__global__')

  if (loading) {
    return (
      <>
        <header className="admin-topbar">
          <div>
            <span className="admin-kicker">CONTROL CENTER</span>
            <h2>Dashboard.</h2>
          </div>
        </header>

        <div className="admin-overview-loading">
          <span />
          <span />
          <span />
        </div>
      </>
    )
  }

  return (
    <>
      <header className="admin-topbar admin-overview-topbar">
        <div>
          <span className="admin-kicker">CONTROL CENTER</span>
          <h2>Dashboard.</h2>
          <p>Ringkasan portfolio sebelum dan sesudah publish.</p>
        </div>

        <button
          type="button"
          className="admin-button"
          disabled={refreshing}
          onClick={() => load({ refresh: true })}
        >
          {refreshing ? 'Memuat…' : 'Refresh'}
        </button>
      </header>

      {error && <div className="admin-overview-warning">{error}</div>}

      <section className="admin-overview-hero">
        <div>
          <span className="admin-overview-eyebrow">WEBSITE STATUS</span>
          <h3>
            {siteIsLive ? 'Portfolio sedang live.' : 'Portfolio sedang dibatasi.'}
          </h3>
          <p>
            {siteIsLive
              ? `${stats.publishedWorks} karya published dan ${stats.publishedActivities} activity publik.`
              : `Global status: ${statusLabel(globalStatus?.status)}.`}
          </p>
        </div>

        <div className="admin-overview-hero-actions">
          <span className={`admin-overview-live-dot ${siteIsLive ? 'is-live' : 'is-limited'}`}>
            <i />
            {siteIsLive ? 'LIVE' : statusLabel(globalStatus?.status).toUpperCase()}
          </span>

          <button type="button" onClick={() => onNavigate('status')}>
            Manage Site Status →
          </button>
        </div>
      </section>

      <section className="admin-overview-stats" aria-label="Portfolio summary">
        <article>
          <span>WORKS</span>
          <strong>{stats.works}</strong>
          <small>{stats.publishedWorks} published · {stats.drafts} draft</small>
        </article>

        <article>
          <span>ACTIVITY</span>
          <strong>{stats.activities}</strong>
          <small>{stats.publishedActivities} published</small>
        </article>

        <article>
          <span>PAGES</span>
          <strong>{visiblePages.length || '—'}</strong>
          <small>{stats.nonLivePages} not live</small>
        </article>

        <article className="is-analytics">
          <span>TRAFFIC</span>
          <strong>—</strong>
          <small>Analytics belum tersambung</small>
        </article>
      </section>

      <div className="admin-overview-grid">
        <section className="admin-overview-panel admin-overview-actions">
          <header>
            <div>
              <span className="admin-overview-label">QUICK ACTIONS</span>
              <h3>Kelola portfolio.</h3>
            </div>
          </header>

          <div>
            <button type="button" onClick={() => onNavigate('works')}>
              <span>
                <strong>Karya</strong>
                <small>Tambah, edit, publish project</small>
              </span>
              <b>→</b>
            </button>

            <button type="button" onClick={() => onNavigate('showcase')}>
              <span>
                <strong>Selected Works</strong>
                <small>Kelola slide showcase di Home</small>
              </span>
              <b>→</b>
            </button>

            <button type="button" onClick={() => onNavigate('activity')}>
              <span>
                <strong>Activity</strong>
                <small>Kelola Journey dan relasi</small>
              </span>
              <b>→</b>
            </button>

            <button type="button" onClick={() => onNavigate('profile')}>
              <span>
                <strong>Profile</strong>
                <small>Bio, tools, social, CV</small>
              </span>
              <b>→</b>
            </button>

            <button type="button" onClick={() => onNavigate('status')}>
              <span>
                <strong>Site Status</strong>
                <small>Maintenance dan Coming Soon</small>
              </span>
              <b>→</b>
            </button>
          </div>
        </section>

        <section className="admin-overview-panel admin-overview-health">
          <header>
            <div>
              <span className="admin-overview-label">CONTENT HEALTH</span>
              <h3>Sebelum publish.</h3>
            </div>
          </header>

          <div className="admin-health-list">
            {health.map((item, index) => (
              <button
                type="button"
                className={`admin-health-item tone-${item.tone}`}
                key={`${item.text}-${index}`}
                onClick={item.action ? () => onNavigate(item.action) : undefined}
                disabled={!item.action}
              >
                <span className="admin-health-icon" aria-hidden="true">
                  {item.tone === 'good' ? '✓' : item.tone === 'warn' ? '!' : 'i'}
                </span>
                <span>{item.text}</span>
                {item.action && <b aria-hidden="true">→</b>}
              </button>
            ))}
          </div>
        </section>

        <section className="admin-overview-panel admin-overview-pages">
          <header>
            <div>
              <span className="admin-overview-label">PUBLIC PAGES</span>
              <h3>Status halaman.</h3>
            </div>

            <button type="button" onClick={() => onNavigate('status')}>Manage →</button>
          </header>

          <div className="admin-overview-page-list">
            {visiblePages.length > 0 ? visiblePages.map((page) => (
              <div key={page.route}>
                <span>
                  <strong>{page.label}</strong>
                  <small>{page.route}</small>
                </span>

                <em className={`status-${page.status}`}>
                  {statusLabel(page.status)}
                </em>
              </div>
            )) : (
              <p>Site Status belum punya data halaman.</p>
            )}
          </div>
        </section>

        <section className="admin-overview-panel admin-overview-analytics">
          <header>
            <div>
              <span className="admin-overview-label">ANALYTICS</span>
              <h3>Traffic nanti di sini.</h3>
            </div>
          </header>

          <div className="admin-analytics-placeholder" aria-hidden="true">
            <i style={{ height: '28%' }} />
            <i style={{ height: '42%' }} />
            <i style={{ height: '36%' }} />
            <i style={{ height: '64%' }} />
            <i style={{ height: '54%' }} />
            <i style={{ height: '78%' }} />
            <i style={{ height: '68%' }} />
          </div>

          <p>
            Setelah website live, kita sambungkan GA4 + Search Console.
            Tidak ada angka palsu yang ditampilkan sebelum data asli tersedia.
          </p>
        </section>
      </div>

      <footer className="admin-overview-footer">
        <span>Signed in as {user?.email || 'admin'}</span>
        <Link to="/" target="_blank">Buka website ↗</Link>
      </footer>
    </>
  )
}
