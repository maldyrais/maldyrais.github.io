import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ActivityTimeline from '../components/ActivityTimeline'
import ActivityModal from '../components/ActivityModal'
import ContactFooter from '../components/ContactFooter'
import ToolLogo from '../components/ToolLogo'
import { supabase } from '../lib/supabase'
import { reportError, reportWarning } from '../lib/errorReporting'
import { getPortfolioAssetUrl } from '../lib/profileStorage'
import { getLocalizedField } from '../lib/localizedField'
import { useLanguage } from '../i18n/LanguageContext'
import { contentPathFromPathname } from '../i18n/routes'
import { primeActivity } from '../lib/publicContentCache'

const FALLBACK_PROFILE = {
  name: 'Maldy Rais',
  headline_id: 'Graphic Design · Japanese Language · Creative Technology',
  headline_en: 'Graphic Design · Japanese Language · Creative Technology',
  headline_ja: 'グラフィックデザイン · 日本語 · クリエイティブテクノロジー',
  bio_id: 'Saya tertarik pada desain grafis, bahasa Jepang, fotografi, dan pengalaman web interaktif.',
  bio_en: 'I am interested in graphic design, Japanese, photography, and interactive web experiences.',
  bio_ja: 'グラフィックデザイン、日本語、写真、インタラクティブなWeb体験に興味があります。',
  location: 'Surabaya, Indonesia',
  roles: ['Graphic Designer', 'Japanese Language Tutor', 'Creative Technologist'],
  tools: ['Photoshop', 'Illustrator', 'Canva', 'Figma', 'VS Code'],
  interests: ['Graphic Design', 'Japanese Language', 'Photography', 'Interactive Web'],
}

const ABOUT_HERO_COPY = {
  id: {
    greeting: 'Halo, saya',
    suffix: '.',
    thatsMe: "That's me!",
    kicker: '01 / ABOUT · 自己紹介',
  },
  en: {
    greeting: "Hi, I'm",
    suffix: '.',
    thatsMe: "That's me!",
    kicker: '01 / ABOUT · 自己紹介',
  },
  ja: {
    greeting: 'こんにちは、',
    suffix: 'です。',
    thatsMe: 'これが私！',
    kicker: '01 / ABOUT · 自己紹介',
  },
}

function toolDescription(tool, language) {
  if (!tool) return ''
  return (
    tool[`description_${language}`] ||
    tool.description_id ||
    tool.description_en ||
    tool.description_ja ||
    ''
  )
}

function legacyToolRows(profile) {
  return (profile?.tools ?? []).map((name, index) => ({
    id: `legacy-${index}-${name}`,
    name,
    icon_key: String(name).toLowerCase().includes('photoshop') ? 'photoshop'
      : String(name).toLowerCase().includes('illustrator') ? 'illustrator'
        : String(name).toLowerCase().includes('figma') ? 'figma'
          : String(name).toLowerCase().includes('canva') ? 'canva'
            : String(name).toLowerCase().includes('code') ? 'vscode'
              : 'other',
    description_id: '',
    description_en: '',
    description_ja: '',
    sort_order: index,
  }))
}

