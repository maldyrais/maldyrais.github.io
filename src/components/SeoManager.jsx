import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  contentPathFromPathname,
  normalizeContentPath,
} from '../i18n/routes'
import { getPortfolioAssetUrl } from '../lib/profileStorage'
import { getWorkImageUrl } from '../lib/storage'
import { reportError } from '../lib/errorReporting'
import {
  getPublishedActivityBySlug,
  getPublishedWorkBySlug,
  primeActivity,
  primeWork,
} from '../lib/publicContentCache'
import { usePublicProfile } from '../hooks/usePublicProfile'

const SITE_URL = 'https://maldyrais.github.io'
const PERSON_ID = `${SITE_URL}/#person`
const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/about/about-portrait.png`
const NIHONGO_URL = `${SITE_URL}/Nihongo-gakushu/`

const LANGUAGE_TAG = {
  id: 'id-ID',
  en: 'en',
  ja: 'ja-JP',
}

const OG_LOCALE = {
  id: 'id_ID',
  en: 'en_US',
  ja: 'ja_JP',
}

const SEO = {
  '/': {
    id: {
      title: 'Maldy Rais — Tutor Bahasa Jepang & Kreator Visual',
      description: 'Portfolio Maldy Rais, tutor bahasa Jepang dan kreator visual yang berkarya dalam desain, fotografi, serta pengalaman web interaktif.',
    },
    en: {
      title: 'Maldy Rais — Japanese Tutor & Visual Creator',
      description: 'Portfolio of Maldy Rais, a Japanese language tutor and visual creator working across design, photography, and interactive web experiences.',
    },
    ja: {
      title: 'Maldy Rais — 日本語チューター・ビジュアルクリエイター',
      description: '日本語教育、デザイン、写真、インタラクティブWeb制作に取り組むMaldy Raisのポートフォリオ。',
    },
  },
  '/about': {
    id: {
      title: 'Tentang Maldy Rais — Tutor Bahasa Jepang & Kreator Visual',
      description: 'Kenali Maldy Rais lebih jauh: perjalanan, pengalaman, minat, dan karya di bidang bahasa Jepang, desain, fotografi, serta web interaktif.',
    },
    en: {
      title: 'About Maldy Rais — Japanese Tutor & Visual Creator',
      description: 'Learn more about Maldy Rais, his experience, interests, and work across Japanese language education, design, photography, and interactive web.',
    },
    ja: {
      title: 'Maldy Raisについて — 日本語・デザイン・写真・Web',
      description: 'Maldy Raisの経験、興味、活動について。日本語教育、デザイン、写真、インタラクティブWebの分野で活動しています。',
    },
  },
  '/works': {
    id: {
      title: 'Karya Maldy Rais — Desain, Fotografi & Web Interaktif',
      description: 'Kumpulan karya pilihan Maldy Rais dalam desain visual, fotografi, materi bahasa Jepang, dan pengalaman web interaktif.',
    },
    en: {
      title: 'Works by Maldy Rais — Design, Photography & Interactive Web',
      description: 'Selected works by Maldy Rais across visual design, photography, Japanese learning materials, and interactive web experiences.',
    },
    ja: {
      title: 'Maldy Raisの作品 — デザイン・写真・インタラクティブWeb',
      description: 'ビジュアルデザイン、写真、日本語学習コンテンツ、インタラクティブWebを中心としたMaldy Raisの作品集。',
    },
  },
  '/nihongo-gakushu': {
    id: {
      title: 'Nihongo Gakushū — Belajar Bahasa Jepang bersama Maldy Rais',
      description: 'Halaman pengantar menuju project Nihongo Gakushū milik Maldy Rais.',
    },
    en: {
      title: 'Nihongo Gakushū — Learn Japanese with Maldy Rais',
      description: 'A redirect page to Maldy Rais’s standalone Japanese language learning project.',
    },
    ja: {
      title: '日本語学習 — Maldy Raisと学ぶ日本語',
      description: 'Maldy Raisの日本語学習プロジェクトへの案内ページです。',
    },
  },
}

const DETAIL_COPY = {
  id: {
    workSuffix: 'Karya Maldy Rais',
    workFallback: (title) => `Karya ${title} oleh Maldy Rais.`,
    activitySuffix: 'Pengalaman Maldy Rais',
    activityFallback: (title) => `${title} — pengalaman dan aktivitas Maldy Rais.`,
    homeLabel: 'Beranda',
    worksLabel: 'Karya',
    aboutLabel: 'Tentang',
  },
  en: {
    workSuffix: 'Work by Maldy Rais',
    workFallback: (title) => `${title}, a work by Maldy Rais.`,
    activitySuffix: 'Experience — Maldy Rais',
    activityFallback: (title) => `${title} — an experience or activity by Maldy Rais.`,
    homeLabel: 'Home',
    worksLabel: 'Works',
    aboutLabel: 'About',
  },
  ja: {
    workSuffix: 'Maldy Raisの作品',
    workFallback: (title) => `${title} — Maldy Raisの作品です。`,
    activitySuffix: 'Maldy Raisの活動・経験',
    activityFallback: (title) => `${title} — Maldy Raisの活動・経験です。`,
    homeLabel: 'ホーム',
    worksLabel: '作品',
    aboutLabel: '自己紹介',
  },
}

function workSlugFromContentPath(contentPath) {
  const match = normalizeContentPath(contentPath).match(/^\/works\/([a-z0-9-]+)$/i)
  return match?.[1] || ''
}

function activitySlugFromContentPath(contentPath) {
  const match = normalizeContentPath(contentPath).match(/^\/about\/activity\/([a-z0-9-]+)$/i)
  return match?.[1] || ''
}

function localizedField(row, field, language) {
  return (
    row?.[`${field}_${language}`]
    || row?.[`${field}_id`]
    || row?.[`${field}_en`]
    || row?.[`${field}_ja`]
    || ''
  )
}

function localizedUrl(contentPath, language) {
  const clean = normalizeContentPath(contentPath)
  return clean === '/'
    ? `${SITE_URL}/${language}/`
    : `${SITE_URL}/${language}${clean}/`
}

function canonicalFor(contentPath, language) {
  if (normalizeContentPath(contentPath) === '/nihongo-gakushu') return NIHONGO_URL
  return localizedUrl(contentPath, language)
}

function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector)

  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })
}

function ensureCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]')

  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.appendChild(element)
  }

  element.href = href
}

function clearAlternates() {
  document.head
    .querySelectorAll('link[rel="alternate"][hreflang]')
    .forEach((element) => element.remove())
}

function ensureAlternates(contentPath) {
  clearAlternates()

  for (const language of SUPPORTED_LANGUAGES) {
    const link = document.createElement('link')
    link.rel = 'alternate'
    link.hreflang = language
    link.href = localizedUrl(contentPath, language)
    document.head.appendChild(link)
  }

  const fallback = document.createElement('link')
  fallback.rel = 'alternate'
  fallback.hreflang = 'x-default'
  fallback.href = localizedUrl(contentPath, DEFAULT_LANGUAGE)
  document.head.appendChild(fallback)
}

function setJsonLd(data) {
  document.getElementById('maldy-static-jsonld')?.remove()

  const id = 'maldy-seo-jsonld'
  let script = document.getElementById(id)

  if (!script) {
    script = document.createElement('script')
    script.id = id
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }

  script.textContent = JSON.stringify(data)
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
}

function personSchema(copy, profile, language) {
  const sameAs = [
    profile?.instagram_url,
    profile?.behance_url,
    profile?.github_url,
    profile?.linkedin_url,
  ].filter(Boolean)

  const profileImage = getPortfolioAssetUrl({
    avatar_path: profile?.avatar_path,
    avatar_url: profile?.avatar_url,
  })

  const roles = uniqueStrings(profile?.roles ?? [])
  const interests = uniqueStrings(profile?.interests ?? [])

  const person = {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: profile?.name || 'Maldy Rais',
    url: `${SITE_URL}/id/about/`,
    description: copy.description,
    image: profileImage || DEFAULT_SOCIAL_IMAGE,
    jobTitle: roles.length > 0 ? roles : ['Japanese Language Tutor', 'Visual Creator'],
    knowsAbout: interests.length > 0
      ? interests
      : ['Japanese language education', 'Visual design', 'Photography', 'Interactive web design'],
    inLanguage: LANGUAGE_TAG[language] || LANGUAGE_TAG.id,
  }

  if (sameAs.length > 0) person.sameAs = sameAs

  if (profile?.location) {
    person.homeLocation = {
      '@type': 'Place',
      name: profile.location,
    }
  }

  return person
}

function breadcrumbSchema(contentPath, copy, language) {
  const clean = normalizeContentPath(contentPath)
  if (clean === '/' || clean === '/nihongo-gakushu') return null

  return {
    '@type': 'BreadcrumbList',
    '@id': `${localizedUrl(clean, language)}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Maldy Rais',
        item: localizedUrl('/', language),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy.title,
        item: localizedUrl(clean, language),
      },
    ],
  }
}

