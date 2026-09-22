import { supabase } from './supabase'

const workBySlug = new Map()
const workPromiseBySlug = new Map()
const workMediaById = new Map()
const workMediaPromiseById = new Map()
const relatedWorksByActivityId = new Map()
const relatedWorksPromiseByActivityId = new Map()
const activityBySlug = new Map()
const activityPromiseBySlug = new Map()

export function primeWork(work) {
  if (work?.slug) workBySlug.set(work.slug, work)
  return work
}

export async function getPublishedWorkBySlug(slug) {
  if (!slug) return null
  if (workBySlug.has(slug)) return workBySlug.get(slug)
  if (workPromiseBySlug.has(slug)) return workPromiseBySlug.get(slug)

  const request = supabase
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
      updated_at,
      category:categories (
        id,
        slug,
        name_id,
        name_en,
        name_ja
      )
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
    .then(({ data, error }) => {
      workPromiseBySlug.delete(slug)
      if (error) throw error
      if (data) workBySlug.set(slug, data)
      return data ?? null
    })
    .catch((error) => {
      workPromiseBySlug.delete(slug)
      throw error
    })

  workPromiseBySlug.set(slug, request)
  return request
}

export function primeActivity(activity) {
  if (activity?.slug) activityBySlug.set(activity.slug, activity)
  return activity
}

export async function getPublishedActivityBySlug(slug) {
  if (!slug) return null
  if (activityBySlug.has(slug)) return activityBySlug.get(slug)
  if (activityPromiseBySlug.has(slug)) return activityPromiseBySlug.get(slug)

  const request = supabase
    .from('activities')
    .select(`
      *,
      group:activity_groups (*),
      parent:activities!activities_parent_activity_id_fkey (
        id,
        slug,
        title_id,
        title_en,
        title_ja
      )
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
    .then(({ data, error }) => {
      activityPromiseBySlug.delete(slug)
      if (error) throw error
      if (data) activityBySlug.set(slug, data)
      return data ?? null
    })
    .catch((error) => {
      activityPromiseBySlug.delete(slug)
      throw error
    })

  activityPromiseBySlug.set(slug, request)
  return request
}

export function primeWorkMedia(workId, rows = []) {
  if (workId) workMediaById.set(String(workId), rows)
  return rows
}

export async function getWorkMedia(workId) {
  if (!workId) return []
  const key = String(workId)

  if (workMediaById.has(key)) return workMediaById.get(key)
  if (workMediaPromiseById.has(key)) return workMediaPromiseById.get(key)

  const request = supabase
    .from('work_media')
    .select('id, work_id, image_path, image_url, sort_order')
    .eq('work_id', workId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .then(({ data, error }) => {
      workMediaPromiseById.delete(key)
      if (error) throw error
      const rows = data ?? []
      workMediaById.set(key, rows)
      return rows
    })
    .catch((error) => {
      workMediaPromiseById.delete(key)
      throw error
    })

  workMediaPromiseById.set(key, request)
  return request
}

export function primeActivityRelatedWorks(activityId, works = []) {
  if (activityId) relatedWorksByActivityId.set(String(activityId), works)
  works.forEach(primeWork)
  return works
}

export async function getActivityRelatedWorks(activityId) {
  if (!activityId) return []
  const key = String(activityId)

  if (relatedWorksByActivityId.has(key)) return relatedWorksByActivityId.get(key)
  if (relatedWorksPromiseByActivityId.has(key)) return relatedWorksPromiseByActivityId.get(key)

  const request = supabase
    .from('activity_work_links')
    .select(`
      work:works (
        *,
        category:categories (id, slug, name_id, name_en, name_ja)
      )
    `)
    .eq('activity_id', activityId)
    .then(({ data, error }) => {
      relatedWorksPromiseByActivityId.delete(key)
      if (error) throw error

      const works = (data ?? []).map((row) => row.work).filter(Boolean)
      works.forEach(primeWork)
      relatedWorksByActivityId.set(key, works)
      return works
    })
    .catch((error) => {
      relatedWorksPromiseByActivityId.delete(key)
      throw error
    })

  relatedWorksPromiseByActivityId.set(key, request)
  return request
}
