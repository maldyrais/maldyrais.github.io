import { useEffect, useMemo, useState } from 'react'
import ActivityEditor from './ActivityEditor'
import ActivityGroupEditor from './ActivityGroupEditor'
import { supabase } from '../../lib/supabase'
import { getPortfolioAssetUrl } from '../../lib/profileStorage'
import { formatMonthYearRange, getWorkTitle } from '../../lib/workFormat'
import { getActivityTitle, getGroupTitle } from '../../lib/activityFormat'
import { reportError, reportWarning } from '../../lib/errorReporting'

export default function ActivityAdmin() {
  const [mode, setMode] = useState('activities')
  const [groups, setGroups] = useState([])
  const [activities, setActivities] = useState([])
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activityEditor, setActivityEditor] = useState(undefined)
  const [groupEditor, setGroupEditor] = useState(undefined)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')

    const [groupResult, activityResult, workResult] = await Promise.all([
      supabase
        .from('activity_groups')
        .select('*')
        .order('start_date', { ascending: true }),
      supabase
        .from('activities')
        .select(`
          *,
          group:activity_groups (*)
        `)
        .order('start_date', { ascending: false }),
      supabase
        .from('works')
        .select(`*, category:categories (id, slug, name_id, name_en, name_ja)`)
        .order('project_sort_date', { ascending: false }),
    ])

    const errors = []
    if (groupResult.error) {
      reportError('admin.activity.groups', groupResult.error)
      errors.push('Data group gagal dibaca.')
    }
    if (activityResult.error) {
      reportError('admin.activity.activities', activityResult.error)
      errors.push('Data aktivitas gagal dibaca.')
    }
    if (workResult.error) {
      reportError('admin.activity.works', workResult.error)
      errors.push('Data karya gagal dibaca.')
    }

    const rawActivities = activityResult.data ?? []
    const activityMap = new Map(rawActivities.map((item) => [item.id, item]))
    const normalizedActivities = rawActivities.map((item) => ({
      ...item,
      parent: item.parent_activity_id ? activityMap.get(item.parent_activity_id) ?? null : null,
    }))

    setGroups(groupResult.data ?? [])
    setActivities(normalizedActivities)
    setWorks(workResult.data ?? [])
    if (errors.length) setError(`Ada data yang gagal dibaca:
${errors.join('\n')}`)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filteredActivities = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return activities
    return activities.filter((item) => [
      getActivityTitle(item),
      getGroupTitle(item.group),
      item.role_id,
      item.activity_type,
    ].filter(Boolean).some((value) => value.toLowerCase().includes(needle)))
  }, [activities, query])

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return groups
    return groups.filter((item) => [getGroupTitle(item), item.type, item.slug]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(needle)))
  }, [groups, query])

  const deleteActivity = async (activity) => {
    if (!window.confirm(`Hapus aktivitas “${getActivityTitle(activity)}”?`)) return

    if (activity.cover_path) {
      const { error: storageError } = await supabase.storage.from('portfolio-assets').remove([activity.cover_path])
      if (storageError) {
        reportWarning('admin.activity.remove-cover', storageError)
        alert('Cover gagal dihapus. Aktivitas belum dihapus. Coba lagi.')
        return
      }
    }

    const { error: deleteError } = await supabase.from('activities').delete().eq('id', activity.id)
    if (deleteError) {
      reportError('admin.activity.delete', deleteError)
      alert('Aktivitas gagal dihapus. Coba lagi.')
      return
    }

    setActivities((current) => current.filter((item) => item.id !== activity.id))
  }

  const deleteGroup = async (group) => {
    if (!window.confirm(`Hapus group “${getGroupTitle(group)}”? Group hanya bisa dihapus jika tidak memiliki activity.`)) return
    const { error: deleteError } = await supabase.from('activity_groups').delete().eq('id', group.id)
    if (deleteError) {
      reportError('admin.activity-group.delete', deleteError)
      alert('Group gagal dihapus. Pastikan semua aktivitas di dalam group sudah dipindah atau dihapus.')
      return
    }
    setGroups((current) => current.filter((item) => item.id !== group.id))
  }

  const saveActivity = (saved) => {
    setActivities((current) => {
      const parent = saved.parent ?? (
        saved.parent_activity_id
          ? current.find((item) => item.id === saved.parent_activity_id) ?? null
          : null
      )
      const normalized = { ...saved, parent }
      const exists = current.some((item) => item.id === normalized.id)
      const next = exists
        ? current.map((item) => item.id === normalized.id ? normalized : item)
        : [normalized, ...current]
      return [...next].sort((a,b) => (b.start_date || '').localeCompare(a.start_date || ''))
    })
    setActivityEditor(undefined)
  }

  const saveGroup = (saved) => {
    setGroups((current) => {
      const exists = current.some((item) => item.id === saved.id)
      const next = exists ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]
      return [...next].sort((a,b) => (a.start_date || '').localeCompare(b.start_date || ''))
    })
    setActivities((current) => current.map((item) => (
      item.group_id === saved.id ? { ...item, group: saved } : item
    )))
    setGroupEditor(undefined)
  }

  return (
    <>
      <header className="admin-topbar">
        <div>
          <span className="admin-kicker">CHRONOLOGICAL PINBOARD</span>
          <h2>Activity.</h2>
        </div>
        <button
          className="admin-button primary"
          onClick={() => mode === 'activities' ? setActivityEditor(null) : setGroupEditor(null)}
        >
          + {mode === 'activities' ? 'Tambah aktivitas' : 'Tambah group'}
        </button>
      </header>

      <div className="admin-stats">
        <article><strong>{activities.length}</strong><span>Activities</span></article>
        <article><strong>{groups.length}</strong><span>Main groups</span></article>
        <article><strong>{activities.filter((item) => item.is_highlighted).length}</strong><span>Highlighted</span></article>
        <article><strong>{works.length}</strong><span>Works siap direlasikan</span></article>
      </div>

      <div className="admin-toolbar">
        <input type="search" placeholder="Cari activity atau group…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="admin-filter-buttons">
          <button className={mode === 'activities' ? 'active' : ''} onClick={() => setMode('activities')}>Activities</button>
          <button className={mode === 'groups' ? 'active' : ''} onClick={() => setMode('groups')}>Groups</button>
        </div>
      </div>

      {loading && <div className="admin-empty-state">Memuat activity…</div>}
      {!loading && error && <div className="admin-empty-state error" style={{ whiteSpace: 'pre-line' }}>{error}</div>}

      {!loading && !error && mode === 'activities' && (
        <div className="admin-work-list">
          {filteredActivities.length === 0 && <div className="admin-empty-state">Belum ada activity.</div>}
          {filteredActivities.map((activity) => {
            const cover = getPortfolioAssetUrl(activity)
            return (
              <article className="admin-work-row" key={activity.id}>
                <div className="admin-work-thumb">{cover ? <img src={cover} alt="" /> : <span>ACT</span>}</div>
                <div className="admin-work-info">
                  <div className="admin-work-badges">
                    <span>{getGroupTitle(activity.group)}</span>
                    {activity.activity_type && <span>{activity.activity_type}</span>}
                    {activity.is_published ? <span className="success">Published</span> : <span>Draft</span>}
                    {activity.is_highlighted && <span className="home">Highlight</span>}
                  </div>
                  <h3>{getActivityTitle(activity)}</h3>
                  <small>{activity.role_id ? `${activity.role_id} · ` : ''}{formatMonthYearRange(activity.start_date, activity.end_date)}</small>
                </div>
                <div className="admin-work-controls">
                  <button className="admin-row-button" onClick={() => setActivityEditor(activity)}>Edit</button>
                  <button className="admin-row-button danger" onClick={() => deleteActivity(activity)}>Hapus</button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {!loading && !error && mode === 'groups' && (
        <div className="admin-work-list">
          {filteredGroups.length === 0 && <div className="admin-empty-state">Belum ada group.</div>}
          {filteredGroups.map((group) => (
            <article className="admin-work-row" key={group.id}>
              <div className="admin-work-thumb activity-group-thumb"><span>{String(group.start_date || '').slice(0,4)}</span></div>
              <div className="admin-work-info">
                <div className="admin-work-badges">
                  <span>{group.type || 'Group'}</span>
                  {group.is_published ? <span className="success">Published</span> : <span>Draft</span>}
                </div>
                <h3>{getGroupTitle(group)}</h3>
                <small>{formatMonthYearRange(group.start_date, group.end_date)} · {group.slug}</small>
              </div>
              <div className="admin-work-controls">
                <button className="admin-row-button" onClick={() => setGroupEditor(group)}>Edit</button>
                <button className="admin-row-button danger" onClick={() => deleteGroup(group)}>Hapus</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {activityEditor !== undefined && (
        <ActivityEditor
          activity={activityEditor}
          groups={groups}
          activities={activities}
          works={works}
          onClose={() => setActivityEditor(undefined)}
          onSaved={saveActivity}
        />
      )}

      {groupEditor !== undefined && (
        <ActivityGroupEditor
          group={groupEditor}
          onClose={() => setGroupEditor(undefined)}
          onSaved={saveGroup}
        />
      )}
    </>
  )
}
