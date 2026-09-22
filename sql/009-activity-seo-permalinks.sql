-- ================================================================
-- ACTIVITY SEO PERMALINKS
-- Stable automatic slugs for /about/activity/<slug>/
-- Run once in Supabase SQL Editor.
-- ================================================================

create extension if not exists unaccent with schema extensions;

alter table public.activities
  add column if not exists slug text;

create or replace function public.make_activity_slug(input_title text, activity_id bigint)
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
    lower(extensions.unaccent(coalesce(nullif(btrim(input_title), ''), 'activity'))),
    '[^a-z0-9]+',
    '-',
    'g'
  ));

  if base_slug = '' then
    base_slug := 'activity';
  end if;

  suffix := coalesce(
    activity_id::text,
    substr(md5(random()::text || clock_timestamp()::text), 1, 8)
  );

  return base_slug || '-' || suffix;
end;
$$;

update public.activities
set slug = public.make_activity_slug(title_id, id)
where nullif(btrim(slug), '') is null;

create unique index if not exists activities_slug_unique_idx
  on public.activities (slug);

alter table public.activities
  alter column slug set not null;

create or replace function public.assign_activity_slug()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  -- Keep existing slugs stable when title changes.
  if nullif(btrim(new.slug), '') is null then
    new.slug := public.make_activity_slug(new.title_id, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_activities_assign_slug on public.activities;

create trigger trg_activities_assign_slug
before insert or update of slug
on public.activities
for each row
execute function public.assign_activity_slug();

comment on column public.activities.slug is
  'Stable permalink slug for /about/activity/<slug>/. Generated automatically and intentionally not changed when title changes.';
