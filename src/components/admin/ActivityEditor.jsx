import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getPortfolioAssetUrl } from '../../lib/profileStorage'
import { getWorkTitle } from '../../lib/workFormat'
import { reportError, reportWarning } from '../../lib/errorReporting'

const EMPTY = {
  group_id: '',
  parent_activity_id: '',
  activity_type: '',
  title_id: '',
  title_en: '',
  title_ja: '',
  role_id: '',
  role_en: '',
  role_ja: '',
  summary_id: '',
  summary_en: '',
  summary_ja: '',
  description_id: '',
  description_en: '',
  description_ja: '',
  start_date: '',
  end_date: '',
  location: '',
  is_highlighted: false,
  is_published: true,
}

function monthValue(value) {
  if (!value) return ''
  return String(value).slice(0, 7)
}

function monthToDate(value) {
  return value ? `${value}-01` : null
}


function ext(file) {
  return (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
}

export default function ActivityEditor({ activity, groups, activities, works, onClose, onSaved }) {
  const editing = Boolean(activity?.id)
  const [form, setForm] = useState(EMPTY)
  const [selectedWorks, setSelectedWorks] = useState([])
  const [workQuery, setWorkQuery] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activity) {
      setForm(EMPTY)
      setSelectedWorks([])
      setPreview('')
      return
    }

    setForm({
      group_id: activity.group_id ? String(activity.group_id) : '',
      parent_activity_id: activity.parent_activity_id ? String(activity.parent_activity_id) : '',
      activity_type: activity.activity_type ?? '',
      title_id: activity.title_id ?? '',
      title_en: activity.title_en ?? '',
      title_ja: activity.title_ja ?? '',
      role_id: activity.role_id ?? '',
      role_en: activity.role_en ?? '',
      role_ja: activity.role_ja ?? '',
      summary_id: activity.summary_id ?? '',
      summary_en: activity.summary_en ?? '',
      summary_ja: activity.summary_ja ?? '',
      description_id: activity.description_id ?? '',
      description_en: activity.description_en ?? '',
      description_ja: activity.description_ja ?? '',
      start_date: monthValue(activity.start_date),
      end_date: monthValue(activity.end_date),
      location: activity.location ?? '',
      is_highlighted: Boolean(activity.is_highlighted),
      is_published: Boolean(activity.is_published),
    })
    setPreview(getPortfolioAssetUrl(activity))

    const loadLinks = async () => {
      const { data, error: linkError } = await supabase
        .from('activity_work_links')
        .select('work_id')
        .eq('activity_id', activity.id)
      if (linkError) reportError('admin.activity-editor.links', linkError)
      else setSelectedWorks((data ?? []).map((row) => row.work_id))
    }
    loadLinks()
  }, [activity])

  useEffect(() => {
    if (!file) return undefined
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const parents = useMemo(
    () => activities.filter((item) => String(item.group_id) === String(form.group_id) && item.id !== activity?.id),
    [activities, form.group_id, activity?.id]
  )

  const filteredWorks = useMemo(() => {
    const needle = workQuery.trim().toLowerCase()
    if (!needle) return works
    return works.filter((work) => getWorkTitle(work).toLowerCase().includes(needle))
  }, [works, workQuery])

  const toggleWork = (id) => {
    setSelectedWorks((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]
    )
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    let uploadedPath = null
    let databaseSaved = false

    try {
      let coverPath = activity?.cover_path ?? null
      let coverUrl = activity?.cover_url ?? null

      if (file) {
        const year = form.start_date?.slice(0,4) || new Date().getFullYear()
        uploadedPath = `activities/${year}/${crypto.randomUUID()}.${ext(file)}`
        const { error: uploadError } = await supabase.storage
          .from('portfolio-assets')
          .upload(uploadedPath, file, { upsert: false, contentType: file.type || undefined })
        if (uploadError) throw uploadError
        coverPath = uploadedPath
        coverUrl = null
      }

      const payload = {
        group_id: form.group_id ? Number(form.group_id) : null,
        parent_activity_id: form.parent_activity_id ? Number(form.parent_activity_id) : null,
        activity_type: form.activity_type.trim() || null,
        title_id: form.title_id.trim(),
        title_en: form.title_en.trim() || null,
        title_ja: form.title_ja.trim() || null,
        role_id: form.role_id.trim() || null,
        role_en: form.role_en.trim() || null,
        role_ja: form.role_ja.trim() || null,
        summary_id: form.summary_id.trim() || null,
        summary_en: form.summary_en.trim() || null,
        summary_ja: form.summary_ja.trim() || null,
        description_id: form.description_id.trim() || null,
        description_en: form.description_en.trim() || null,
        description_ja: form.description_ja.trim() || null,
        start_date: monthToDate(form.start_date),
        end_date: monthToDate(form.end_date),
        location: form.location.trim() || null,
        cover_path: coverPath,
        cover_url: coverUrl,
        is_highlighted: form.is_highlighted,
        is_published: form.is_published,
      }

      if (!payload.group_id || !payload.title_id || !payload.start_date) {
        throw new Error('Group, judul, dan bulan mulai wajib diisi.')
      }

      if (payload.end_date && payload.end_date < payload.start_date) {
        throw new Error('Bulan selesai tidak boleh lebih awal dari bulan mulai.')
      }

      const query = editing
        ? supabase.from('activities').update(payload).eq('id', activity.id)
        : supabase.from('activities').insert(payload)

      const { data, error: saveError } = await query
        .select(`*, group:activity_groups (*)`)
        .single()

      if (saveError) throw saveError
      databaseSaved = true

      const parent = data.parent_activity_id
        ? activities.find((item) => item.id === data.parent_activity_id) ?? null
        : null
      const savedActivity = { ...data, parent }

      const activityId = data.id
      const { error: clearError } = await supabase.from('activity_work_links').delete().eq('activity_id', activityId)
      if (clearError) throw clearError

      if (selectedWorks.length > 0) {
        const { error: linkError } = await supabase
          .from('activity_work_links')
          .insert(selectedWorks.map((workId) => ({ activity_id: activityId, work_id: workId })))
        if (linkError) throw linkError
      }

      if (file && editing && activity.cover_path && activity.cover_path !== uploadedPath) {
        const { error: removeError } = await supabase.storage.from('portfolio-assets').remove([activity.cover_path])
        if (removeError) reportWarning('admin.activity-editor.remove-old-cover', removeError)
      }

      onSaved(savedActivity)
    } catch (saveError) {
      reportError('admin.activity-editor.save', saveError)
      if (uploadedPath && !databaseSaved) {
        const { error: cleanupError } = await supabase.storage.from('portfolio-assets').remove([uploadedPath])
        if (cleanupError) reportWarning('admin.activity-editor.upload-cleanup', cleanupError)
      }

      const safeValidationMessages = new Set([
        'Group, judul, dan bulan mulai wajib diisi.',
        'Bulan selesai tidak boleh lebih awal dari bulan mulai.',
      ])

      setError(
        safeValidationMessages.has(saveError?.message)
          ? saveError.message
          : 'Gagal menyimpan aktivitas. Coba lagi.',
      )
      setSaving(false)
    }
  }

  return (
    <div className="admin-editor-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="admin-editor wide" role="dialog" aria-modal="true">
        <header className="admin-editor-header">
          <div><span className="admin-chip">{editing ? 'EDIT ACTIVITY' : 'NEW ACTIVITY'}</span><h2>{editing ? 'Edit aktivitas' : 'Tambah aktivitas'}</h2></div>
          <button className="admin-icon-button" onClick={onClose}>×</button>
        </header>

        <form className="admin-work-form" onSubmit={submit}>
          <div className="admin-form-grid two">
            <label>Group *<select value={form.group_id} onChange={(e) => { update('group_id',e.target.value); update('parent_activity_id','') }} required>
              <option value="">Pilih group</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.title_id}</option>)}
            </select></label>
            <label>Parent activity<select value={form.parent_activity_id} onChange={(e) => update('parent_activity_id',e.target.value)}>
              <option value="">Tidak ada</option>
              {parents.map((item) => <option key={item.id} value={item.id}>{item.title_id}</option>)}
            </select></label>
          </div>

          <div className="admin-form-grid two">
            <label>Judul Indonesia *<input value={form.title_id} onChange={(e) => update('title_id',e.target.value)} required /></label>
            <label>Tipe aktivitas<input placeholder="event, achievement, role…" value={form.activity_type} onChange={(e) => update('activity_type',e.target.value)} /></label>
          </div>

          <div className="admin-form-grid two">
            <label>Peran / posisi<input value={form.role_id} onChange={(e) => update('role_id',e.target.value)} /></label>
            <label>Lokasi<input value={form.location} onChange={(e) => update('location',e.target.value)} /></label>
          </div>

          <label>Ringkasan singkat<textarea rows="3" value={form.summary_id} onChange={(e) => update('summary_id',e.target.value)} /></label>
          <label>Deskripsi detail<textarea rows="6" value={form.description_id} onChange={(e) => update('description_id',e.target.value)} /></label>

          <details className="admin-translation-details">
            <summary>English & 日本語</summary>
            <div className="admin-form-grid two">
              <label>Title EN<input value={form.title_en} onChange={(e) => update('title_en',e.target.value)} /></label>
              <label>Title JP<input value={form.title_ja} onChange={(e) => update('title_ja',e.target.value)} /></label>
              <label>Role EN<input value={form.role_en} onChange={(e) => update('role_en',e.target.value)} /></label>
              <label>Role JP<input value={form.role_ja} onChange={(e) => update('role_ja',e.target.value)} /></label>
              <label>Summary EN<textarea rows="3" value={form.summary_en} onChange={(e) => update('summary_en',e.target.value)} /></label>
              <label>Summary JP<textarea rows="3" value={form.summary_ja} onChange={(e) => update('summary_ja',e.target.value)} /></label>
              <label>Description EN<textarea rows="5" value={form.description_en} onChange={(e) => update('description_en',e.target.value)} /></label>
              <label>Description JP<textarea rows="5" value={form.description_ja} onChange={(e) => update('description_ja',e.target.value)} /></label>
            </div>
          </details>

          <div className="admin-form-grid two">
            <label>Mulai (bulan & tahun) *<input type="month" value={form.start_date} onChange={(e) => update('start_date',e.target.value)} required /></label>
            <label>Selesai (bulan & tahun)<input type="month" min={form.start_date || undefined} value={form.end_date} onChange={(e) => update('end_date',e.target.value)} /></label>
          </div>

          <div className="admin-upload-grid">
            <label className="admin-file-picker">
              <span>Cover opsional</span>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <strong>{file ? file.name : 'Pilih gambar'}</strong>
            </label>
            <div className="admin-image-preview">{preview ? <img src={preview} alt="" /> : <span>Tanpa cover juga aman</span>}</div>
          </div>

          <section className="admin-related-selector">
            <header><div><strong>Karya terkait</strong><small>Karya ini akan keluar dari folder Fan-out di Activity Modal.</small></div><span>{selectedWorks.length} dipilih</span></header>
            <input type="search" placeholder="Cari karya…" value={workQuery} onChange={(e) => setWorkQuery(e.target.value)} />
            <div className="admin-related-work-list">
              {filteredWorks.map((work) => (
                <label key={work.id}>
                  <input type="checkbox" checked={selectedWorks.includes(work.id)} onChange={() => toggleWork(work.id)} />
                  <span>{getWorkTitle(work)}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="admin-publish-box">
            <label className="admin-switch-row"><span><strong>Highlight</strong><small>Card diberi aksen lebih kuat.</small></span><input type="checkbox" checked={form.is_highlighted} onChange={(e) => update('is_highlighted',e.target.checked)} /></label>
            <label className="admin-switch-row"><span><strong>Published</strong><small>Tampil di timeline publik.</small></span><input type="checkbox" checked={form.is_published} onChange={(e) => update('is_published',e.target.checked)} /></label>
          </div>

          {error && <div className="admin-form-error">{error}</div>}
          <div className="admin-editor-footer">
            <button type="button" className="admin-button secondary" onClick={onClose}>Batal</button>
            <button className="admin-button primary" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan aktivitas'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
