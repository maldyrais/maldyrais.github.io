import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getHomeShowcaseImageUrl } from '../lib/storage'
import { useLanguage } from '../i18n/LanguageContext'
import { reportError } from '../lib/errorReporting'
import WorkModal from './WorkModal'

const FALLBACK_CTA = {
  id: 'Lihat semua karya',
  en: 'View all works',
  ja: 'すべての作品を見る',
}

const NAV_LABELS = {
  id: { previous: 'Slide sebelumnya', next: 'Slide berikutnya' },
  en: { previous: 'Previous slide', next: 'Next slide' },
  ja: { previous: '前のスライド', next: '次のスライド' },
}

function localized(row, field, language, fallback = '') {
  if (!row) return fallback
  return (
    row[`${field}_${language}`] ||
    row[`${field}_id`] ||
    row[`${field}_en`] ||
    row[`${field}_ja`] ||
    fallback
  )
}

function resolveSlideLink(slide, path) {
  if (slide?.cta_category?.slug) {
    return path(`/works?category=${encodeURIComponent(slide.cta_category.slug)}`)
  }

  if (slide?.cta_url?.startsWith('/')) return path(slide.cta_url)
  return slide?.cta_url || path('/works')
}

function ShowcaseMessage({ children }) {
  const { t } = useLanguage()
  return (
    <section className="snap-section selected-works showcase-section works-state">
      <div>
        <div className="section-kicker">{t('selectedWorks.kicker')}</div>
        <h2>{t('selectedWorks.heading')}</h2>
        <p>{children}</p>
      </div>
    </section>
  )
}

