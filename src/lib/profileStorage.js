import { supabase } from './supabase'

export function getPortfolioAssetUrl(pathOrRecord) {
  const path = typeof pathOrRecord === 'string'
    ? pathOrRecord
    : pathOrRecord?.avatar_path || pathOrRecord?.cover_path

  const fallback = typeof pathOrRecord === 'object'
    ? pathOrRecord?.avatar_url || pathOrRecord?.cover_url
    : null

  if (path) {
    return supabase.storage.from('portfolio-assets').getPublicUrl(path).data.publicUrl
  }

  return fallback || ''
}
