import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { reportError, reportWarning } from '../../lib/errorReporting'
import ShowcaseEditor from './ShowcaseEditor'

function slideTitle(slide) {
  return slide?.title_id || slide?.title_en || slide?.title_ja || 'Tanpa judul'
}

export default function AdminShowcasePanel() {
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editorSlide, setEditorSlide] = useState(undefined)
  const [deletingId, setDeletingId] = useState(null)
  const [reordering, setReordering] = useState(false)

  const fetchSlides = async () => {
    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('home_showcase_slides')
      .select(`
        *,
        cta_category:categories (id, slug, name_id, name_en, name_ja),
        images:home_showcase_images (id, image_path, image_url, work_id, sort_order)
      `)
      .order('slide_order', { ascending: true })
      .order('id', { ascending: true })

    if (queryError) {
      reportError('admin.showcase.load', queryError)
      setError('Gagal membaca slide Showcase. Pastikan migration SQL sudah dijalankan.')
      setSlides([])
    } else {
      setSlides((data ?? []).map((slide) => ({
        ...slide,
        images: (slide.images ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      })))
    }

    setLoading(false)
  }

  useEffect(() => { fetchSlides() }, [])

  const activeCount = slides.filter((slide) => slide.is_active).length
  const imageCount = slides.reduce((total, slide) => total + (slide.images?.length ?? 0), 0)

  const quickToggle = async (slide) => {
    const { data, error: updateError } = await supabase
      .from('home_showcase_slides')
      .update({ is_active: !slide.is_active })
      .eq('id', slide.id)
      .select('id, is_active')
      .single()

    if (updateError) {
      reportError('admin.showcase.toggle', updateError)
      alert('Status slide gagal diubah.')
      return
    }

    setSlides((current) => current.map((item) => item.id === slide.id ? { ...item, is_active: data.is_active } : item))
  }

  const moveSlide = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= slides.length || reordering) return

    const currentSlide = slides[index]
    const targetSlide = slides[targetIndex]
    const currentOrder = currentSlide.slide_order ?? index
    const targetOrder = targetSlide.slide_order ?? targetIndex

    setReordering(true)

    const [first, second] = await Promise.all([
      supabase.from('home_showcase_slides').update({ slide_order: targetOrder }).eq('id', currentSlide.id),
      supabase.from('home_showcase_slides').update({ slide_order: currentOrder }).eq('id', targetSlide.id),
    ])

    if (first.error || second.error) {
      reportError('admin.showcase.reorder', first.error || second.error)
      alert('Urutan slide gagal diubah.')
      await fetchSlides()
      setReordering(false)
      return
    }

    setSlides((current) => {
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return next.map((item, itemIndex) => ({ ...item, slide_order: itemIndex + 1 }))
    })

    // Normalize ordering so future inserts/reorders stay predictable.
    const normalized = [...slides]
    const [moved] = normalized.splice(index, 1)
    normalized.splice(targetIndex, 0, moved)
    await Promise.all(normalized.map((item, itemIndex) => (
      supabase.from('home_showcase_slides').update({ slide_order: itemIndex + 1 }).eq('id', item.id)
    )))

    setReordering(false)
  }

  const handleDelete = async (slide) => {
    if (!window.confirm(`Hapus slide “${slideTitle(slide)}”? Gambar upload khusus pada slide ini juga akan dihapus.`)) return
    setDeletingId(slide.id)

    try {
      const customPaths = (slide.images ?? []).map((image) => image.image_path).filter(Boolean)

      const { error: deleteError } = await supabase
        .from('home_showcase_slides')
        .delete()
        .eq('id', slide.id)

      if (deleteError) {
        reportError('admin.showcase.delete', deleteError)
        alert('Slide gagal dihapus.')
        return
      }

      if (customPaths.length > 0) {
        const { error: storageError } = await supabase.storage.from('works').remove(customPaths)
        if (storageError) {
          reportWarning('admin.showcase.storage-cleanup', storageError)
          alert('Slide sudah dihapus, tetapi beberapa file Storage gagal dibersihkan.')
        }
      }

      setSlides((current) => current.filter((item) => item.id !== slide.id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <header className="admin-topbar">
        <div>
          <span className="admin-kicker">HOMEPAGE SHOWCASE</span>
          <h2>Showcase.</h2>
        </div>
        <button className="admin-button primary" onClick={() => setEditorSlide(null)}>+ Tambah slide</button>
      </header>

      <div className="admin-stats showcase-admin-stats">
        <article><strong>{slides.length}</strong><span>Total slide</span></article>
        <article><strong>{activeCount}</strong><span>Aktif di Home</span></article>
        <article><strong>{imageCount}</strong><span>Total gambar</span></article>
        <article><strong>3</strong><span>Maks. gambar / slide</span></article>
      </div>

      <div className="admin-showcase-note">
        <strong>Showcase Home</strong>
        <span>Atur cerita utama di section “Selected Works”. Setiap slide bisa memakai maksimal 3 cover karya atau gambar upload khusus.</span>
      </div>

      {loading && <div className="admin-empty-state">Memuat slide…</div>}
      {!loading && error && <div className="admin-empty-state error">{error}</div>}
      {!loading && !error && slides.length === 0 && (
        <div className="admin-empty-state">Belum ada slide. Tambahkan slide pertama untuk mulai mengisi Showcase Home.</div>
      )}

      {!loading && !error && slides.length > 0 && (
        <div className="admin-showcase-list">
          {slides.map((slide, index) => (
            <article className="admin-showcase-row" key={slide.id}>
              <div className="admin-showcase-order">{String(index + 1).padStart(2, '0')}</div>

              <div className="admin-showcase-info">
                <div className="admin-work-badges">
                  <span>{slide.images?.length ?? 0} gambar</span>
                  <span>{slide.autoplay_seconds ?? 7}s</span>
                  {slide.cta_category?.slug && <span>{slide.cta_category.slug}</span>}
                  {slide.is_active ? <span className="success">Aktif</span> : <span>Nonaktif</span>}
                </div>
                <h3>{slideTitle(slide)}</h3>
                <small>{slide.description_id || 'Belum ada deskripsi Indonesia.'}</small>
              </div>

              <div className="admin-showcase-controls">
                <div className="admin-showcase-move">
                  <button type="button" onClick={() => moveSlide(index, -1)} disabled={index === 0 || reordering} aria-label="Geser slide ke atas">↑</button>
                  <button type="button" onClick={() => moveSlide(index, 1)} disabled={index === slides.length - 1 || reordering} aria-label="Geser slide ke bawah">↓</button>
                </div>
                <label><span>Aktif</span><input type="checkbox" checked={Boolean(slide.is_active)} onChange={() => quickToggle(slide)} /></label>
                <button className="admin-row-button" onClick={() => setEditorSlide(slide)}>Edit</button>
                <button className="admin-row-button danger" disabled={deletingId === slide.id} onClick={() => handleDelete(slide)}>{deletingId === slide.id ? '…' : 'Hapus'}</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editorSlide !== undefined && (
        <ShowcaseEditor
          slide={editorSlide}
          suggestedOrder={slides.length + 1}
          onClose={() => setEditorSlide(undefined)}
          onSaved={async () => {
            setEditorSlide(undefined)
            await fetchSlides()
          }}
        />
      )}
    </>
  )
}
