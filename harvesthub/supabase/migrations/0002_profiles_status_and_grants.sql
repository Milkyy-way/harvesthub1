-- HarvestHub — add profiles.status (the verification/lifecycle gate) and lock
-- down which columns `authenticated` may write directly on profiles.
--
-- SECURITY FIX: 0001's "users can update their own profile" policy only
-- checks `auth.uid() = id` — RLS applies per-row, not per-column, so that
-- policy alone lets any logged-in user run `.update({ role: 'admin' })`
-- today. Closing that here, and doing the same for the new `status` column,
-- so a pending farmer can't self-approve their own application.

alter table profiles
  add column status text not null default 'active'
    check (status in ('active', 'pending_verification', 'rejected', 'suspended'));

create index if not exists profiles_role_status_idx on profiles (role, status);

revoke update on profiles from authenticated;
grant update (full_name, phone) on profiles to authenticated;
