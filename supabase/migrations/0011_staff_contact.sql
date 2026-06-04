-- Phase 5 Block C polish: contact information for team members.
--
-- Adds optional email + phone to staff. Both are nullable and additive — no
-- backfill needed. `email` also seeds the future invite-by-email flow (Block C2);
-- a staff row may carry an email before a `user_id` is ever linked.

alter table staff add column if not exists email text;
alter table staff add column if not exists phone text;
