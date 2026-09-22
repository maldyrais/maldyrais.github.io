import { useEffect, useMemo, useState } from 'react'
import WorkModal from './WorkModal'
import { reportError } from '../lib/errorReporting'
import { lockModalScroll, unlockModalScroll } from '../lib/modalLock'
import { getPortfolioAssetUrl } from '../lib/profileStorage'
import { formatMonthYearRange, getWorkTitle } from '../lib/workFormat'
import {
  getActivityDescription,
  getActivityRole,
  getActivitySummary,
  getActivityTitle,
  getGroupTitle,
} from '../lib/activityFormat'
import { getWorkImageUrl } from '../lib/storage'
import { useLanguage } from '../i18n/LanguageContext'
import { getActivityRelatedWorks } from '../lib/publicContentCache'

export default function ActivityModal({ activity, onClose }) {
  const { language, t } = useLanguage()
  const [relatedWorks, setRelatedWorks] = useState([])
  const [loadingWorks, setLoadingWorks] = useState(false)
  const [fanOpen, setFanOpen] = useState(false)
  const [gridOpen, setGridOpen] = useState(false)
  const [activeWork, setActiveWork] = useState(null)

  useEffect(() => {
    if (!activity) return undefined
    lockModalScroll()

    const onKey = (event) => {
      if (event.key !== 'Escape') return
      if (activeWork) return
      if (gridOpen) {
        setGridOpen(false)
        return
      }
      if (fanOpen) {
        setFanOpen(false)
        return
      }
      onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      unlockModalScroll()
    }
  }, [activity, fanOpen, gridOpen, activeWork, onClose])

  useEffect(() => {
    if (!activity?.id) return
    let cancelled = false

    const fetchRelated = async () => {
      setLoadingWorks(true)
      try {
        const works = await getActivityRelatedWorks(activity.id)
        if (cancelled) return
        setRelatedWorks(works)
      } catch (error) {
        if (cancelled) return
        reportError('activity-modal.related-works', error)
        setRelatedWorks([])
      }
      setLoadingWorks(false)
    }

    fetchRelated()
    return () => { cancelled = true }
  }, [activity?.id])

  useEffect(() => {
    setFanOpen(false)
    setGridOpen(false)
    setActiveWork(null)
  }, [activity?.id])

  const fanWorks = useMemo(() => relatedWorks.slice(0, 5), [relatedWorks])

  if (!activity) return null

  const title = getActivityTitle(activity, language)
  const role = getActivityRole(activity, language)
  const summary = getActivitySummary(activity, language)
  const description = getActivityDescription(activity, language)
  const groupTitle = getGroupTitle(activity.group, language)
  const date = formatMonthYearRange(activity.start_date, activity.end_date, language)
  const coverUrl = getPortfolioAssetUrl(activity)
  const parentTitle = activity.parent ? getActivityTitle(activity.parent, language) : ''

  return (
    <>
      <div
        className="activity-modal-backdrop"
        onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      >
        <article className="activity-modal" role="dialog" aria-modal="true" aria-label={title}>
          <button className="activity-modal-close" onClick={onClose} aria-label={t('activity.close')}>×</button>

          <div className="activity-modal-copy">
            <div className="activity-modal-eyebrow">{groupTitle}{date ? ` · ${date}` : ''}</div>
            <h2>{title}</h2>
            {role && <div className="activity-role">{role}</div>}
            {summary && <p className="activity-summary">{summary}</p>}
            {description && <p className="activity-description">{description}</p>}

            <div className="activity-detail-grid">
              {activity.activity_type && <div><span>{t('activity.type')}</span><strong>{activity.activity_type}</strong></div>}
              {activity.location && <div><span>{t('activity.location')}</span><strong>{activity.location}</strong></div>}
              {parentTitle && <div><span>{t('activity.connected')}</span><strong>{parentTitle}</strong></div>}
            </div>
          </div>

          <div className="activity-modal-side">
            {coverUrl ? (
              <img className="activity-cover" src={coverUrl} alt="" />
            ) : (
              <div className="activity-cover-placeholder">
                <span>{String(activity.start_date || '').slice(0, 4) || 'ACT'}</span>
                <strong>{groupTitle}</strong>
              </div>
            )}

            {(loadingWorks || relatedWorks.length > 0) && (
              <button
                className={`related-folder-trigger ${fanOpen ? 'open' : ''}`}
                onClick={() => setFanOpen((value) => !value)}
                aria-expanded={fanOpen}
              >
                <span className="folder-tab"></span>
                <span className="folder-front">
                  <strong>{loadingWorks ? '…' : relatedWorks.length}</strong>
                  <small>{t('activity.relatedWorks')}</small>
                </span>
              </button>
            )}
          </div>
        </article>

        {relatedWorks.length > 0 && (
          <div className={`related-fan-stage ${fanOpen ? 'open' : ''}`} aria-hidden={!fanOpen}>
            <div className="fan-cards">
              {fanWorks.map((work, index) => {
                const center = (fanWorks.length - 1) / 2
                const offset = index - center
                const spread = 165
                const lift = 305 - Math.abs(offset) * 34
                return (
                  <button
                    className="fan-work-card"
                    key={work.id}
                    style={{
                      '--fan-x': `${offset * spread}px`,
                      '--fan-y': `${-lift}px`,
                      '--fan-r': `${offset * 4.5}deg`,
                      '--fan-delay': `${index * 70}ms`,
                    }}
                    onClick={() => setActiveWork(work)}
                  >
                    <img src={getWorkImageUrl(work)} alt="" />
                    <span>{getWorkTitle(work, language)}</span>
                  </button>
                )
              })}

              {relatedWorks.length > 5 && (
                <button
                  className="fan-more-card"
                  style={{
                    '--fan-x': '0px',
                    '--fan-y': '-360px',
                    '--fan-r': '0deg',
                    '--fan-delay': '420ms',
                  }}
                  onClick={() => setGridOpen(true)}
                >
                  +{relatedWorks.length - 5}
                  <small>{t('activity.viewAll')}</small>
                </button>
              )}
            </div>

            <button className="fan-folder-base" onClick={() => setFanOpen(false)}>
              <span className="fan-folder-tab"></span>
              <span className="fan-folder-front">
                <strong>{t('activity.worksFromActivity')}</strong>
                <small>{t('activity.fanHint')}</small>
              </span>
            </button>
          </div>
        )}

        {gridOpen && (
          <div className="related-grid-panel" onMouseDown={(e) => e.target === e.currentTarget && setGridOpen(false)}>
            <section>
              <header>
                <div>
                  <small>{t('activity.relatedWorksHeading')}</small>
                  <h3>{title}</h3>
                </div>
                <button onClick={() => setGridOpen(false)} aria-label={t('activity.close')}>×</button>
              </header>
              <div className="related-grid">
                {relatedWorks.map((work) => (
                  <button key={work.id} onClick={() => setActiveWork(work)}>
                    <img src={getWorkImageUrl(work)} alt="" />
                    <span>{getWorkTitle(work, language)}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <WorkModal work={activeWork} onClose={() => setActiveWork(null)} />
    </>
  )
}
