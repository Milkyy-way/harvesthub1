-- HarvestHub — farmer payout ledger.
--
-- Ledger-only bookkeeping — deliberately NO Stripe Connect. Every dollar
-- charged still lands in the platform's own Stripe account; this just
-- tracks what each farmer is OWED. Actual money transfer to a farmer
-- happens manually outside the app (ACH/check by ops), with a
-- farmer_payouts row marked 'paid' by hand once that happens — see the
-- "what you need to do" notes in this checkpoint's plan for the exact SQL.
--
-- farmer_ledger_entries — one 'order' row per store_order once it reaches
-- 'completed' (the customer's "Mark as Received" action — see
-- app/orders/service.py::mark_store_order_completed), carrying a 12% flat
-- commission SNAPSHOTTED at creation time (app/core/pricing.py's
-- FARMER_COMMISSION_RATE) so a future rate change never retroactively
-- alters historical entries. Pay periods are Saturday-to-Friday weeks
-- containing the completion date.
--
-- Refunds against a completed (and therefore ledgered) store order don't
-- mutate history: if the entry is still 'open' (not yet swept), it's
-- deleted outright (today's refunds are always the full store_order
-- total — nothing partial to preserve). If it's already 'closed' (swept,
-- possibly already disbursed), a NEW 'refund_adjustment' row is inserted
-- with negated amounts, dated into the CURRENT open pay period — this
-- rides into the farmer's next weekly sweep and reduces their next
-- payout, with no special-casing needed in the sweep itself. See
-- app/payouts/service.py::handle_refund_ledger_adjustment.
--
-- The partial unique index below (only one 'order' row per store_order_id,
-- 'refund_adjustment' rows unrestricted) mirrors 0008's partial index
-- pattern on products for the active-farmer filter.
--
-- farmer_payouts — one row per farmer per pay period, produced by the
-- weekly pg_cron sweep below. Money-movement mechanism decided
-- deliberately NOT via Stripe Connect for phase 1 — see header note.
--
-- Race-condition safety (a refund initiated while the Friday sweep job is
-- running): handle_refund_ledger_adjustment takes a row-level lock
-- (SELECT ... FOR UPDATE) on the ledger entry before branching; the sweep
-- function below claims rows via an atomic `UPDATE ... RETURNING`, which
-- IS its lock acquisition — whichever transaction commits first wins, and
-- the loser sees the post-commit row state. No best-effort timing check.

create table if not exists farmer_payouts (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references profiles (id) on delete restrict,
  pay_period_start date not null,
  pay_period_end date not null,
  gross_total numeric(10, 2) not null default 0,
  commission_total numeric(10, 2) not null default 0,
  net_total numeric(10, 2) not null default 0,
  status text not null default 'pending_disbursement' check (status in ('pending_disbursement', 'paid')),
  disbursed_at timestamptz,
  disbursed_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farmer_id, pay_period_start, pay_period_end)
);

create index if not exists farmer_payouts_farmer_id_idx on farmer_payouts (farmer_id);

alter table farmer_payouts enable row level security;

drop policy if exists "farmers view their own payouts" on farmer_payouts;
create policy "farmers view their own payouts"
  on farmer_payouts for select
  using (auth.uid() = farmer_id);

drop trigger if exists farmer_payouts_set_updated_at on farmer_payouts;
create trigger farmer_payouts_set_updated_at
  before update on farmer_payouts
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------

create table if not exists farmer_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references profiles (id) on delete restrict,
  store_order_id uuid not null references store_orders (id) on delete restrict,
  entry_type text not null default 'order' check (entry_type in ('order', 'refund_adjustment')),
  gross_amount numeric(10, 2) not null,
  commission_rate numeric(5, 4) not null,
  commission_amount numeric(10, 2) not null,
  net_amount numeric(10, 2) not null,
  pay_period_start date not null,
  pay_period_end date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  payout_id uuid references farmer_payouts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists farmer_ledger_entries_order_entry_unique
  on farmer_ledger_entries (store_order_id) where entry_type = 'order';
create index if not exists farmer_ledger_entries_farmer_id_idx on farmer_ledger_entries (farmer_id);
create index if not exists farmer_ledger_entries_payout_id_idx on farmer_ledger_entries (payout_id);
create index if not exists farmer_ledger_entries_open_period_idx on farmer_ledger_entries (pay_period_end) where status = 'open';

