export function getLocalizedField(record, base, language = 'id', fallback = '') {
  if (!record) return fallback

  const preferred = record[`${base}_${language}`]
  const indonesia = record[`${base}_id`]
  const english = record[`${base}_en`]
  const japanese = record[`${base}_ja`]

  return preferred || indonesia || english || japanese || fallback
}
