import { getLocalizedField } from './localizedField'

export function getActivityTitle(activity, language = 'id') {
  const fallback = language === 'ja' ? '活動' : language === 'en' ? 'Activity' : 'Aktivitas'
  return getLocalizedField(activity, 'title', language, fallback)
}

export function getActivityRole(activity, language = 'id') {
  return getLocalizedField(activity, 'role', language, '')
}

export function getActivitySummary(activity, language = 'id') {
  return getLocalizedField(activity, 'summary', language, '')
}

export function getActivityDescription(activity, language = 'id') {
  return getLocalizedField(activity, 'description', language, '')
}

export function getGroupTitle(group, language = 'id') {
  const fallback = language === 'ja' ? 'グループ' : 'Group'
  return getLocalizedField(group, 'title', language, fallback)
}

export function getGroupSummary(group, language = 'id') {
  return getLocalizedField(group, 'summary', language, '')
}

export function yearFromDate(value) {
  if (!value) return null
  return new Date(`${value}T00:00:00`).getFullYear()
}
