-- ================================================================
-- WORKS — OPTIONAL EXTERNAL PROJECT LINK
-- Adds an optional URL used by WorkModal for "Lihat karya".
-- Safe to run once on the current public.works table.
-- ================================================================

begin;

alter table public.works
  add column if not exists external_url text;

-- Keep external links limited to normal web URLs.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'works_external_url_http_check'
      and conrelid = 'public.works'::regclass
  ) then
    alter table public.works
      add constraint works_external_url_http_check
      check (
        external_url is null
        or external_url ~* '^https?://[^[:space:]]+$'
      );
  end if;
end $$;

comment on column public.works.external_url is
  'Optional public URL for the live/external version of a work, e.g. website, Instagram, Behance, or GitHub.';

commit;
