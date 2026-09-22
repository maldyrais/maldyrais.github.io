import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { reportError } from '../lib/errorReporting'

let profileCache
let profilePromise = null

async function fetchPublicProfile() {
  if (profileCache !== undefined) return profileCache
  if (profilePromise) return profilePromise

  profilePromise = supabase
    .from('profile')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        reportError('public-profile.load', error)
        return null
      }

      profileCache = data ?? null
      return profileCache
    })
    .finally(() => {
      profilePromise = null
    })

  return profilePromise
}

export function usePublicProfile() {
  const [profile, setProfile] = useState(
    profileCache === undefined ? null : profileCache,
  )

  useEffect(() => {
    let cancelled = false

    fetchPublicProfile().then((data) => {
      if (!cancelled) setProfile(data)
    })

    return () => { cancelled = true }
  }, [])

  return profile
}
