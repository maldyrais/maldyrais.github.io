-- ================================================================
-- WORK SEO PERMALINKS
-- Stable automatic slugs for /works/<slug>/
-- Run once in Supabase SQL Editor before deploying this version.
-- ================================================================

create extension if not exists unaccent with schema extensions;

alter table public.works
  add column if not exists slug text;

create or replace function public.make_work_slug(input_title text, work_id bigint)
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  base_slug text;
  suffix text;
begin
  base_slug := trim(both '-' from regexp_replace(
    lower(extensions.unaccent(coalesce(nullif(btrim(input_title), ''), 'work'))),
    '[^a-z0-9]+',
    '-',
    'g'
  ));

  if base_slug = '' then
    base_slug := 'work';
  end if;

  suffix := coalesce(
    work_id::text,
    substr(md5(random()::text || clock_timestamp()::text), 1, 8)
  );

  return base_slug || '-' || suffix;
end;
$$;

update public.works
set slug = public.make_work_slug(title_id, id)
where nullif(btrim(slug), '') is null;

create unique index if not exists works_slug_unique_idx
  on public.works (slug);

alter table public.works
  alter column slug set not null;

create or replace function public.assign_work_slug()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  -- Existing slugs stay stable when a title changes.
  -- This keeps old Google/social links valid.
  if nullif(btrim(new.slug), '') is null then
    new.slug := public.make_work_slug(new.title_id, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_works_assign_slug on public.works;

create trigger trg_works_assign_slug
before insert or update of slug
on public.works
for each row
execute function public.assign_work_slug();

comment on column public.works.slug is
  'Stable permalink slug for /works/<slug>/. Generated automatically and intentionally not changed when title changes.';
