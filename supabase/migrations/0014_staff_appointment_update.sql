-- Phase 6 Block B — let staff update the status of their OWN appointments.
--
-- Staff already have SELECT on their own appointments (0002_rls_policies.sql:
-- "staff can view own appointments"). This adds the matching UPDATE so a staff
-- member can mark their own appointments completed / no-show from the staff
-- agenda. Owners keep the broader "owner can manage all appointments in own
-- business" policy.
--
-- USING limits which rows a staff member may target (only their own).
-- WITH CHECK ensures the row still belongs to them after the update, so they
-- cannot reassign an appointment to another staff member. The owner dashboard
-- only ever writes `status`, so the post-update row keeps the same staff_id.

create policy "staff can update own appointments"
  on appointments for update
  using (
    staff_id in (select id from staff where user_id = auth.uid())
  )
  with check (
    staff_id in (select id from staff where user_id = auth.uid())
  );
