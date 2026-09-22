import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import WorkModal from '../components/WorkModal'
import Navbar from '../components/Navbar'
import ContactFooter from '../components/ContactFooter'
import { supabase } from '../lib/supabase'
import { reportError } from '../lib/errorReporting'
import { getWorkImageUrl } from '../lib/storage'
import { formatProjectDateRange, getCategoryName, getWorkTitle } from '../lib/workFormat'
import { useLanguage } from '../i18n/LanguageContext'
import { contentPathFromPathname } from '../i18n/routes'
import { getPublishedWorkBySlug, primeWork } from '../lib/publicContentCache'

const PAGE_SIZE = 24

function WorkCard({ work, returnTo, onFallbackOpen }) {
  const { language, t, path } = useLanguage()
  const title = getWorkTitle(work, language)
  const category = getCategoryName(work.category, language)
  const date = formatProjectDateRange(work.project_start_date, work.project_end_date, language)
  const imageUrl = getWorkImageUrl(work)

  const content = (
    <>
      <span className="works-card-media">
        {imageUrl ? (
          <img src={imageUrl} alt={title} loading="lazy" />
        ) : (
          <span className="work-image-placeholder">{t('works.noImage')}</span>
        )}
        <span className="works-card-open" aria-hidden="true">↗</span>
      </span>

      <span className="works-card-info">
        <small>{category}{date ? ` · ${date}` : ''}</small>
        <strong>{title}</strong>
      </span>
    </>
  )

  if (work.slug) {
    return (
      <Link
        className="works-card"
        to={path(`/works/${work.slug}/`)}
        state={{ returnTo, work, modalRoute: true }}
        aria-label={t('works.openDetail', { title })}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      className="works-card"
      onClick={() => onFallbackOpen(work)}
      aria-label={t('works.openDetail', { title })}
    >
      {content}
    </button>
  )
}

export default function Works() {
  const { language, t, path } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const workSlug = useMemo(() => {
    const contentPath = contentPathFromPathname(location.pathname)
    const match = contentPath.match(/^\/works\/([^/]+)\/?$/i)
    return match?.[1] || ''
  }, [location.pathname])
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [works, setWorks] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [activeWork, setActiveWork] = useState(null)

  const categoryParam = searchParams.get('category')

  // Home uses mandatory vertical scroll-snap, while /works is a long archive.
  // Do this in a layout effect so snap is disabled before App's route scroll-to-top
  // and before the browser can restore the old footer position.
  useLayoutEffect(() => {
    const root = document.documentElement
    const historyObject = window.history

    const previousSnapValue = root.style.getPropertyValue('scroll-snap-type')
    const previousSnapPriority = root.style.getPropertyPriority('scroll-snap-type')
    const previousRootBehavior = root.style.scrollBehavior
    const previousBodyBehavior = document.body.style.scrollBehavior
    const previousRestoration = historyObject.scrollRestoration

    root.style.setProperty('scroll-snap-type', 'none', 'important')
    root.style.scrollBehavior = 'auto'
    document.body.style.scrollBehavior = 'auto'

    if ('scrollRestoration' in historyObject) {
      historyObject.scrollRestoration = 'manual'
    }

    const forceTop = () => window.scrollTo(0, 0)

    forceTop()
    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      forceTop()

      secondFrame = window.requestAnimationFrame(() => {
        forceTop()
        root.style.scrollBehavior = previousRootBehavior
        document.body.style.scrollBehavior = previousBodyBehavior
      })
    })

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)

      if (previousSnapValue) {
        root.style.setProperty(
          'scroll-snap-type',
          previousSnapValue,
          previousSnapPriority,
        )
      } else {
        root.style.removeProperty('scroll-snap-type')
      }

      root.style.scrollBehavior = previousRootBehavior
      document.body.style.scrollBehavior = previousBodyBehavior

      if ('scrollRestoration' in historyObject) {
        historyObject.scrollRestoration = previousRestoration
      }
    }
  }, [])

  const selectedCategoryId = useMemo(() => {
    if (selectedCategory === 'all') return null
    return Number(selectedCategory)
  }, [selectedCategory])

  useEffect(() => {
    let mounted = true

    const fetchCategories = async () => {
      const { data, error: categoryError } = await supabase
        .from('categories')
        .select('id, slug, name_id, name_en, name_ja, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (!mounted) return

      if (categoryError) {
        reportError('works.categories', categoryError)
      } else {
        setCategories(data ?? [])
      }
    }

    fetchCategories()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!categories.length) return

    if (!categoryParam) {
      setSelectedCategory('all')
      return
    }

    const matched = categories.find((category) => (
      category.slug === categoryParam || String(category.id) === categoryParam
    ))

    setSelectedCategory(matched ? String(matched.id) : 'all')
  }, [categories, categoryParam])

  useEffect(() => {
    let mounted = true

    const fetchFirstPage = async () => {
      setLoading(true)
      setError('')
      setPage(0)

      let query = supabase
        .from('works')
        .select(`
          id,
          slug,
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
          category_id,
          category:categories (
            id,
            slug,
            name_id,
            name_en,
            name_ja
          )
        `)
        .eq('is_published', true)
        .order('project_sort_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1)

      if (selectedCategoryId) query = query.eq('category_id', selectedCategoryId)

      const { data, error: queryError } = await query

      if (!mounted) return

      if (queryError) {
        reportError('works.first-page', queryError)
        setError('query')
        setWorks([])
        setHasMore(false)
      } else {
        const rows = data ?? []
        rows.forEach(primeWork)
        setWorks(rows)
        setHasMore(rows.length === PAGE_SIZE)
      }

      setLoading(false)
    }

    fetchFirstPage()
    return () => { mounted = false }
  }, [selectedCategoryId])

  useEffect(() => {
    let mounted = true

    const openPermalinkWork = async () => {
      if (!workSlug) {
        setActiveWork(null)
        return
      }

      const routeStateWork = location.state?.work
      if (routeStateWork?.slug === workSlug) {
        primeWork(routeStateWork)
        setActiveWork(routeStateWork)
        return
      }

      try {
        const data = await getPublishedWorkBySlug(workSlug)
        if (!mounted) return
        setActiveWork(data)
      } catch (detailError) {
        if (!mounted) return
        reportError('works.permalink', detailError)
        setActiveWork(null)
      }
    }

    openPermalinkWork()

    return () => { mounted = false }
  }, [workSlug, location.state])

  const closeWork = () => {
    setActiveWork(null)

    if (!workSlug) return

    const returnTo = location.state?.returnTo
    navigate(
      typeof returnTo === 'string' ? returnTo : path('/works/'),
      { replace: true, state: { preserveScroll: true } },
    )
  }

  const chooseCategory = (category) => {
    if (!category) {
      setSelectedCategory('all')
      setSearchParams({}, { replace: true })
      return
    }

    setSelectedCategory(String(category.id))
    setSearchParams({ category: category.slug || String(category.id) }, { replace: true })
  }

  const loadMore = async () => {
    if (loadingMore || !hasMore) return

    const nextPage = page + 1
    const from = nextPage * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    setLoadingMore(true)

    let query = supabase
      .from('works')
      .select(`
        id,
        slug,
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
        category_id,
        category:categories (
          id,
          slug,
          name_id,
          name_en,
          name_ja
        )
      `)
      .eq('is_published', true)
      .order('project_sort_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (selectedCategoryId) query = query.eq('category_id', selectedCategoryId)

    const { data, error: queryError } = await query

    if (queryError) {
      reportError('works.load-more', queryError)
      setError('more')
    } else {
      const rows = data ?? []
      rows.forEach(primeWork)
      setWorks((current) => [...current, ...rows])
      setPage(nextPage)
      setHasMore(rows.length === PAGE_SIZE)
      setError('')
    }

    setLoadingMore(false)
  }

  return (
    <>
      <Navbar />

      <main className="works-page">
        <header className="works-page-header">
          <div className="works-header-top">
            <Link to={path("/")} className="works-back">{t('works.back')}</Link>
          </div>

          <div className="works-header-grid">
            <div className="works-header-copy">
              <div className="section-kicker">{t('works.kicker')}</div>
              <h1>{t('works.heading')}</h1>
              <p>{t('works.description')}</p>
            </div>

            <div className="works-header-jp" aria-hidden="true">作品。</div>
          </div>
        </header>

        <div className="works-filter-wrap">
          <div className="works-filters" aria-label={t('works.filterLabel')}>
            <button
              className={selectedCategory === 'all' ? 'active' : ''}
              onClick={() => chooseCategory(null)}
            >
              {t('works.all')}
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                className={selectedCategory === String(category.id) ? 'active' : ''}
                onClick={() => chooseCategory(category)}
              >
                {getCategoryName(category, language)}
              </button>
            ))}
          </div>

          <span className="works-sort-label">{t('works.latest')}</span>
        </div>

        <section className="works-archive" aria-live="polite">
          {loading && <div className="works-page-state">{t('works.loading')}</div>}
          {!loading && error && works.length === 0 && <div className="works-page-state">{t('works.error')}</div>}
          {!loading && !error && works.length === 0 && <div className="works-page-state">{t('works.empty')}</div>}
          {!loading && error === 'more' && works.length > 0 && <div className="works-page-state compact">{t('works.loadError')}</div>}

          {!loading && works.length > 0 && (
            <div className="works-grid">
              {works.map((work) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  returnTo={`${location.pathname}${location.search}`}
                  onFallbackOpen={setActiveWork}
                />
              ))}
            </div>
          )}

          {!loading && hasMore && (
            <div className="works-load-more-wrap">
              <button className="works-load-more" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? t('works.loadingMore') : t('works.loadMore')} <span aria-hidden="true">↓</span>
              </button>
            </div>
          )}
        </section>
      </main>

      <ContactFooter />

      <WorkModal work={activeWork} onClose={closeWork} />
    </>
  )
}
