-- Hardens the staff invite trigger:
-- 1. Allowlist role values to prevent arbitrary injection
-- 2. Log UUID parse failures to Supabase logs
-- 3. Add partial unique index on staff.user_id to prevent double-linking

-- Fix 3a: clean up duplicate user_id links created by the old trigger
-- Keep the earliest staff row per user_id; null-out the rest
update public.staff s
set user_id = null
where user_id is not null
  and id not in (
    select distinct on (user_id) id
    from public.staff
    where user_id is not null
    order by user_id, created_at asc
  );

-- Fix 3b: partial unique index (WHERE user_id IS NOT NULL so unlinked rows don't conflict)
create unique index if not exists idx_staff_user_id_unique
  on public.staff (user_id)
  where user_id is not null;

-- Fixes 1 + 2: replace trigger with hardened version
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role     text;
  v_business uuid := null;
  v_staff    uuid := null;
begin
  -- Allowlist role values — never trust raw metadata strings
  v_role := case
    when new.raw_user_meta_data->>'role' = 'staff' then 'staff'
    else 'owner'
  end;

  -- Only parse UUIDs for staff invites (avoids cast errors on normal sign-ups)
  if v_role = 'staff' then
    begin
      v_business := (new.raw_user_meta_data->>'business_id')::uuid;
      v_staff    := (new.raw_user_meta_data->>'staff_id')::uuid;
    exception when invalid_text_representation then
      raise warning 'handle_new_user: invalid UUID in staff invite metadata for user %', new.id;
      v_business := null;
      v_staff    := null;
    end;
  end if;

  insert into public.users (id, email, full_name, avatar_url, role, provider, business_id)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    new.raw_app_meta_data->>'provider',
    v_business
  )
  on conflict (id) do nothing;

  -- Link the pre-created staff row to the new auth user
  if v_role = 'staff' and v_staff is not null and v_business is not null then
    update public.staff
    set user_id = new.id
    where id = v_staff
      and business_id = v_business
      and user_id is null;
  end if;

  return new;
end;
$$;