export default function About() {
  const { language, t, path } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const activitySlug = useMemo(() => {
    const contentPath = contentPathFromPathname(location.pathname)
    const match = contentPath.match(/^\/about\/activity\/([^/]+)\/?$/i)
    return match?.[1] || ''
  }, [location.pathname])

  const [profile, setProfile] = useState(FALLBACK_PROFILE)
  const [groups, setGroups] = useState([])
  const [activities, setActivities] = useState([])
  const [profileTools, setProfileTools] = useState([])
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [loading, setLoading] = useState(true)

  useLayoutEffect(() => {
    const root = document.documentElement
    const historyObject = window.history
    const previousRestoration = historyObject.scrollRestoration

    root.classList.add('about-route-active')

    if ('scrollRestoration' in historyObject) {
      historyObject.scrollRestoration = 'manual'
    }

    window.scrollTo(0, 0)
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0))

    return () => {
      window.cancelAnimationFrame(frame)
      root.classList.remove('about-route-active')

      if ('scrollRestoration' in historyObject) {
        historyObject.scrollRestoration = previousRestoration
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [profileResult, groupResult, activityResult, toolResult] = await Promise.all([
        supabase.from('profile').select('*').eq('id', 1).maybeSingle(),
        supabase
          .from('activity_groups')
          .select('*')
          .eq('is_published', true)
          .order('start_date', { ascending: false }),
        supabase
          .from('activities')
          .select(`
            *,
            group:activity_groups (*)
          `)
          .eq('is_published', true)
          .order('start_date', { ascending: false }),
        supabase
          .from('profile_tools')
          .select('id, profile_id, name, icon_key, description_id, description_en, description_ja, sort_order, is_active')
          .eq('profile_id', 1)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true }),
      ])

      if (cancelled) return

      const loadedProfile = profileResult.data ?? FALLBACK_PROFILE
      if (profileResult.data) setProfile(profileResult.data)

      if (toolResult.error) {
        reportWarning('about.profile-tools', toolResult.error)
        setProfileTools(legacyToolRows(loadedProfile))
      } else {
        setProfileTools((toolResult.data ?? []).length
          ? (toolResult.data ?? [])
          : legacyToolRows(loadedProfile))
      }

      if (groupResult.error) reportError('about.groups', groupResult.error)
      else setGroups(groupResult.data ?? [])

      if (activityResult.error) {
        reportError('about.activities', activityResult.error)
      } else {
        const rawActivities = activityResult.data ?? []
        const activityMap = new Map(rawActivities.map((activity) => [activity.id, activity]))

        const normalizedActivities = rawActivities.map((activity) => ({
          ...activity,
          parent: activity.parent_activity_id
            ? activityMap.get(activity.parent_activity_id) ?? null
            : null,
        }))

        normalizedActivities.forEach(primeActivity)
        setActivities(normalizedActivities)
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!activitySlug) {
      setSelectedActivity(null)
      return
    }

    const routeStateActivity = location.state?.activity
    if (routeStateActivity?.slug === activitySlug) {
      setSelectedActivity(routeStateActivity)
      return
    }

    if (loading) return

    const found = activities.find((activity) => activity.slug === activitySlug) ?? null
    setSelectedActivity(found)
  }, [activitySlug, location.state, activities, loading])

  const closeActivity = () => {
    setSelectedActivity(null)

    if (!activitySlug) return

    const returnTo = location.state?.returnTo
    navigate(
      typeof returnTo === 'string' ? returnTo : path('/about/'),
      { replace: true, state: { preserveScroll: true } },
    )
  }

  const avatar = getPortfolioAssetUrl({
    avatar_path: profile.avatar_path,
    avatar_url: profile.avatar_url,
  })

  const bio = getLocalizedField(profile, 'bio', language, FALLBACK_PROFILE.bio_id)
  const heroCopy = ABOUT_HERO_COPY[language] ?? ABOUT_HERO_COPY.id
  const displayName = language === 'ja'
    ? (profile.name_ja || 'マルディ・ライス')
    : (profile.name || FALLBACK_PROFILE.name)
  const roleItems = [...new Set((profile.roles ?? []).filter(Boolean))]

  const socialLinks = [
    ['Instagram', profile.instagram_url],
    ['Behance', profile.behance_url],
    ['GitHub', profile.github_url],
    ['LinkedIn', profile.linkedin_url],
  ].filter(([, url]) => Boolean(url))

  return (
    <>
      <Navbar />

      <main className="about-page">
        <section className="about-hero about-hero-v2" data-language={language}>
          <div className="about-hero-copy">
            <span className="section-kicker about-hero-kicker">{heroCopy.kicker}</span>

            <h1 className="about-intro-title">
              <span>{heroCopy.greeting}</span>
              <span>{displayName}{heroCopy.suffix}</span>
            </h1>

            <p className="about-bio about-bio-v2">{bio}</p>

            {roleItems.length > 0 && (
              <div className="about-role-line" aria-label="Roles">
                {roleItems.map((role, index) => (
                  <span key={role}>
                    {index > 0 && <i aria-hidden="true">·</i>}
                    {role}
                  </span>
                ))}
              </div>
            )}

            <div className="about-contact-line about-contact-line-v2">
              {profile.location && <span>{profile.location}</span>}
              {profile.email && <a href={`mailto:${profile.email}`}>{profile.email} ↗</a>}
              {socialLinks.map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer">{name} ↗</a>
              ))}
            </div>
          </div>

          <div className="about-portrait-wrap about-portrait-wrap-v2">
            <div className="about-thats-me" aria-hidden="true">
              <span>{heroCopy.thatsMe}</span>
              <svg viewBox="0 0 112 86" role="presentation">
                <path d="M10 8c2 35 23 57 62 61 12 1 21-2 27-8" />
                <path d="M83 54l16 7-10 14" />
              </svg>
            </div>

            <div className="about-portrait-ring">
              {avatar ? (
                <img className="about-portrait" src={avatar} alt={profile.name || 'Maldy Rais'} />
              ) : (
                <div className="about-portrait-placeholder">
                  <strong>MR</strong>
                  <span>{profile.name}</span>
                </div>
              )}
            </div>

            <span className="about-portrait-jp" aria-hidden="true">自己紹介</span>
          </div>
        </section>

        <section className="about-facts about-facts-v2">
          <div className="about-tools-fact">
            <span className="about-fact-index">01</span>
            <small>{t('about.tools')}</small>

            <div className="about-tool-list">
              {profileTools.length > 0 ? profileTools.map((tool) => {
                const context = toolDescription(tool, language)

                return (
                  <div className="about-tool-item" key={tool.id ?? tool.name}>
                    <ToolLogo iconKey={tool.icon_key} name={tool.name} />
                    <span className="about-tool-copy">
                      <strong>{tool.name}</strong>
                      {context && <span>{context}</span>}
                    </span>
                  </div>
                )
              }) : <p>—</p>}
            </div>
          </div>
          <div>
            <span className="about-fact-index">02</span>
            <small>{t('about.japanese')}</small>
            <p>{profile.japanese_level || t('about.learning')}</p>
          </div>
          <div>
            <span className="about-fact-index">03</span>
            <small>{t('about.interests')}</small>
            <p>{(profile.interests ?? []).join(' · ') || '—'}</p>
          </div>
        </section>

        <section className="activity-section">
          <header className="activity-section-heading">
            <div>
              <span className="section-kicker">{t('about.activityKicker')}</span>
              <h2>{t('about.activityHeading')}</h2>
            </div>
            <p>{t('about.activityDescription')}</p>
          </header>

          {loading ? (
            <div className="activity-empty">{t('about.loadingJourney')}</div>
          ) : (
            <ActivityTimeline
              groups={groups}
              activities={activities}
              onSelect={setSelectedActivity}
              returnTo={`${location.pathname}${location.search}${location.hash}`}
            />
          )}
        </section>

        {profile.cv_url && (
          <div className="about-footer">
            <span>Curriculum Vitae</span>
            <a href={profile.cv_url} target="_blank" rel="noopener noreferrer">{t('about.viewCv')}</a>
          </div>
        )}
      </main>

      <ContactFooter />

      <ActivityModal activity={selectedActivity} onClose={closeActivity} />
    </>
  )
}
