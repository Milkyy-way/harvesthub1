-- HarvestHub — farmer order fulfillment (Farmer F3): "Ready for Pickup",
-- when a farmer gets to see an order (and the customer's contact details),
-- and farmer-initiated cancellations.
--
-- 1. store_orders.status gains 'ready_for_pickup' (a farmer action):
--      card:  pending_payment -> paid -> ready_for_pickup -> completed
--      cash:  pending_payment ---------> ready_for_pickup -> completed
--    The customer's "Mark as Received" now requires ready_for_pickup.
--    0013's orders.status trigger needs no change: ready_for_pickup is just
--    "not finished yet", so the parent order stays 'active'.
--
-- 2. store_orders.released_to_farmer_at — when the farmer may see the
--    order, including the customer's full name and phone number. Decided
--    with the user: the customer is told at checkout, before paying,
--    exactly what is shared and with which farm; the farmer only gets it
--    once the order is fully placed. Set when a card payment succeeds, or at
--    placement for cash on pickup (which has no online payment step). Null
--    means the farmer never sees the order — e.g. a card order abandoned at
--    the payment sheet. Existing rows are backfilled below.
--
-- 3. Farmer cancellations: the customer gets a FULL refund (back to their
--    card, through Stripe), and — decided with the user — the farmer bears
--    the platform's service fee: a 'cancellation_fee' ledger entry deducts
--    store_orders.service_fee from their next weekly payout. Only when money
--    was actually refunded (a card order) — cancelling an unpaid cash order
--    costs the farmer nothing. A new fee_amount column keeps every ledger
--    row reconcilable:
--      net_amount = gross_amount - commission_amount - cash_collected - fee_amount
--    farmer_payouts gains fee_total to match, and the sweep function is
--    replaced to carry it (otherwise identical to 0021's).

alter table store_orders add column if not exists released_to_farmer_at timestamptz;

alter table store_orders drop constraint if exists store_orders_status_check;
alter table store_orders add constraint store_orders_status_check
  check (status in ('pending_payment', 'paid', 'ready_for_pickup', 'completed', 'cancelled'));

update store_orders so
set released_to_farmer_at = so.created_at
where so.released_to_farmer_at is null
  and (
    so.status in ('paid', 'ready_for_pickup', 'completed')
    or exists (select 1 from payments p where p.order_id = so.order_id and p.payment_method = 'cash_on_pickup')
    or exists (select 1 from refunds r where r.store_order_id = so.id)
  );

create index if not exists store_orders_farmer_released_idx
  on store_orders (farmer_id, released_to_farmer_at)
  where released_to_farmer_at is not null;

-- ---------------------------------------------------------------------

alter table farmer_ledger_entries add column if not exists fee_amount numeric(10, 2) not null default 0;
alter table farmer_payouts add column if not exists fee_total numeric(10, 2) not null default 0;

alter table farmer_ledger_entries drop constraint if exists farmer_ledger_entries_entry_type_check;
alter table farmer_ledger_entries add constraint farmer_ledger_entries_entry_type_check
  check (entry_type in ('order', 'refund_adjustment', 'cancellation_fee'));

-- A store order can only ever cost its farmer one cancellation fee.
create unique index if not exists farmer_ledger_entries_cancellation_fee_unique
  on farmer_ledger_entries (store_order_id) where entry_type = 'cancellation_fee';

create or replace function public.sweep_weekly_farmer_payouts(as_of date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with claimed as (
    select id, farmer_id, pay_period_start, pay_period_end,
           gross_amount, commission_amount, cash_collected, fee_amount, net_amount
    from farmer_ledger_entries
    where status = 'open' and pay_period_end < as_of
    for update
  ),
  aggregated as (
    select farmer_id, pay_period_start, pay_period_end,
           sum(gross_amount) as gross, sum(commission_amount) as commission,
           sum(cash_collected) as cash_collected, sum(fee_amount) as fees, sum(net_amount) as net
    from claimed
    group by farmer_id, pay_period_start, pay_period_end
  ),
  upserted as (
    insert into farmer_payouts (
      farmer_id, pay_period_start, pay_period_end,
      gross_total, commission_total, cash_collected_total, fee_total, net_total, status
    )
    select farmer_id, pay_period_start, pay_period_end, gross, commission, cash_collected, fees, net, 'pending_disbursement'
    from aggregated
    on conflict (farmer_id, pay_period_start, pay_period_end) do update
      set gross_total = farmer_payouts.gross_total + excluded.gross_total,
          commission_total = farmer_payouts.commission_total + excluded.commission_total,
          cash_collected_total = farmer_payouts.cash_collected_total + excluded.cash_collected_total,
          fee_total = farmer_payouts.fee_total + excluded.fee_total,
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
