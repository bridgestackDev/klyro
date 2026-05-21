-- Public read access for the booking flow (Phase 3).
-- All tables have RLS enabled with no anon policies — this migration adds
-- the minimum policies needed for unauthenticated clients to browse
-- businesses, branches, staff, services, and available slots.
-- Writes (clients, appointments) use the admin/service-role client from
-- the booking API route handler, so no anon INSERT policies are needed.

-- businesses: anon can read completed (live) businesses
create policy "public can read completed businesses"
  on businesses for select
  to anon
  using (onboarding_completed = true);

-- branches: anon can read active branches of completed businesses
create policy "public can read active branches"
  on branches for select
  to anon
  using (
    is_active = true
    and business_id in (
      select id from businesses where onboarding_completed = true
    )
  );

-- staff: anon can read active staff of completed businesses
create policy "public can read active staff"
  on staff for select
  to anon
  using (
    is_active = true
    and business_id in (
      select id from businesses where onboarding_completed = true
    )
  );

-- staff_branches: anon can read staff-branch assignments
create policy "public can read staff_branches"
  on staff_branches for select
  to anon
  using (true);

-- services: anon can read active services of completed businesses
create policy "public can read active services"
  on services for select
  to anon
  using (
    is_active = true
    and business_id in (
      select id from businesses where onboarding_completed = true
    )
  );

-- branch_services: anon can read service-branch assignments
create policy "public can read branch_services"
  on branch_services for select
  to anon
  using (true);

-- staff_availability: anon can read schedules to show calendar
create policy "public can read staff_availability"
  on staff_availability for select
  to anon
  using (true);

-- appointments: anon can read pending/confirmed appointments for slot-overlap checking.
-- Only start/end times and staff_id are relevant; client data is in a separate table
-- with no anon read policy, so client PII is never exposed.
create policy "public can read appointments for slot checking"
  on appointments for select
  to anon
  using (
    status in ('pending', 'confirmed')
    and staff_id in (select id from staff where is_active = true)
  );
