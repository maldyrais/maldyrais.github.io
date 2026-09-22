import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { reportError } from '../../lib/errorReporting'

const STATUS_OPTIONS = [
  ['live', 'Live'],
  ['maintenance', 'Maintenance'],
  ['coming_soon', 'Coming Soon'],
  ['hidden', 'Hidden'],
]

const ROUTE_ORDER = [
  '__global__',
  '/',
  '/works',
  '/about',
  '/nihongo-gakushu',
]

function text(value) {
  return value == null ? '' : String(value)
}

function toLocalDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function toIso(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalize(row) {
  return {
    ...row,
    label: text(row.label),
    status: text(row.status) || 'live',
    message_id: text(row.message_id),
    message_en: text(row.message_en),
    message_ja: text(row.message_ja),
    available_at: toLocalDateTime(row.available_at),
  }
}

function statusLabel(status) {
  return STATUS_OPTIONS.find(([value]) => value === status)?.[1] || status
}

export default function SiteStatusPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingRoute, setSavingRoute] = useState('')
  const [status, setStatus] = useState('')

  const orderedRows = useMemo(() => {
    const map = new Map(rows.map((row) => [row.route, row]))
    return ROUTE_ORDER.map((route) => map.get(route)).filter(Boolean)
  }, [rows])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setStatus('')

      const { data, error } = await supabase
        .from('site_pages')
        .select('*')

      if (cancelled) return

      if (error) {
        reportError('admin.site-status.load', error)
        setStatus('Gagal membaca Site Status. Muat ulang halaman lalu coba lagi.')
        setLoading(false)
        return
      }

      setRows((data ?? []).map(normalize))
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  const update = (route, key, value) => {
    setRows((current) => current.map((row) => (
      row.route === route ? { ...row, [key]: value } : row
    )))
  }

  const save = async (row) => {
    setSavingRoute(row.route)
    setStatus('')

    try {
      const payload = {
        route: row.route,
        label: text(row.label).trim() || row.route,
        status: row.status,
        message_id: text(row.message_id).trim() || null,
        message_en: text(row.message_en).trim() || null,
        message_ja: text(row.message_ja).trim() || null,
        available_at: toIso(row.available_at),
      }

      const { data, error } = await supabase
        .from('site_pages')
        .upsert(payload, { onConflict: 'route' })
        .select('*')
        .single()

      if (error) throw error

      setRows((current) => current.map((item) => (
        item.route === row.route ? normalize(data) : item
      )))

      setStatus(`${row.label} disimpan.`)
    } catch (error) {
      reportError('admin.site-status.save', error)
      setStatus(`Gagal menyimpan ${row.label}. Coba lagi.`)
    } finally {
      setSavingRoute('')
    }
  }

  const liveCount = rows.filter((row) => row.route !== '__global__' && row.status === 'live').length
  const pageCount = rows.filter((row) => row.route !== '__global__').length
  const globalRow = rows.find((row) => row.route === '__global__')
  const globalLive = !globalRow || globalRow.status === 'live'

  return (
    <>
      <header className="admin-topbar">
        <div>
          <span className="admin-kicker">WEBSITE CONTROL</span>
          <h2>Site Status.</h2>
        </div>
      </header>

      <div className="admin-site-summary">
        <article>
          <small>GLOBAL</small>
          <strong className={globalLive ? 'is-live' : 'is-offline'}>
            {globalLive ? 'LIVE' : statusLabel(globalRow?.status)}
          </strong>
        </article>
        <article>
          <small>PUBLIC PAGES</small>
          <strong>{liveCount} / {pageCount}</strong>
        </article>
        <article>
          <small>ADMIN PREVIEW</small>
          <strong>ALWAYS ON</strong>
        </article>
      </div>

      <div className="admin-site-note">
        Karena website-mu static di GitHub Pages, status ini mengatur apa yang
        dilihat pengunjung lewat UI. Source bundle tetap bukan tempat menyimpan
        data rahasia.
      </div>

      {loading && <div className="admin-empty-state">Memuat status website…</div>}

      {!loading && (
        <div className="admin-site-status-list">
          {orderedRows.map((row) => {
            const isGlobal = row.route === '__global__'
            const isSaving = savingRoute === row.route

            return (
              <article
                className={`admin-site-status-card ${isGlobal ? 'is-global' : ''}`}
                key={row.route}
              >
                <header>
                  <div>
                    <span className="admin-site-route">
                      {isGlobal ? 'GLOBAL' : row.route}
                    </span>
                    <h3>{row.label}</h3>
                  </div>

                  <span className={`admin-site-pill status-${row.status}`}>
                    {statusLabel(row.status)}
                  </span>
                </header>

                <div className="admin-form-grid two">
                  <label>
                    Status
                    <select
                      value={row.status}
                      onChange={(event) => update(row.route, 'status', event.target.value)}
                    >
                      {STATUS_OPTIONS.map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Perkiraan kembali <span className="admin-field-help">opsional</span>
                    <input
                      type="datetime-local"
                      value={row.available_at}
                      onChange={(event) => update(row.route, 'available_at', event.target.value)}
                    />
                  </label>
                </div>

                <label>
                  Pesan Indonesia
                  <textarea
                    rows="3"
                    value={row.message_id}
                    onChange={(event) => update(row.route, 'message_id', event.target.value)}
                    placeholder="Kosongkan untuk memakai pesan default."
                  />
                </label>

                <details className="admin-translation-details">
                  <summary>English & 日本語</summary>
                  <div className="admin-form-grid two">
                    <label>
                      Message EN
                      <textarea
                        rows="3"
                        value={row.message_en}
                        onChange={(event) => update(row.route, 'message_en', event.target.value)}
                      />
                    </label>

                    <label>
                      Message JP
                      <textarea
                        rows="3"
                        value={row.message_ja}
                        onChange={(event) => update(row.route, 'message_ja', event.target.value)}
                      />
                    </label>
                  </div>
                </details>

                <footer>
                  <small>
                    {row.status === 'live'
                      ? 'Pengunjung melihat halaman normal.'
                      : 'Admin yang login tetap melihat halaman asli untuk preview.'}
                  </small>

                  <button
                    type="button"
                    className="admin-button primary"
                    disabled={isSaving}
                    onClick={() => save(row)}
                  >
                    {isSaving ? 'Menyimpan…' : 'Simpan status'}
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      {status && (
        <div className={`admin-save-status ${status.startsWith('Gagal') ? 'error' : ''}`}>
          {status}
        </div>
      )}
    </>
  )
}
