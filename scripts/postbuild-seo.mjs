import { mkdir, readFile, writeFile } from 'node:fs/promises'

const SITE_URL = 'https://maldyrais.github.io'
const NIHONGO_URL = `${SITE_URL}/Nihongo-gakushu/`
const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/about/about-portrait.png`
const DEFAULT_LANGUAGE = 'id'
const LANGUAGES = ['id', 'en', 'ja']

const LANGUAGE = {
  id: {
    tag: 'id-ID',
    og: 'id_ID',
    home: 'Beranda',
    about: 'Tentang',
    works: 'Karya',
    experienceHeading: 'Pengalaman dan pencapaian',
    worksHeading: 'Daftar karya',
    allWorks: 'Semua karya',
    aboutBack: 'Tentang Maldy Rais',
    workSuffix: 'Karya Maldy Rais',
    workFallback: (title) => `Karya ${title} oleh Maldy Rais.`,
    activitySuffix: 'Pengalaman Maldy Rais',
    activityFallback: (title) => `${title} — pengalaman dan aktivitas Maldy Rais.`,
    gateway: 'Pilih bahasa',
    redirect: 'Melanjutkan ke project Nihongo Gakushū.',
  },
  en: {
    tag: 'en',
    og: 'en_US',
    home: 'Home',
    about: 'About',
    works: 'Works',
    experienceHeading: 'Experience and achievements',
    worksHeading: 'Works',
    allWorks: 'All works',
    aboutBack: 'About Maldy Rais',
    workSuffix: 'Work by Maldy Rais',
    workFallback: (title) => `${title}, a work by Maldy Rais.`,
    activitySuffix: 'Experience — Maldy Rais',
    activityFallback: (title) => `${title} — an experience or activity by Maldy Rais.`,
    gateway: 'Choose a language',
    redirect: 'Continuing to the Nihongo Gakushū project.',
  },
  ja: {
    tag: 'ja-JP',
    og: 'ja_JP',
    home: 'ホーム',
    about: '自己紹介',
    works: '作品',
    experienceHeading: '経験・実績',
    worksHeading: '作品一覧',
    allWorks: 'すべての作品',
    aboutBack: 'Maldy Raisについて',
    workSuffix: 'Maldy Raisの作品',
    workFallback: (title) => `${title} — Maldy Raisの作品です。`,
    activitySuffix: 'Maldy Raisの活動・経験',
    activityFallback: (title) => `${title} — Maldy Raisの活動・経験です。`,
    gateway: '言語を選択',
    redirect: '日本語学習プロジェクトへ移動します。',
  },
}

const ROUTES = {
  '/': {
    type: 'website',
    id: {
      title: 'Maldy Rais — Tutor Bahasa Jepang & Kreator Visual',
      description: 'Portfolio Maldy Rais, tutor bahasa Jepang dan kreator visual yang berkarya dalam desain, fotografi, serta pengalaman web interaktif.',
      heading: 'Maldy Rais',
      summary: 'Tutor bahasa Jepang dan kreator visual yang berkarya dalam desain, fotografi, dan pengalaman web interaktif.',
    },
    en: {
      title: 'Maldy Rais — Japanese Tutor & Visual Creator',
      description: 'Portfolio of Maldy Rais, a Japanese language tutor and visual creator working across design, photography, and interactive web experiences.',
      heading: 'Maldy Rais',
      summary: 'A Japanese language tutor and visual creator working across design, photography, and interactive web experiences.',
    },
    ja: {
      title: 'Maldy Rais — 日本語チューター・ビジュアルクリエイター',
      description: '日本語教育、デザイン、写真、インタラクティブWeb制作に取り組むMaldy Raisのポートフォリオ。',
      heading: 'Maldy Rais',
      summary: '日本語教育、デザイン、写真、インタラクティブWeb制作に取り組むポートフォリオです。',
    },
  },
  '/about': {
    type: 'profile',
    id: {
      title: 'Tentang Maldy Rais — Tutor Bahasa Jepang & Kreator Visual',
      description: 'Kenali Maldy Rais lebih jauh: perjalanan, pengalaman, minat, dan karya di bidang bahasa Jepang, desain, fotografi, serta web interaktif.',
      heading: 'Tentang Maldy Rais',
      summary: 'Profil, perjalanan, pengalaman, minat, dan aktivitas Maldy Rais di bidang bahasa Jepang, desain, fotografi, serta web interaktif.',
    },
    en: {
      title: 'About Maldy Rais — Japanese Tutor & Visual Creator',
      description: 'Learn more about Maldy Rais, his experience, interests, and work across Japanese language education, design, photography, and interactive web.',
      heading: 'About Maldy Rais',
      summary: 'Profile, experience, interests, and activities across Japanese language education, design, photography, and interactive web.',
    },
    ja: {
      title: 'Maldy Raisについて — 日本語・デザイン・写真・Web',
      description: 'Maldy Raisの経験、興味、活動について。日本語教育、デザイン、写真、インタラクティブWebの分野で活動しています。',
      heading: 'Maldy Raisについて',
      summary: '日本語教育、デザイン、写真、インタラクティブWebに関する経験、興味、活動を紹介します。',
    },
  },
  '/works': {
    type: 'website',
    id: {
      title: 'Karya Maldy Rais — Desain, Fotografi & Web Interaktif',
      description: 'Kumpulan karya pilihan Maldy Rais dalam desain visual, fotografi, materi bahasa Jepang, dan pengalaman web interaktif.',
      heading: 'Karya Maldy Rais',
      summary: 'Kumpulan karya dalam desain visual, fotografi, materi bahasa Jepang, dan pengalaman web interaktif.',
    },
    en: {
      title: 'Works by Maldy Rais — Design, Photography & Interactive Web',
      description: 'Selected works by Maldy Rais across visual design, photography, Japanese learning materials, and interactive web experiences.',
      heading: 'Works by Maldy Rais',
      summary: 'Selected work across visual design, photography, Japanese learning materials, and interactive web experiences.',
    },
    ja: {
      title: 'Maldy Raisの作品 — デザイン・写真・インタラクティブWeb',
      description: 'ビジュアルデザイン、写真、日本語学習コンテンツ、インタラクティブWebを中心としたMaldy Raisの作品集。',
      heading: 'Maldy Raisの作品',
      summary: 'ビジュアルデザイン、写真、日本語学習コンテンツ、インタラクティブWebの作品を紹介します。',
    },
  },
}

const privateRoutes = ['/admin', '/admin/login']

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))]
}

function normalizeContentPath(path = '/') {
  if (!path || path === '/') return '/'
  return `/${String(path).replace(/^\/+|\/+$/g, '')}`
}

function localizedPath(contentPath, language) {
  const clean = normalizeContentPath(contentPath)
  return clean === '/' ? `/${language}/` : `/${language}${clean}/`
}

function localizedUrl(contentPath, language) {
  return `${SITE_URL}${localizedPath(contentPath, language)}`
}

function alternateMarkup(contentPath) {
  const clean = normalizeContentPath(contentPath)
  return [
    ...LANGUAGES.map((language) => (
      `<link rel="alternate" hreflang="${language}" href="${localizedUrl(clean, language)}">`
    )),
    `<link rel="alternate" hreflang="x-default" href="${localizedUrl(clean, DEFAULT_LANGUAGE)}">`,
  ].join('\n    ')
}

function localized(row, field, language, fallback = '') {
  return (
    row?.[`${field}_${language}`]
    || row?.[`${field}_id`]
    || row?.[`${field}_en`]
    || row?.[`${field}_ja`]
    || fallback
  )
}

async function readEnvFile() {
  try {
    const raw = await readFile(new URL('../.env', import.meta.url), 'utf8')
    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const separator = line.indexOf('=')
          const key = line.slice(0, separator).trim()
          const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
          return [key, value]
        }),
    )
  } catch {
    return {}
  }
}

async function loadPublicSnapshot() {
  const fileEnv = await readEnvFile()
  const supabaseUrl = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return { supabaseUrl: '', profile: null, activities: [], works: [] }
  }

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  }

  const get = async (path) => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  }

  const [profileRows, activities, works] = await Promise.all([
    get('profile?id=eq.1&is_published=eq.true&select=name,name_ja,bio_id,bio_en,bio_ja,location,roles,interests,instagram_url,behance_url,github_url,linkedin_url,updated_at'),
    get('activities?is_published=eq.true&select=id,slug,title_id,title_en,title_ja,role_id,role_en,role_ja,summary_id,summary_en,summary_ja,description_id,description_en,description_ja,start_date,end_date,location,activity_type,cover_path,cover_url,updated_at&order=start_date.desc&limit=1000'),
    get('works?is_published=eq.true&select=id,slug,title_id,title_en,title_ja,description_id,description_en,description_ja,project_start_date,project_end_date,image_path,image_url,external_url,updated_at&order=project_sort_date.desc.nullslast&limit=1000'),
  ])

  return {
    supabaseUrl,
    profile: Array.isArray(profileRows) ? profileRows[0] ?? null : null,
    activities: Array.isArray(activities) ? activities : [],
    works: Array.isArray(works) ? works : [],
  }
}

function personSchema(copy, snapshot, language) {
  const profile = snapshot.profile
  const personId = `${SITE_URL}/#person`
  const sameAs = [
    profile?.instagram_url,
    profile?.behance_url,
    profile?.github_url,
    profile?.linkedin_url,
  ].filter(Boolean)
  const roles = uniqueStrings(profile?.roles)
  const interests = uniqueStrings(profile?.interests)

  const person = {
    '@type': 'Person',
    '@id': personId,
    name: profile?.name || 'Maldy Rais',
    url: `${SITE_URL}/id/about/`,
    description: localized(profile, 'bio', language, copy.description),
    image: DEFAULT_SOCIAL_IMAGE,
    jobTitle: roles.length ? roles : ['Japanese Language Tutor', 'Visual Creator'],
    knowsAbout: interests.length
      ? interests
      : ['Japanese language education', 'Visual design', 'Photography', 'Interactive web design'],
    inLanguage: LANGUAGE[language].tag,
  }

  if (sameAs.length) person.sameAs = sameAs
  if (profile?.location) person.homeLocation = { '@type': 'Place', name: profile.location }

  return person
}

