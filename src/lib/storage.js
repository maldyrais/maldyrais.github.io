import { supabase } from './supabase'

const WORKS_BUCKET = 'works'

export function getPublicStorageUrl(bucket, path) {
  if (!path) return ''

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl || ''
}

export function getWorkImageUrl(work) {
  if (!work) return ''

  if (work.image_path) {
    return getPublicStorageUrl(WORKS_BUCKET, work.image_path)
  }

  return work.image_url || ''
}

export function getWorkMediaUrl(media) {
  if (!media) return ''

  if (media.image_path) {
    return getPublicStorageUrl(WORKS_BUCKET, media.image_path)
  }

  return media.image_url || ''
}

export function getWorkMediaUrls(mediaItems = []) {
  return mediaItems
    .map((media) => ({
      ...media,
      url: getWorkMediaUrl(media),
    }))
    .filter((media) => Boolean(media.url))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

export function getHomeShowcaseImageUrl(item) {
  if (!item) return ''

  if (item.image_path) return getPublicStorageUrl(WORKS_BUCKET, item.image_path)
  if (item.image_url) return item.image_url
  if (item.work) return getWorkImageUrl(item.work)

  return ''
}