function structuredData(contentPath, copy, languageTag, profile, language) {
  const clean = normalizeContentPath(contentPath)
  const person = personSchema(copy, profile, language)
  const breadcrumb = breadcrumbSchema(clean, copy, language)
  const websiteId = `${SITE_URL}/${language}/#website`

  if (clean === '/') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': websiteId,
          url: localizedUrl('/', language),
          name: 'Maldy Rais',
          inLanguage: languageTag,
          publisher: { '@id': PERSON_ID },
        },
        person,
      ],
    }
  }

  if (clean === '/about') {
    const profilePage = {
      '@type': 'ProfilePage',
      '@id': `${localizedUrl('/about', language)}#profile`,
      url: localizedUrl('/about', language),
      name: copy.title,
      description: copy.description,
      inLanguage: languageTag,
      mainEntity: person,
      isPartOf: { '@id': websiteId },
    }

    if (profile?.updated_at) profilePage.dateModified = profile.updated_at

    return {
      '@context': 'https://schema.org',
      '@graph': [profilePage, person, breadcrumb].filter(Boolean),
    }
  }

  if (clean === '/works') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': `${localizedUrl('/works', language)}#collection`,
          url: localizedUrl('/works', language),
          name: copy.title,
          description: copy.description,
          inLanguage: languageTag,
          creator: { '@id': PERSON_ID },
          about: { '@id': PERSON_ID },
          isPartOf: { '@id': websiteId },
        },
        person,
        breadcrumb,
      ].filter(Boolean),
    }
  }

  if (clean === '/nihongo-gakushu') {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: NIHONGO_URL,
      name: copy.title,
      description: copy.description,
      inLanguage: languageTag,
      author: { '@id': PERSON_ID },
    }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        url: localizedUrl(clean, language),
        name: copy.title,
        description: copy.description,
        inLanguage: languageTag,
        author: { '@id': PERSON_ID },
        isPartOf: { '@id': websiteId },
      },
      person,
      breadcrumb,
    ].filter(Boolean),
  }
}

