-- HarvestHub — farmer ledger support for cash-on-pickup orders, plus a fix
-- to the weekly payout sweep.
--
-- Until now a cash_on_pickup store order could never leave
-- 'pending_payment' (only 'paid' orders could be marked received), so it
-- never reached the ledger at all. Now the customer's "Mark as Received"
-- completes it directly (pending_payment -> completed — see
-- app/orders/service.py::mark_store_order_completed), and — decided with
-- the user — the farmer OWES the platform its cut, because the farmer
-- physically collected the whole store_orders.total in cash (goods +
-- service fee + tax, plus any delivery fee).
--
-- Representation: completion still writes one ordinary 'order' ledger row
-- with the usual gross/commission, plus the new cash_collected column
-- holding what the farmer took in hand. net_amount is always
--   gross_amount - commission_amount - cash_collected
-- so a card order (cash_collected = 0) is unchanged, and a cash order's net
-- is negative: -(commission + service fee + tax + delivery fee). It rides
-- into the farmer's weekly sweep like any other entry and reduces that
-- payout; a farmer with only cash orders in a week ends up with a NEGATIVE
-- farmer_payouts.net_total — an amount ops collects from them rather than
-- pays out. Refunds of a ledgered cash order reuse app/payouts/service.py's
-- existing logic (delete if still open, else a negated 'refund_adjustment',
-- which negates cash_collected too).
--
-- farmer_payouts gains cash_collected_total so a payout row still
-- reconciles: net_total = gross_total - commission_total - cash_collected_total.
--
-- Sweep fix: 0015's version closed entries in a data-modifying CTE
-- (UPDATE ... RETURNING) and then set payout_id on those same rows in the
-- outer UPDATE. Postgres won't update a row twice in one statement — the
-- second update is silently skipped — so payout_id was never set
-- (reproduced against 0015 as written: entries closed, payout_id null).
-- This version locks the open entries with SELECT ... FOR UPDATE and sets
-- status and payout_id in a single UPDATE. Locking against
-- handle_refund_ledger_adjustment's own SELECT ... FOR UPDATE works as
-- before: whichever transaction locks first wins, and a waiting sweep
-- re-checks each row afterwards (skipping one the refund deleted).
--
-- Ledger rows already closed by the old sweep keep payout_id = null; they
-- can be backfilled by (farmer_id, pay_period_start, pay_period_end) if
-- that history matters:
--   update farmer_ledger_entries le set payout_id = p.id
--   from farmer_payouts p
--   where le.status = 'closed' and le.payout_id is null and p.farmer_id = le.farmer_id
--     and p.pay_period_start = le.pay_period_start and p.pay_period_end = le.pay_period_end;

alter table farmer_ledger_entries add column if not exists cash_collected numeric(10, 2) not null default 0;
alter table farmer_payouts add column if not exists cash_collected_total numeric(10, 2) not null default 0;

create or replace function public.sweep_weekly_farmer_payouts(as_of date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with claimed as (
    select id, farmer_id, pay_period_start, pay_period_end,
           gross_amount, commission_amount, cash_collected, net_amount
    from farmer_ledger_entries
    where status = 'open' and pay_period_end < as_of
    for update
  ),
  aggregated as (
    select farmer_id, pay_period_start, pay_period_end,
           sum(gross_amount) as gross, sum(commission_amount) as commission,
           sum(cash_collected) as cash_collected, sum(net_amount) as net
    from claimed
    group by farmer_id, pay_period_start, pay_period_end
  ),
  upserted as (
    insert into farmer_payouts (
      farmer_id, pay_period_start, pay_period_end,
      gross_total, commission_total, cash_collected_total, net_total, status
    )
    select farmer_id, pay_period_start, pay_period_end, gross, commission, cash_collected, net, 'pending_disbursement'
    from aggregated
    on conflict (farmer_id, pay_period_start, pay_period_end) do update
      set gross_total = farmer_payouts.gross_total + excluded.gross_total,
          commission_total = farmer_payouts.commission_total + excluded.commission_total,
          cash_collected_total = farmer_payouts.cash_collected_total + excluded.cash_collected_total,
          net_total = farmer_payouts.net_total + excluded.net_total,
          -- A late-arriving entry (e.g. a refund_adjustment) landing in an
          -- already-'paid'-marked period reopens it rather than silently
          -- inflating a total that already reads as "settled."
          status = case when farmer_payouts.status = 'paid' then 'pending_disbursement' else farmer_payouts.status end,
          updated_at = now()
    returning id, farmer_id, pay_period_start, pay_period_end
  )
  update farmer_ledger_entries le
  set status = 'closed', payout_id = u.id, updated_at = now()
  from claimed c
  join upserted u
    on u.farmer_id = c.farmer_id
   and u.pay_period_start = c.pay_period_start
   and u.pay_period_end = c.pay_period_end
  where le.id = c.id;
end;
$$;