function breadcrumbSchema(contentPath, copy, language) {
  const clean = normalizeContentPath(contentPath)
  if (clean === '/') return null

  return {
    '@type': 'BreadcrumbList',
    '@id': `${localizedUrl(clean, language)}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: LANGUAGE[language].home,
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

function schemaFor(contentPath, copy, snapshot, language) {
  const clean = normalizeContentPath(contentPath)
  const personId = `${SITE_URL}/#person`
  const person = personSchema(copy, snapshot, language)
  const breadcrumb = breadcrumbSchema(clean, copy, language)
  const websiteId = `${localizedUrl('/', language)}#website`

  if (clean === '/') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': websiteId,
          url: localizedUrl('/', language),
          name: 'Maldy Rais',
          inLanguage: LANGUAGE[language].tag,
          publisher: { '@id': personId },
        },
        person,
      ],
    }
  }

  if (clean === '/about') {
    const page = {
      '@type': 'ProfilePage',
      '@id': `${localizedUrl('/about', language)}#profile`,
      url: localizedUrl('/about', language),
      name: copy.title,
      description: copy.description,
      inLanguage: LANGUAGE[language].tag,
      mainEntity: person,
      isPartOf: { '@id': websiteId },
    }

    if (snapshot.profile?.updated_at) page.dateModified = snapshot.profile.updated_at

    return {
      '@context': 'https://schema.org',
      '@graph': [page, person, breadcrumb].filter(Boolean),
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
          inLanguage: LANGUAGE[language].tag,
          creator: { '@id': personId },
          about: { '@id': personId },
          isPartOf: { '@id': websiteId },
        },
        person,
        breadcrumb,
      ].filter(Boolean),
    }
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: localizedUrl(clean, language),
    name: copy.title,
    description: copy.description,
    inLanguage: LANGUAGE[language].tag,
    author: { '@id': personId },
  }
}

