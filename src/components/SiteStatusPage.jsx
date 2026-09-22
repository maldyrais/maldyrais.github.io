import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

const COPY = {
  id: {
    maintenance: {
      eyebrow: 'MAINTENANCE / メンテナンス',
      title: 'Sedang dirapikan.',
      body: 'Halaman ini sedang diperbaiki sebentar.',
    },
    coming_soon: {
      eyebrow: 'COMING SOON / 近日公開',
      title: 'Segera hadir.',
      body: 'Halaman ini masih sedang disiapkan.',
    },
    hidden: {
      eyebrow: 'UNAVAILABLE / 非公開',
      title: 'Belum tersedia.',
      body: 'Halaman ini belum tersedia untuk publik.',
    },
    back: 'Kembali ke Home',
    available: 'Perkiraan kembali',
  },
  en: {
    maintenance: {
      eyebrow: 'MAINTENANCE / メンテナンス',
      title: 'A little maintenance.',
      body: 'This page is being polished for a moment.',
    },
    coming_soon: {
      eyebrow: 'COMING SOON / 近日公開',
      title: 'Coming soon.',
      body: 'This page is still being prepared.',
    },
    hidden: {
      eyebrow: 'UNAVAILABLE / 非公開',
      title: 'Not available yet.',
      body: 'This page is not currently public.',
    },
    back: 'Back to Home',
    available: 'Expected back',
  },
  ja: {
    maintenance: {
      eyebrow: 'MAINTENANCE / メンテナンス',
      title: 'ただいま整備中です。',
      body: 'このページを少し調整しています。',
    },
    coming_soon: {
      eyebrow: 'COMING SOON / 近日公開',
      title: 'もうすぐ公開します。',
      body: 'このページは現在準備中です。',
    },
    hidden: {
      eyebrow: 'UNAVAILABLE / 非公開',
      title: '現在ご覧いただけません。',
      body: 'このページはまだ公開されていません。',
    },
    back: 'Homeへ戻る',
    available: '公開予定',
  },
}

function localizedMessage(page, language) {
  return (
    page?.[`message_${language}`] ||
    page?.message_id ||
    page?.message_en ||
    page?.message_ja ||
    ''
  )
}

function formatAvailableAt(value, language) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const locale =
    language === 'ja' ? 'ja-JP'
      : language === 'en' ? 'en-US'
        : 'id-ID'

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function SiteStatusPage({ page }) {
  const { language, path } = useLanguage()
  const copy = COPY[language] ?? COPY.id
  const statusCopy = copy[page?.status] ?? copy.maintenance
  const message = localizedMessage(page, language) || statusCopy.body
  const available = formatAvailableAt(page?.available_at, language)
  const isGlobal = page?.route === '__global__'

  useEffect(() => {
    const previousTitle = document.title
    let robots = document.head.querySelector('meta[name="robots"]')
    const createdRobots = !robots
    const previousRobots = robots?.getAttribute('content') || ''

    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }

    document.title = `${statusCopy.title} — Maldy Rais`
    robots.setAttribute('content', 'noindex, follow, noarchive')

    return () => {
      document.title = previousTitle
      if (createdRobots) robots?.remove()
      else robots?.setAttribute('content', previousRobots)
    }
  }, [statusCopy.title])

  return (
    <main className="site-status-page">
      <div className="site-status-noise" aria-hidden="true" />

      <header className="site-status-brand">
        <Link to={path("/")}>MALDY RAIS</Link>
        <span>{page?.label || 'Portfolio'}</span>
      </header>

      <section className="site-status-card">
        <div className="site-status-kicker">{statusCopy.eyebrow}</div>

        <div className="site-status-title-wrap">
          <h1>{statusCopy.title}</h1>
          <span className="site-status-jp" aria-hidden="true">
            {page?.status === 'coming_soon' ? '準備中' : page?.status === 'hidden' ? '非公開' : '整備中'}
          </span>
        </div>

        <p>{message}</p>

        {available && (
          <div className="site-status-available">
            <small>{copy.available}</small>
            <strong>{available}</strong>
          </div>
        )}

        {!isGlobal && page?.route !== '/' && (
          <Link className="site-status-back" to={path("/")}>
            {copy.back} <span aria-hidden="true">→</span>
          </Link>
        )}
      </section>

      <footer className="site-status-footer">
        <span>またね。</span>
        <small>© 2026 Maldy Rais</small>
      </footer>
    </main>
  )
}
