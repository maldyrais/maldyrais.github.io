import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getWorkImageUrl, getWorkMediaUrl } from '../../lib/storage'
import { reportError, reportWarning } from '../../lib/errorReporting'

const EMPTY_FORM = {
  title_id: '',
  title_en: '',
  title_ja: '',
  description_id: '',
  description_en: '',
  description_ja: '',
  category_id: '',
  project_start_date: '',
  project_end_date: '',
  tools: '',
  external_url: '',
  is_published: true,
}

function extensionFromFile(file) {
  const raw = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safe = raw.replace(/[^a-z0-9]/g, '')
  return safe || 'jpg'
}

function existingMediaItem(row) {
  return {
    key: `existing-${row.id}`,
    kind: 'existing',
    id: row.id,
    work_id: row.work_id,
    image_path: row.image_path,
    image_url: row.image_url,
    sort_order: row.sort_order ?? 0,
    previewUrl: getWorkMediaUrl(row),
  }
}

function newMediaItem(file) {
  return {
    key: `new-${crypto.randomUUID()}`,
    kind: 'new',
    file,
    previewUrl: URL.createObjectURL(file),
  }
}

export default function WorkEditor({ work, categories, onClose, onSaved }) {
  const [workingWork, setWorkingWork] = useState(work ?? null)
  const editing = Boolean(workingWork?.id)

  const [form, setForm] = useState(EMPTY_FORM)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [mediaItems, setMediaItems] = useState([])
  const [originalMedia, setOriginalMedia] = useState([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setWorkingWork(work ?? null)
    setFile(null)
    setError('')
    setMediaError('')

    if (!work) {
      setForm({ ...EMPTY_FORM })
      setPreviewUrl('')
      setMediaItems([])
      setOriginalMedia([])
      return
    }

    setForm({
      title_id: work.title_id ?? '',
      title_en: work.title_en ?? '',
      title_ja: work.title_ja ?? '',
      description_id: work.description_id ?? '',
      description_en: work.description_en ?? '',
      description_ja: work.description_ja ?? '',
      category_id: work.category_id ? String(work.category_id) : '',
      project_start_date: work.project_start_date ?? '',
      project_end_date: work.project_end_date ?? '',
      tools: Array.isArray(work.tools) ? work.tools.join(', ') : '',
      external_url: work.external_url ?? '',
      is_published: Boolean(work.is_published),
    })
    setPreviewUrl(getWorkImageUrl(work) ?? '')
  }, [work])

  useEffect(() => {
    if (!file) return undefined
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    let cancelled = false

    const loadMedia = async () => {
      const workId = work?.id

      if (!workId) {
        setMediaItems([])
        setOriginalMedia([])
        setMediaLoading(false)
        return
      }

      setMediaLoading(true)
      setMediaError('')

      const { data, error: queryError } = await supabase
        .from('work_media')
        .select('id, work_id, image_path, image_url, sort_order, created_at')
        .eq('work_id', workId)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true })

      if (cancelled) return

      if (queryError) {
        reportError('admin.work-editor.media-load', queryError)
        setMediaItems([])
        setOriginalMedia([])
        setMediaError('Media carousel gagal dimuat. Muat ulang halaman lalu coba lagi.')
      } else {
        const rows = data ?? []
        setOriginalMedia(rows)
        setMediaItems(rows.map(existingMediaItem))
      }

      setMediaLoading(false)
    }

    loadMedia()
    return () => { cancelled = true }
  }, [work?.id])

  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => {
        if (item.kind === 'new' && item.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
    }
  }, [])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const addMediaFiles = (event) => {
    const files = Array.from(event.target.files ?? []).filter((item) => item.type.startsWith('image/'))
    if (!files.length) return

    setMediaItems((current) => [
      ...current,
      ...files.map(newMediaItem),
    ])

    event.target.value = ''
  }

  const removeMedia = (key) => {
    setMediaItems((current) => {
      const item = current.find((entry) => entry.key === key)
      if (item?.kind === 'new' && item.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl)
      }
      return current.filter((entry) => entry.key !== key)
    })
  }

  const moveMedia = (index, direction) => {
    setMediaItems((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const syncGallery = async (workId) => {
    const uploadedPaths = []

    try {
      const currentExistingIds = new Set(
        mediaItems
          .filter((item) => item.kind === 'existing')
          .map((item) => item.id),
      )

      const removedRows = originalMedia.filter((row) => !currentExistingIds.has(row.id))
      const removedIds = removedRows.map((row) => row.id)

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('work_media')
          .delete()
          .in('id', removedIds)

        if (deleteError) throw deleteError
      }

      const existingUpdates = mediaItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.kind === 'existing')

      for (const { item, index } of existingUpdates) {
        const { error: updateError } = await supabase
          .from('work_media')
          .update({ sort_order: index })
          .eq('id', item.id)

        if (updateError) throw updateError
      }

      const newRows = []

      for (let index = 0; index < mediaItems.length; index += 1) {
        const item = mediaItems[index]
        if (item.kind !== 'new') continue

        const extension = extensionFromFile(item.file)
        const path = `media/${workId}/${crypto.randomUUID()}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('works')
          .upload(path, item.file, {
            cacheControl: '3600',
            upsert: false,
            contentType: item.file.type || undefined,
          })

        if (uploadError) throw uploadError

        uploadedPaths.push(path)
        newRows.push({
          work_id: workId,
          image_path: path,
          image_url: null,
          sort_order: index,
        })
      }

      if (newRows.length > 0) {
        const { error: insertError } = await supabase
          .from('work_media')
          .insert(newRows)

        if (insertError) throw insertError
      }

      const removedPaths = removedRows
        .map((row) => row.image_path)
        .filter(Boolean)

      if (removedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from('works')
          .remove(removedPaths)

        if (cleanupError) {
          reportWarning('admin.work-editor.removed-media-cleanup', cleanupError)
        }
      }

      return uploadedPaths
    } catch (galleryError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('works').remove(uploadedPaths)
      }
      throw galleryError
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!editing && !file && !workingWork?.image_path && !workingWork?.image_url) {
      setError('Pilih satu gambar cover karya.')
      return
    }

    setSaving(true)

    let uploadedCoverPath = null
    let savedWork = null
    let createdThisSave = false

    try {
      let imagePath = workingWork?.image_path ?? null
      let imageUrl = workingWork?.image_url ?? null

      if (file) {
        const extension = extensionFromFile(file)
        const year = form.project_start_date?.slice(0, 4) || new Date().getFullYear()
        uploadedCoverPath = `${year}/${crypto.randomUUID()}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('works')
          .upload(uploadedCoverPath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || undefined,
          })

        if (uploadError) throw uploadError
        imagePath = uploadedCoverPath
        imageUrl = null
      }

      const payload = {
        title_id: form.title_id.trim(),
        title_en: form.title_en.trim() || null,
        title_ja: form.title_ja.trim() || null,
        description_id: form.description_id.trim() || null,
        description_en: form.description_en.trim() || null,
        description_ja: form.description_ja.trim() || null,
        category_id: form.category_id ? Number(form.category_id) : null,
        project_start_date: form.project_start_date || null,
        project_end_date: form.project_end_date || null,
        tools: form.tools.split(',').map((item) => item.trim()).filter(Boolean),
        external_url: form.external_url.trim() || null,
        is_published: form.is_published,
        image_path: imagePath,
        image_url: imageUrl,
      }

      if (!payload.title_id) throw new Error('Judul Indonesia wajib diisi.')
      if (!payload.category_id) throw new Error('Pilih kategori karya.')
      if (payload.external_url && !/^https?:\/\//i.test(payload.external_url)) {
        throw new Error('Link karya harus diawali http:// atau https://.')
      }

      if (
        payload.project_start_date &&
        payload.project_end_date &&
        payload.project_end_date < payload.project_start_date
      ) {
        throw new Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.')
      }

      let result

      if (editing) {
        result = await supabase
          .from('works')
          .update(payload)
          .eq('id', workingWork.id)
          .select(`
            *,
            category:categories (id, slug, name_id, name_en, name_ja)
          `)
          .single()
      } else {
        result = await supabase
          .from('works')
          .insert(payload)
          .select(`
            *,
            category:categories (id, slug, name_id, name_en, name_ja)
          `)
          .single()

        createdThisSave = true
      }

      if (result.error) throw result.error

      savedWork = result.data
      setWorkingWork(savedWork)

      if (uploadedCoverPath) {
        setFile(null)
        setPreviewUrl(getWorkImageUrl(savedWork))
      }

      await syncGallery(savedWork.id)

      const previousCoverPath = workingWork?.image_path

      if (
        uploadedCoverPath &&
        previousCoverPath &&
        previousCoverPath !== uploadedCoverPath
      ) {
        const { error: cleanupError } = await supabase.storage
          .from('works')
          .remove([previousCoverPath])

        if (cleanupError) reportWarning('admin.work-editor.old-cover-cleanup', cleanupError)
      }

      onSaved(savedWork)
    } catch (saveError) {
      reportError('admin.work-editor.save', saveError)

      if (createdThisSave && savedWork?.id) {
        await supabase.from('works').delete().eq('id', savedWork.id)

        if (uploadedCoverPath) {
          await supabase.storage.from('works').remove([uploadedCoverPath])
        }

        setWorkingWork(null)
      } else if (!savedWork && uploadedCoverPath) {
        await supabase.storage.from('works').remove([uploadedCoverPath])
      }

      const safeValidationMessages = new Set([
        'Judul Indonesia wajib diisi.',
        'Pilih kategori karya.',
        'Link karya harus diawali http:// atau https://.',
        'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.',
      ])

      setError(
        savedWork
          ? 'Data karya utama sudah tersimpan, tetapi media tambahan belum selesai disimpan. Coba simpan lagi.'
          : safeValidationMessages.has(saveError?.message)
            ? saveError.message
            : 'Gagal menyimpan karya. Coba lagi.',
      )
      setSaving(false)
    }
  }

  return (
    <div className="admin-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="admin-editor wide work-editor-v2" role="dialog" aria-modal="true" aria-label={editing ? 'Edit karya' : 'Tambah karya'}>
        <header className="admin-editor-header">
          <div>
            <span className="admin-chip">{editing ? 'EDIT WORK' : 'NEW WORK'}</span>
            <h2>{editing ? 'Edit karya' : 'Tambah karya'}</h2>
          </div>
          <button type="button" className="admin-icon-button" onClick={onClose} aria-label="Tutup">×</button>
        </header>

        <form className="admin-work-form" onSubmit={handleSubmit}>
          <div className="admin-form-grid two">
            <label>
              Judul Indonesia *
              <input value={form.title_id ?? ''} onChange={(e) => update('title_id', e.target.value)} required />
            </label>
            <label>
              Kategori *
              <select value={form.category_id ?? ''} onChange={(e) => update('category_id', e.target.value)} required>
                <option value="">Pilih kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name_id}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-form-grid two">
            <label>
              English title
              <input value={form.title_en ?? ''} onChange={(e) => update('title_en', e.target.value)} />
            </label>
            <label>
              日本語タイトル
              <input value={form.title_ja ?? ''} onChange={(e) => update('title_ja', e.target.value)} />
            </label>
          </div>

          <label>
            Deskripsi Indonesia
            <textarea rows="4" value={form.description_id ?? ''} onChange={(e) => update('description_id', e.target.value)} />
          </label>

          <details className="admin-translation-details">
            <summary>Deskripsi terjemahan</summary>
            <div className="admin-form-grid two">
              <label>
                English
                <textarea rows="4" value={form.description_en ?? ''} onChange={(e) => update('description_en', e.target.value)} />
              </label>
              <label>
                日本語
                <textarea rows="4" value={form.description_ja ?? ''} onChange={(e) => update('description_ja', e.target.value)} />
              </label>
            </div>
          </details>

          <div className="admin-form-grid two">
            <label>
              Tanggal mulai
              <input type="date" value={form.project_start_date ?? ''} onChange={(e) => update('project_start_date', e.target.value)} />
            </label>
            <label>
              Tanggal selesai
              <input type="date" min={form.project_start_date || undefined} value={form.project_end_date ?? ''} onChange={(e) => update('project_end_date', e.target.value)} />
            </label>
          </div>

          <label>
            Tools <span className="admin-field-help">pisahkan dengan koma</span>
            <input placeholder="Photoshop, Illustrator, Figma" value={form.tools ?? ''} onChange={(e) => update('tools', e.target.value)} />
          </label>

          <label>
            Link karya <span className="admin-field-help">opsional · website, Instagram, Behance, GitHub, dll.</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://..."
              value={form.external_url ?? ''}
              onChange={(e) => update('external_url', e.target.value)}
            />
          </label>

          <section className="admin-cover-section">
            <div className="admin-media-section-heading">
              <div>
                <strong>Cover utama</strong>
                <small>Dipakai sebagai thumbnail utama di halaman Works dan dapat dipilih untuk Showcase Home.</small>
              </div>
            </div>

            <div className="admin-upload-grid">
              <label className="admin-file-picker">
                <span>Gambar cover {editing ? '(opsional)' : '*'}</span>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <strong>{file ? file.name : 'Pilih gambar'}</strong>
              </label>
              <div className="admin-image-preview contain">
                {previewUrl ? <img src={previewUrl} alt="Preview cover karya" /> : <span>Preview</span>}
              </div>
            </div>
          </section>

          <section className="admin-media-section">
            <div className="admin-media-section-heading">
              <div>
                <strong>Project media / carousel</strong>
                <small>
                  Cover otomatis menjadi slide pertama. Tambahkan hanya gambar lanjutan di sini.
                </small>
              </div>
              <span className="admin-media-count">{mediaItems.length} tambahan</span>
            </div>

            <label className="admin-media-add">
              <input type="file" accept="image/*" multiple onChange={addMediaFiles} />
              <span>＋ Tambah gambar</span>
            </label>

            {mediaLoading && <div className="admin-media-state">Memuat media…</div>}
            {mediaError && <div className="admin-media-state error">{mediaError}</div>}

            {!mediaLoading && !mediaError && mediaItems.length === 0 && (
              <div className="admin-media-empty">
                Belum ada gambar tambahan. Kalau karya cuma punya satu gambar, bagian ini boleh kosong.
              </div>
            )}

            {mediaItems.length > 0 && (
              <div className="admin-media-grid">
                {mediaItems.map((item, index) => (
                  <article className="admin-media-item" key={item.key}>
                    <div className="admin-media-thumb">
                      <img src={item.previewUrl} alt={`Slide tambahan ${index + 2}`} />
                      <span>{index + 2}</span>
                    </div>

                    <div className="admin-media-item-actions">
                      <button
                        type="button"
                        onClick={() => moveMedia(index, -1)}
                        disabled={index === 0}
                        aria-label="Geser ke kiri"
                        title="Geser ke kiri"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMedia(index, 1)}
                        disabled={index === mediaItems.length - 1}
                        aria-label="Geser ke kanan"
                        title="Geser ke kanan"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeMedia(item.key)}
                        aria-label="Hapus media"
                        title="Hapus media"
                      >
                        ×
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="admin-publish-box">
            <label className="admin-switch-row">
              <span>
                <strong>Publikasikan</strong>
                <small>Karya bisa dilihat publik.</small>
              </span>
              <input type="checkbox" checked={Boolean(form.is_published)} onChange={(e) => update('is_published', e.target.checked)} />
            </label>
          </div>

          {error && <div className="admin-form-error">{error}</div>}

          <footer className="admin-editor-footer">
            <button type="button" className="admin-button secondary" onClick={onClose}>Batal</button>
            <button className="admin-button primary" disabled={saving || mediaLoading}>
              {saving ? 'Menyimpan…' : 'Simpan karya'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
