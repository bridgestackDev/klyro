-- Replaces private.handle_new_user() to support staff invite acceptance.
-- When inviteUserByEmail is called with data.role='staff', the trigger
-- sets role='staff', business_id, and links staff.user_id atomically.
-- Normal owner sign-ups are unaffected.

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
  v_role := coalesce(new.raw_user_meta_data->>'role', 'owner');

  -- Only parse UUIDs for staff invites (avoids cast errors on normal sign-ups)
  if v_role = 'staff' then
    begin
      v_business := (new.raw_user_meta_data->>'business_id')::uuid;
      v_staff    := (new.raw_user_meta_data->>'staff_id')::uuid;
    exception when invalid_text_representation then
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
