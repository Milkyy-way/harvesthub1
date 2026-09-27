-- HarvestHub — farmer ratings.
--
-- One rating per completed store_order (a customer rates the FARM's
-- performance on that specific transaction, not a product) — enforced by
-- the unique constraint on store_order_id below, and by application code
-- only allowing submission once app/orders/service.py sees the store
-- order's status as 'completed'. Submitting again on the same store order
-- upserts (updates) the existing row rather than creating a second one —
-- customers can revise their rating.
--
-- The collective (average) rating feeds the Home feed's "spotlight"
-- ranking alongside distance — see app/farmers/service.py's
-- get_spotlight_farmers() for the actual blended-score formula, which is
-- explicitly flagged there as a placeholder/tunable weighting, not a
-- researched one.

create table if not exists farmer_ratings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete restrict,
  farmer_id uuid not null references profiles (id) on delete restrict,
  store_order_id uuid not null references store_orders (id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_order_id)
);

create index if not exists farmer_ratings_farmer_id_idx on farmer_ratings (farmer_id);
create index if not exists farmer_ratings_customer_id_idx on farmer_ratings (customer_id);

alter table farmer_ratings enable row level security;

drop policy if exists "customers manage their own ratings" on farmer_ratings;
create policy "customers manage their own ratings"
  on farmer_ratings for all
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

drop policy if exists "farmers view ratings about themselves" on farmer_ratings;
create policy "farmers view ratings about themselves"
  on farmer_ratings for select
  using (auth.uid() = farmer_id);

drop trigger if exists farmer_ratings_set_updated_at on farmer_ratings;
create trigger farmer_ratings_set_updated_at
  before update on farmer_ratings
  for each row execute procedure public.set_updated_at();

-- Belt-and-suspenders, same reasoning as 0015's patch: guard against this
-- table having already existed under this name without these constraints.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'farmer_ratings_rating_check') then
    alter table farmer_ratings
      add constraint farmer_ratings_rating_check check (rating between 1 and 5);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farmer_ratings_store_order_id_key') then
    alter table farmer_ratings
      add constraint farmer_ratings_store_order_id_key unique (store_order_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farmer_ratings_customer_id_fkey') then
    alter table farmer_ratings
      add constraint farmer_ratings_customer_id_fkey foreign key (customer_id) references profiles (id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farmer_ratings_farmer_id_fkey') then
    alter table farmer_ratings
      add constraint farmer_ratings_farmer_id_fkey foreign key (farmer_id) references profiles (id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farmer_ratings_store_order_id_fkey') then
    alter table farmer_ratings
      add constraint farmer_ratings_store_order_id_fkey foreign key (store_order_id) references store_orders (id) on delete restrict;
  end if;
end $$;
