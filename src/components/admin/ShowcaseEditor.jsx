import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getHomeShowcaseImageUrl, getWorkImageUrl } from '../../lib/storage'
import { getCategoryName, getWorkTitle } from '../../lib/workFormat'
import { reportError, reportWarning } from '../../lib/errorReporting'

const EMPTY_FORM = {
  title_id: '',
  title_en: '',
  title_ja: '',
  description_id: '',
  description_en: '',
  description_ja: '',
  cta_label_id: '',
  cta_label_en: '',
  cta_label_ja: '',
  cta_url: '',
  cta_category_id: '',
  slide_order: 1,
  autoplay_seconds: 7,
  is_active: true,
}

function extensionFromFile(file) {
  const raw = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  return raw.replace(/[^a-z0-9]/g, '') || 'jpg'
}

function existingImageItem(row) {
  return {
    key: `existing-${row.id}`,
    kind: 'existing',
    id: row.id,
    work_id: row.work_id,
    image_path: row.image_path,
    image_url: row.image_url,
    sort_order: row.sort_order ?? 0,
    work: row.work ?? null,
    previewUrl: getHomeShowcaseImageUrl(row),
  }
}

function newWorkItem(work) {
  return {
    key: `work-${work.id}-${crypto.randomUUID()}`,
    kind: 'new-work',
    work_id: work.id,
    work,
    previewUrl: getWorkImageUrl(work),
  }
}

function newFileItem(file) {
  return {
    key: `file-${crypto.randomUUID()}`,
    kind: 'new-file',
    file,
    previewUrl: URL.createObjectURL(file),
  }
}

