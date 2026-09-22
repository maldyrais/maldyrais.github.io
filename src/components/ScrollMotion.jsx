import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { contentPathFromPathname } from '../i18n/routes'

const GROUPS = [
  // Home — move the content, never the section background itself.
  { selector: '.hero-layered-stage', kind: 'hero', stagger: 0 },
  { selector: '.about-preview-board', kind: 'rise', stagger: 0 },
  { selector: '.showcase-shell', kind: 'rise', stagger: 0 },
  { selector: '.more-simple-shell', kind: 'rise', stagger: 0 },
  { selector: '.contact-footer-content', kind: 'rise', stagger: 0 },

  // About.
  { selector: '.about-hero-copy', kind: 'slide-left', stagger: 0 },
  { selector: '.about-portrait-wrap-v2', kind: 'slide-right', stagger: 0, baseDelay: 90 },
  { selector: '.about-facts-v2 > div', kind: 'card', stagger: 75 },
  { selector: '.activity-section-heading', kind: 'rise', stagger: 0 },
  { selector: '.activity-year', kind: 'soft', stagger: 55 },
  { selector: '.about-footer', kind: 'rise', stagger: 0 },

  // Works archive.
  { selector: '.works-header-top', kind: 'soft', stagger: 0 },
  { selector: '.works-header-grid', kind: 'rise', stagger: 0, baseDelay: 60 },
  { selector: '.works-filters', kind: 'soft', stagger: 0 },
  { selector: '.works-sort-label', kind: 'soft', stagger: 0, baseDelay: 70 },
  { selector: '.works-card', kind: 'card', stagger: 45, maxDelay: 315 },
  { selector: '.works-load-more-wrap', kind: 'rise', stagger: 0 },
  { selector: '.works-page-state', kind: 'soft', stagger: 0 },
  { selector: '.activity-empty', kind: 'soft', stagger: 0 },
]

function routeKey(pathname) {
  const contentPath = contentPathFromPathname(pathname)
  const clean = contentPath && contentPath !== '/' ? contentPath.replace(/\/+$/, '') : '/'

  // Opening a SEO permalink modal must NOT restart the motion system
  // behind it. The parent page stays alive.
  if (clean === '/works' || clean.startsWith('/works/')) return '/works'
  if (clean === '/about' || clean.startsWith('/about/')) return '/about'

  return clean || '/'
}

function reduceMotion() {
  return (
    typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export default function ScrollMotion() {
  const { pathname } = useLocation()
  const key = routeKey(pathname)

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return undefined
    }

    let cancelled = false
    let frame = 0
    const observed = new Set()

    const reduced = reduceMotion()

    const observer = reduced
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const element = entry.target

              if (entry.isIntersecting && entry.intersectionRatio >= 0.08) {
                element.classList.add('motion-visible')
                element.classList.remove('motion-exit-up', 'motion-exit-down')
                return
              }

              if (entry.isIntersecting) return

              element.classList.remove('motion-visible')

              if (entry.boundingClientRect.bottom <= 0) {
                element.classList.add('motion-exit-up')
                element.classList.remove('motion-exit-down')
              } else {
                element.classList.add('motion-exit-down')
                element.classList.remove('motion-exit-up')
              }
            })
          },
          {
            threshold: [0, 0.08, 0.18, 0.5],
            rootMargin: '-5% 0px -8% 0px',
          },
        )

    const prepare = () => {
      if (cancelled) return

      GROUPS.forEach((group) => {
        document.querySelectorAll(group.selector).forEach((element, index) => {
          if (observed.has(element)) return

          observed.add(element)
          element.classList.add('motion-item')
          element.dataset.motionKind = group.kind

          const delay = Math.min(
            (group.baseDelay ?? 0) + index * (group.stagger ?? 0),
            group.maxDelay ?? 420,
          )

          element.style.setProperty('--motion-delay', `${delay}ms`)

          if (reduced) {
            element.classList.add('motion-visible')
          } else {
            observer.observe(element)
          }
        })
      })
    }

    // useLayoutEffect adds the hidden base state before paint. Observing on
    // the next frame guarantees the first visible items actually animate in.
    prepare()
    frame = window.requestAnimationFrame(prepare)

    // Supabase content can appear after the route has already mounted.
    // Observe only newly-added matching nodes; this does not poll on scroll.
    const mutationObserver = new MutationObserver(() => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(prepare)
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      mutationObserver.disconnect()
      observer?.disconnect()
    }
  }, [key])

  return null
}
