import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  contentPathFromPathname,
  languageFromPath,
  localizePath,
} from './routes'

const STORAGE_KEY = 'maldy-portfolio-language'

const translations = {
  id: {
    'nav.works': 'Karya',
    'nav.about': 'Tentang',
    'nav.main': 'Navigasi utama',
    'nav.language': 'Pilih bahasa',

    'hero.eyebrow': 'Graphic Design · Japanese · Interactive Web',
    'hero.description': 'Desainer grafis dan tutor bahasa Jepang yang suka membuat visual, materi ajar, fotografi, serta pengalaman web interaktif.',
    'hero.cta': 'Yuk kenalan',
    'hero.cardKicker': 'Creative portfolio',
    'hero.cardTitle': 'Visual yang menyampaikan pesan.',

    'aboutPreview.kicker': '01 / ABOUT PREVIEW',
    'aboutPreview.heading': 'Halo, saya {name}.',
    'aboutPreview.fallbackBio': 'Mahasiswa Bahasa dan Sastra Jepang, tutor bahasa Jepang, serta kreator visual yang tertarik pada desain media sosial, fotografi, dan pengalaman web interaktif.',
    'aboutPreview.cta': 'Kenal lebih jauh',

    'selectedWorks.kicker': '02 / SELECTED WORKS',
    'selectedWorks.heading': 'Karya pilihan.',
    'selectedWorks.hint': 'Hover untuk melihat judul. Klik untuk membuka detail.',
    'selectedWorks.loading': 'Memuat karya…',
    'selectedWorks.error': 'Karya belum bisa dimuat. Coba lagi beberapa saat lagi.',
    'selectedWorks.empty': 'Belum ada karya yang dipilih untuk tampil di Home.',
    'selectedWorks.noImage': 'Belum ada gambar',
    'selectedWorks.openDetail': 'Buka detail {title}',

    'more.kicker': '03 / MORE ABOUT ME',
    'more.heading': 'Masuk lebih jauh.',
    'more.about.title': 'Tentang Saya',
    'more.about.subtitle': 'Kenalan lebih jauh dengan Maldy Rais.',
    'more.nihongo.title': 'Nihongo Gakushū',
    'more.nihongo.subtitle': 'Project belajar bahasa Jepang yang berdiri sendiri.',
    'more.works.title': 'Karya Saya',
    'more.works.subtitle': 'Jelajahi desain, fotografi, dan proyek interaktif.',
    'more.open': 'Buka',
    'more.visit': 'Kunjungi',

    'contact.kicker': '04 / CONTACT',
    'contact.thanks': 'Terima kasih sudah mampir.',
    'contact.empty': 'Tautan kontak belum tersedia.',

    'about.kicker': 'ABOUT / 自己紹介',
    'about.tools': 'TOOLS',
    'about.japanese': 'JAPANESE',
    'about.interests': 'INTERESTS',
    'about.learning': 'Sedang belajar.',
    'about.activityKicker': 'ACTIVITY / JOURNEY',
    'about.activityHeading': 'Perjalanan yang saling terhubung.',
    'about.activityDescription': 'Aktivitas ditempatkan berdasarkan waktu mulainya. Garis menghubungkan kegiatan dengan organisasi atau aktivitas induknya, walaupun terjadi di tahun berbeda.',
    'about.loadingJourney': 'Memuat perjalanan…',
    'about.viewCv': 'Lihat CV ↗',

    'activity.empty': 'Aktivitas belum ditambahkan.',
    'activity.fallback': 'Aktivitas',
    'activity.groupFallback': 'Group',
    'activity.type': 'Tipe',
    'activity.location': 'Lokasi',
    'activity.connected': 'Terhubung',
    'activity.close': 'Tutup',
    'activity.relatedWorks': 'Karya terkait',
    'activity.worksFromActivity': 'Karya dari aktivitas ini',
    'activity.fanHint': 'Klik kartu untuk membuka detail · klik folder untuk menutup',
    'activity.viewAll': 'Lihat semua',
    'activity.relatedWorksHeading': 'RELATED WORKS',

    'works.back': '← Home',
    'works.kicker': 'WORKS / 作品',
    'works.heading': 'Karya saya.',
    'works.description': 'Desain, materi ajar, fotografi, dan eksperimen interaktif — terbaru lebih dulu.',
    'works.filterLabel': 'Filter kategori karya',
    'works.all': 'Semua',
    'works.latest': 'Terbaru ↓',
    'works.loading': 'Memuat karya…',
    'works.error': 'Karya belum bisa dimuat.',
    'works.loadError': 'Gagal memuat karya berikutnya.',
    'works.empty': 'Belum ada karya di kategori ini.',
    'works.loadMore': 'Muat lebih banyak',
    'works.loadingMore': 'Memuat…',
    'works.noImage': 'Belum ada gambar',
    'works.openDetail': 'Buka detail {title}',

    'work.untitled': 'Tanpa judul',
    'work.categoryFallback': 'Karya',
    'work.noDescription': 'Belum ada deskripsi.',
    'work.noImage': 'Belum ada gambar',
    'work.preview': 'Preview {title}',
    'work.viewImage': 'Lihat gambar',
    'work.viewWork': 'Lihat karya',
    'work.close': 'Tutup',
    'work.viewerLabel': 'Lihat gambar {title}',
    'work.zoomOut': 'Perkecil gambar',
    'work.zoomIn': 'Perbesar gambar',
    'work.closeViewer': 'Tutup tampilan gambar',

    'nihongo.opening': 'Membuka Nihongo Gakushū…',
    'nihongo.description': 'Project Nihongo Gakushū berada di website terpisah.',
  },

  en: {
    'nav.works': 'Works',
    'nav.about': 'About',
    'nav.main': 'Main navigation',
    'nav.language': 'Choose language',

    'hero.eyebrow': 'Graphic Design · Japanese · Interactive Web',
    'hero.description': 'A graphic designer and Japanese language tutor who enjoys creating visuals, learning materials, photography, and interactive web experiences.',
    'hero.cta': 'Let’s get acquainted',
    'hero.cardKicker': 'Creative portfolio',
    'hero.cardTitle': 'Visuals that communicate.',

    'aboutPreview.kicker': '01 / ABOUT PREVIEW',
    'aboutPreview.heading': 'Hi, I’m {name}.',
    'aboutPreview.fallbackBio': 'A Japanese Language and Literature student, Japanese language tutor, and visual creator interested in social media design, photography, and interactive web experiences.',
    'aboutPreview.cta': 'Get to know me',

    'selectedWorks.kicker': '02 / SELECTED WORKS',
    'selectedWorks.heading': 'Selected works.',
    'selectedWorks.hint': 'Hover to see the title. Click to open details.',
    'selectedWorks.loading': 'Loading works…',
    'selectedWorks.error': 'Works could not be loaded right now. Please try again shortly.',
    'selectedWorks.empty': 'No works have been selected for the Home page yet.',
    'selectedWorks.noImage': 'No image yet',
    'selectedWorks.openDetail': 'Open details for {title}',

    'more.kicker': '03 / MORE ABOUT ME',
    'more.heading': 'Explore further.',
    'more.about.title': 'About Me',
    'more.about.subtitle': 'Get to know Maldy Rais a little better.',
    'more.nihongo.title': 'Nihongo Gakushū',
    'more.nihongo.subtitle': 'A standalone Japanese-learning project.',
    'more.works.title': 'My Works',
    'more.works.subtitle': 'Explore design, photography, and interactive projects.',
    'more.open': 'Open',
    'more.visit': 'Visit',

    'contact.kicker': '04 / CONTACT',
    'contact.thanks': 'Thanks for stopping by.',
    'contact.empty': 'Contact links are not available yet.',

    'about.kicker': 'ABOUT / 自己紹介',
    'about.tools': 'TOOLS',
    'about.japanese': 'JAPANESE',
    'about.interests': 'INTERESTS',
    'about.learning': 'Still learning.',
    'about.activityKicker': 'ACTIVITY / JOURNEY',
    'about.activityHeading': 'A journey with connected paths.',
    'about.activityDescription': 'Activities are placed by their starting date. Lines connect each activity to its organization or parent activity, even across different years.',
    'about.loadingJourney': 'Loading journey…',
    'about.viewCv': 'View CV ↗',

    'activity.empty': 'No activities have been added yet.',
    'activity.fallback': 'Activity',
    'activity.groupFallback': 'Group',
    'activity.type': 'Type',
    'activity.location': 'Location',
    'activity.connected': 'Connected to',
    'activity.close': 'Close',
    'activity.relatedWorks': 'Related works',
    'activity.worksFromActivity': 'Works from this activity',
    'activity.fanHint': 'Click a card to open details · click the folder to close',
    'activity.viewAll': 'View all',
    'activity.relatedWorksHeading': 'RELATED WORKS',

    'works.back': '← Home',
    'works.kicker': 'WORKS / 作品',
    'works.heading': 'My works.',
    'works.description': 'Design, learning materials, photography, and interactive experiments — newest first.',
    'works.filterLabel': 'Filter work categories',
    'works.all': 'All',
    'works.latest': 'Newest ↓',
    'works.loading': 'Loading works…',
    'works.error': 'Works could not be loaded.',
    'works.loadError': 'Could not load more works.',
    'works.empty': 'There are no works in this category yet.',
    'works.loadMore': 'Load more',
    'works.loadingMore': 'Loading…',
    'works.noImage': 'No image yet',
    'works.openDetail': 'Open details for {title}',

    'work.untitled': 'Untitled',
    'work.categoryFallback': 'Work',
    'work.noDescription': 'No description yet.',
    'work.noImage': 'No image yet',
    'work.preview': 'Preview {title}',
    'work.viewImage': 'View image',
    'work.viewWork': 'View work',
    'work.close': 'Close',
    'work.viewerLabel': 'View image {title}',
    'work.zoomOut': 'Zoom out',
    'work.zoomIn': 'Zoom in',
    'work.closeViewer': 'Close image viewer',

    'nihongo.opening': 'Opening Nihongo Gakushū…',
    'nihongo.description': 'Nihongo Gakushū lives on a separate website.',
  },

  ja: {
    'nav.works': '作品',
    'nav.about': '自己紹介',
    'nav.main': 'メインナビゲーション',
    'nav.language': '言語を選択',

    'hero.eyebrow': 'グラフィックデザイン · 日本語 · インタラクティブWeb',
    'hero.description': 'ビジュアル制作、教材、写真、インタラクティブなWeb体験づくりが好きなグラフィックデザイナー兼日本語チューターです。',
    'hero.cta': 'もっと知ってください',
    'hero.cardKicker': 'クリエイティブポートフォリオ',
    'hero.cardTitle': '伝わるビジュアルを。',

    'aboutPreview.kicker': '01 / ABOUT PREVIEW',
    'aboutPreview.heading': 'こんにちは、マルヂィ・ライスです。',
    'aboutPreview.fallbackBio': '日本語・日本文学を学ぶ学生で、日本語チューターとして活動しながら、SNSデザイン、写真、インタラクティブなWeb体験にも取り組んでいます。',
    'aboutPreview.cta': 'もっと知る',

    'selectedWorks.kicker': '02 / SELECTED WORKS',
    'selectedWorks.heading': 'ピックアップ作品。',
    'selectedWorks.hint': 'ホバーでタイトルを表示。クリックで詳細を開きます。',
    'selectedWorks.loading': '作品を読み込み中…',
    'selectedWorks.error': '作品を読み込めませんでした。しばらくしてからもう一度お試しください。',
    'selectedWorks.empty': 'ホームに表示する作品がまだ選択されていません。',
    'selectedWorks.noImage': '画像はまだありません',
    'selectedWorks.openDetail': '{title}の詳細を開く',

    'more.kicker': '03 / MORE ABOUT ME',
    'more.heading': 'もっと見る。',
    'more.about.title': '自己紹介',
    'more.about.subtitle': 'マルヂィ・ライスについて、もう少し詳しく。',
    'more.nihongo.title': 'Nihongo Gakushū',
    'more.nihongo.subtitle': '独立した日本語学習プロジェクトです。',
    'more.works.title': '作品',
    'more.works.subtitle': 'デザイン、写真、インタラクティブ作品をご覧ください。',
    'more.open': '開く',
    'more.visit': '訪問する',

    'contact.kicker': '04 / CONTACT',
    'contact.thanks': '見に来てくれて、ありがとうございます。',
    'contact.empty': 'Admin → ProfileからSNSリンクを追加できます。',

    'about.kicker': 'ABOUT / 自己紹介',
    'about.tools': 'TOOLS',
    'about.japanese': 'JAPANESE',
    'about.interests': 'INTERESTS',
    'about.learning': '勉強中です。',
    'about.activityKicker': 'ACTIVITY / JOURNEY',
    'about.activityHeading': 'つながっていく活動の軌跡。',
    'about.activityDescription': '活動は開始時期に合わせて配置し、年をまたいでも所属先や親となる活動との関係を線で表します。',
    'about.loadingJourney': '活動を読み込み中…',
    'about.viewCv': 'CVを見る ↗',

    'activity.empty': '活動はまだ追加されていません。',
    'activity.fallback': '活動',
    'activity.groupFallback': 'グループ',
    'activity.type': '種類',
    'activity.location': '場所',
    'activity.connected': '関連',
    'activity.close': '閉じる',
    'activity.relatedWorks': '関連作品',
    'activity.worksFromActivity': 'この活動から生まれた作品',
    'activity.fanHint': 'カードをクリックして詳細を表示 · フォルダをクリックして閉じる',
    'activity.viewAll': 'すべて見る',
    'activity.relatedWorksHeading': 'RELATED WORKS',

    'works.back': '← Home',
    'works.kicker': 'WORKS / 作品',
    'works.heading': '作品。',
    'works.description': 'デザイン、教材、写真、インタラクティブな実験作品を新しい順に紹介します。',
    'works.filterLabel': '作品カテゴリーで絞り込む',
    'works.all': 'すべて',
    'works.latest': '新しい順 ↓',
    'works.loading': '作品を読み込み中…',
    'works.error': '作品を読み込めませんでした。',
    'works.loadError': '次の作品を読み込めませんでした。',
    'works.empty': 'このカテゴリーにはまだ作品がありません。',
    'works.loadMore': 'もっと見る',
    'works.loadingMore': '読み込み中…',
    'works.noImage': '画像はまだありません',
    'works.openDetail': '{title}の詳細を開く',

    'work.untitled': '無題',
    'work.categoryFallback': '作品',
    'work.noDescription': '説明はまだありません。',
    'work.noImage': '画像はまだありません',
    'work.preview': '{title}のプレビュー',
    'work.viewImage': '画像を見る',
    'work.viewWork': '作品を見る',
    'work.close': '閉じる',
    'work.viewerLabel': '{title}の画像を見る',
    'work.zoomOut': '縮小',
    'work.zoomIn': '拡大',
    'work.closeViewer': '画像ビューアを閉じる',

    'nihongo.opening': 'Nihongo Gakushūを開いています…',
    'nihongo.description': 'Nihongo Gakushūは別サイトで公開しています。',
  },
}