export default function ShowcaseEditor({ slide, suggestedOrder, onClose, onSaved }) {
  const editing = Boolean(slide?.id)
  const [form, setForm] = useState({ ...EMPTY_FORM, slide_order: suggestedOrder || 1 })
  const [categories, setCategories] = useState([])
  const [works, setWorks] = useState([])
  const [workChoice, setWorkChoice] = useState('')
  const [imageItems, setImageItems] = useState([])
  const [originalImages, setOriginalImages] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    setForm({
      ...EMPTY_FORM,
      title_id: slide?.title_id ?? '',
      title_en: slide?.title_en ?? '',
      title_ja: slide?.title_ja ?? '',
      description_id: slide?.description_id ?? '',
      description_en: slide?.description_en ?? '',
      description_ja: slide?.description_ja ?? '',
      cta_label_id: slide?.cta_label_id ?? '',
      cta_label_en: slide?.cta_label_en ?? '',
      cta_label_ja: slide?.cta_label_ja ?? '',
      cta_url: slide?.cta_url ?? '',
      cta_category_id: slide?.cta_category_id ? String(slide.cta_category_id) : '',
      slide_order: slide?.slide_order ?? suggestedOrder ?? 1,
      autoplay_seconds: slide?.autoplay_seconds ?? 7,
      is_active: slide?.is_active ?? true,
    })
    setError('')
    setWorkChoice('')
  }, [slide, suggestedOrder])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoadingData(true)
      setError('')

      const requests = [
        supabase
          .from('categories')
          .select('id, slug, name_id, name_en, name_ja, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('works')
          .select(`
            id,
            title_id,
            title_en,
            title_ja,
            image_path,
            image_url,
            project_sort_date,
            category:categories (id, slug, name_id, name_en, name_ja)
          `)
          .eq('is_published', true)
          .order('project_sort_date', { ascending: false })
          .limit(1000),
      ]

      if (slide?.id) {
        requests.push(
          supabase
            .from('home_showcase_images')
            .select(`
              id,
              slide_id,
              work_id,
              image_path,
              image_url,
              sort_order,
              work:works (
                id,
                title_id,
                title_en,
                title_ja,
                image_path,
                image_url,
                is_published,
                category:categories (id, slug, name_id, name_en, name_ja)
              )
            `)
            .eq('slide_id', slide.id)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true }),
        )
      }

      const results = await Promise.all(requests)
      if (cancelled) return

      const [categoriesResult, worksResult, imagesResult] = results

      if (categoriesResult.error) reportError('admin.showcase.categories', categoriesResult.error)
      else setCategories(categoriesResult.data ?? [])

      if (worksResult.error) {
        reportError('admin.showcase.works', worksResult.error)
        setWorks([])
      } else {
        setWorks(worksResult.data ?? [])
      }

      if (imagesResult) {
        if (imagesResult.error) {
          reportError('admin.showcase.images', imagesResult.error)
          setImageItems([])
          setOriginalImages([])
          setError('Gambar slide gagal dimuat.')
        } else {
          const rows = imagesResult.data ?? []
          setOriginalImages(rows)
          setImageItems(rows.map(existingImageItem))
        }
      } else {
        setImageItems([])
        setOriginalImages([])
      }

      setLoadingData(false)
    }

    loadData()
    return () => { cancelled = true }
  }, [slide?.id])

  useEffect(() => {
    return () => {
      imageItems.forEach((item) => {
        if (item.kind === 'new-file' && item.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
    }
  }, [])

  const selectedWork = useMemo(() => {
    if (!workChoice) return null
    return works.find((work) => String(work.id) === String(workChoice)) ?? null
  }, [works, workChoice])

  const addSelectedWork = () => {
    if (!selectedWork || imageItems.length >= 3) return

    const alreadyUsed = imageItems.some((item) => String(item.work_id || '') === String(selectedWork.id))
    if (alreadyUsed) {
      setError('Karya tersebut sudah dipakai pada slide ini.')
      return
    }

    const previewUrl = getWorkImageUrl(selectedWork)
    if (!previewUrl) {
      setError('Karya yang dipilih tidak memiliki cover yang bisa ditampilkan.')
      return
    }

    setImageItems((current) => [...current, newWorkItem(selectedWork)])
    setWorkChoice('')
    setError('')
  }

  const addFiles = (event) => {
    const slotsLeft = Math.max(0, 3 - imageItems.length)
    const files = Array.from(event.target.files ?? [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, slotsLeft)

    if (files.length) {
      setImageItems((current) => [...current, ...files.map(newFileItem)])
      setError('')
    }

    event.target.value = ''
  }

  const removeImage = (key) => {
    setImageItems((current) => {
      const item = current.find((entry) => entry.key === key)
      if (item?.kind === 'new-file' && item.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl)
      }
      return current.filter((entry) => entry.key !== key)
    })
  }

  const moveImage = (index, direction) => {
    setImageItems((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const syncImages = async (slideId) => {
    const uploadedPaths = []

    try {
      const currentExistingIds = new Set(
        imageItems.filter((item) => item.kind === 'existing').map((item) => item.id),
      )

      const removedRows = originalImages.filter((row) => !currentExistingIds.has(row.id))
      const removedIds = removedRows.map((row) => row.id)

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('home_showcase_images')
          .delete()
          .in('id', removedIds)
        if (deleteError) throw deleteError
      }

      for (let index = 0; index < imageItems.length; index += 1) {
        const item = imageItems[index]

        if (item.kind === 'existing') {
          const { error: updateError } = await supabase
            .from('home_showcase_images')
            .update({ sort_order: index })
            .eq('id', item.id)
          if (updateError) throw updateError
          continue
        }

        if (item.kind === 'new-work') {
          const { error: insertError } = await supabase
            .from('home_showcase_images')
            .insert({
              slide_id: slideId,
              work_id: item.work_id,
              image_path: null,
              image_url: null,
              sort_order: index,
            })
          if (insertError) throw insertError
          continue
        }

        if (item.kind === 'new-file') {
          const extension = extensionFromFile(item.file)
          const path = `showcase/${slideId}/${crypto.randomUUID()}.${extension}`

          const { error: uploadError } = await supabase.storage
            .from('works')
            .upload(path, item.file, {
              cacheControl: '3600',
              upsert: false,
              contentType: item.file.type || undefined,
            })

          if (uploadError) throw uploadError
          uploadedPaths.push(path)

          const { error: insertError } = await supabase
            .from('home_showcase_images')
            .insert({
              slide_id: slideId,
              work_id: null,
              image_path: path,
              image_url: null,
              sort_order: index,
            })

          if (insertError) throw insertError
        }
      }

      const removedPaths = removedRows.map((row) => row.image_path).filter(Boolean)
      if (removedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage.from('works').remove(removedPaths)
        if (cleanupError) reportWarning('admin.showcase.removed-image-cleanup', cleanupError)
      }

      return uploadedPaths
    } catch (syncError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('works').remove(uploadedPaths)
      }
      throw syncError
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.title_id.trim()) {
      setError('Judul Indonesia wajib diisi.')
      return
    }

    if (imageItems.length > 3) {
      setError('Maksimal 3 gambar per slide.')
      return
    }

    setSaving(true)
    let savedSlide = null
    let createdThisSave = false

    try {
      const payload = {
        title_id: form.title_id.trim(),
        title_en: form.title_en.trim() || null,
        title_ja: form.title_ja.trim() || null,
        description_id: form.description_id.trim() || null,
        description_en: form.description_en.trim() || null,
        description_ja: form.description_ja.trim() || null,
        cta_label_id: form.cta_label_id.trim() || null,
        cta_label_en: form.cta_label_en.trim() || null,
        cta_label_ja: form.cta_label_ja.trim() || null,
        cta_url: form.cta_url.trim() || null,
        cta_category_id: form.cta_category_id ? Number(form.cta_category_id) : null,
        slide_order: Math.max(1, Number(form.slide_order) || 1),
        autoplay_seconds: Math.max(3, Math.min(60, Number(form.autoplay_seconds) || 7)),
        is_active: Boolean(form.is_active),
      }

      let result
      if (editing) {
        result = await supabase
          .from('home_showcase_slides')
          .update(payload)
          .eq('id', slide.id)
          .select('*')
          .single()
      } else {
        result = await supabase
          .from('home_showcase_slides')
          .insert(payload)
          .select('*')
          .single()
        createdThisSave = true
      }

      if (result.error) throw result.error
      savedSlide = result.data

      await syncImages(savedSlide.id)
      onSaved(savedSlide)
    } catch (saveError) {
      reportError('admin.showcase.save', saveError)

      if (createdThisSave && savedSlide?.id) {
        await supabase.from('home_showcase_slides').delete().eq('id', savedSlide.id)
      }

      setError('Slide gagal disimpan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="admin-editor wide showcase-editor" role="dialog" aria-modal="true" aria-label={editing ? 'Edit showcase slide' : 'Tambah showcase slide'}>
        <header className="admin-editor-header">
          <div>
            <span className="admin-kicker">SHOWCASE SLIDE</span>
            <h2>{editing ? 'Edit slide.' : 'Slide baru.'}</h2>
          </div>
          <button type="button" className="admin-row-button" onClick={onClose}>Tutup</button>
        </header>

        <form className="admin-work-form" onSubmit={handleSubmit}>
          <label>
            Judul Indonesia *
            <input value={form.title_id} onChange={(event) => update('title_id', event.target.value)} placeholder="Mengajar & berbagi." />
          </label>

          <label>
            Deskripsi Indonesia
            <textarea rows="4" value={form.description_id} onChange={(event) => update('description_id', event.target.value)} placeholder="Deskripsi singkat tentang sisi ini dari karya atau aktivitasmu." />
          </label>

          <details className="admin-language-details">
            <summary>Terjemahan EN / 日本語</summary>
            <div className="admin-form-grid">
              <label>
                Title EN
                <input value={form.title_en} onChange={(event) => update('title_en', event.target.value)} />
              </label>
              <label>
                Description EN
                <textarea rows="3" value={form.description_en} onChange={(event) => update('description_en', event.target.value)} />
              </label>
              <label>
                日本語タイトル
                <input value={form.title_ja} onChange={(event) => update('title_ja', event.target.value)} />
              </label>
              <label>
                日本語説明
                <textarea rows="3" value={form.description_ja} onChange={(event) => update('description_ja', event.target.value)} />
              </label>
            </div>
          </details>

          <section className="admin-media-section showcase-media-section">
            <div className="admin-media-section-heading">
              <div>
                <strong>Visual slide</strong>
                <small>Maksimal 3 gambar. Campurkan cover karya dengan upload foto khusus jika perlu.</small>
              </div>
              <span className="admin-media-count">{imageItems.length}/3</span>
            </div>

            {loadingData && <div className="admin-media-state">Memuat pilihan karya…</div>}

            {!loadingData && imageItems.length > 0 && (
              <div className="admin-showcase-image-grid">
                {imageItems.map((item, index) => (
                  <article className="admin-showcase-image-item" key={item.key}>
                    <div className="admin-showcase-image-preview">
                      {item.previewUrl ? <img src={item.previewUrl} alt="" /> : <span>Preview</span>}
                      <span>{index + 1}</span>
                    </div>
                    <div className="admin-showcase-image-meta">
                      <strong>{item.work ? getWorkTitle(item.work) : item.file?.name || 'Upload khusus'}</strong>
                      <small>{item.work ? getCategoryName(item.work.category) : 'Custom image'}</small>
                    </div>
                    <div className="admin-media-item-actions">
                      <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="Geser ke kiri">←</button>
                      <button type="button" onClick={() => moveImage(index, 1)} disabled={index === imageItems.length - 1} aria-label="Geser ke kanan">→</button>
                      <button type="button" className="danger" onClick={() => removeImage(item.key)} aria-label="Hapus gambar">×</button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!loadingData && imageItems.length === 0 && (
              <div className="admin-media-empty">Belum ada gambar. Slide tetap bisa disimpan, tapi sebaiknya isi 1–3 visual.</div>
            )}

            {!loadingData && imageItems.length < 3 && (
              <div className="admin-showcase-add-grid">
                <div className="admin-showcase-work-picker">
                  <label>
                    Ambil dari karya
                    <select value={workChoice} onChange={(event) => setWorkChoice(event.target.value)}>
                      <option value="">Pilih karya…</option>
                      {works.map((work) => (
                        <option key={work.id} value={work.id}>
                          {getWorkTitle(work)}{work.category ? ` — ${getCategoryName(work.category)}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="admin-button secondary" onClick={addSelectedWork} disabled={!selectedWork}>+ Tambahkan karya</button>
                </div>

                <label className="admin-media-add showcase-upload-add">
                  <input type="file" accept="image/*" multiple onChange={addFiles} />
                  <span>＋ Upload gambar khusus</span>
                </label>
              </div>
            )}
          </section>

          <section className="admin-showcase-cta-box">
            <div className="admin-media-section-heading">
              <div>
                <strong>Tombol CTA</strong>
                <small>Pilih kategori agar tombol otomatis membuka halaman Works dengan filter yang sesuai.</small>
              </div>
            </div>

            <div className="admin-form-grid two">
              <label>
                Filter kategori
                <select value={form.cta_category_id} onChange={(event) => update('cta_category_id', event.target.value)}>
                  <option value="">Semua karya</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{getCategoryName(category)} ({category.slug})</option>
                  ))}
                </select>
              </label>
              <label>
                URL custom <span className="admin-field-help">opsional</span>
                <input value={form.cta_url} onChange={(event) => update('cta_url', event.target.value)} placeholder="/works atau https://…" />
              </label>
            </div>

            <label>
              Label CTA Indonesia
              <input value={form.cta_label_id} onChange={(event) => update('cta_label_id', event.target.value)} placeholder="Lihat semua karya" />
            </label>

            <details className="admin-language-details compact">
              <summary>Label CTA EN / 日本語</summary>
              <div className="admin-form-grid two">
                <label>EN<input value={form.cta_label_en} onChange={(event) => update('cta_label_en', event.target.value)} /></label>
                <label>日本語<input value={form.cta_label_ja} onChange={(event) => update('cta_label_ja', event.target.value)} /></label>
              </div>
            </details>
          </section>

          <div className="admin-form-grid two">
            <label>
              Urutan slide
              <input type="number" min="1" max="999" value={form.slide_order} onChange={(event) => update('slide_order', event.target.value)} />
            </label>
            <label>
              Durasi autoplay (detik)
              <input type="number" min="3" max="60" value={form.autoplay_seconds} onChange={(event) => update('autoplay_seconds', event.target.value)} />
            </label>
          </div>

          <div className="admin-publish-box">
            <label className="admin-switch-row">
              <span>
                <strong>Aktifkan slide</strong>
                <small>Slide aktif akan ikut tampil dan berputar otomatis di Home.</small>
              </span>
              <input type="checkbox" checked={Boolean(form.is_active)} onChange={(event) => update('is_active', event.target.checked)} />
            </label>
          </div>

          {error && <div className="admin-form-error">{error}</div>}

          <footer className="admin-editor-footer">
            <button type="button" className="admin-button secondary" onClick={onClose}>Batal</button>
            <button className="admin-button primary" disabled={saving || loadingData}>{saving ? 'Menyimpan…' : 'Simpan slide'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