function stripSeoHead(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']author["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:[^"']+["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']alternate["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']preload["'][^>]*>/gi, '')
    .replace(/<script[^>]+id=["']maldy-static-jsonld["'][^>]*>[\s\S]*?<\/script>/gi, '')
}

function setHtmlLanguage(html, language) {
  const lang = LANGUAGE[language]?.tag || LANGUAGE.id.tag
  return html.replace(/<html\b([^>]*)\blang=["'][^"']*["']([^>]*)>/i, `<html$1lang="${lang}"$2>`)
}

function formatDateRange(start, end) {
  if (!start && !end) return ''
  if (start && end && start !== end) return `${start} – ${end}`
  return start || end || ''
}

function noScriptFallback(contentPath, copy, snapshot, language) {
  const labels = LANGUAGE[language]
  const profile = snapshot.profile
  const intro = localized(profile, 'bio', language, copy.summary)
  let extra = ''

  if (contentPath === '/about' && snapshot.activities.length) {
    const items = snapshot.activities.map((activity) => {
      const role = localized(activity, 'role', language, '')
      const meta = [role, formatDateRange(activity.start_date, activity.end_date), activity.location]
        .filter(Boolean)
        .join(' · ')
      const detail = localized(activity, 'description', language, localized(activity, 'summary', language, ''))
      const title = localized(activity, 'title', language, labels.experienceHeading)
      const heading = activity.slug
        ? `<h3><a href="${localizedPath(`/about/activity/${activity.slug}`, language)}">${escapeHtml(title)}</a></h3>`
        : `<h3>${escapeHtml(title)}</h3>`
      return `<li><article>${heading}${meta ? `<p>${escapeHtml(meta)}</p>` : ''}${detail ? `<p>${escapeHtml(detail)}</p>` : ''}</article></li>`
    }).join('')

    extra = `<section><h2>${escapeHtml(labels.experienceHeading)}</h2><ul>${items}</ul></section>`
  }

  if (contentPath === '/works' && snapshot.works.length) {
    const items = snapshot.works.map((work) => {
      const date = formatDateRange(work.project_start_date, work.project_end_date)
      const title = localized(work, 'title', language, labels.worksHeading)
      const description = localized(work, 'description', language, '')
      const heading = work.slug
        ? `<h2><a href="${localizedPath(`/works/${work.slug}`, language)}">${escapeHtml(title)}</a></h2>`
        : `<h2>${escapeHtml(title)}</h2>`
      return `<li><article>${heading}${date ? `<p>${escapeHtml(date)}</p>` : ''}${description ? `<p>${escapeHtml(description)}</p>` : ''}</article></li>`
    }).join('')

    extra = `<section><h2>${escapeHtml(labels.worksHeading)}</h2><ul>${items}</ul></section>`
  }

  return `<noscript>
      <main class="seo-fallback" aria-label="${escapeHtml(copy.heading)}">
        <h1>${escapeHtml(copy.heading)}</h1>
        <p>${escapeHtml(intro)}</p>
        ${extra}
        <nav>
          <a href="${localizedPath('/', language)}">${escapeHtml(labels.home)}</a>
          <a href="${localizedPath('/about', language)}">${escapeHtml(labels.about)}</a>
          <a href="${localizedPath('/works', language)}">${escapeHtml(labels.works)}</a>
          <a href="${NIHONGO_URL}">Nihongo Gakushū</a>
        </nav>
      </main>
    </noscript>`
}

function injectPublicHead(html, contentPath, snapshot, language) {
  const route = ROUTES[contentPath]
  const copy = route[language]
  const url = localizedUrl(contentPath, language)
  const schema = JSON.stringify(schemaFor(contentPath, copy, snapshot, language)).replace(/</g, '\\u003c')
  const homePreload = contentPath === '/'
    ? '<link rel="preload" as="image" href="/hero/maldy-character.webp" type="image/webp" fetchpriority="high">'
    : ''

  const tags = `
    <title>${escapeHtml(copy.title)}</title>
    <meta name="description" content="${escapeHtml(copy.description)}">
    <meta name="author" content="Maldy Rais">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${url}">
    ${alternateMarkup(contentPath)}
    ${homePreload}
    <meta property="og:type" content="${route.type}">
    <meta property="og:site_name" content="Maldy Rais">
    <meta property="og:title" content="${escapeHtml(copy.title)}">
    <meta property="og:description" content="${escapeHtml(copy.description)}">
    <meta property="og:url" content="${url}">
    <meta property="og:locale" content="${LANGUAGE[language].og}">
    <meta property="og:image" content="${DEFAULT_SOCIAL_IMAGE}">
    <meta property="og:image:width" content="1254">
    <meta property="og:image:height" content="1254">
    <meta property="og:image:alt" content="Maldy Rais">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(copy.title)}">
    <meta name="twitter:description" content="${escapeHtml(copy.description)}">
    <meta name="twitter:image" content="${DEFAULT_SOCIAL_IMAGE}">
    <script id="maldy-static-jsonld" type="application/ld+json">${schema}</script>`

  return setHtmlLanguage(
    stripSeoHead(html)
      .replace('</head>', `${tags}\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root"></div>\n    ${noScriptFallback(contentPath, copy, snapshot, language)}`),
    language,
  )
}

function injectPrivateHead(html) {
  const tags = `
    <title>Admin — Maldy Rais</title>
    <meta name="robots" content="noindex, nofollow, noarchive">`

  return stripSeoHead(html).replace('</head>', `${tags}\n  </head>`)
}

function trimMetaDescription(value, fallback) {
  const text = String(value || fallback || '').replace(/\s+/g, ' ').trim()
  if (text.length <= 180) return text
  return `${text.slice(0, 177).trimEnd()}…`
}

function publicWorkImageUrl(work, supabaseUrl) {
  if (work?.image_url) return work.image_url
  if (!work?.image_path || !supabaseUrl) return DEFAULT_SOCIAL_IMAGE

  const encodedPath = String(work.image_path)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')

  return `${supabaseUrl}/storage/v1/object/public/works/${encodedPath}`
}

function workStaticSchema(work, snapshot, title, description, imageUrl, language) {
  const contentPath = `/works/${work.slug}`
  const url = localizedUrl(contentPath, language)
  const labels = LANGUAGE[language]
  const person = personSchema({ description }, snapshot, language)

  const creativeWork = {
    '@type': 'CreativeWork',
    '@id': `${url}#work`,
    url,
    name: title,
    description,
    inLanguage: labels.tag,
    creator: { '@id': `${SITE_URL}/#person` },
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
          { '@type': 'ListItem', position: 1, name: labels.home, item: localizedUrl('/', language) },
          { '@type': 'ListItem', position: 2, name: labels.works, item: localizedUrl('/works', language) },
          { '@type': 'ListItem', position: 3, name: title, item: url },
        ],
      },
    ],
  }
}