const LanguageContext = createContext(null)

function interpolate(value, params = {}) {
  return Object.entries(params).reduce(
    (text, [key, replacement]) => text.replaceAll(`{${key}}`, String(replacement)),
    value,
  )
}

function detectDeviceLanguage() {
  if (typeof navigator === 'undefined') return 'id'

  const locales = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]

  for (const locale of locales) {
    const normalized = String(locale || '').toLowerCase()
    if (normalized.startsWith('id')) return 'id'
    if (normalized.startsWith('ja')) return 'ja'
    if (normalized.startsWith('en')) return 'en'
  }

  return 'id'
}

function initialLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE

  const urlLanguage = languageFromPath(window.location.pathname)
  if (urlLanguage) return urlLanguage

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED_LANGUAGES.includes(saved)) return saved
  } catch {
    // localStorage can be unavailable in stricter privacy modes.
  }

  return detectDeviceLanguage()
}

export function LanguageProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [language, setLanguageState] = useState(initialLanguage)

  useEffect(() => {
    const urlLanguage = languageFromPath(location.pathname)
    if (!urlLanguage) return

    setLanguageState((current) => (
      current === urlLanguage ? current : urlLanguage
    ))

    // Visiting an explicit language URL counts as a preference.
    try {
      window.localStorage.setItem(STORAGE_KEY, urlLanguage)
    } catch {
      // localStorage can be unavailable in stricter privacy modes.
    }
  }, [location.pathname])

  const setLanguage = (next) => {
    if (!SUPPORTED_LANGUAGES.includes(next) || next === language) return

    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Keep language switching functional even when storage is blocked.
    }

    // Always derive the next URL from the current CONTENT route.
    // This guarantees:
    //   /id/works/foo -> /en/works/foo
    // instead of ever falling back to /en/.
    const contentPath = contentPathFromPathname(location.pathname)
    const destination = localizePath(
      `${contentPath}${location.search}${location.hash}`,
      next,
    )

    const root = document.documentElement
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    // On Home we use mandatory scroll snapping. Changing text can slightly
    // change layout, which can otherwise make the browser snap to another
    // section (for example Selected Works). Keep the current section/offset.
    const snapSections = Array.from(document.querySelectorAll('.snap-section'))
    const snapAnchor = snapSections
      .map((element) => ({
        element,
        distance: Math.abs(element.getBoundingClientRect().top),
        offset: element.getBoundingClientRect().top,
      }))
      .sort((a, b) => a.distance - b.distance)[0] ?? null

    let restoreFrameA = 0
    let restoreFrameB = 0
    let restoreTimerA = 0
    let restoreTimerB = 0

    const restorePosition = () => {
      if (snapAnchor?.element?.isConnected) {
        const currentTop = snapAnchor.element.getBoundingClientRect().top
        const delta = currentTop - snapAnchor.offset
        window.scrollTo({
          top: window.scrollY + delta,
          left: scrollX,
          behavior: 'auto',
        })
        return
      }

      window.scrollTo({
        top: scrollY,
        left: scrollX,
        behavior: 'auto',
      })
    }

    const scheduleRestore = () => {
      restorePosition()

      restoreFrameA = window.requestAnimationFrame(() => {
        restorePosition()
        restoreFrameB = window.requestAnimationFrame(restorePosition)
      })

      restoreTimerA = window.setTimeout(restorePosition, 80)
      restoreTimerB = window.setTimeout(() => {
        restorePosition()
        root.classList.remove('language-switching')
      }, 360)
    }

    const nextState = {
      ...(location.state ?? {}),
      preserveScroll: true,
      languageSwitch: true,
    }

    // If a Work/Activity modal is open, closing it after switching language
    // should return to the SAME archive/About page in the new language.
    if (typeof nextState.returnTo === 'string') {
      nextState.returnTo = localizePath(nextState.returnTo, next)
    }

    const applyLanguage = () => {
      root.classList.add('language-switching')

      flushSync(() => {
        setLanguageState(next)
      })

      navigate(destination, {
        replace: true,
        state: nextState,
        preventScrollReset: true,
      })

      scheduleRestore()
    }

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const canUseViewTransition = typeof document !== 'undefined' && 'startViewTransition' in document

    if (canUseViewTransition && !prefersReducedMotion) {
      const transition = document.startViewTransition(applyLanguage)

      transition.finished
        .catch(() => {})
        .finally(() => {
          restorePosition()
          root.classList.remove('language-switching')
        })
    } else {
      applyLanguage()
    }

    // Cleanup is intentionally defensive. setLanguage is an event handler,
    // so these timers normally finish before another switch happens.
    window.setTimeout(() => {
      window.cancelAnimationFrame(restoreFrameA)
      window.cancelAnimationFrame(restoreFrameB)
      window.clearTimeout(restoreTimerA)
      window.clearTimeout(restoreTimerB)
      root.classList.remove('language-switching')
    }, 900)
  }

  useEffect(() => {
    document.documentElement.lang = language === 'ja' ? 'ja' : language === 'en' ? 'en' : 'id'
  }, [language])

  // IMPORTANT:
  // setLanguage closes over the CURRENT React Router location.
  // If this memo only depends on `language`, navigating Home -> About/Works
  // without changing language leaves consumers holding an old setLanguage
  // function whose `location` still points at the previous page.
  //
  // Example of the old bug:
  // /id/ -> /id/about/ (language still "id")
  // click 日本語
  // stale closure still sees /id/ and navigates to /ja/ instead of /ja/about/
  //
  // location.key changes on every router navigation, so the context value
  // always receives a fresh setLanguage closure for the page currently open.
  const value = useMemo(() => ({
    language,
    setLanguage,
    path(target = '/') {
      return localizePath(target, language)
    },
    t(key, params) {
      const raw = translations[language]?.[key] ?? translations.id[key] ?? key
      return interpolate(raw, params)
    },
  }), [
    language,
    location.pathname,
    location.search,
    location.hash,
    location.key,
  ])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage harus digunakan di dalam LanguageProvider.')
  return context
}
