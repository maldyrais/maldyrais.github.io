export const SUPPORTED_LANGUAGES = ['id', 'en', 'ja']
export const DEFAULT_LANGUAGE = 'id'

const EXTERNAL_OR_SPECIAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i

export function languageFromPath(pathname = '') {
  const match = String(pathname || '').match(/^\/(id|en|ja)(?=\/|$)/i)
  const language = match?.[1]?.toLowerCase()
  return SUPPORTED_LANGUAGES.includes(language) ? language : null
}

export function contentPathFromPathname(pathname = '/') {
  const raw = String(pathname || '/') || '/'
  const language = languageFromPath(raw)

  if (!language) return raw.startsWith('/') ? raw : `/${raw}`

  const withoutLanguage = raw.slice(language.length + 1)
  if (!withoutLanguage || withoutLanguage === '/') return '/'
  return withoutLanguage.startsWith('/') ? withoutLanguage : `/${withoutLanguage}`
}

export function normalizeContentPath(pathname = '/') {
  const contentPath = contentPathFromPathname(pathname)
  if (!contentPath || contentPath === '/') return '/'
  return contentPath.replace(/\/+$/, '') || '/'
}

export function localizePath(target = '/', language = DEFAULT_LANGUAGE) {
  if (!SUPPORTED_LANGUAGES.includes(language)) language = DEFAULT_LANGUAGE

  const value = String(target || '/')
  if (EXTERNAL_OR_SPECIAL.test(value)) return value

  const match = value.match(/^([^?#]*)([?#][\s\S]*)?$/)
  const rawPath = match?.[1] || '/'
  const suffix = match?.[2] || ''

  // Admin remains intentionally language-neutral.
  if (
    rawPath === '/admin'
    || rawPath.startsWith('/admin/')
    || rawPath === '/Nihongo-gakushu'
    || rawPath.startsWith('/Nihongo-gakushu/')
  ) {
    return `${rawPath}${suffix}`
  }

  const contentPath = contentPathFromPathname(rawPath || '/')
  const localized = contentPath === '/'
    ? `/${language}/`
    : `/${language}${contentPath.startsWith('/') ? contentPath : `/${contentPath}`}`

  return `${localized}${suffix}`
}

export function sameContentPath(pathname, language) {
  return localizePath(contentPathFromPathname(pathname), language)
}