function injectWorkHead(html, work, snapshot, language) {
  const labels = LANGUAGE[language]
  const title = localized(work, 'title', language, labels.worksHeading)
  const description = trimMetaDescription(
    localized(work, 'description', language, ''),
    labels.workFallback(title),
  )
  const contentPath = `/works/${work.slug}`
  const url = localizedUrl(contentPath, language)
  const imageUrl = publicWorkImageUrl(work, snapshot.supabaseUrl)
  const pageTitle = `${title} — ${labels.workSuffix}`
  const schema = JSON.stringify(
    workStaticSchema(work, snapshot, title, description, imageUrl, language),
  ).replace(/</g, '\\u003c')

  const tags = `
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="author" content="Maldy Rais">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${url}">
    ${alternateMarkup(contentPath)}
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Maldy Rais">
    <meta property="og:title" content="${escapeHtml(pageTitle)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${url}">
    <meta property="og:locale" content="${labels.og}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    <script id="maldy-static-jsonld" type="application/ld+json">${schema}</script>`

  const date = formatDateRange(work.project_start_date, work.project_end_date)
  const fallback = `<noscript>
      <main class="seo-fallback" aria-label="${escapeHtml(title)}">
        <p><a href="${localizedPath('/works', language)}">← ${escapeHtml(labels.allWorks)}</a></p>
        <article>
          <h1>${escapeHtml(title)}</h1>
          ${date ? `<p>${escapeHtml(date)}</p>` : ''}
          ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}">` : ''}
          <p>${escapeHtml(description)}</p>
          ${work.external_url ? `<p><a href="${escapeHtml(work.external_url)}">${escapeHtml(labels.works)}</a></p>` : ''}
        </article>
      </main>
    </noscript>`

  return setHtmlLanguage(
    stripSeoHead(html)
      .replace('</head>', `${tags}\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root"></div>\n    ${fallback}`),
    language,
  )
}