function workStructuredData(work, copy, languageTag, profile, imageUrl, language) {
  const url = localizedUrl(`/works/${work.slug}`, language)
  const labels = DETAIL_COPY[language] ?? DETAIL_COPY.id
  const person = personSchema(copy, profile, language)

  const creativeWork = {
    '@type': 'CreativeWork',
    '@id': `${url}#work`,
    url,
    name: copy.title,
    description: copy.description,
    inLanguage: languageTag,
    creator: { '@id': PERSON_ID },
    isPartOf: { '@id': `${localizedUrl('/works', language)}#collection` },
  }

  if (imageUrl) creativeWork.image = imageUrl
  if (work.project_start_date) creativeWork.dateCreated = work.project_start_date
  if (work.updated_at) creativeWork.dateModified = work.updated_at
  if (work.external_url) creativeWork.sameAs = work.external_url

  return {
    '@context': 'https://schema.org',
    '@graph': [
      creativeWork,
      person,
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: labels.homeLabel, item: localizedUrl('/', language) },
          { '@type': 'ListItem', position: 2, name: labels.worksLabel, item: localizedUrl('/works', language) },
          { '@type': 'ListItem', position: 3, name: copy.title, item: url },
        ],
      },
    ],
  }
}

function activityStructuredData(activity, copy, languageTag, profile, imageUrl, language) {
  const url = localizedUrl(`/about/activity/${activity.slug}`, language)
  const labels = DETAIL_COPY[language] ?? DETAIL_COPY.id
  const person = personSchema(copy, profile, language)

  const page = {
    '@type': 'WebPage',
    '@id': `${url}#page`,
    url,
    name: copy.title,
    description: copy.description,
    inLanguage: languageTag,
    about: { '@id': PERSON_ID },
    isPartOf: { '@id': `${localizedUrl('/about', language)}#profile` },
  }

  if (imageUrl) page.primaryImageOfPage = imageUrl
  if (activity.updated_at) page.dateModified = activity.updated_at

  return {
    '@context': 'https://schema.org',
    '@graph': [
      page,
      person,
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: labels.homeLabel, item: localizedUrl('/', language) },
          { '@type': 'ListItem', position: 2, name: labels.aboutLabel, item: localizedUrl('/about', language) },
          { '@type': 'ListItem', position: 3, name: copy.title, item: url },
        ],
      },
    ],
  }
}

