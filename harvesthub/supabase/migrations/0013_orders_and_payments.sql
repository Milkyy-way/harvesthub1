-- HarvestHub — orders, payments, cancellations, refunds.
--
-- Shape mirrors the checkout page's own grouping (see 0012 / app/checkout/):
-- one `orders` row per "Place Order" action (whether that came from the
-- cart's per-farm "Place Order Separately" or the all-at-once button), one
-- `store_orders` row per farmer inside it, one `store_order_items` row per
-- product line inside that. This is deliberately NOT the same shape as
-- `cart_items`/`products` — everything here is a frozen SNAPSHOT taken at
-- order-placement time (name, unit, price, address text), because an order
-- record must stay accurate even if the underlying product is later
-- repriced/renamed/deleted or the farmer moves. Never join back to
-- `products`/`farmer_profiles` to redisplay historical order data.
--
-- Payment model: ONE Stripe PaymentIntent per `orders` row (the customer's
-- card is charged once for the whole "Place Order" action's grand total),
-- but every `store_orders` row tracks its own status independently and can
-- be individually cancelled/refunded — a partial refund against that one
-- shared PaymentIntent, scoped to just one farmer's portion. This is what
-- "every transaction happens separately" means at the bookkeeping level
-- even though, technically, one charge covers a multi-farm checkout.

-- ---------------------------------------------------------------------
-- orders — the parent record. `status` is a trigger-maintained aggregate
-- of its store_orders (see the trigger below), not something application
-- code sets directly, so it can't drift out of sync with its children.

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_customer_id_idx on orders (customer_id);
create index if not exists orders_customer_status_idx on orders (customer_id, status);

alter table orders enable row level security;

drop policy if exists "customers view their own orders" on orders;
create policy "customers view their own orders"
  on orders for select
  using (auth.uid() = customer_id);

-- ---------------------------------------------------------------------
-- store_orders — one per farmer within an order; the real unit of
-- fulfillment, cancellation, and (partial) refund.

create table if not exists store_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  farmer_id uuid not null references profiles (id) on delete restrict,
  farm_name text not null, -- snapshot — see header note

  fulfillment_method text not null check (fulfillment_method in ('pickup', 'delivery')),
  pickup_address_street text,
  pickup_address_city text,
  pickup_address_state text,
  pickup_address_zip text,
  delivery_address_street text,
  delivery_address_city text,
  delivery_address_state text,
  delivery_address_zip text,

  subtotal numeric(10, 2) not null,
  promo_code text,
  promo_discount numeric(10, 2) not null default 0,
  delivery_fee numeric(10, 2) not null default 0,
  service_fee numeric(10, 2) not null default 0,
  tax numeric(10, 2) not null default 0,
  total numeric(10, 2) not null, -- immutable historical charge amount for this store's portion; refunds are tracked separately, never subtracted from this column

  -- pending_payment -> paid -> completed, or -> cancelled from either of
  -- the first two. 'completed' is reachable today only via the customer's
  -- own "mark received" action — there's no farmer-side fulfillment UI
  -- yet to transition it automatically.
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'completed', 'cancelled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_orders_order_id_idx on store_orders (order_id);
create index if not exists store_orders_farmer_id_idx on store_orders (farmer_id);

alter table store_orders enable row level security;

drop policy if exists "customers view their own store orders" on store_orders;
create policy "customers view their own store orders"
  on store_orders for select
  using (exists (select 1 from orders o where o.id = store_orders.order_id and o.customer_id = auth.uid()));

drop trigger if exists store_orders_set_updated_at on store_orders;
create trigger store_orders_set_updated_at
  before update on store_orders
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------
-- store_order_items — one per product line. product_id is nullable +
-- ON DELETE SET NULL: if a product is later deleted, the historical order
-- line must still render correctly from its own snapshot columns.

create table if not exists store_order_items (
  id uuid primary key default gen_random_uuid(),
  store_order_id uuid not null references store_orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  product_name text not null,
  unit text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists store_order_items_store_order_id_idx on store_order_items (store_order_id);

alter table store_order_items enable row level security;

drop policy if exists "customers view their own order items" on store_order_items;
create policy "customers view their own order items"
  on store_order_items for select
  using (
    exists (
      select 1 from store_orders so
      join orders o on o.id = so.order_id
      where so.id = store_order_items.store_order_id and o.customer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Aggregate orders.status from its store_orders whenever a child changes:
--   all cancelled                        -> 'cancelled'
--   all non-cancelled ones are completed -> 'completed'
--   otherwise                            -> 'active'
-- Same "trigger keeps a derived status in sync so app code never has to"
-- pattern as 0004's sync_profile_status_from_verification.

create or replace function public.sync_order_status_from_store_orders()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_order_id uuid := coalesce(new.order_id, old.order_id);
  total_count integer;
  cancelled_count integer;
  unfinished_count integer;
  new_status text;
begin
  select count(*) into total_count from store_orders where order_id = target_order_id;
  select count(*) into cancelled_count from store_orders where order_id = target_order_id and status = 'cancelled';
  select count(*) into unfinished_count from store_orders where order_id = target_order_id and status not in ('completed', 'cancelled');

  if total_count = 0 then
    return coalesce(new, old);
  elsif cancelled_count = total_count then
    new_status := 'cancelled';
  elsif unfinished_count = 0 then
    new_status := 'completed';
  else
    new_status := 'active';
  end if;

  update orders set status = new_status where id = target_order_id and status is distinct from new_status;
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_store_order_status_change on store_orders;
create trigger on_store_order_status_change
  after insert or update of status or delete on store_orders
  for each row execute procedure public.sync_order_status_from_store_orders();

-- ---------------------------------------------------------------------
-- order_cancellations — audit trail of who cancelled what and why.
-- store_order_id is always the real unit cancelled; order_id groups
-- together every store_order_id cancelled by the same whole-order-cancel
-- action (order-level cancel loops and inserts one row per affected store).

create table if not exists order_cancellations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  store_order_id uuid not null references store_orders (id) on delete cascade,
  cancelled_by uuid not null references profiles (id) on delete restrict,
  cancelled_by_role text not null check (cancelled_by_role in ('customer', 'farmer', 'admin')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists order_cancellations_order_id_idx on order_cancellations (order_id);
create index if not exists order_cancellations_store_order_id_idx on order_cancellations (store_order_id);

alter table order_cancellations enable row level security;

drop policy if exists "customers view their own cancellations" on order_cancellations;
create policy "customers view their own cancellations"
  on order_cancellations for select
  using (exists (select 1 from orders o where o.id = order_cancellations.order_id and o.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- payments — one row per PaymentIntent (one per `orders` row for
-- card/wallet; also one for cash_on_pickup, just with no Stripe object
-- behind it, so every order has exactly one payment record regardless of
-- method). status mirrors Stripe's own PaymentIntent status values
-- directly rather than inventing a parallel state machine.

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  customer_id uuid not null references profiles (id) on delete restrict,
  amount numeric(10, 2) not null,
  currency text not null default 'usd',
  payment_method text not null check (payment_method in ('card', 'cash_on_pickup')), -- 'card' covers everything the native Stripe PaymentSheet offers (manually entered card, Apple Pay, Google Pay) — the sheet itself decides what to show; the app doesn't need to know which the customer actually used
  provider text not null default 'stripe',
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  status text not null default 'requires_payment_method'
    check (status in (
      'requires_payment_method', 'requires_confirmation', 'requires_action',
      'requires_capture', 'processing', 'succeeded', 'failed', 'canceled', 'pending'
    )), -- the requires_*/processing/succeeded/canceled values mirror Stripe's
       -- own PaymentIntent.status enum directly (no parallel state machine);
       -- 'pending' and 'failed' are the two non-Stripe values, used for
       -- cash_on_pickup and a hard failure respectively
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_order_id_idx on payments (order_id);
create index if not exists payments_customer_id_idx on payments (customer_id);

alter table payments enable row level security;

drop policy if exists "customers view their own payments" on payments;
create policy "customers view their own payments"
  on payments for select
  using (auth.uid() = customer_id);

drop trigger if exists payments_set_updated_at on payments;
create trigger payments_set_updated_at
  before update on payments
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------
-- refunds — always scoped to one store_order (even a "whole order"
-- refund is just one refund row per affected store_order), against the
-- payment that was actually charged. amount is independent of
-- store_orders.total, which stays an immutable historical record.

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete restrict,
  store_order_id uuid not null references store_orders (id) on delete restrict,
  amount numeric(10, 2) not null check (amount >= 0),
  reason text,
  stripe_refund_id text unique,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists refunds_payment_id_idx on refunds (payment_id);
create index if not exists refunds_store_order_id_idx on refunds (store_order_id);

alter table refunds enable row level security;

drop policy if exists "customers view their own refunds" on refunds;
create policy "customers view their own refunds"
  on refunds for select
  using (exists (select 1 from payments p where p.id = refunds.payment_id and p.customer_id = auth.uid()));

drop trigger if exists refunds_set_updated_at on refunds;
create trigger refunds_set_updated_at
  before update on refunds
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------
-- payment_cancellations — distinct from refunds: this is for a
-- PaymentIntent that never captured money in the first place (customer
-- abandoned the native payment sheet, or it expired) — nothing to refund,
-- just an audit record that it was cancelled rather than left dangling.

create table if not exists payment_cancellations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists payment_cancellations_payment_id_idx on payment_cancellations (payment_id);

alter table payment_cancellations enable row level security;

drop policy if exists "customers view their own payment cancellations" on payment_cancellations;
create policy "customers view their own payment cancellations"
  on payment_cancellations for select
  using (exists (select 1 from payments p where p.id = payment_cancellations.payment_id and p.customer_id = auth.uid()));
