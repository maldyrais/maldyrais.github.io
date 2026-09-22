-- ================================================================
-- SITE STATUS / MAINTENANCE MODE — PHASE 1
-- Run once in Supabase > SQL Editor.
--
-- This is UI-level status control for a static GitHub Pages portfolio.
-- It does NOT make bundled source code private.
-- ================================================================

create table if not exists public.site_pages (
  route text primary key,
  label text not null,
  status text not null default 'live',
  message_id text null,
  message_en text null,
  message_ja text null,
  available_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint site_pages_status_check
    check (status in ('live', 'maintenance', 'coming_soon', 'hidden'))
);

alter table public.site_pages
  add column if not exists label text,
  add column if not exists status text not null default 'live',
  add column if not exists message_id text null,
  add column if not exists message_en text null,
  add column if not exists message_ja text null,
  add column if not exists available_at timestamptz null,
  add column if not exists updated_at timestamptz not null default now();

-- Ensure old/partial rows always have a label.
update public.site_pages
set label = coalesce(nullif(trim(label), ''), route)
where label is null or trim(label) = '';

alter table public.site_pages
  alter column label set not null;

create or replace function public.set_site_pages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_site_pages_updated_at on public.site_pages;
create trigger trg_site_pages_updated_at
before update on public.site_pages
for each row execute function public.set_site_pages_updated_at();

alter table public.site_pages enable row level security;

-- Visitors need to read status so the frontend can decide what to show.
drop policy if exists "Public can read site page status" on public.site_pages;
create policy "Public can read site page status"
on public.site_pages
for select
to anon, authenticated
using (true);

-- Only the configured portfolio owner can change status.
drop policy if exists "Authenticated can manage site page status" on public.site_pages;
drop policy if exists "Admin can manage site page status" on public.site_pages;
create policy "Admin can manage site page status"
on public.site_pages
for all
to authenticated
using ((select public.is_portfolio_admin()))
with check ((select public.is_portfolio_admin()));

insert into public.site_pages (
  route,
  label,
  status,
  message_id,
  message_en,
  message_ja
)
values
  (
    '__global__',
    'Seluruh website',
    'live',
    'Website sedang dirapikan sebentar. Coba kembali lagi nanti.',
    'The website is being polished for a moment. Please check back soon.',
    'サイトを少し整備しています。しばらくしてからまたお越しください。'
  ),
  (
    '/',
    'Home',
    'live',
    null,
    null,
    null
  ),
  (
    '/works',
    'Works',
    'live',
    'Bagian karya sedang saya rapikan. Akan kembali sebentar lagi.',
    'The works section is being polished. It will be back shortly.',
    '作品ページを調整しています。もうしばらくお待ちください。'
  ),
  (
    '/about',
    'About',
    'live',
    'Halaman About sedang saya rapikan. Akan kembali sebentar lagi.',
    'The About page is being polished. It will be back shortly.',
    'Aboutページを調整しています。もうしばらくお待ちください。'
  ),
  (
    '/nihongo-gakushu',
    'Nihongo Gakushū',
    'live',
    'Nihongo Gakushū sedang disiapkan. Sampai jumpa sebentar lagi.',
    'Nihongo Gakushū is being prepared. See you soon.',
    '日本語学習ページを準備しています。もう少しお待ちください。'
  )
on conflict (route) do nothing;

-- Verification:
-- select * from public.site_pages order by route;