function publicActivityImageUrl(activity, supabaseUrl) {
  if (activity?.cover_url) return activity.cover_url
  if (!activity?.cover_path || !supabaseUrl) return DEFAULT_SOCIAL_IMAGE

  const encodedPath = String(activity.cover_path)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')

  return `${supabaseUrl}/storage/v1/object/public/portfolio-assets/${encodedPath}`
}

function activityStaticSchema(activity, snapshot, title, description, imageUrl, language) {
  const contentPath = `/about/activity/${activity.slug}`
  const url = localizedUrl(contentPath, language)
  const labels = LANGUAGE[language]
  const person = personSchema({ description }, snapshot, language)

  const page = {
    '@type': 'WebPage',
    '@id': `${url}#page`,
    url,
    name: title,
    description,
    inLanguage: labels.tag,
    about: { '@id': `${SITE_URL}/#person` },
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
          { '@type': 'ListItem', position: 1, name: labels.home, item: localizedUrl('/', language) },
          { '@type': 'ListItem', position: 2, name: labels.about, item: localizedUrl('/about', language) },
          { '@type': 'ListItem', position: 3, name: title, item: url },
        ],
      },
    ],
  }
}

function injectActivityHead(html, activity, snapshot, language) {
  const labels = LANGUAGE[language]
  const title = localized(activity, 'title', language, labels.experienceHeading)
  const description = trimMetaDescription(
    localized(
      activity,
      'description',
      language,
      localized(activity, 'summary', language, ''),
    ),
    labels.activityFallback(title),
  )
  const contentPath = `/about/activity/${activity.slug}`
  const url = localizedUrl(contentPath, language)
  const imageUrl = publicActivityImageUrl(activity, snapshot.supabaseUrl)
  const pageTitle = `${title} — ${labels.activitySuffix}`
  const schema = JSON.stringify(
    activityStaticSchema(activity, snapshot, title, description, imageUrl, language),
  ).replace(/</g, '\\u003c')

  const meta = [
    localized(activity, 'role', language, ''),
    formatDateRange(activity.start_date, activity.end_date),
    activity.location,
    activity.activity_type,
  ].filter(Boolean).join(' · ')

  const tags = `
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="author" content="Maldy Rais">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${url}">
    ${alternateMarkup(contentPath)}
    <meta property="og:type" content="profile">
    <meta property="og:site_name" content="Maldy Rais">
    <meta property="og:title" content="${escapeHtml(pageTitle)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${url}">
    <meta property="og:locale" content="${labels.og}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    <script id="maldy-static-jsonld" type="application/ld+json">${schema}</script>`

  const fallback = `<noscript>
      <main class="seo-fallback" aria-label="${escapeHtml(title)}">
        <p><a href="${localizedPath('/about', language)}">← ${escapeHtml(labels.aboutBack)}</a></p>
        <article>
          <h1>${escapeHtml(title)}</h1>
          ${meta ? `<p>${escapeHtml(meta)}</p>` : ''}
          ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}">` : ''}
          <p>${escapeHtml(description)}</p>
        </article>
      </main>
    </noscript>`

  return setHtmlLanguage(
    stripSeoHead(html)
      .replace('</head>', `${tags}\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root"></div>\n    ${fallback}`),
    language,
  )
}

