import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { contentPathFromPathname } from '../i18n/routes'

const languageOptions = [
  ['id', 'ID'],
  ['en', 'EN'],
  ['ja', '日本語'],
]

export default function Navbar() {
  const [visible, setVisible] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(() =>
    typeof window !== 'undefined' ? window.scrollY > 24 : false
  )
  const lastY = useRef(0)
  const location = useLocation()
  const { language, setLanguage, t, path } = useLanguage()
  const isHome = contentPathFromPathname(location.pathname) === '/'
  const isHeroTop = isHome && !scrolled

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setVisible(y < 40 || y < lastY.current)
      setScrolled(y > 24)
      lastY.current = y
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    if (menuOpen) {
      document.documentElement.classList.add('nav-open')
      window.addEventListener('keydown', onKeyDown)
    }

    return () => {
      document.documentElement.classList.remove('nav-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      className={`navbar ${visible || menuOpen ? 'is-visible' : 'is-hidden'} ${isHome ? 'is-home' : ''} ${scrolled ? 'is-scrolled' : 'is-top'} ${isHeroTop ? 'is-hero-top' : ''}`}
    >
      <Link className="brand" to={path("/")} onClick={closeMenu}>MALDY RAIS</Link>

      <nav className="nav-links" aria-label={t('nav.main')}>
        <Link to={path("/works")}>{t('nav.works')}</Link>
        <Link to={path("/about")}>{t('nav.about')}</Link>
        <div className="language-switch" aria-label={t('nav.language')}>
          {languageOptions.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={language === value ? 'active' : ''}
              onClick={() => setLanguage(value)}
              aria-pressed={language === value}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <button
        type="button"
        className={`nav-menu-toggle ${menuOpen ? 'is-open' : ''}`}
        onClick={() => setMenuOpen((current) => !current)}
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`mobile-nav-shell ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Tutup menu"
          tabIndex={menuOpen ? 0 : -1}
          onClick={closeMenu}
        />

        <aside
          id="mobile-navigation"
          className="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.main')}
        >
          <div className="mobile-nav-header">
            <span className="brand">MALDY RAIS</span>
            <button type="button" className="mobile-nav-close" onClick={closeMenu} aria-label="Tutup menu">×</button>
          </div>

          <nav className="mobile-nav-links">
            <Link to={path("/")} onClick={closeMenu}>Home</Link>
            <Link to={path("/works")} onClick={closeMenu}>{t('nav.works')}</Link>
            <Link to={path("/about")} onClick={closeMenu}>{t('nav.about')}</Link>
          </nav>

          <div className="mobile-nav-language">
            <small>{t('nav.language')}</small>
            <div className="language-switch">
              {languageOptions.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={language === value ? 'active' : ''}
                  onClick={() => setLanguage(value)}
                  aria-pressed={language === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </header>
  )
}
