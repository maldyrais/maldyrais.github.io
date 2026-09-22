import { Link } from 'react-router-dom'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { useLanguage } from '../i18n/LanguageContext'
import { getPortfolioAssetUrl } from '../lib/profileStorage'

const ABOUT_COPY = {
  id: {
    greeting: 'Halo, saya',
    nameSuffix: '.',
    bio: 'Mahasiswa Bahasa dan Sastra Jepang, tutor bahasa Jepang, serta kreator visual yang tertarik pada desain media sosial, fotografi, dan pengalaman web interaktif.',
    thatsMe: "That's me!",
    focus: ['Graphic Design', 'Japanese Tutoring', 'Photography', 'Interactive Web'],
  },
  en: {
    greeting: "Hi, I'm",
    nameSuffix: '.',
    bio: 'A Japanese Language and Literature student, Japanese language tutor, and visual creator interested in social media design, photography, and interactive web experiences.',
    thatsMe: "That's me!",
    focus: ['Graphic Design', 'Japanese Tutoring', 'Photography', 'Interactive Web'],
  },
  ja: {
    greeting: 'こんにちは、',
    nameSuffix: 'です。',
    bio: '日本語・日本文学を学ぶ学生で、日本語チューターとして活動しながら、SNSデザイン、写真、インタラクティブなWeb体験にも取り組んでいます。',
    thatsMe: 'これが私！',
    focus: ['グラフィックデザイン', '日本語指導', '写真', 'インタラクティブWeb'],
  },
}

function cleanList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }

  return []
}

export default function AboutPreview() {
  const profile = usePublicProfile()
  const { language, t, path } = useLanguage()
  const copy = ABOUT_COPY[language] ?? ABOUT_COPY.id
  const name = profile?.name || 'Maldy Rais'
  const displayName = language === 'ja' ? 'マルヂィ・ライス' : name
  const localizedBio = profile?.[`bio_${language}`]
  const bio = localizedBio || copy.bio || t('aboutPreview.fallbackBio')
  const avatar = getPortfolioAssetUrl({
    avatar_path: profile?.avatar_path,
    avatar_url: profile?.avatar_url,
  })

  const profileFocus = [
    ...cleanList(profile?.roles),
    ...cleanList(profile?.interests),
  ]
  const focusItems = [...new Set(profileFocus.length ? profileFocus : copy.focus)].slice(0, 4)

  return (
    <section
      id="about-preview"
      className="snap-section about-preview about-preview-v2"
      data-language={language}
    >
      <article className="about-preview-board">
        <div className="section-kicker about-preview-kicker">{t('aboutPreview.kicker')}</div>

        <div className="about-preview-main">
          <div className="about-preview-copy-v2">
            <div className="about-preview-heading-wrap">
              <h2>
                <span>{copy.greeting}</span>
                <span>{displayName}{copy.nameSuffix}</span>
              </h2>
            </div>

            <p className="about-preview-bio">{bio}</p>

            <div className="about-preview-focus" aria-label="Profile focus">
              {focusItems.map((item) => <span key={item}>{item}</span>)}
            </div>

            <Link className="about-preview-cta" to={path("/about")}>
              {t('aboutPreview.cta')} <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="about-preview-visual" aria-label={`${displayName} portrait`}>
            <div className="about-preview-thats-me" aria-hidden="true">
              <span>{copy.thatsMe}</span>
              <img src="/about/arrow-doodle.svg" alt="" />
            </div>

            <div className="about-preview-portrait-ring">
              <img
                className="about-preview-portrait"
                src={avatar || '/about/about-portrait.webp'}
                alt={displayName}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}
