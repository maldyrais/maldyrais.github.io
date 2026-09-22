-- ================================================================
-- MALDY PORTFOLIO — ADMIN RLS
-- ================================================================
-- 1) Buat user admin dahulu melalui Supabase Dashboard:
--    Authentication > Users > Add user
-- 2) Copy UUID user tersebut.
-- 3) Ganti YOUR_ADMIN_UUID di bawah dengan UUID itu, lalu Run.
--
-- Jangan memasukkan service_role key ke React.
-- ================================================================

begin;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select (select auth.uid()) = 'YOUR_ADMIN_UUID'::uuid;
$$;

revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to authenticated;

-- WORKS: admin boleh melihat draft dan melakukan CRUD.
drop policy if exists "Admin can read all works" on public.works;
create policy "Admin can read all works"
on public.works
for select
to authenticated
using ((select public.is_portfolio_admin()));

drop policy if exists "Admin can insert works" on public.works;
create policy "Admin can insert works"
on public.works
for insert
to authenticated
with check ((select public.is_portfolio_admin()));

drop policy if exists "Admin can update works" on public.works;
create policy "Admin can update works"
on public.works
for update
to authenticated
using ((select public.is_portfolio_admin()))
with check ((select public.is_portfolio_admin()));

drop policy if exists "Admin can delete works" on public.works;
create policy "Admin can delete works"
on public.works
for delete
to authenticated
using ((select public.is_portfolio_admin()));

-- STORAGE: bucket works sudah dibuat PUBLIC.
-- Public bucket hanya membuat file bisa dibaca; upload/edit/delete tetap RLS.
drop policy if exists "Admin can upload work images" on storage.objects;
create policy "Admin can upload work images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'works'
  and (select public.is_portfolio_admin())
);

drop policy if exists "Admin can update work images" on storage.objects;
create policy "Admin can update work images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'works'
  and (select public.is_portfolio_admin())
)
with check (
  bucket_id = 'works'
  and (select public.is_portfolio_admin())
);

drop policy if exists "Admin can delete work images" on storage.objects;
create policy "Admin can delete work images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'works'
  and (select public.is_portfolio_admin())
);

drop policy if exists "Admin can read work image objects" on storage.objects;
create policy "Admin can read work image objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'works'
  and (select public.is_portfolio_admin())
);

commit;
