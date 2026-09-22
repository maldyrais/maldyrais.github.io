import { useEffect, useRef, useState } from 'react'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { useLanguage } from '../i18n/LanguageContext'

const DISCOVERED_KEY = 'maldy-services-discovered'

const SERVICE_COPY = {
  id: {
    widgetLabel: 'Buka layanan Maldy Rais',
    kicker: 'JASA / SERVICES',
    title: 'Butuh bantuan merapikan sesuatu?',
    description: 'Saya juga menerima beberapa kebutuhan kreatif yang bisa dikerjakan bareng.',
    services: [
      'Rapihin dokumen',
      'Presentasi & layout',
      'Desain media sosial',
      'Creative support',
    ],
    cta: 'Diskusikan jasa ↗',
    close: 'Tutup layanan',
  },
  en: {
    widgetLabel: 'Open Maldy Rais services',
    kicker: 'SERVICES',
    title: 'Need a hand polishing something?',
    description: 'I also take on selected creative work that we can build together.',
    services: [
      'Document cleanup',
      'Presentation & layout',
      'Social media design',
      'Creative support',
    ],
    cta: 'Discuss a project ↗',
    close: 'Close services',
  },
  ja: {
    widgetLabel: 'マルヂィ・ライスのサービスを開く',
    kicker: 'サービス',
    title: 'ちょっと整えたいもの、ありませんか？',
    description: 'ドキュメント整理やデザインなど、いくつかのクリエイティブ制作もお手伝いしています。',
    services: [
      'ドキュメント整理',
      'プレゼン・レイアウト',
      'SNSデザイン',
      'クリエイティブサポート',
    ],
    cta: '相談する ↗',
    close: 'サービスを閉じる',
  },
}

const SERVICE_ART = {
  idle1: '/service-float/service-idle-1.webp',
  idle2: '/service-float/service-idle-2.webp',
  open: '/service-float/service-open.webp',
}

function readDiscovered() {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(DISCOVERED_KEY) === 'true'
  } catch {
    return false
  }
}

function rememberDiscovered() {
  try {
    window.localStorage.setItem(DISCOVERED_KEY, 'true')
  } catch {
    // localStorage bisa tidak tersedia pada browser/context tertentu.
  }
}

function ServiceVisual({ isOpen }) {
  return (
    <span className="service-float-visual" aria-hidden="true">
      <span className="service-float-art-stack">
        <img
          className="service-float-art service-float-art-idle service-float-art-idle-1"
          src={SERVICE_ART.idle1}
          alt=""
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <img
          className="service-float-art service-float-art-idle service-float-art-idle-2"
          src={SERVICE_ART.idle2}
          alt=""
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <img
          className="service-float-art service-float-art-open"
          src={SERVICE_ART.open}
          alt=""
          loading="lazy"
          decoding="async"
          draggable="false"
        />
      </span>

      <span className={`service-float-mini-label ${isOpen ? 'is-open' : ''}`}>
        {isOpen ? 'OPEN' : 'JASA'}
      </span>
    </span>
  )
}

export default function ServiceFloat() {
  const profile = usePublicProfile()
  const { language } = useLanguage()
  const copy = SERVICE_COPY[language] ?? SERVICE_COPY.id

  const timerRef = useRef(null)
  const [discovered, setDiscovered] = useState(readDiscovered)
  const [introOpen, setIntroOpen] = useState(false)
  const [pinnedOpen, setPinnedOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [hoverSuppressed, setHoverSuppressed] = useState(false)
  const [canHover, setCanHover] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setCanHover(media.matches)

    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    if (discovered) return undefined

    const footer = document.getElementById('contact')
    if (!footer || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timerRef.current)

        if (!entry.isIntersecting) return

        timerRef.current = window.setTimeout(() => {
          rememberDiscovered()
          setDiscovered(true)
          setIntroOpen(true)
          observer.disconnect()
        }, 2000)
      },
      { threshold: 0.38 },
    )

    observer.observe(footer)

    return () => {
      observer.disconnect()
      window.clearTimeout(timerRef.current)
    }
  }, [discovered])

  const hoverOpen = discovered && canHover && hovered && !hoverSuppressed
  const isOpen = introOpen || pinnedOpen || hoverOpen

  useEffect(() => {
    if (!isOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return

      setIntroOpen(false)
      setPinnedOpen(false)
      setHoverSuppressed(true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const closePanel = () => {
    setIntroOpen(false)
    setPinnedOpen(false)
    setHoverSuppressed(true)
  }

  const handleTriggerClick = () => {
    if (introOpen || pinnedOpen) {
      closePanel()
      return
    }

    setHoverSuppressed(false)
    setPinnedOpen(true)
  }

  return (
    <div
      className={`service-float-shell ${discovered ? 'is-discovered' : ''} ${isOpen ? 'is-open' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setHoverSuppressed(false)
      }}
    >
      <aside
        id="service-float-panel"
        className="service-float-panel"
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          className="service-float-close"
          onClick={closePanel}
          aria-label={copy.close}
        >
          ×
        </button>

        <div className="service-float-kicker">{copy.kicker}</div>
        <h3>{copy.title}</h3>
        <p>{copy.description}</p>

        <div className="service-float-tags">
          {copy.services.map((service) => (
            <span key={service}>{service}</span>
          ))}
        </div>

        {profile?.email && (
          <a className="service-float-cta" href={`mailto:${profile.email}`}>
            {copy.cta}
          </a>
        )}
      </aside>

      <button
        type="button"
        className="service-float-trigger"
        aria-label={copy.widgetLabel}
        aria-expanded={isOpen}
        aria-controls="service-float-panel"
        onClick={handleTriggerClick}
      >
        <ServiceVisual isOpen={isOpen} />
      </button>
    </div>
  )
}
