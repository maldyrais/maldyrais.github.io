import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getPortfolioAssetUrl } from '../../lib/profileStorage'
import ToolLogo from '../ToolLogo'
import { reportError, reportWarning } from '../../lib/errorReporting'

const EMPTY = {
  id: 1,
  name: 'Maldy Rais',
  nickname: '',
  headline_id: '',
  headline_en: '',
  headline_ja: '',
  bio_id: '',
  bio_en: '',
  bio_ja: '',
  location: '',
  email: '',
  instagram_url: '',
  behance_url: '',
  github_url: '',
  linkedin_url: '',
  cv_url: '',
  roles: '',
  interests: '',
  japanese_level: '',
  is_published: true,
}

const ICON_OPTIONS = [
  ['photoshop', 'Photoshop'],
  ['illustrator', 'Illustrator'],
  ['figma', 'Figma'],
  ['canva', 'Canva'],
  ['vscode', 'VS Code'],
  ['lightroom', 'Lightroom'],
  ['premiere', 'Premiere Pro'],
  ['aftereffects', 'After Effects'],
  ['indesign', 'InDesign'],
  ['other', 'Lainnya'],
]

function text(value) {
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

function nullableText(value) {
  const clean = text(value).trim()
  return clean || null
}

function csv(value) {
  return text(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function ext(file) {
  return (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
}

function guessIconKey(name) {
  const value = text(name).trim().toLowerCase()
  if (value.includes('photoshop')) return 'photoshop'
  if (value.includes('illustrator')) return 'illustrator'
  if (value.includes('figma')) return 'figma'
  if (value.includes('canva')) return 'canva'
  if (value.includes('visual studio') || value.includes('vs code') || value.includes('vscode')) return 'vscode'
  if (value.includes('lightroom')) return 'lightroom'
  if (value.includes('premiere')) return 'premiere'
  if (value.includes('after effects') || value.includes('aftereffects')) return 'aftereffects'
  if (value.includes('indesign')) return 'indesign'
  return 'other'
}

function toolKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeTool(row = {}, index = 0) {
  const name = text(row.name)
  return {
    _key: row._key || (row.id ? `db-${row.id}` : toolKey()),
    id: row.id ?? null,
    profile_id: Number(row.profile_id) || 1,
    name,
    icon_key: text(row.icon_key) || guessIconKey(name),
    description_id: text(row.description_id),
    description_en: text(row.description_en),
    description_ja: text(row.description_ja),
    sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index,
    is_active: row.is_active !== false,
  }
}

function legacyTools(rows = []) {
  return rows.map((name, index) => normalizeTool({
    name,
    icon_key: guessIconKey(name),
    sort_order: index,
    is_active: true,
  }, index))
}

function normalizeProfile(data = {}) {
  return {
    ...EMPTY,
    ...data,
    name: text(data.name) || EMPTY.name,
    nickname: text(data.nickname),
    headline_id: text(data.headline_id),
    headline_en: text(data.headline_en),
    headline_ja: text(data.headline_ja),
    bio_id: text(data.bio_id),
    bio_en: text(data.bio_en),
    bio_ja: text(data.bio_ja),
    location: text(data.location),
    email: text(data.email),
    instagram_url: text(data.instagram_url),
    behance_url: text(data.behance_url),
    github_url: text(data.github_url),
    linkedin_url: text(data.linkedin_url),
    cv_url: text(data.cv_url),
    roles: Array.isArray(data.roles) ? data.roles.join(', ') : text(data.roles),
    interests: Array.isArray(data.interests) ? data.interests.join(', ') : text(data.interests),
    japanese_level: text(data.japanese_level),
    is_published: data.is_published !== false,
  }
}

export default function ProfilePanel() {
  const [form, setForm] = useState(EMPTY)
  const [original, setOriginal] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [tools, setTools] = useState([])
  const [deletedToolIds, setDeletedToolIds] = useState([])
  const [toolTableReady, setToolTableReady] = useState(true)

  const activeToolNames = useMemo(
    () => tools
      .filter((tool) => tool.is_active && text(tool.name).trim())
      .map((tool) => text(tool.name).trim()),
    [tools],
  )

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const profileResult = await supabase
        .from('profile')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

      if (cancelled) return

      if (profileResult.error) {
        reportError('admin.profile.load', profileResult.error)
        setStatus('Gagal membaca profil dari database.')
        return
      }

      const profileData = profileResult.data ?? { ...EMPTY }
      setOriginal(profileData)
      setForm(normalizeProfile(profileData))
      setPreview(getPortfolioAssetUrl({
        avatar_path: profileData.avatar_path,
        avatar_url: profileData.avatar_url,
      }))

      const toolResult = await supabase
        .from('profile_tools')
        .select('id, profile_id, name, icon_key, description_id, description_en, description_ja, sort_order, is_active')
        .eq('profile_id', 1)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true })

      if (cancelled) return

      if (toolResult.error) {
        reportWarning('admin.profile.tools-load', toolResult.error)
        setToolTableReady(false)
        setTools(legacyTools(Array.isArray(profileData.tools) ? profileData.tools : []))
      } else {
        setToolTableReady(true)
        setTools((toolResult.data ?? []).map(normalizeTool))
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!file) return undefined
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const updateTool = (key, field, value) => {
    setTools((current) => current.map((tool) => (
      tool._key === key
        ? {
            ...tool,
            [field]: value,
            ...(field === 'name' && (!tool.icon_key || tool.icon_key === 'other')
              ? { icon_key: guessIconKey(value) }
              : {}),
          }
        : tool
    )))
  }

  const addTool = () => {
    setTools((current) => [
      ...current,
      normalizeTool({
        name: '',
        icon_key: 'other',
        sort_order: current.length,
        is_active: true,
      }, current.length),
    ])
  }

  const removeTool = (key) => {
    setTools((current) => {
      const target = current.find((tool) => tool._key === key)
      if (target?.id) setDeletedToolIds((ids) => [...new Set([...ids, target.id])])
      return current.filter((tool) => tool._key !== key)
    })
  }

  const moveTool = (index, direction) => {
    setTools((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const copy = [...current]
      const [item] = copy.splice(index, 1)
      copy.splice(nextIndex, 0, item)
      return copy
    })
  }

  const validateTools = () => {
    const names = tools
      .map((tool) => text(tool.name).trim())
      .filter(Boolean)
      .map((name) => name.toLowerCase())

    if (new Set(names).size !== names.length) {
      throw new Error('Nama tool tidak boleh duplikat.')
    }
  }

  const persistTools = async () => {
    if (!toolTableReady) return null

    validateTools()

    if (deletedToolIds.length > 0) {
      const { error } = await supabase
        .from('profile_tools')
        .delete()
        .in('id', deletedToolIds)

      if (error) throw error
    }

    const clean = tools
      .map((tool, index) => ({
        ...tool,
        name: text(tool.name).trim(),
        icon_key: text(tool.icon_key).trim() || guessIconKey(tool.name),
        description_id: nullableText(tool.description_id),
        description_en: nullableText(tool.description_en),
        description_ja: nullableText(tool.description_ja),
        sort_order: index,
        is_active: Boolean(tool.is_active),
      }))
      .filter((tool) => tool.name)

    const existingRows = clean
      .filter((tool) => tool.id)
      .map((tool) => ({
        id: tool.id,
        profile_id: 1,
        name: tool.name,
        icon_key: tool.icon_key,
        description_id: tool.description_id,
        description_en: tool.description_en,
        description_ja: tool.description_ja,
        sort_order: tool.sort_order,
        is_active: tool.is_active,
      }))

    const newRows = clean
      .filter((tool) => !tool.id)
      .map((tool) => ({
        profile_id: 1,
        name: tool.name,
        icon_key: tool.icon_key,
        description_id: tool.description_id,
        description_en: tool.description_en,
        description_ja: tool.description_ja,
        sort_order: tool.sort_order,
        is_active: tool.is_active,
      }))

    if (existingRows.length > 0) {
      const { error } = await supabase
        .from('profile_tools')
        .upsert(existingRows, { onConflict: 'id' })

      if (error) throw error
    }

    if (newRows.length > 0) {
      const { error } = await supabase
        .from('profile_tools')
        .upsert(newRows, { onConflict: 'profile_id,name' })

      if (error) throw error
    }

    const { data, error } = await supabase
      .from('profile_tools')
      .select('id, profile_id, name, icon_key, description_id, description_en, description_ja, sort_order, is_active')
      .eq('profile_id', 1)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw error
    setDeletedToolIds([])
    setTools((data ?? []).map(normalizeTool))
    return data ?? []
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setStatus('')
    let uploadedPath = null
    let profileSaved = false

    try {
      validateTools()

      let avatarPath = original?.avatar_path ?? null
      let avatarUrl = original?.avatar_url ?? null

      if (file) {
        uploadedPath = `avatar/${crypto.randomUUID()}.${ext(file)}`
        const { error: uploadError } = await supabase.storage
          .from('portfolio-assets')
          .upload(uploadedPath, file, {
            upsert: false,
            contentType: file.type || undefined,
          })

        if (uploadError) throw uploadError
        avatarPath = uploadedPath
        avatarUrl = null
      }

      const payload = {
        id: 1,
        name: text(form.name).trim() || 'Maldy Rais',
        nickname: nullableText(form.nickname),
        headline_id: nullableText(form.headline_id),
        headline_en: nullableText(form.headline_en),
        headline_ja: nullableText(form.headline_ja),
        bio_id: nullableText(form.bio_id),
        bio_en: nullableText(form.bio_en),
        bio_ja: nullableText(form.bio_ja),
        location: nullableText(form.location),
        email: nullableText(form.email),
        instagram_url: nullableText(form.instagram_url),
        behance_url: nullableText(form.behance_url),
        github_url: nullableText(form.github_url),
        linkedin_url: nullableText(form.linkedin_url),
        cv_url: nullableText(form.cv_url),
        roles: csv(form.roles),
        tools: activeToolNames,
        interests: csv(form.interests),
        japanese_level: nullableText(form.japanese_level),
        avatar_path: avatarPath,
        avatar_url: avatarUrl,
        is_published: Boolean(form.is_published),
      }

      const { data, error } = await supabase
        .from('profile')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single()

      if (error) throw error
      profileSaved = true

      if (toolTableReady) {
        await persistTools()
      }

      if (file && original?.avatar_path && original.avatar_path !== uploadedPath) {
        const { error: removeError } = await supabase.storage
          .from('portfolio-assets')
          .remove([original.avatar_path])

        if (removeError) reportWarning('admin.profile.remove-old-avatar', removeError)
      }

      setOriginal(data)
      setForm(normalizeProfile(data))
      setFile(null)
      setPreview(getPortfolioAssetUrl({
        avatar_path: data.avatar_path,
        avatar_url: data.avatar_url,
      }))

      setStatus(
        toolTableReady
          ? 'Profil dan tools tersimpan.'
          : 'Profil tersimpan. Jalankan SQL profile_tools lalu refresh untuk mengelola konteks tools.',
      )
    } catch (error) {
      reportError('admin.profile.save', error)

      if (uploadedPath && !profileSaved) {
        await supabase.storage.from('portfolio-assets').remove([uploadedPath])
      }

      setStatus('Gagal menyimpan profil. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <header className="admin-topbar">
        <div>
          <span className="admin-kicker">PROFILE CMS</span>
          <h2>Profil.</h2>
        </div>
        <button
          className="admin-button primary"
          form="profile-admin-form"
          disabled={saving}
        >
          {saving ? 'Menyimpan…' : 'Simpan profil'}
        </button>
      </header>

      <form id="profile-admin-form" className="admin-profile-form" onSubmit={save}>
        <section className="admin-panel-card">
          <div className="admin-profile-avatar-wrap">
            <div className="admin-profile-avatar">
              {preview ? <img src={preview} alt="" /> : <span>MR</span>}
            </div>

            <label className="admin-file-picker compact">
              <span>Foto / avatar</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <strong>{file ? file.name : 'Pilih gambar'}</strong>
            </label>
          </div>

          <div className="admin-form-grid two">
            <label>
              Nama
              <input
                value={form.name ?? ''}
                onChange={(event) => update('name', event.target.value)}
                required
              />
            </label>

            <label>
              Nickname <span className="admin-field-help">opsional, bukan judul utama About</span>
              <input
                value={form.nickname ?? ''}
                onChange={(event) => update('nickname', event.target.value)}
              />
            </label>
          </div>

          <label>
            Headline Indonesia
            <input value={form.headline_id ?? ''} onChange={(event) => update('headline_id', event.target.value)} />
          </label>

          <label>
            Bio Indonesia
            <textarea rows="6" value={form.bio_id ?? ''} onChange={(event) => update('bio_id', event.target.value)} />
          </label>

          <details className="admin-translation-details">
            <summary>English & 日本語</summary>
            <div className="admin-form-grid two">
              <label>
                Headline EN
                <input value={form.headline_en ?? ''} onChange={(event) => update('headline_en', event.target.value)} />
              </label>
              <label>
                Headline JP
                <input value={form.headline_ja ?? ''} onChange={(event) => update('headline_ja', event.target.value)} />
              </label>
              <label>
                Bio EN
                <textarea rows="5" value={form.bio_en ?? ''} onChange={(event) => update('bio_en', event.target.value)} />
              </label>
              <label>
                Bio JP
                <textarea rows="5" value={form.bio_ja ?? ''} onChange={(event) => update('bio_ja', event.target.value)} />
              </label>
            </div>
          </details>

          <div className="admin-form-grid two">
            <label>
              Lokasi
              <input value={form.location ?? ''} onChange={(event) => update('location', event.target.value)} />
            </label>
            <label>
              Email
              <input type="email" value={form.email ?? ''} onChange={(event) => update('email', event.target.value)} />
            </label>
          </div>

          <label>
            Roles <span className="admin-field-help">pisahkan koma</span>
            <input value={form.roles ?? ''} onChange={(event) => update('roles', event.target.value)} />
          </label>

          <label>
            Interests <span className="admin-field-help">pisahkan koma</span>
            <input value={form.interests ?? ''} onChange={(event) => update('interests', event.target.value)} />
          </label>

          <label>
            Level Jepang
            <input value={form.japanese_level ?? ''} onChange={(event) => update('japanese_level', event.target.value)} />
          </label>

          <section className="admin-tool-manager">
            <header className="admin-tool-manager-heading">
              <div>
                <span className="admin-kicker">TOOLS + CONTEXT</span>
                <h3>Tools yang saya pakai.</h3>
                <p>Nama tool tetap disinkronkan ke kolom profile.tools untuk kompatibilitas lama.</p>
              </div>
              <button type="button" className="admin-button" onClick={addTool}>+ Tambah tool</button>
            </header>

            {!toolTableReady && (
              <div className="admin-tool-warning">
                Tabel <code>profile_tools</code> belum terbaca. Jalankan SQL migration dari paket ini, lalu refresh halaman Admin.
              </div>
            )}

            <div className="admin-tool-list">
              {tools.length === 0 && (
                <div className="admin-tool-empty">Belum ada tool. Tambahkan tool pertama.</div>
              )}

              {tools.map((tool, index) => (
                <article className="admin-tool-row" key={tool._key}>
                  <div className="admin-tool-logo-preview">
                    <ToolLogo iconKey={tool.icon_key} name={tool.name || 'Tool'} />
                  </div>

                  <div className="admin-tool-fields">
                    <div className="admin-form-grid two">
                      <label>
                        Nama tool
                        <input
                          value={tool.name}
                          placeholder="Photoshop"
                          onChange={(event) => updateTool(tool._key, 'name', event.target.value)}
                        />
                      </label>

                      <label>
                        Logo
                        <select
                          value={tool.icon_key}
                          onChange={(event) => updateTool(tool._key, 'icon_key', event.target.value)}
                        >
                          {ICON_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label>
                      Konteks kemampuan — Indonesia
                      <input
                        value={tool.description_id}
                        placeholder="Desain media sosial · manipulasi foto"
                        onChange={(event) => updateTool(tool._key, 'description_id', event.target.value)}
                      />
                    </label>

                    <details className="admin-translation-details compact">
                      <summary>Terjemahan konteks</summary>
                      <div className="admin-form-grid two">
                        <label>
                          Context EN
                          <input
                            value={tool.description_en}
                            onChange={(event) => updateTool(tool._key, 'description_en', event.target.value)}
                          />
                        </label>
                        <label>
                          Context JP
                          <input
                            value={tool.description_ja}
                            onChange={(event) => updateTool(tool._key, 'description_ja', event.target.value)}
                          />
                        </label>
                      </div>
                    </details>
                  </div>

                  <div className="admin-tool-actions">
                    <label className="admin-tool-active">
                      <input
                        type="checkbox"
                        checked={tool.is_active}
                        onChange={(event) => updateTool(tool._key, 'is_active', event.target.checked)}
                      />
                      <span>Aktif</span>
                    </label>

                    <div>
                      <button type="button" onClick={() => moveTool(index, -1)} disabled={index === 0} aria-label="Naikkan urutan">↑</button>
                      <button type="button" onClick={() => moveTool(index, 1)} disabled={index === tools.length - 1} aria-label="Turunkan urutan">↓</button>
                      <button type="button" className="danger" onClick={() => removeTool(tool._key)} aria-label={`Hapus ${tool.name || 'tool'}`}>×</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="admin-form-grid two">
            <label>
              Instagram URL
              <input value={form.instagram_url ?? ''} onChange={(event) => update('instagram_url', event.target.value)} />
            </label>
            <label>
              Behance URL
              <input value={form.behance_url ?? ''} onChange={(event) => update('behance_url', event.target.value)} />
            </label>
            <label>
              GitHub URL
              <input value={form.github_url ?? ''} onChange={(event) => update('github_url', event.target.value)} />
            </label>
            <label>
              LinkedIn URL
              <input value={form.linkedin_url ?? ''} onChange={(event) => update('linkedin_url', event.target.value)} />
            </label>
          </div>

          <label>
            CV URL
            <input value={form.cv_url ?? ''} onChange={(event) => update('cv_url', event.target.value)} />
          </label>

          <label className="admin-switch-row standalone">
            <span>
              <strong>Publikasikan profil</strong>
              <small>Jika mati, halaman publik dapat memakai fallback.</small>
            </span>
            <input
              type="checkbox"
              checked={Boolean(form.is_published)}
              onChange={(event) => update('is_published', event.target.checked)}
            />
          </label>

          {status && (
            <div className={`admin-save-status ${status.startsWith('Gagal') ? 'error' : ''}`}>
              {status}
            </div>
          )}
        </section>
      </form>
    </>
  )
}
