import { usePublicProfile } from '../hooks/usePublicProfile'
import { useLanguage } from '../i18n/LanguageContext'

const CONNECT_COPY = {
  id: 'Tetap terhubung.',
  en: 'Stay connected.',
  ja: 'つながりましょう。',
}

function SocialIcon({ name }) {
  if (name === 'Instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
        <circle cx="12" cy="12" r="4.2" />
        <circle className="social-icon-fill" cx="17.4" cy="6.7" r="1.15" />
      </svg>
    )
  }

  if (name === 'Behance') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.2 6.4h6.1c3.1 0 4.8 1.3 4.8 3.6 0 1.5-.8 2.6-2.1 3.1 1.8.4 2.8 1.7 2.8 3.6 0 2.7-2.1 4.2-5.6 4.2h-6V6.4Zm5.7 5.8c1.6 0 2.4-.6 2.4-1.7 0-1.1-.8-1.6-2.4-1.6H7v3.3h2.9Zm.2 6.1c1.9 0 2.8-.7 2.8-2 0-1.3-.9-1.9-2.8-1.9H7v3.9h3.1Z" />
        <path d="M16.4 7.1h4.1M20.8 16.4h-6.5c.2 1.5 1.1 2.3 2.6 2.3 1.1 0 1.8-.4 2.2-1.1h1.6c-.6 2-2 3.1-4 3.1-2.9 0-4.8-2-4.8-5.1s1.9-5.2 4.7-5.2c3 0 4.5 2.3 4.2 6Zm-2.1-1.7c-.1-1.4-.9-2.2-2.2-2.2-1.3 0-2 .8-2.2 2.2h4.4Z" />
      </svg>
    )
  }

  if (name === 'GitHub') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.3a8.8 8.8 0 0 0-2.8 17.1c.4.1.5-.2.5-.4v-1.7c-2.2.5-2.7-.9-2.9-1.4-.1-.3-.7-1.4-1.2-1.6-.4-.2-1-.7 0-.7.9 0 1.5.8 1.7 1.2 1 1.7 2.7 1.2 3.4.9.1-.7.4-1.2.7-1.5-1.8-.2-3.7-.9-3.7-4 0-.9.3-1.6.8-2.2-.1-.2-.4-1 .1-2.2 0 0 .7-.2 2.4.8a8.1 8.1 0 0 1 4.4 0c1.7-1.1 2.4-.8 2.4-.8.5 1.2.2 2 .1 2.2.5.6.8 1.3.8 2.2 0 3.1-1.9 3.8-3.7 4 .4.3.7.9.7 1.8V20c0 .2.1.5.6.4A8.8 8.8 0 0 0 12 3.3Z" />
      </svg>
    )
  }

  if (name === 'LinkedIn') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="9" width="3.3" height="10.5" rx=".6" />
        <circle cx="5.65" cy="5.65" r="1.85" />
        <path d="M10 9h3.2v1.45h.05c.45-.85 1.55-1.75 3.2-1.75 3.42 0 4.05 2.25 4.05 5.18v5.62h-3.35v-4.98c0-1.19-.02-2.72-1.66-2.72-1.66 0-1.92 1.3-1.92 2.63v5.07H10V9Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5.2" width="18" height="13.6" rx="2.2" />
      <path d="m4.2 7 7.8 6.1L19.8 7" />
    </svg>
  )
}

export default function ContactFooter() {
  const profile = usePublicProfile()
  const { language, t } = useLanguage()
  const connectCopy = CONNECT_COPY[language] ?? CONNECT_COPY.id

  const links = [
    ['Instagram', profile?.instagram_url],
    ['Behance', profile?.behance_url],
    ['GitHub', profile?.github_url],
    ['LinkedIn', profile?.linkedin_url],
  ].filter(([, url]) => Boolean(url))

  const contactLinks = profile?.email
    ? [...links, ['Email', `mailto:${profile.email}`]]
    : links

  return (
    <footer className="snap-section contact-footer" id="contact">
      <div className="contact-footer-content">
        <div className="contact-intro">
          <div className="section-kicker">{t('contact.kicker')}</div>
          <h2>またね。</h2>
          <p>{t('contact.thanks')}</p>
        </div>

        <div className="contact-connect">
          <p className="contact-connect-title">{connectCopy}</p>

          {contactLinks.length > 0 && (
            <nav className="socials" aria-label={t('contact.kicker')}>
              {contactLinks.map(([name, url]) => (
                <a
                  key={name}
                  className="social-icon-link"
                  href={url}
                  target={name === 'Email' ? undefined : '_blank'}
                  rel={name === 'Email' ? undefined : 'noopener noreferrer'}
                  aria-label={name}
                  title={name}
                >
                  <SocialIcon name={name} />
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>

      <div className="footer-grass" aria-hidden="true" />

      <div className="footer-meta">
        <span>{profile?.location || 'Surabaya, Indonesia'}</span>
        <span>© 2026 {profile?.name || 'Maldy Rais'}</span>
      </div>
    </footer>
  )
}
