const localeMap = {
  id: 'id-ID',
  en: 'en-US',
  ja: 'ja-JP',
}

function parseDate(value) {
  if (!value) return null
  return new Date(`${value}T00:00:00Z`)
}

function formatter(locale, options) {
  return new Intl.DateTimeFormat(localeMap[locale] || localeMap.id, {
    timeZone: 'UTC',
    ...options,
  })
}

export function getWorkTitle(work, locale = 'id') {
  if (!work) return locale === 'ja' ? '無題' : locale === 'en' ? 'Untitled' : 'Tanpa judul'

  const byLocale = {
    id: work.title_id,
    en: work.title_en,
    ja: work.title_ja,
  }

  return byLocale[locale]
    || work.title_id
    || work.title_en
    || work.title_ja
    || (locale === 'ja' ? '無題' : locale === 'en' ? 'Untitled' : 'Tanpa judul')
}

export function getWorkDescription(work, locale = 'id') {
  if (!work) return ''

  const byLocale = {
    id: work.description_id,
    en: work.description_en,
    ja: work.description_ja,
  }

  return byLocale[locale] || work.description_id || work.description_en || work.description_ja || ''
}

export function getCategoryName(category, locale = 'id') {
  if (!category) return locale === 'ja' ? '作品' : locale === 'en' ? 'Work' : 'Karya'

  const byLocale = {
    id: category.name_id,
    en: category.name_en,
    ja: category.name_ja,
  }

  return byLocale[locale]
    || category.name_id
    || category.name_en
    || category.name_ja
    || (locale === 'ja' ? '作品' : locale === 'en' ? 'Work' : 'Karya')
}

export function formatMonthYearRange(startValue, endValue, locale = 'id') {
  const start = parseDate(startValue)
  const end = parseDate(endValue)

  if (!start && !end) return ''

  const monthYear = formatter(locale, { month: 'long', year: 'numeric' })

  if (!start) return monthYear.format(end)
  if (!end) return monthYear.format(start)

  const startY = start.getUTCFullYear()
  const startM = start.getUTCMonth()
  const endY = end.getUTCFullYear()
  const endM = end.getUTCMonth()

  if (startY === endY && startM === endM) {
    return monthYear.format(start)
  }

  if (locale === 'ja') {
    if (startY === endY) {
      return `${startY}年${startM + 1}月〜${endM + 1}月`
    }

    return `${startY}年${startM + 1}月〜${endY}年${endM + 1}月`
  }

  if (startY === endY) {
    const startMonth = formatter(locale, { month: 'long' }).format(start)
    const endMonth = formatter(locale, { month: 'long' }).format(end)
    return `${startMonth} – ${endMonth} ${startY}`
  }

  return `${monthYear.format(start)} – ${monthYear.format(end)}`
}

export function formatProjectDateRange(startValue, endValue, locale = 'id') {
  const start = parseDate(startValue)
  const end = parseDate(endValue || startValue)

  if (!start && !end) return ''

  const full = formatter(locale, { day: 'numeric', month: 'long', year: 'numeric' })

  if (!start) return full.format(end)
  if (!end) return full.format(start)

  const startY = start.getUTCFullYear()
  const startM = start.getUTCMonth()
  const startD = start.getUTCDate()
  const endY = end.getUTCFullYear()
  const endM = end.getUTCMonth()
  const endD = end.getUTCDate()

  if (startY === endY && startM === endM && startD === endD) {
    return full.format(start)
  }

  if (locale === 'ja') {
    if (startY === endY && startM === endM) {
      return `${startY}年${startM + 1}月${startD}日〜${endD}日`
    }
    if (startY === endY) {
      return `${startY}年${startM + 1}月${startD}日〜${endM + 1}月${endD}日`
    }
    return `${full.format(start)}〜${full.format(end)}`
  }

  if (locale === 'en') {
    if (startY === endY && startM === endM) {
      const month = formatter('en', { month: 'long' }).format(start)
      return `${month} ${startD}–${endD}, ${startY}`
    }
    if (startY === endY) {
      const left = formatter('en', { month: 'long', day: 'numeric' }).format(start)
      const right = formatter('en', { month: 'long', day: 'numeric' }).format(end)
      return `${left} – ${right}, ${startY}`
    }
    return `${full.format(start)} – ${full.format(end)}`
  }

  if (startY === endY && startM === endM) {
    const monthYear = formatter('id', { month: 'long', year: 'numeric' }).format(end)
    return `${startD}–${endD} ${monthYear}`
  }

  if (startY === endY) {
    const left = formatter('id', { day: 'numeric', month: 'long' }).format(start)
    const right = formatter('id', { day: 'numeric', month: 'long', year: 'numeric' }).format(end)
    return `${left} – ${right}`
  }

  return `${full.format(start)} – ${full.format(end)}`
}
