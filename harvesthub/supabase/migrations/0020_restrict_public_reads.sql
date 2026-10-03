-- HarvestHub — close two over-broad public read policies.
--
-- profiles: 0001's "profiles are viewable by everyone" (using (true)) let
-- anyone holding the anon key — which ships inside the app — list every
-- user's full_name, phone, role and status, without even logging in.
-- Nothing needs that: the app only ever reads its OWN profiles row via
-- supabase-js (AuthContext, signup-details, edit-profile), and everything
-- that shows another user's data (farm names on the feed, etc.) goes
-- through FastAPI, whose direct connection bypasses RLS anyway. Replaced
-- with a self-only read policy.
--
-- promo_codes: 0012's "active promo codes are viewable by everyone" let
-- anyone enumerate every farmer's live codes. No client reads this table
-- directly (codes are validated server-side by /checkout/preview), and
-- farmers keep full access to their own codes through 0012's existing
-- "farmers manage their own promo codes" policy.
--
-- Security-definer functions (handle_new_user, complete_profile_setup,
-- the status-sync triggers) run as the table owner and are unaffected.

drop policy if exists "profiles are viewable by everyone" on profiles;

drop policy if exists "users can view their own profile" on profiles;
create policy "users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "active promo codes are viewable by everyone" on promo_codes;
