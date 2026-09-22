const GITHUB_OWNER = 'maldyrais'
const GITHUB_REPO = 'maldyrais.github.io'
const EVENT_TYPE = 'portfolio-content-changed'

const ALLOWED_TABLES = new Set([
  'profile',
  'profile_tools',
  'works',
  'work_media',
  'categories',
  'activities',
  'activity_groups',
  'activity_work_links',
  'home_showcase_slides',
  'home_showcase_images',
  'site_pages',
])

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const webhookSecret = Deno.env.get('REBUILD_WEBHOOK_SECRET')
  const suppliedSecret = request.headers.get('x-rebuild-secret')

  if (!webhookSecret || suppliedSecret !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: Record<string, unknown>

  try {
    payload = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const table = String(payload?.table || '')
  const event = String(payload?.type || '')

  if (!ALLOWED_TABLES.has(table)) {
    return Response.json({ ok: true, skipped: true, reason: 'table-not-indexed' })
  }

  if (!['INSERT', 'UPDATE', 'DELETE'].includes(event)) {
    return Response.json({ ok: true, skipped: true, reason: 'event-not-indexed' })
  }

  const githubToken = Deno.env.get('GITHUB_REBUILD_TOKEN')

  if (!githubToken) {
    console.error('GITHUB_REBUILD_TOKEN is not configured.')
    return new Response('Server configuration error', { status: 500 })
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: EVENT_TYPE,
        client_payload: {
          source: 'supabase-database-webhook',
          table,
          event,
        },
      }),
    },
  )

  if (!response.ok) {
    const detail = await response.text()
    console.error(`GitHub dispatch failed (${response.status}):`, detail)
    return new Response('GitHub dispatch failed', { status: 502 })
  }

  return Response.json({
    ok: true,
    dispatched: true,
    table,
    event,
  })
})