function nihongoRedirectPage(language) {
  const labels = LANGUAGE[language]
  return `<!doctype html>
<html lang="${labels.tag}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${NIHONGO_URL}">
  <meta http-equiv="refresh" content="0; url=${NIHONGO_URL}">
  <title>Nihongo Gakushū — Maldy Rais</title>
</head>
<body>
  <main>
    <h1>Nihongo Gakushū</h1>
    <p>${escapeHtml(labels.redirect)}</p>
    <p><a href="${NIHONGO_URL}">Nihongo Gakushū ↗</a></p>
  </main>
</body>
</html>`
}

function legacyRedirectPage(contentPath, title = 'Maldy Rais') {
  const target = localizedUrl(contentPath, DEFAULT_LANGUAGE)
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${target}">
  ${alternateMarkup(contentPath)}
  <meta http-equiv="refresh" content="0; url=${target}">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <main>
    <p><a href="${target}">Lanjut ke halaman portfolio →</a></p>
  </main>
</body>
</html>`
}

function rootGatewayPage() {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${localizedUrl('/', DEFAULT_LANGUAGE)}">
  ${alternateMarkup('/')}
  <title>Maldy Rais</title>
  <script>
    (() => {
      const supported = ['id', 'en', 'ja'];
      let language = 'id';

      try {
        const saved = localStorage.getItem('maldy-portfolio-language');
        if (supported.includes(saved)) language = saved;
        else {
          const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
          const match = locales
            .map((value) => String(value || '').toLowerCase())
            .find((value) => supported.some((code) => value.startsWith(code)));
          if (match) language = supported.find((code) => match.startsWith(code)) || 'id';
        }
      } catch {}

      location.replace('/' + language + '/' + location.search + location.hash);
    })();
  </script>
</head>
<body>
  <main>
    <h1>Maldy Rais</h1>
    <p>Pilih bahasa / Choose a language / 言語を選択</p>
    <nav>
      <a href="/id/">Indonesia</a>
      <a href="/en/">English</a>
      <a href="/ja/">日本語</a>
    </nav>
  </main>
</body>
</html>`
}

