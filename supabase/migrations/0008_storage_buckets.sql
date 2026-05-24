-- Phase 2.6 Block A: Storage buckets for business logos and staff avatars
--
-- Path convention (ADR-013):
--   business-logos/{business_id}/logo.{ext}
--   staff-avatars/{business_id}/{staff_id}.{ext}
--
-- RLS uses (storage.foldername(name))[1] to extract the business_id folder
-- and compares it against get_my_business_id() from migration 0002.

-- ── Buckets ───────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'business-logos',
    'business-logos',
    true,
    2097152, -- 2 MB
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'staff-avatars',
    'staff-avatars',
    true,
    1048576, -- 1 MB
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do nothing;

-- ── business-logos RLS ────────────────────────────────────────────────────────

-- Public read: logos appear on public booking pages
create policy "public can view business logos"
  on storage.objects for select
  using (bucket_id = 'business-logos');

-- Only the business owner may upload/replace/delete their logo
create policy "owner can upload business logo"
  on storage.objects for insert
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = get_my_business_id()::text
    and get_my_role() = 'owner'
  );

create policy "owner can update business logo"
  on storage.objects for update
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = get_my_business_id()::text
    and get_my_role() = 'owner'
  );

create policy "owner can delete business logo"
  on storage.objects for delete
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = get_my_business_id()::text
    and get_my_role() = 'owner'
  );

-- ── staff-avatars RLS ─────────────────────────────────────────────────────────

-- Public read: avatars appear on public booking pages
create policy "public can view staff avatars"
  on storage.objects for select
  using (bucket_id = 'staff-avatars');

-- Owner may upload/replace/delete any avatar for their business
-- Staff may upload/replace/delete their own avatar (user_id match on staff table)
create policy "owner or self can upload staff avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'staff-avatars'
    and (storage.foldername(name))[1] = get_my_business_id()::text
    and (
      get_my_role() = 'owner'
      or exists (
        select 1 from staff
        where user_id = auth.uid()
          and business_id = get_my_business_id()
      )
    )
  );

create policy "owner or self can update staff avatar"
  on storage.objects for update
  using (
    bucket_id = 'staff-avatars'
    and (storage.foldername(name))[1] = get_my_business_id()::text
    and (
      get_my_role() = 'owner'
      or exists (
        select 1 from staff
        where user_id = auth.uid()
          and business_id = get_my_business_id()
      )
    )
  );

create policy "owner or self can delete staff avatar"
  on storage.objects for delete
  using (
    bucket_id = 'staff-avatars'
    and (storage.foldername(name))[1] = get_my_business_id()::text
    and (
      get_my_role() = 'owner'
      or exists (
        select 1 from staff
        where user_id = auth.uid()
          and business_id = get_my_business_id()
      )
    )
  );
