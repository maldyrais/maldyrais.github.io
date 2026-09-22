import { useEffect, useMemo, useRef, useState } from 'react'
import { reportError } from '../lib/errorReporting'
import { getWorkImageUrl, getWorkMediaUrl } from '../lib/storage'
import { getWorkMedia } from '../lib/publicContentCache'
import { lockModalScroll, unlockModalScroll } from '../lib/modalLock'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatProjectDateRange,
  getCategoryName,
  getWorkDescription,
  getWorkTitle,
} from '../lib/workFormat'

function classifyMedia(width, height) {
  if (!width || !height) {
    return {
      width: 0,
      height: 0,
      ratio: 4 / 3,
      kind: 'standard',
      desktopMode: 'contain',
    }
  }

  const ratio = width / height

  return {
    width,
    height,
    ratio,
    kind: ratio >= 2.05
      ? 'panorama'
      : ratio <= 0.62
        ? 'tall'
        : 'standard',
    desktopMode: 'contain',
  }
}

export default function WorkModal({ work, onClose }) {
  const { language, t } = useLanguage()

  const [galleryMedia, setGalleryMedia] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(0)
  const [mediaMeta, setMediaMeta] = useState({})
  const [previewMode, setPreviewMode] = useState('fit')

  const touchStartRef = useRef(null)
  const previewScrollRef = useRef(null)
  const viewerScrollRef = useRef(null)

  const title = work ? getWorkTitle(work, language) : ''
  const description = work
    ? getWorkDescription(work, language) || t('work.noDescription')
    : ''
  const category = work ? getCategoryName(work.category, language) : ''
  const date = work
    ? formatProjectDateRange(work.project_start_date, work.project_end_date, language)
    : ''
  const coverUrl = work ? getWorkImageUrl(work) : ''
  const tools = Array.isArray(work?.tools) ? work.tools : []
  const externalUrl = typeof work?.external_url === 'string' ? work.external_url.trim() : ''
  const hasExternalWork = /^https?:\/\//i.test(externalUrl)

  const slides = useMemo(() => {
    if (!work) return []

    const result = []

    if (coverUrl) {
      result.push({
        key: `cover-${work.id}`,
        id: `cover-${work.id}`,
        type: 'cover',
        url: coverUrl,
      })
    }

    galleryMedia.forEach((media) => {
      const url = getWorkMediaUrl(media)
      if (!url) return

      result.push({
        key: `media-${media.id}`,
        id: media.id,
        type: 'media',
        url,
        sort_order: media.sort_order,
      })
    })

    return result
  }, [work, coverUrl, galleryMedia])

  const activeSlide = slides[activeIndex] ?? slides[0] ?? null
  const activeMeta = activeSlide
    ? (mediaMeta[activeSlide.key] ?? classifyMedia())
    : classifyMedia()

  const hasMultipleSlides = slides.length > 1

  useEffect(() => {
    if (!work) return undefined

    lockModalScroll()

    return () => {
      unlockModalScroll()
    }
  }, [work])

  useEffect(() => {
    let cancelled = false

    const loadGallery = async () => {
      if (!work?.id) {
        setGalleryMedia([])
        setGalleryLoading(false)
        return
      }

      setGalleryLoading(true)

      try {
        const data = await getWorkMedia(work.id)
        if (cancelled) return
        setGalleryMedia(data)
      } catch (error) {
        if (cancelled) return
        reportError('work-modal.media', error)
        setGalleryMedia([])
      }

      setGalleryLoading(false)
    }

    loadGallery()

    return () => {
      cancelled = true
    }
  }, [work?.id])

  useEffect(() => {
    setActiveIndex(0)
    setViewerOpen(false)
    setZoomLevel(0)
    setMediaMeta({})
    setPreviewMode('fit')
    touchStartRef.current = null
  }, [work?.id])

  useEffect(() => {
    if (activeIndex <= slides.length - 1) return
    setActiveIndex(Math.max(0, slides.length - 1))
  }, [activeIndex, slides.length])

  useEffect(() => {
    setPreviewMode('fit')
    previewScrollRef.current?.scrollTo({ top: 0, left: 0 })
    viewerScrollRef.current?.scrollTo({ top: 0, left: 0 })
  }, [activeIndex])

  const goToSlide = (nextIndex) => {
    if (!slides.length) return

    const normalized = ((nextIndex % slides.length) + slides.length) % slides.length
    setActiveIndex(normalized)
    setZoomLevel(0)
  }

  const goPrevious = () => {
    if (!hasMultipleSlides) return
    goToSlide(activeIndex - 1)
  }

  const goNext = () => {
    if (!hasMultipleSlides) return
    goToSlide(activeIndex + 1)
  }

  useEffect(() => {
    if (!work) return undefined

    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (viewerOpen) {
          setViewerOpen(false)
          setZoomLevel(0)
        } else {
          onClose()
        }
        return
      }

      if (event.key === 'ArrowLeft' && hasMultipleSlides) {
        event.preventDefault()
        goPrevious()
        return
      }

      if (event.key === 'ArrowRight' && hasMultipleSlides) {
        event.preventDefault()
        goNext()
        return
      }

      if (!viewerOpen) return

      if (event.key === '+' || event.key === '=') {
        setZoomLevel((level) => Math.min(level + 1, 2))
      }

      if (event.key === '-') {
        setZoomLevel((level) => Math.max(level - 1, 0))
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [work, onClose, viewerOpen, hasMultipleSlides, activeIndex, slides.length])

  if (!work) return null

  const openViewer = () => {
    if (!activeSlide) return
    setZoomLevel(0)
    setViewerOpen(true)
  }

  const handleMediaLoad = (event, slideKey) => {
    const width = event.currentTarget.naturalWidth || 0
    const height = event.currentTarget.naturalHeight || 0
    if (!width || !height || !slideKey) return

    const baseMeta = classifyMedia(width, height)
    const frame = event.currentTarget.closest('.modal-image-scroll')

    // The preview no longer guesses whether an image should scroll.
    // Every slide opens in FIT mode so photography and artwork are never
    // cropped by a ratio heuristic. We only calculate which axis would
    // scroll if the visitor explicitly switches to Detail mode.
    let detailAxis = 'y'

    if (frame?.clientWidth && frame?.clientHeight) {
      const frameRatio = frame.clientWidth / frame.clientHeight
      detailAxis = baseMeta.ratio > frameRatio ? 'x' : 'y'
    }

    setMediaMeta((current) => ({
      ...current,
      [slideKey]: {
        ...baseMeta,
        detailAxis,
      },
    }))

    requestAnimationFrame(() => {
      previewScrollRef.current?.scrollTo({ top: 0, left: 0 })
      viewerScrollRef.current?.scrollTo({ top: 0, left: 0 })
    })
  }

  const togglePreviewMode = () => {
    setPreviewMode((current) => current === 'fit' ? 'detail' : 'fit')
    requestAnimationFrame(() => {
      previewScrollRef.current?.scrollTo({ top: 0, left: 0 })
    })
  }

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0]
    if (!touch) return

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }

  const handleTouchEnd = (event) => {
    if (!hasMultipleSlides || !touchStartRef.current) return

    const touch = event.changedTouches?.[0]
    if (!touch) return

    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    touchStartRef.current = null

    if (Math.abs(deltaX) < 48) return
    if (Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return

    if (deltaX < 0) goNext()
    else goPrevious()
  }

  const zoomScale = [1, 1.25, 1.5][zoomLevel]
  const viewerImageWidth = activeMeta.kind === 'panorama'
    ? `max(${100 * zoomScale}%, ${activeMeta.ratio * 76 * zoomScale}dvh)`
    : `${100 * zoomScale}%`

  const mediaStyle = {
    '--work-media-ratio': String(activeMeta.ratio || (4 / 3)),
  }

  return (
    <>
      <div
        className="modal-backdrop work-modal-layer"
        onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      >
        <article
          className={`work-modal media-${activeMeta.kind}`}
          style={mediaStyle}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <button className="modal-close" onClick={onClose} aria-label={t('work.close')}>×</button>

          <div
            className="modal-media-pane work-carousel"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {activeSlide ? (
              <>
                <img
                  className="modal-image-backdrop"
                  src={activeSlide.url}
                  alt=""
                  aria-hidden="true"
                />

                <div
                  ref={previewScrollRef}
                  className={`modal-image-scroll preview-${previewMode} detail-${activeMeta.detailAxis || 'y'}`}
                  tabIndex="0"
                  aria-label={t('work.preview', { title })}
                >
                  <img
                    key={activeSlide.key}
                    src={activeSlide.url}
                    alt={`${title} — ${activeIndex + 1}`}
                    onLoad={(event) => handleMediaLoad(event, activeSlide.key)}
                  />
                </div>

                {hasMultipleSlides && (
                  <>
                    <button
                      type="button"
                      className="work-carousel-arrow work-carousel-prev"
                      onClick={goPrevious}
                      aria-label="Gambar sebelumnya"
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      className="work-carousel-arrow work-carousel-next"
                      onClick={goNext}
                      aria-label="Gambar berikutnya"
                    >
                      →
                    </button>

                    <div className="work-carousel-status" aria-label={`${activeIndex + 1} dari ${slides.length}`}>
                      <span>{activeIndex + 1} / {slides.length}</span>
                      <div className="work-carousel-dots" aria-hidden="true">
                        {slides.map((slide, index) => (
                          <button
                            key={slide.key}
                            type="button"
                            className={index === activeIndex ? 'active' : ''}
                            onClick={() => goToSlide(index)}
                            tabIndex="-1"
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  className="work-preview-mode-button"
                  onClick={togglePreviewMode}
                  aria-pressed={previewMode === 'detail'}
                  aria-label={previewMode === 'fit' ? 'Tampilkan detail dan aktifkan scroll' : 'Tampilkan seluruh gambar'}
                  title={previewMode === 'fit' ? 'Detail' : 'Fit'}
                >
                  <span aria-hidden="true">{previewMode === 'fit' ? '⌕' : '⊡'}</span>
                  <span>{previewMode === 'fit' ? 'Detail' : 'Fit'}</span>
                </button>

                {hasExternalWork ? (
                  <a
                    className="view-image-button"
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t('work.viewWork')}: ${title}`}
                  >
                    <span aria-hidden="true">↗</span>
                    {t('work.viewWork')}
                  </a>
                ) : (
                  <button className="view-image-button" onClick={openViewer}>
                    <span aria-hidden="true">↗</span>
                    {t('work.viewImage')}
                  </button>
                )}

                {galleryLoading && (
                  <div className="work-carousel-loading">…</div>
                )}
              </>
            ) : (
              <div className="modal-image-placeholder">{t('work.noImage')}</div>
            )}
          </div>

          <div className="modal-content">
            <div className="work-meta">
              {category}{date ? ` · ${date}` : ''}
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            {tools.length > 0 && <div className="tool-list">{tools.join(' · ')}</div>}
          </div>
        </article>
      </div>

      {viewerOpen && activeSlide && (
        <div
          className={`image-viewer-backdrop media-${activeMeta.kind}`}
          style={mediaStyle}
          role="dialog"
          aria-modal="true"
          aria-label={t('work.viewerLabel', { title })}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewerOpen(false)
              setZoomLevel(0)
            }
          }}
        >
          <div className="image-viewer-toolbar">
            <div className="image-viewer-title">
              {title}
              {hasMultipleSlides && <span className="image-viewer-counter">{activeIndex + 1} / {slides.length}</span>}
            </div>

            <div className="image-viewer-actions">
              {hasMultipleSlides && (
                <>
                  <button onClick={goPrevious} aria-label="Gambar sebelumnya">←</button>
                  <button onClick={goNext} aria-label="Gambar berikutnya">→</button>
                </>
              )}

              <button
                onClick={() => setZoomLevel((level) => Math.max(level - 1, 0))}
                disabled={zoomLevel === 0}
                aria-label={t('work.zoomOut')}
              >
                −
              </button>

              <span>{[100, 125, 150][zoomLevel]}%</span>

              <button
                onClick={() => setZoomLevel((level) => Math.min(level + 1, 2))}
                disabled={zoomLevel === 2}
                aria-label={t('work.zoomIn')}
              >
                +
              </button>

              <button
                className="image-viewer-close"
                onClick={() => {
                  setViewerOpen(false)
                  setZoomLevel(0)
                }}
                aria-label={t('work.closeViewer')}
              >
                ×
              </button>
            </div>
          </div>

          <div
            ref={viewerScrollRef}
            className={`image-viewer-scroll media-${activeMeta.kind} zoom-${zoomLevel}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              key={`viewer-${activeSlide.key}`}
              src={activeSlide.url}
              alt={`${title} — ${activeIndex + 1}`}
              style={{ width: viewerImageWidth }}
              onLoad={(event) => handleMediaLoad(event, activeSlide.key)}
            />
          </div>
        </div>
      )}
    </>
  )
}
