# HarvestHub — mobile app starter

Working sign-up / log-in flow with real Supabase authentication, role-based
routing (customer vs. farmer), and secure session storage. Confirmed to
type-check cleanly and bundle successfully via Metro before being handed to
you — the remaining setup below is connecting it to your own Supabase project.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Open the **SQL Editor** and run every file in `supabase/migrations/` **in order**
   (`0001` through `0007`). Together they create the `profiles`, `customer_profiles`,
   `farmer_profiles`, `farmer_verification`, and `farmer_certifications` tables, their
   RLS policies, the trigger that turns a sign-up into the right rows automatically,
   the private `farmer-verification-docs` storage bucket + policies, and the
   `submit_farmer_verification()` RPC the app calls when a farmer submits their
   application.
3. Go to **Settings → API** and copy your **Project URL** and **anon public** key.
4. Farmer applications are reviewed manually for now: once a farmer submits their
   verification documents, open the `farmer_verification` table in the Studio table
   editor and set `status` to `approved` or `rejected` (add `reviewer_notes` too, if
   rejecting) — a trigger syncs that back to `profiles.status` automatically, which is
   what actually unlocks their dashboard. Uploaded documents are under
   **Storage → farmer-verification-docs → `<user id>`**.

## 2. Configure the app

```bash
cd app
cp .env.example .env
# paste your Project URL and anon key into .env
npm install
```

## 3. Run it on your phone

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app (iOS or Android). You should land
on the HarvestHub welcome screen.

## 4. Try the full loop

**Customer:**
- Tap **Sign up**, choose **Customer**, and fill in the form (contact info,
  delivery address, and optional dietary preferences / referral source).
- Supabase sends a confirmation email by default — confirm it, then log in.
  (You can turn confirmation off for faster local testing under
  **Authentication → Providers → Email** in your Supabase dashboard, but
  turn it back on before you go live.)
- You land straight on the customer home screen.

**Farmer:**
- Tap **Sign up**, choose **Farmer**, and create the account (farm name,
  owner contact info, password) — this is just step 1.
- Confirm the email, then log in. You're dropped into an in-app onboarding
  wizard to fill in farm details (address, farm type, years in operation, tax
  ID) and upload verification documents (business license, insurance
  certificate + expiration date, certifications, government ID, proof of
  land ownership/lease).
- After submitting, you'll see an "under review" screen — a farmer can log in
  at any time, but doesn't reach the real dashboard until an admin approves
  them (see step 4 above for how to do that manually).

Tap **Log out** and log back in on either flow — the session persists
securely on the device via `expo-secure-store`, so this should be instant.

## What's already handled

- **Security** — passwords never touch your own code (Supabase Auth handles
  hashing/storage); session tokens live in the device Keychain/Keystore, not
  plain storage; every table has row-level security; `role` and `status`
  can't be self-escalated through the client — a column-level `GRANT`
  restricts exactly which columns `authenticated` may write, on top of RLS
  (see `0002_profiles_status_and_grants.sql`).
- **Reliability** — auth state is driven by a single listener
  (`onAuthStateChange`) rather than manual polling, so the UI can't drift out
  of sync with the actual session; loading and error states are handled
  explicitly on every screen, not just the happy path.
- **Scalability** — auth is fully stateless (JWT-based), so there's nothing
  here that needs to change as usage grows; Postgres/Supabase scales
  independently of the app itself.

## What's next

This gets you through the first bullet point of the MVP list (accounts,
roles, and farmer verification). Bank/payment setup was deliberately left out
of farmer signup — that belongs in a dedicated payments-onboarding flow later
(e.g. via a payment processor's own hosted onboarding, not fields we store
ourselves). Listings, browsing, and checkout are the next phases — bring this
project back whenever you're ready to build the next piece and we'll keep
going the same way.
