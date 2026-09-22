-- ================================================================
-- PRE-PUBLISH SECURITY HARDENING
-- Requires public.is_portfolio_admin() from 002-admin-rls.sql.
-- Run this ONCE in Supabase SQL Editor before publishing.
-- ================================================================

begin;

-- PROFILE: remove broad authenticated manage policy created by the later
-- profile-tools migration and replace it with owner-only access.
drop policy if exists "Authenticated can manage profile v2" on public.profile;
drop policy if exists "Admin can manage profile v2" on public.profile;
create policy "Admin can manage profile v2"
on public.profile
for all
to authenticated
using ((select public.is_portfolio_admin()))
with check ((select public.is_portfolio_admin()));

-- PROFILE TOOLS.
drop policy if exists "Authenticated can manage profile tools" on public.profile_tools;
drop policy if exists "Admin can manage profile tools" on public.profile_tools;
create policy "Admin can manage profile tools"
on public.profile_tools
for all
to authenticated
using ((select public.is_portfolio_admin()))
with check ((select public.is_portfolio_admin()));

-- WORK MEDIA: public still reads media for published works through the
-- existing public policy. Only the portfolio owner may read draft media
-- or mutate carousel rows.
drop policy if exists "Authenticated can read all work media" on public.work_media;
drop policy if exists "Authenticated can insert work media" on public.work_media;
drop policy if exists "Authenticated can update work media" on public.work_media;
drop policy if exists "Authenticated can delete work media" on public.work_media;

drop policy if exists "Admin can read all work media" on public.work_media;
create policy "Admin can read all work media"
on public.work_media for select to authenticated
using ((select public.is_portfolio_admin()));

drop policy if exists "Admin can insert work media" on public.work_media;
create policy "Admin can insert work media"
on public.work_media for insert to authenticated
with check ((select public.is_portfolio_admin()));

drop policy if exists "Admin can update work media" on public.work_media;
create policy "Admin can update work media"
on public.work_media for update to authenticated
using ((select public.is_portfolio_admin()))
with check ((select public.is_portfolio_admin()));

drop policy if exists "Admin can delete work media" on public.work_media;
create policy "Admin can delete work media"
on public.work_media for delete to authenticated
using ((select public.is_portfolio_admin()));

-- HOME SHOWCASE: anonymous/public users only see active slides. An
-- authenticated session does NOT automatically gain draft access.
drop policy if exists "Public can read active showcase slides" on public.home_showcase_slides;
create policy "Public can read active showcase slides"
on public.home_showcase_slides
for select to anon, authenticated
using (is_active = true);

drop policy if exists "Admin can read all showcase slides" on public.home_showcase_slides;
create policy "Admin can read all showcase slides"
on public.home_showcase_slides
for select to authenticated
using ((select public.is_portfolio_admin()));

drop policy if exists "Public can read images from active showcase slides" on public.home_showcase_images;
create policy "Public can read images from active showcase slides"
on public.home_showcase_images
for select to anon, authenticated
using (
  exists (
    select 1
    from public.home_showcase_slides slide
    where slide.id = home_showcase_images.slide_id
      and slide.is_active = true
  )
);

drop policy if exists "Admin can read all showcase images" on public.home_showcase_images;
create policy "Admin can read all showcase images"
on public.home_showcase_images
for select to authenticated
using ((select public.is_portfolio_admin()));

-- Replace broad CRUD policies.
drop policy if exists "Authenticated can insert showcase slides" on public.home_showcase_slides;
drop policy if exists "Authenticated can update showcase slides" on public.home_showcase_slides;
drop policy if exists "Authenticated can delete showcase slides" on public.home_showcase_slides;
drop policy if exists "Authenticated can insert showcase images" on public.home_showcase_images;
drop policy if exists "Authenticated can update showcase images" on public.home_showcase_images;
drop policy if exists "Authenticated can delete showcase images" on public.home_showcase_images;

drop policy if exists "Admin can insert showcase slides" on public.home_showcase_slides;
create policy "Admin can insert showcase slides"
on public.home_showcase_slides for insert to authenticated
with check ((select public.is_portfolio_admin()));

drop policy if exists "Admin can update showcase slides" on public.home_showcase_slides;
create policy "Admin can update showcase slides"
on public.home_showcase_slides for update to authenticated
using ((select public.is_portfolio_admin()))
with check ((select public.is_portfolio_admin()));

drop policy if exists "Admin can delete showcase slides" on public.home_showcase_slides;
create policy "Admin can delete showcase slides"
on public.home_showcase_slides for delete to authenticated
using ((select public.is_portfolio_admin()));

drop policy if exists "Admin can insert showcase images" on public.home_showcase_images;
create policy "Admin can insert showcase images"
on public.home_showcase_images for insert to authenticated
with check ((select public.is_portfolio_admin()));

drop policy if exists "Admin can update showcase images" on public.home_showcase_images;
create policy "Admin can update showcase images"
on public.home_showcase_images for update to authenticated
using ((select public.is_portfolio_admin()))
with check ((select public.is_portfolio_admin()));

drop policy if exists "Admin can delete showcase images" on public.home_showcase_images;
create policy "Admin can delete showcase images"
on public.home_showcase_images for delete to authenticated
using ((select public.is_portfolio_admin()));

-- SITE STATUS: visitors may read it, only owner may change it.
drop policy if exists "Authenticated can manage site page status" on public.site_pages;
drop policy if exists "Admin can manage site page status" on public.site_pages;
create policy "Admin can manage site page status"
on public.site_pages
for all
to authenticated
using ((select public.is_portfolio_admin()))
with check ((select public.is_portfolio_admin()));

commit;
