-- HarvestHub — carry a farmer's negative week into their next payout
-- (Farmer F4).
--
-- A farmer's week can end NEGATIVE: on a cash-on-pickup order they keep the
-- whole cash total, so their ledger entry is -(commission + service fee +
-- tax) (see 0021), and farmer-cancellation fees are negative too (0025).
-- Until now that just left a farmer_payouts row with a negative net_total
-- and no rule for what happens next. Decided with the user (2026-10-03):
-- the amount is CARRIED automatically into the farmer's next payout.
--
-- How: after the weekly sweep builds/updates payouts, for each farmer it
-- touched, every EARLIER payout of theirs that is still
-- 'pending_disbursement' with a negative net_total is folded into their
-- newest payout from this run — that payout's carried_in_total and
-- net_total go down by the owed amount, and each folded payout becomes
-- 'carried_forward' with carried_into_payout_id pointing at it. If the
-- newest payout is itself still negative, it simply waits (pending) and is
-- carried again the next week the farmer has activity. A negative payout an
-- admin has already settled by hand (marked 'paid' in Studio) is left alone.
--
-- Every payout row still reconciles:
--   net_total = gross_total - commission_total - cash_collected_total - fee_total + carried_in_total
--
-- Ledger entries are always dated into the CURRENT (unswept) pay period
-- (app/payouts/service.py uses today's date), so a payout that has been
-- carried forward never receives new entries afterwards.

alter table farmer_payouts add column if not exists carried_in_total numeric(10, 2) not null default 0;
alter table farmer_payouts add column if not exists carried_into_payout_id uuid references farmer_payouts (id) on delete set null;

alter table farmer_payouts drop constraint if exists farmer_payouts_status_check;
alter table farmer_payouts add constraint farmer_payouts_status_check
  check (status in ('pending_disbursement', 'paid', 'carried_forward'));

create or replace function public.sweep_weekly_farmer_payouts(as_of date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_touched uuid[];
  r record;
  v_carry numeric(10, 2);
begin
  -- 1. Same as 0025: claim every open entry whose period has fully ended,
  --    roll it into one payout per (farmer, period), link the entries.
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
          -- A late-arriving entry landing in an already-'paid'-marked period
          -- reopens it rather than silently inflating a total that already
          -- reads as "settled."
          status = case when farmer_payouts.status = 'paid' then 'pending_disbursement' else farmer_payouts.status end,
          updated_at = now()
    returning id, farmer_id, pay_period_start, pay_period_end
  ),
  linked as (
    update farmer_ledger_entries le
    set status = 'closed', payout_id = u.id, updated_at = now()
    from claimed c
    join upserted u
      on u.farmer_id = c.farmer_id
     and u.pay_period_start = c.pay_period_start
     and u.pay_period_end = c.pay_period_end
    where le.id = c.id
    returning le.id
  )
  select coalesce(array_agg(u.id), '{}') into v_touched from upserted u;

  -- 2. Carry owed amounts forward: for each farmer touched above, fold their
  --    earlier still-pending negative payouts into their newest payout.
  for r in
    select distinct on (p.farmer_id) p.id, p.farmer_id, p.pay_period_end
    from farmer_payouts p
    where p.id = any (v_touched)
    order by p.farmer_id, p.pay_period_end desc
  loop
    select coalesce(sum(net_total), 0) into v_carry
    from farmer_payouts
    where farmer_id = r.farmer_id
      and id <> r.id
      and status = 'pending_disbursement'
      and net_total < 0
      and pay_period_end < r.pay_period_end;

    if v_carry < 0 then
      update farmer_payouts
      set status = 'carried_forward', carried_into_payout_id = r.id, updated_at = now()
      where farmer_id = r.farmer_id
        and id <> r.id
        and status = 'pending_disbursement'
        and net_total < 0
        and pay_period_end < r.pay_period_end;

      update farmer_payouts
      set carried_in_total = carried_in_total + v_carry,
          net_total = net_total + v_carry,
          updated_at = now()
      where id = r.id;
    end if;
  end loop;
end;
$$;
