import { useLanguage } from '../i18n/LanguageContext'

const HERO_ASSETS = {
  character: '/hero/maldy-character.webp',
  cloudMain: '/hero/cloud-main.webp',
  cloudLeft: '/hero/cloud-left.webp',
  cloudRight: '/hero/cloud-right.webp',
  noteAa: '/hero/note-aa.webp',
  noteJa: '/hero/note-ja.webp',
  paperPlane: '/hero/paper-plane.webp',
  doodleLeft: '/hero/doodle-left.webp',
  doodleRight: '/hero/doodle-right.webp',
}

const HERO_COPY = {
  id: {
    learn: 'Belajar.',
    create: 'Berkarya.',
    connect: 'Terhubung.',
    description: 'graphic designer, Japanese tutor, dan kreator pengalaman digital.',
  },
  en: {
    learn: 'Learn.',
    create: 'Create.',
    connect: 'Connect.',
    description: 'graphic designer, Japanese tutor, and digital experience creator.',
  },
  ja: {
    learn: '学ぶ。',
    create: '創る。',
    connect: 'つながる。',
    description: 'グラフィックデザイナー、日本語チューター、デジタル体験をつくるクリエイター。',
  },
}

export default function Hero() {
  const { language, t } = useLanguage()
  const copy = HERO_COPY[language] ?? HERO_COPY.id

  const scrollToAboutPreview = (event) => {
    event.preventDefault()

    const target = document.querySelector('#about-preview, .about-preview')
    if (!target) return

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <section className="snap-section hero hero-layered" id="home" data-language={language} aria-labelledby="hero-title">
      <div className="hero-layered-stage">
        <div className="hero-layered-art">
          {/* Everything in this scene stays behind the main cloud.
              The scene keeps the cqw-based responsive coordinate system. */}
          <div className="hero-layered-scene">
            <img
              className="hero-layer hero-layer-cloud-side hero-layer-cloud-left"
              src={HERO_ASSETS.cloudLeft}
              alt=""
              aria-hidden="true"
            />
            <img
              className="hero-layer hero-layer-cloud-side hero-layer-cloud-right"
              src={HERO_ASSETS.cloudRight}
              alt=""
              aria-hidden="true"
            />

            <img
              className="hero-layer hero-layer-doodle hero-layer-doodle-left"
              src={HERO_ASSETS.doodleLeft}
              alt=""
              aria-hidden="true"
            />
            <img
              className="hero-layer hero-layer-doodle hero-layer-doodle-right"
              src={HERO_ASSETS.doodleRight}
              alt=""
              aria-hidden="true"
            />

            <img
              className="hero-layer hero-layer-plane"
              src={HERO_ASSETS.paperPlane}
              alt=""
              aria-hidden="true"
            />

            <p className="hero-layered-name">Maldy Rais</p>

            <h1 className="hero-layered-headline" id="hero-title">
              <span className="hero-layered-words hero-layered-words-left">
                <span>{copy.learn}</span>
                <span>{copy.create}</span>
              </span>
              <span className="hero-layered-words hero-layered-words-right">
                <span>{copy.connect}</span>
              </span>
            </h1>

            <img
              className="hero-layer hero-layer-character"
              src={HERO_ASSETS.character}
              alt=""
              aria-hidden="true"
              loading="eager"
              fetchPriority="high"
            />
          </div>

          {/* Notes intentionally sit outside .hero-layered-scene so their
              z-index can pass the main-cloud stacking layer. */}
          <img
            className="hero-layer hero-layer-note hero-layer-note-aa"
            src={HERO_ASSETS.noteAa}
            alt=""
            aria-hidden="true"
          />
          <img
            className="hero-layer hero-layer-note hero-layer-note-ja"
            src={HERO_ASSETS.noteJa}
            alt=""
            aria-hidden="true"
          />
        </div>

        <div className="hero-layered-bottom">
          <div className="hero-layer-cloud-main" aria-hidden="true">
            <img src={HERO_ASSETS.cloudMain} alt="" />
          </div>

          <p>{copy.description}</p>
          <a
            className="hero-layered-cta"
            href="#about-preview"
            onClick={scrollToAboutPreview}
          >
            {t('hero.cta')} <span aria-hidden="true">↘</span>
          </a>
        </div>
      </div>
    </section>
  )
}
