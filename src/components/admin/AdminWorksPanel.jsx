import { useEffect, useMemo, useState } from 'react'
import WorkEditor from './WorkEditor'
import { supabase } from '../../lib/supabase'
import { getWorkImageUrl } from '../../lib/storage'
import { formatProjectDateRange, getCategoryName, getWorkTitle } from '../../lib/workFormat'
import { reportError, reportWarning } from '../../lib/errorReporting'

export default function AdminWorksPanel() {
  const [works, setWorks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [editorWork, setEditorWork] = useState(undefined)
  const [deletingId, setDeletingId] = useState(null)

  const fetchAdminData = async () => {
    setLoading(true)
    setError('')

    const [worksResult, categoriesResult] = await Promise.all([
      supabase
        .from('works')
        .select(`*, category:categories (id, slug, name_id, name_en, name_ja)`)
        .order('project_sort_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('categories')
        .select('id, slug, name_id, name_en, name_ja, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ])

    if (worksResult.error) {
      reportError('admin.works.load', worksResult.error)
      setError('Gagal membaca data karya.')
    } else setWorks(worksResult.data ?? [])

    if (categoriesResult.error) reportError('admin.works.categories', categoriesResult.error)
    else setCategories(categoriesResult.data ?? [])

    setLoading(false)
  }

  useEffect(() => { fetchAdminData() }, [])

  const publishedCount = works.filter((work) => work.is_published).length
  const draftCount = works.length - publishedCount

  const filteredWorks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return works.filter((work) => {
      if (filter === 'published' && !work.is_published) return false
      if (filter === 'draft' && work.is_published) return false
      if (!needle) return true
      return [work.title_id, work.title_en, work.title_ja, getCategoryName(work.category)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    })
  }, [works, query, filter])

  const quickUpdate = async (work, changes) => {
    const { data, error: updateError } = await supabase
      .from('works')
      .update(changes)
      .eq('id', work.id)
      .select(`*, category:categories (id, slug, name_id, name_en, name_ja)`)
      .single()

    if (updateError) {
      reportError('admin.works.quick-update', updateError)
      alert('Perubahan gagal disimpan.')
      return
    }

    setWorks((current) => current.map((item) => item.id === work.id ? data : item))
  }

  const handleDelete = async (work) => {
    if (!window.confirm(`Hapus “${getWorkTitle(work)}”? Cover, carousel, dan data karya akan dihapus permanen.`)) return
    setDeletingId(work.id)

    try {
      const { data: mediaRows, error: mediaError } = await supabase
        .from('work_media')
        .select('image_path')
        .eq('work_id', work.id)

      if (mediaError) {
        reportError('admin.works.delete-media-read', mediaError)
        alert('Media carousel gagal dibaca. Data karya belum dihapus.')
        return
      }

      const storagePaths = [
        work.image_path,
        ...(mediaRows ?? []).map((item) => item.image_path),
      ].filter(Boolean)

      const { error: deleteError } = await supabase
        .from('works')
        .delete()
        .eq('id', work.id)

      if (deleteError) {
        reportError('admin.works.delete', deleteError)
        alert('Data karya gagal dihapus.')
        return
      }

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('works')
          .remove(storagePaths)

        if (storageError) {
          reportWarning('admin.works.storage-cleanup', storageError)
          alert('Karya sudah dihapus, tetapi ada file Storage yang gagal dibersihkan. Cek Storage bila perlu.')
        }
      }

      setWorks((current) => current.filter((item) => item.id !== work.id))
    } finally {
      setDeletingId(null)
    }
  }

  const handleSaved = (savedWork) => {
    setWorks((current) => {
      const exists = current.some((item) => item.id === savedWork.id)
      const next = exists
        ? current.map((item) => item.id === savedWork.id ? savedWork : item)
        : [savedWork, ...current]
      return [...next].sort((a, b) => (b.project_sort_date || b.created_at || '').localeCompare(a.project_sort_date || a.created_at || ''))
    })
    setEditorWork(undefined)
  }

  return (
    <>
      <header className="admin-topbar">
        <div>
          <span className="admin-kicker">WORKS MANAGEMENT</span>
          <h2>Karya.</h2>
        </div>
        <button className="admin-button primary" onClick={() => setEditorWork(null)}>+ Tambah karya</button>
      </header>

      <div className="admin-stats">
        <article><strong>{works.length}</strong><span>Total karya</span></article>
        <article><strong>{publishedCount}</strong><span>Published</span></article>
        <article><strong>{draftCount}</strong><span>Draft</span></article>
        <article><strong>{categories.length}</strong><span>Kategori aktif</span></article>
      </div>

      <div className="admin-toolbar">
        <input type="search" placeholder="Cari judul atau kategori…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="admin-filter-buttons">
          {[['all','Semua'],['published','Published'],['draft','Draft']].map(([value,label]) => (
            <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
      </div>

      {loading && <div className="admin-empty-state">Memuat karya…</div>}
      {!loading && error && <div className="admin-empty-state error">{error}</div>}
      {!loading && !error && filteredWorks.length === 0 && <div className="admin-empty-state">Tidak ada karya yang cocok.</div>}

      {!loading && filteredWorks.length > 0 && (
        <div className="admin-work-list">
          {filteredWorks.map((work) => {
            const imageUrl = getWorkImageUrl(work)
            const date = formatProjectDateRange(work.project_start_date, work.project_end_date)
            return (
              <article className="admin-work-row" key={work.id}>
                <div className="admin-work-thumb">{imageUrl ? <img src={imageUrl} alt="" /> : <span>—</span>}</div>
                <div className="admin-work-info">
                  <div className="admin-work-badges">
                    <span>{getCategoryName(work.category)}</span>
                    {work.is_published ? <span className="success">Published</span> : <span>Draft</span>}
                    {work.external_url && <span className="external">↗ Link karya</span>}
                  </div>
                  <h3>{getWorkTitle(work)}</h3>
                  <small>{date || 'Tanggal project belum diisi'}</small>
                </div>
                <div className="admin-work-controls">
                  <label><span>Publish</span><input type="checkbox" checked={Boolean(work.is_published)} onChange={(e) => quickUpdate(work,{is_published:e.target.checked})} /></label>
                  <button className="admin-row-button" onClick={() => setEditorWork(work)}>Edit</button>
                  <button className="admin-row-button danger" disabled={deletingId === work.id} onClick={() => handleDelete(work)}>{deletingId === work.id ? '…' : 'Hapus'}</button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editorWork !== undefined && (
        <WorkEditor work={editorWork} categories={categories} onClose={() => setEditorWork(undefined)} onSaved={handleSaved} />
      )}
    </>
  )
}