export default function SelectedWorks() {
  const { language, t, path } = useLanguage()
  const [slides, setSlides] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeWork, setActiveWork] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoplayKey, setAutoplayKey] = useState(0)
  const touchStartRef = useRef(null)
  const autoplayDeadlineRef = useRef(0)

  useEffect(() => {
    let mounted = true

    const fetchSlides = async () => {
      setLoading(true)
      setError('')

      const { data, error: queryError } = await supabase
        .from('home_showcase_slides')
        .select(`
          id,
          title_id,
          title_en,
          title_ja,
          description_id,
          description_en,
          description_ja,
          cta_label_id,
          cta_label_en,
          cta_label_ja,
          cta_url,
          slide_order,
          autoplay_seconds,
          cta_category:categories (
            id,
            slug,
            name_id,
            name_en,
            name_ja
          ),
          images:home_showcase_images (
            id,
            slide_id,
            work_id,
            image_path,
            image_url,
            sort_order,
            work:works (
              id,
              title_id,
              title_en,
              title_ja,
              description_id,
              description_en,
              description_ja,
              project_start_date,
              project_end_date,
              project_sort_date,
              image_path,
              image_url,
              tools,
              external_url,
              is_published,
              category:categories (
                id,
                slug,
                name_id,
                name_en,
                name_ja
              )
            )
          )
        `)
        .eq('is_active', true)
        .order('slide_order', { ascending: true })
        .order('id', { ascending: true })

      if (!mounted) return

      if (queryError) {
        reportError('selected-works.showcase-load', queryError)
        setSlides([])
        setError('query')
      } else {
        const normalized = (data ?? []).map((slide) => ({
          ...slide,
          images: (slide.images ?? [])
            .filter((image) => !image.work || image.work.is_published !== false)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .slice(0, 3),
        }))

        setSlides(normalized)
        setActiveIndex(0)
        setAutoplayKey((value) => value + 1)
      }

      setLoading(false)
    }

    fetchSlides()
    return () => { mounted = false }
  }, [])

  const activeSlide = slides[activeIndex] ?? null
  const duration = Math.max(3, Math.min(60, Number(activeSlide?.autoplay_seconds) || 7))

  // Autoplay sengaja tidak bergantung pada posisi section di viewport.
  // Heartbeat kecil ini membuat slide tetap berganti saat user sedang berada
  // di section lain. Saat browser men-throttle timer (mis. tab sempat hidden),
  // visibilitychange akan langsung mengecek deadline ketika tab aktif lagi.
  useEffect(() => {
    if (slides.length <= 1) return undefined

    autoplayDeadlineRef.current = Date.now() + (duration * 1000)

    const advanceIfDue = () => {
      if (Date.now() < autoplayDeadlineRef.current) return

      setActiveIndex((current) => (current + 1) % slides.length)
      setAutoplayKey((value) => value + 1)
    }

    const heartbeat = window.setInterval(advanceIfDue, 250)
    document.addEventListener('visibilitychange', advanceIfDue)

    return () => {
      window.clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', advanceIfDue)
    }
  }, [activeIndex, duration, slides.length, autoplayKey])

  const labels = NAV_LABELS[language] ?? NAV_LABELS.id

  const goTo = (index) => {
    if (!slides.length) return
    const normalized = ((index % slides.length) + slides.length) % slides.length
    setActiveIndex(normalized)
    setAutoplayKey((value) => value + 1)
  }

  const goPrevious = () => goTo(activeIndex - 1)
  const goNext = () => goTo(activeIndex + 1)

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current
    const touch = event.changedTouches?.[0]
    touchStartRef.current = null
    if (!start || !touch || slides.length <= 1) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return
    if (deltaX < 0) goNext()
    else goPrevious()
  }

  const visualItems = useMemo(() => {
    return (activeSlide?.images ?? []).map((image) => ({
      ...image,
      url: getHomeShowcaseImageUrl(image),
      alt: localized(image.work, 'title', language, ''),
    })).filter((image) => image.url)
  }, [activeSlide, language])

  if (loading) return <ShowcaseMessage>{t('selectedWorks.loading')}</ShowcaseMessage>
  if (error) return <ShowcaseMessage>{t('selectedWorks.error')}</ShowcaseMessage>
  if (!slides.length) return <ShowcaseMessage>{t('selectedWorks.empty')}</ShowcaseMessage>

  const title = localized(activeSlide, 'title', language, t('selectedWorks.heading'))
  const description = localized(activeSlide, 'description', language, '')
  const ctaLabel = localized(activeSlide, 'cta_label', language, FALLBACK_CTA[language] ?? FALLBACK_CTA.id)
  const ctaTo = resolveSlideLink(activeSlide, path)

  return (
    <>
      <section
        className="snap-section selected-works showcase-section"
        id="works-preview"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="showcase-shell">
          <div className="section-kicker showcase-kicker">{t('selectedWorks.kicker')}</div>

          <div className="showcase-stage" key={activeSlide.id}>
            <div className="showcase-copy">
              <span className="showcase-index">{String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
              <h2>{title}</h2>
              {description && <p>{description}</p>}

              <Link className="showcase-cta" to={ctaTo}>
                {ctaLabel} <span aria-hidden="true">↗</span>
              </Link>
            </div>

            <div className={`showcase-collage count-${visualItems.length}`} aria-label={title}>
              {visualItems.map((image, index) => {
                const imageClass = `showcase-image showcase-image-${index + 1}`
                const imageContent = (
                  <>
                    <img src={image.url} alt={image.alt || ''} loading={activeIndex === 0 ? 'eager' : 'lazy'} />
                    {image.work?.id && <span className="showcase-image-open" aria-hidden="true">↗</span>}
                  </>
                )

                if (image.work?.id) {
                  const workTitle = localized(image.work, 'title', language, t('work.untitled'))
                  return (
                    <button
                      type="button"
                      className={`${imageClass} is-clickable`}
                      key={image.id ?? `${activeSlide.id}-${index}`}
                      onClick={() => setActiveWork(image.work)}
                      aria-label={t('selectedWorks.openDetail', { title: workTitle })}
                    >
                      {imageContent}
                    </button>
                  )
                }

                return (
                  <figure className={imageClass} key={image.id ?? `${activeSlide.id}-${index}`}>
                    {imageContent}
                  </figure>
                )
              })}

              {!visualItems.length && (
                <div className="showcase-empty-visual">{t('selectedWorks.noImage')}</div>
              )}
            </div>
          </div>

          <div className="showcase-controls">
            <div className="showcase-arrows">
              <button type="button" onClick={goPrevious} aria-label={labels.previous}>←</button>
              <button type="button" onClick={goNext} aria-label={labels.next}>→</button>
            </div>

            <div className="showcase-progress" key={`progress-${activeIndex}-${autoplayKey}`} aria-label={`${activeIndex + 1} / ${slides.length}`}>
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`showcase-progress-segment ${index === activeIndex ? 'active' : ''}`}
                  style={{ '--slide-duration': `${duration}s` }}
                  onClick={() => goTo(index)}
                  aria-label={`${index + 1}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <WorkModal work={activeWork} onClose={() => setActiveWork(null)} />
    </>
  )
}
