import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

const NIHONGO_URL = 'https://maldyrais.github.io/Nihongo-gakushu/'
const MORE_ASSET = '/more-about'

function canUseHoverPointer() {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export default function MoreAboutMe() {
  const navigate = useNavigate()
  const { t, path } = useLanguage()
  const [canHover, setCanHover] = useState(canUseHoverPointer)
  const [activeId, setActiveId] = useState(null)

  const items = useMemo(() => [
    {
      id: 'about',
      index: '01',
      title: t('more.about.title'),
      subtitle: t('more.about.subtitle'),
      route: path('/about'),
      mark: '私',
      illustration: `${MORE_ASSET}/illustrations/about-main.webp`,
    },
    {
      id: 'nihongo',
      index: '02',
      title: t('more.nihongo.title'),
      subtitle: t('more.nihongo.subtitle'),
      url: NIHONGO_URL,
      external: true,
      mark: 'あ',
      illustration: `${MORE_ASSET}/illustrations/nihongo-main.webp`,
    },
    {
      id: 'works',
      index: '03',
      title: t('more.works.title'),
      subtitle: t('more.works.subtitle'),
      route: path('/works'),
      mark: '作',
      illustration: `${MORE_ASSET}/illustrations/works-main.webp`,
    },
  ], [t, path])

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)')

    const updatePointerMode = () => {
      const nextCanHover = media.matches
      setCanHover(nextCanHover)

      // Desktop always has an initial preview. Touch starts closed so the
      // first tap reveals the artwork instead of immediately navigating.
      setActiveId((current) => {
        if (nextCanHover) return current ?? 'about'
        return null
      })
    }

    updatePointerMode()
    media.addEventListener?.('change', updatePointerMode)
    return () => media.removeEventListener?.('change', updatePointerMode)
  }, [])

  const activeItem = items.find((item) => item.id === activeId)
    ?? (canHover ? items[0] : null)

  const openItem = (item) => {
    if (item.external) window.open(item.url, '_blank', 'noopener,noreferrer')
    else navigate(item.route)
  }

  const handleItemClick = (item) => {
    if (canHover) {
      openItem(item)
      return
    }

    // Touch only: first tap previews, second tap on the same row opens it.
    if (activeId === item.id) {
      openItem(item)
      return
    }

    setActiveId(item.id)
  }

  const handleDesktopPreview = (item) => {
    if (canHover) setActiveId(item.id)
  }

  return (
    <section className={`snap-section more-about more-about-simple ${canHover ? 'can-hover' : 'is-touch'}`}>
      <div className="more-simple-shell">
        <header className="more-simple-header">
          <div>
            <div className="section-kicker">{t('more.kicker')}</div>
            <h2>{t('more.heading')}</h2>
          </div>
          <span className="more-simple-jp" aria-hidden="true">もっと。</span>
        </header>

        <div className="more-simple-layout">
          <nav className="more-directory" aria-label={t('more.heading')}>
            {items.map((item) => {
              const isActive = activeId === item.id
              const previewId = `more-touch-preview-${item.id}`

              return (
                <div className="more-directory-entry" key={item.id}>
                  <button
                    type="button"
                    className={`more-directory-row ${isActive ? 'is-active' : ''}`}
                    onMouseEnter={() => handleDesktopPreview(item)}
                    onFocus={() => handleDesktopPreview(item)}
                    onClick={() => handleItemClick(item)}
                    aria-expanded={!canHover ? isActive : undefined}
                    aria-controls={!canHover ? previewId : undefined}
                    aria-label={`${item.title} — ${item.external ? t('more.visit') : t('more.open')}`}
                  >
                    <span className="more-directory-index">{item.index}</span>

                    <span className="more-directory-copy">
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </span>

                    <span className="more-directory-mark" aria-hidden="true">{item.mark}</span>
                    <span className="more-directory-arrow" aria-hidden="true">↗</span>
                  </button>

                  {!canHover && isActive && (
                    <div className="more-touch-preview" id={previewId}>
                      <div className="more-touch-preview-art" aria-hidden="true">
                        <span className="more-touch-preview-orbit" />
                        <span className="more-touch-preview-mark">{item.mark}</span>
                        <img
                          key={item.id}
                          className={`more-touch-preview-image more-touch-preview-image-${item.id}`}
                          src={item.illustration}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable="false"
                        />
                      </div>
                      <span className="more-touch-preview-cue" aria-hidden="true">↗</span>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <aside className="more-simple-preview" aria-hidden="true">
            {activeItem && (
              <>
                <div className="more-preview-orbit" />
                <span className="more-preview-mark">{activeItem.mark}</span>
                <img
                  key={activeItem.id}
                  className={`more-preview-image more-preview-image-${activeItem.id}`}
                  src={activeItem.illustration}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                />
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  )
}