async function writeRoute(path, html) {
  const clean = path.replace(/^\/+|\/+$/g, '')
  const target = clean
    ? new URL(`../dist/${clean}/index.html`, import.meta.url)
    : new URL('../dist/index.html', import.meta.url)

  await mkdir(new URL('.', target), { recursive: true })
  await writeFile(target, html, 'utf8')
}

const baseHtml = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const snapshot = await loadPublicSnapshot()
const publishedWorks = snapshot.works.filter((work) => work?.slug)
const publishedActivities = snapshot.activities.filter((activity) => activity?.slug)

for (const language of LANGUAGES) {
  for (const contentPath of Object.keys(ROUTES)) {
    await writeRoute(
      localizedPath(contentPath, language),
      injectPublicHead(baseHtml, contentPath, snapshot, language),
    )
  }

  for (const work of publishedWorks) {
    await writeRoute(
      localizedPath(`/works/${work.slug}`, language),
      injectWorkHead(baseHtml, work, snapshot, language),
    )
  }

  for (const activity of publishedActivities) {
    await writeRoute(
      localizedPath(`/about/activity/${activity.slug}`, language),
      injectActivityHead(baseHtml, activity, snapshot, language),
    )
  }

  await writeRoute(
    localizedPath('/nihongo-gakushu', language),
    nihongoRedirectPage(language),
  )
}

for (const path of privateRoutes) {
  await writeRoute(path, injectPrivateHead(baseHtml))
}

// Root becomes x-default language gateway.
await writeRoute('/', rootGatewayPage())

// Keep old public URLs working while search engines move to /id/, /en/, /ja/.
await writeRoute('/about', legacyRedirectPage('/about', 'Tentang Maldy Rais'))
await writeRoute('/works', legacyRedirectPage('/works', 'Karya Maldy Rais'))
await writeRoute('/nihongo-gakushu', nihongoRedirectPage(DEFAULT_LANGUAGE))

for (const work of publishedWorks) {
  await writeRoute(
    `/works/${work.slug}`,
    legacyRedirectPage(`/works/${work.slug}`, localized(work, 'title', 'id', 'Karya Maldy Rais')),
  )
}

