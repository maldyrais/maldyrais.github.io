import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { reportError } from '../../lib/errorReporting'

const EMPTY = {
  slug: '',
  title_id: '',
  title_en: '',
  title_ja: '',
  type: '',
  summary_id: '',
  summary_en: '',
  summary_ja: '',
  start_date: '',
  end_date: '',
  accent: '',
  is_published: true,
}

function monthValue(value) {
  if (!value) return ''
  return String(value).slice(0, 7)
}

function monthToDate(value) {
  return value ? `${value}-01` : null
}


export default function ActivityGroupEditor({ group, onClose, onSaved }) {
  const editing = Boolean(group?.id)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!group) {
      setForm(EMPTY)
      return
    }
    setForm({
      slug: group.slug ?? '',
      title_id: group.title_id ?? '',
      title_en: group.title_en ?? '',
      title_ja: group.title_ja ?? '',
      type: group.type ?? '',
      summary_id: group.summary_id ?? '',
      summary_en: group.summary_en ?? '',
      summary_ja: group.summary_ja ?? '',
      start_date: monthValue(group.start_date),
      end_date: monthValue(group.end_date),
      accent: group.accent ?? '',
      is_published: Boolean(group.is_published),
    })
  }, [group])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      title_id: form.title_id.trim(),
      title_en: form.title_en.trim() || null,
      title_ja: form.title_ja.trim() || null,
      type: form.type.trim() || null,
      summary_id: form.summary_id.trim() || null,
      summary_en: form.summary_en.trim() || null,
      summary_ja: form.summary_ja.trim() || null,
      start_date: monthToDate(form.start_date),
      end_date: monthToDate(form.end_date),
      accent: form.accent.trim() || null,
      is_published: form.is_published,
    }

    if (!payload.slug || !payload.title_id || !payload.start_date) {
      setError('Slug, nama group, dan bulan mulai wajib diisi.')
      setSaving(false)
      return
    }

    const query = editing
      ? supabase.from('activity_groups').update(payload).eq('id', group.id)
      : supabase.from('activity_groups').insert(payload)

    const { data, error: saveError } = await query.select('*').single()

    if (saveError) {
      reportError('admin.activity-group.save', saveError)
      setError('Gagal menyimpan group. Coba lagi.')
      setSaving(false)
      return
    }

    onSaved(data)
  }

  return (
    <div className="admin-editor-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="admin-editor" role="dialog" aria-modal="true">
        <header className="admin-editor-header">
          <div><span className="admin-chip">{editing ? 'EDIT GROUP' : 'NEW GROUP'}</span><h2>{editing ? 'Edit group' : 'Tambah group'}</h2></div>
          <button className="admin-icon-button" onClick={onClose}>×</button>
        </header>

        <form className="admin-work-form" onSubmit={submit}>
          <div className="admin-form-grid two">
            <label>Nama group *<input value={form.title_id} onChange={(e) => update('title_id',e.target.value)} required /></label>
            <label>Slug *<input value={form.slug} onChange={(e) => update('slug',e.target.value)} required /></label>
          </div>
          <div className="admin-form-grid two">
            <label>Type<input placeholder="organization, education, work…" value={form.type} onChange={(e) => update('type',e.target.value)} /></label>
            <label>Accent opsional<input placeholder="#3976e8" value={form.accent} onChange={(e) => update('accent',e.target.value)} /></label>
          </div>
          <label>Ringkasan Indonesia<textarea rows="4" value={form.summary_id} onChange={(e) => update('summary_id',e.target.value)} /></label>

          <details className="admin-translation-details">
            <summary>English & 日本語</summary>
            <div className="admin-form-grid two">
              <label>Title EN<input value={form.title_en} onChange={(e) => update('title_en',e.target.value)} /></label>
              <label>Title JP<input value={form.title_ja} onChange={(e) => update('title_ja',e.target.value)} /></label>
              <label>Summary EN<textarea rows="4" value={form.summary_en} onChange={(e) => update('summary_en',e.target.value)} /></label>
              <label>Summary JP<textarea rows="4" value={form.summary_ja} onChange={(e) => update('summary_ja',e.target.value)} /></label>
            </div>
          </details>

          <div className="admin-form-grid two">
            <label>Mulai (bulan & tahun) *<input type="month" value={form.start_date} onChange={(e) => update('start_date',e.target.value)} required /></label>
            <label>Selesai (bulan & tahun)<input type="month" min={form.start_date || undefined} value={form.end_date} onChange={(e) => update('end_date',e.target.value)} /></label>
          </div>

          <label className="admin-switch-row standalone">
            <span><strong>Published</strong><small>Group tampil di timeline publik.</small></span>
            <input type="checkbox" checked={form.is_published} onChange={(e) => update('is_published',e.target.checked)} />
          </label>

          {error && <div className="admin-form-error">{error}</div>}
          <div className="admin-editor-footer">
            <button type="button" className="admin-button secondary" onClick={onClose}>Batal</button>
            <button className="admin-button primary" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