-- Belt-and-suspenders: `create table if not exists` above is a no-op if
-- either table already existed under that name (e.g. a prior partial run)
-- — it does NOT retroactively add constraints to an already-existing
-- table. These guarded ALTER TABLEs make sure the unique/check/FK
-- constraints are actually present regardless of that history, the same
-- "always guard for re-run" discipline as this project's policy/trigger
-- drop-if-exists convention, just extended to table constraints.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'farmer_payouts_period_unique') then
    alter table farmer_payouts
      add constraint farmer_payouts_period_unique unique (farmer_id, pay_period_start, pay_period_end);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farmer_payouts_status_check') then
    alter table farmer_payouts
      add constraint farmer_payouts_status_check check (status in ('pending_disbursement', 'paid'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farmer_payouts_farmer_id_fkey') then
    alter table farmer_payouts
      add constraint farmer_payouts_farmer_id_fkey foreign key (farmer_id) references profiles (id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farmer_ledger_entries_farmer_id_fkey') then
    alter table farmer_ledger_entries
      add constraint farmer_ledger_entries_farmer_id_fkey foreign key (farmer_id) references profiles (id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farmer_ledger_entries_store_order_id_fkey') then
    alter table farmer_ledger_entries
      add constraint farmer_ledger_entries_store_order_id_fkey foreign key (store_order_id) references store_orders (id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farmer_ledger_entries_payout_id_fkey') then
    alter table farmer_ledger_entries
      add constraint farmer_ledger_entries_payout_id_fkey foreign key (payout_id) references farmer_payouts (id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farmer_ledger_entries_entry_type_check') then
    alter table farmer_ledger_entries
      add constraint farmer_ledger_entries_entry_type_check check (entry_type in ('order', 'refund_adjustment'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farmer_ledger_entries_status_check') then
    alter table farmer_ledger_entries
      add constraint farmer_ledger_entries_status_check check (status in ('open', 'closed'));
  end if;
end $$;

alter table farmer_ledger_entries enable row level security;

drop policy if exists "farmers view their own ledger entries" on farmer_ledger_entries;
create policy "farmers view their own ledger entries"
  on farmer_ledger_entries for select
  using (auth.uid() = farmer_id);

drop trigger if exists farmer_ledger_entries_set_updated_at on farmer_ledger_entries;
create trigger farmer_ledger_entries_set_updated_at
  before update on farmer_ledger_entries
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------
-- Weekly sweep: claims every 'open' ledger entry whose period has fully
-- ended, aggregates it into (or adds it onto) a farmer_payouts row per
-- (farmer, period), and marks those entries 'closed'. The `as_of`
-- parameter defaults to current_date for the real Friday cron run, but
-- can be called with a future date to exercise the sweep during testing
-- without waiting for an actual Friday, e.g.:
--   select public.sweep_weekly_farmer_payouts(current_date + 8);

create extension if not exists pg_cron;

create or replace function public.sweep_weekly_farmer_payouts(as_of date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with closed as (
    update farmer_ledger_entries
    set status = 'closed', updated_at = now()
    where status = 'open' and pay_period_end < as_of
    returning id, farmer_id, pay_period_start, pay_period_end, gross_amount, commission_amount, net_amount
  ),
  aggregated as (
    select farmer_id, pay_period_start, pay_period_end,
           sum(gross_amount) as gross, sum(commission_amount) as commission, sum(net_amount) as net
    from closed
    group by farmer_id, pay_period_start, pay_period_end
  ),
  upserted as (
    insert into farmer_payouts (farmer_id, pay_period_start, pay_period_end, gross_total, commission_total, net_total, status)
    select farmer_id, pay_period_start, pay_period_end, gross, commission, net, 'pending_disbursement'
    from aggregated
    on conflict (farmer_id, pay_period_start, pay_period_end) do update
      set gross_total = farmer_payouts.gross_total + excluded.gross_total,
          commission_total = farmer_payouts.commission_total + excluded.commission_total,
          net_total = farmer_payouts.net_total + excluded.net_total,
          -- A late-arriving entry (e.g. a refund_adjustment) landing in an
          -- already-'paid'-marked period reopens it rather than silently
          -- inflating a total that already reads as "settled."
          status = case when farmer_payouts.status = 'paid' then 'pending_disbursement' else farmer_payouts.status end,
          updated_at = now()
    returning id, farmer_id, pay_period_start, pay_period_end
  )
  update farmer_ledger_entries le
  set payout_id = u.id
  from upserted u, closed c
  where le.id = c.id and c.farmer_id = u.farmer_id
    and c.pay_period_start = u.pay_period_start and c.pay_period_end = u.pay_period_end;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'weekly_farmer_payout_sweep') then
    perform cron.unschedule('weekly_farmer_payout_sweep');
  end if;
end $$;

select cron.schedule(
  'weekly_farmer_payout_sweep',
  '0 20 * * 5', -- Friday 20:00 UTC — pg_cron has no timezone/DST awareness, adjust as needed
  $$select public.sweep_weekly_farmer_payouts();$$
);