for (const activity of publishedActivities) {
  await writeRoute(
    `/about/activity/${activity.slug}`,
    legacyRedirectPage(
      `/about/activity/${activity.slug}`,
      localized(activity, 'title', 'id', 'Aktivitas Maldy Rais'),
    ),
  )
}

const robots = `User-agent: *
Allow: /
Disallow: /admin/

User-agent: OAI-SearchBot
Allow: /
Disallow: /admin/

Sitemap: ${SITE_URL}/sitemap.xml
`
await writeFile(new URL('../dist/robots.txt', import.meta.url), robots, 'utf8')

const sitemapContentPaths = [
  '/',
  '/about',
  '/works',
  ...publishedWorks.map((work) => `/works/${work.slug}`),
  ...publishedActivities.map((activity) => `/about/activity/${activity.slug}`),
]

const sitemapUrls = sitemapContentPaths
  .flatMap((contentPath) => (
    LANGUAGES.map((language) => {
      const url = localizedUrl(contentPath, language)
      const alternateLinks = [
        ...LANGUAGES.map((alternateLanguage) => (
          `    <xhtml:link rel="alternate" hreflang="${alternateLanguage}" href="${escapeXml(localizedUrl(contentPath, alternateLanguage))}" />`
        )),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localizedUrl(contentPath, DEFAULT_LANGUAGE))}" />`,
      ].join('\n')

      return `  <url>
    <loc>${escapeXml(url)}</loc>
${alternateLinks}
  </url>`
    })
  ))
  .join('\n')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapUrls}
</urlset>
`
await writeFile(new URL('../dist/sitemap.xml', import.meta.url), sitemap, 'utf8')

const workLines = publishedWorks
  .map((work) => {
    const title = localized(work, 'title', 'en', localized(work, 'title', 'id', 'Work'))
    return `- ${localizedUrl(`/works/${work.slug}`, 'en')} — ${title}`
  })
  .join('\n')

const activityLines = publishedActivities
  .map((activity) => {
    const title = localized(activity, 'title', 'en', localized(activity, 'title', 'id', 'Activity'))
    return `- ${localizedUrl(`/about/activity/${activity.slug}`, 'en')} — ${title}`
  })
  .join('\n')

const llms = `# Maldy Rais

> Multilingual portfolio of Maldy Rais, a Japanese language tutor and visual creator working across design, photography, Japanese learning materials, and interactive web experiences.

## Language homes
- ${localizedUrl('/', 'id')} — Bahasa Indonesia
- ${localizedUrl('/', 'en')} — English
- ${localizedUrl('/', 'ja')} — 日本語

## Main pages
- ${localizedUrl('/about', 'id')} — Tentang Maldy Rais
- ${localizedUrl('/about', 'en')} — About Maldy Rais
- ${localizedUrl('/about', 'ja')} — Maldy Raisについて
- ${localizedUrl('/works', 'id')} — Karya
- ${localizedUrl('/works', 'en')} — Works
- ${localizedUrl('/works', 'ja')} — 作品
- ${NIHONGO_URL} — Standalone Japanese language learning project

## Published works (English alternate)
${workLines || '- No published works yet'}

## Published activities (English alternate)
${activityLines || '- No published activities yet'}
`
await writeFile(new URL('../dist/llms.txt', import.meta.url), llms, 'utf8')

await writeFile(new URL('../dist/.nojekyll', import.meta.url), '', 'utf8')

const notFound = `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, follow">
  <title>404 — Maldy Rais</title>
</head>
<body>
  <main>
    <h1>404</h1>
    <p>Halaman yang kamu cari tidak ditemukan.</p>
    <p><a href="/id/">Indonesia</a> · <a href="/en/">English</a> · <a href="/ja/">日本語</a></p>
  </main>
</body>
</html>`
await writeFile(new URL('../dist/404.html', import.meta.url), notFound, 'utf8')

console.log('Multilingual SEO postbuild complete.')
console.log(
  `Generated 3 language variants for ${publishedWorks.length} works and ${publishedActivities.length} activities.`,
)
