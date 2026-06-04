-- Phase 2.6 Block A: Storage buckets for business logos and staff avatars
--
-- Path convention (ADR-013):
--   business-logos/{business_id}/logo.{ext}
--   staff-avatars/{business_id}/{staff_id}.{ext}
--
-- RLS uses (storage.foldername(name))[1] to extract the business_id folder
-- and compares it against private.get_my_business_id() from migration 0002.
--
-- For staff-avatars, non-owner staff are additionally restricted to their
-- own subfolder via (storage.foldername(name))[2] = own staff id.

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
    and (storage.foldername(name))[1] = private.get_my_business_id()::text
    and private.get_my_role() = 'owner'
  );

-- [M1] WITH CHECK mirrors USING so the new-row state is validated too
create policy "owner can update business logo"
  on storage.objects for update
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = private.get_my_business_id()::text
    and private.get_my_role() = 'owner'
  )
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = private.get_my_business_id()::text
    and private.get_my_role() = 'owner'
  );

create policy "owner can delete business logo"
  on storage.objects for delete
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = private.get_my_business_id()::text
    and private.get_my_role() = 'owner'
  );

-- ── staff-avatars RLS ─────────────────────────────────────────────────────────

-- Public read: avatars appear on public booking pages
create policy "public can view staff avatars"
  on storage.objects for select
  using (bucket_id = 'staff-avatars');

-- Owner may upload/replace/delete any avatar for their business.
-- Staff may only upload to their own subfolder:
--   (storage.foldername(name))[2] must equal their own staff id.
-- [C1] The non-owner branch now checks the staff_id path segment to prevent
--      one staff member from overwriting another's avatar.
create policy "owner or self can upload staff avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'staff-avatars'
    and (storage.foldername(name))[1] = private.get_my_business_id()::text
    and (
      private.get_my_role() = 'owner'
      or (storage.foldername(name))[2] = (
        select id::text from staff
        where user_id = auth.uid()
          and business_id = private.get_my_business_id()
      )
    )
  );

-- [C1] + [M1]: non-owner path restricts to own staff_id; WITH CHECK mirrors USING
create policy "owner or self can update staff avatar"
  on storage.objects for update
  using (
    bucket_id = 'staff-avatars'
    and (storage.foldername(name))[1] = private.get_my_business_id()::text
    and (
      private.get_my_role() = 'owner'
      or (storage.foldername(name))[2] = (
        select id::text from staff
        where user_id = auth.uid()
          and business_id = private.get_my_business_id()
      )
    )
  )
  with check (
    bucket_id = 'staff-avatars'
    and (storage.foldername(name))[1] = private.get_my_business_id()::text
    and (
      private.get_my_role() = 'owner'
      or (storage.foldername(name))[2] = (
        select id::text from staff
        where user_id = auth.uid()
          and business_id = private.get_my_business_id()
      )
    )
  );

-- [C1]: non-owner path restricts to own staff_id
create policy "owner or self can delete staff avatar"
  on storage.objects for delete
  using (
    bucket_id = 'staff-avatars'
    and (storage.foldername(name))[1] = private.get_my_business_id()::text
    and (
      private.get_my_role() = 'owner'
      or (storage.foldername(name))[2] = (
        select id::text from staff
        where user_id = auth.uid()
          and business_id = private.get_my_business_id()
      )
    )
  );