export default function SeoManager() {
  const location = useLocation()
  const { pathname } = location
  const { language } = useLanguage()
  const profile = usePublicProfile()

  const contentPath = normalizeContentPath(contentPathFromPathname(pathname))
  const workDetailSlug = workSlugFromContentPath(contentPath)
  const activityDetailSlug = activitySlugFromContentPath(contentPath)

  const [workSeo, setWorkSeo] = useState({ slug: '', status: 'idle', work: null })
  const [activitySeo, setActivitySeo] = useState({ slug: '', status: 'idle', activity: null })

  useEffect(() => {
    const slug = workSlugFromContentPath(contentPath)

    if (!slug) {
      setWorkSeo({ slug: '', status: 'idle', work: null })
      return undefined
    }

    const stateWork = location.state?.work
    if (stateWork?.slug === slug) {
      primeWork(stateWork)
      setWorkSeo({ slug, status: 'ready', work: stateWork })
      return undefined
    }

    let cancelled = false
    setWorkSeo({ slug, status: 'loading', work: null })

    getPublishedWorkBySlug(slug)
      .then((work) => {
        if (cancelled) return
        setWorkSeo({ slug, status: work ? 'ready' : 'missing', work })
      })
      .catch((error) => {
        if (cancelled) return
        reportError('seo.work-detail', error)
        setWorkSeo({ slug, status: 'error', work: null })
      })

    return () => { cancelled = true }
  }, [contentPath, location.state])

  useEffect(() => {
    const slug = activitySlugFromContentPath(contentPath)

    if (!slug) {
      setActivitySeo({ slug: '', status: 'idle', activity: null })
      return undefined
    }

    const stateActivity = location.state?.activity
    if (stateActivity?.slug === slug) {
      primeActivity(stateActivity)
      setActivitySeo({ slug, status: 'ready', activity: stateActivity })
      return undefined
    }

    let cancelled = false
    setActivitySeo({ slug, status: 'loading', activity: null })

    getPublishedActivityBySlug(slug)
      .then((activity) => {
        if (cancelled) return
        setActivitySeo({ slug, status: activity ? 'ready' : 'missing', activity })
      })
      .catch((error) => {
        if (cancelled) return
        reportError('seo.activity-detail', error)
        setActivitySeo({ slug, status: 'error', activity: null })
      })

    return () => { cancelled = true }
  }, [contentPath, location.state])

  useEffect(() => {
    const routeSeo = SEO[contentPath]
    const isAdmin = contentPath === '/admin' || contentPath.startsWith('/admin/')
    const languageTag = LANGUAGE_TAG[language] || LANGUAGE_TAG.id
    const labels = DETAIL_COPY[language] ?? DETAIL_COPY.id

    document.documentElement.lang = languageTag

    if (isAdmin) {
      document.title = 'Admin — Maldy Rais'
      ensureMeta('meta[name="robots"]', {
        name: 'robots',
        content: 'noindex, nofollow, noarchive',
      })
      clearAlternates()
      return
    }

    if (workDetailSlug) {
      if (workSeo.slug !== workDetailSlug || workSeo.status === 'loading') return

      if (workSeo.status !== 'ready' || !workSeo.work) {
        document.title = 'Karya tidak ditemukan — Maldy Rais'
        ensureMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, follow' })
        clearAlternates()
        return
      }

      const detailWork = workSeo.work
      const workTitle = localizedField(detailWork, 'title', language) || 'Maldy Rais'
      const workDescription = localizedField(detailWork, 'description', language)
        || labels.workFallback(workTitle)
      const copy = {
        title: `${workTitle} — ${labels.workSuffix}`,
        description: workDescription,
      }
      const canonical = localizedUrl(`/works/${detailWork.slug}`, language)
      const imageUrl = getWorkImageUrl(detailWork) || DEFAULT_SOCIAL_IMAGE

      document.title = copy.title
      ensureMeta('meta[name="description"]', { name: 'description', content: copy.description })
      ensureMeta('meta[name="author"]', { name: 'author', content: 'Maldy Rais' })
      ensureMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow, max-image-preview:large' })
      ensureMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
      ensureMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Maldy Rais' })
      ensureMeta('meta[property="og:title"]', { property: 'og:title', content: copy.title })
      ensureMeta('meta[property="og:description"]', { property: 'og:description', content: copy.description })
      ensureMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
      ensureMeta('meta[property="og:locale"]', { property: 'og:locale', content: OG_LOCALE[language] || OG_LOCALE.id })
      ensureMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl })
      ensureMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: workTitle })
      ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
      ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: copy.title })
      ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: copy.description })
      ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl })

      ensureCanonical(canonical)
      ensureAlternates(`/works/${detailWork.slug}`)
      setJsonLd(workStructuredData(detailWork, copy, languageTag, profile, imageUrl, language))
      return
    }

    if (activityDetailSlug) {
      if (activitySeo.slug !== activityDetailSlug || activitySeo.status === 'loading') return

      if (activitySeo.status !== 'ready' || !activitySeo.activity) {
        document.title = 'Aktivitas tidak ditemukan — Maldy Rais'
        ensureMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, follow' })
        clearAlternates()
        return
      }

      const activity = activitySeo.activity
      const activityTitle = localizedField(activity, 'title', language) || 'Maldy Rais'
      const activityDescription = (
        localizedField(activity, 'description', language)
        || localizedField(activity, 'summary', language)
        || labels.activityFallback(activityTitle)
      )
      const copy = {
        title: `${activityTitle} — ${labels.activitySuffix}`,
        description: activityDescription,
      }
      const canonical = localizedUrl(`/about/activity/${activity.slug}`, language)
      const imageUrl = getPortfolioAssetUrl(activity) || DEFAULT_SOCIAL_IMAGE

      document.title = copy.title
      ensureMeta('meta[name="description"]', { name: 'description', content: copy.description })
      ensureMeta('meta[name="author"]', { name: 'author', content: 'Maldy Rais' })
      ensureMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow, max-image-preview:large' })
      ensureMeta('meta[property="og:type"]', { property: 'og:type', content: 'profile' })
      ensureMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Maldy Rais' })
      ensureMeta('meta[property="og:title"]', { property: 'og:title', content: copy.title })
      ensureMeta('meta[property="og:description"]', { property: 'og:description', content: copy.description })
      ensureMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
      ensureMeta('meta[property="og:locale"]', { property: 'og:locale', content: OG_LOCALE[language] || OG_LOCALE.id })
      ensureMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl })
      ensureMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: activityTitle })
      ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
      ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: copy.title })
      ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: copy.description })
      ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl })

      ensureCanonical(canonical)
      ensureAlternates(`/about/activity/${activity.slug}`)
      setJsonLd(activityStructuredData(activity, copy, languageTag, profile, imageUrl, language))
      return
    }

    if (!routeSeo) {
      document.title = 'Halaman tidak ditemukan — Maldy Rais'
      ensureMeta('meta[name="robots"]', {
        name: 'robots',
        content: 'noindex, follow',
      })
      clearAlternates()
      return
    }

    const copy = routeSeo[language] || routeSeo.id
    const canonical = canonicalFor(contentPath, language)
    const isRedirectPage = contentPath === '/nihongo-gakushu'

    document.title = copy.title

    ensureMeta('meta[name="description"]', { name: 'description', content: copy.description })
    ensureMeta('meta[name="author"]', { name: 'author', content: 'Maldy Rais' })
    ensureMeta('meta[name="robots"]', {
      name: 'robots',
      content: isRedirectPage ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    })

    ensureMeta('meta[property="og:type"]', { property: 'og:type', content: contentPath === '/about' ? 'profile' : 'website' })
    ensureMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Maldy Rais' })
    ensureMeta('meta[property="og:title"]', { property: 'og:title', content: copy.title })
    ensureMeta('meta[property="og:description"]', { property: 'og:description', content: copy.description })
    ensureMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
    ensureMeta('meta[property="og:locale"]', { property: 'og:locale', content: OG_LOCALE[language] || OG_LOCALE.id })
    ensureMeta('meta[property="og:image"]', { property: 'og:image', content: DEFAULT_SOCIAL_IMAGE })
    ensureMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '1254' })
    ensureMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '1254' })
    ensureMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: 'Maldy Rais' })

    ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: copy.title })
    ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: copy.description })
    ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: DEFAULT_SOCIAL_IMAGE })

    ensureCanonical(canonical)

    if (isRedirectPage) clearAlternates()
    else ensureAlternates(contentPath)

    setJsonLd(structuredData(contentPath, copy, languageTag, profile, language))
  }, [
    activityDetailSlug,
    activitySeo,
    contentPath,
    language,
    profile,
    workDetailSlug,
    workSeo,
  ])

  return null
}
