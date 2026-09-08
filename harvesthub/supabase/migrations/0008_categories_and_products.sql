-- HarvestHub — product catalog: categories (mirrors the existing
-- produce_interests taxonomy from customer_profiles/0003) + products
-- (farmer-owned listings). Customers browse both without ever writing to
-- them, so both get a public/authenticated read policy; only the owning
-- farmer can write products.
--
-- NOTE: the FastAPI backend connects as a service-role/postgres
-- connection that bypasses RLS entirely (see V1.md) — the read policies
-- below don't protect anything the customer feed endpoint touches today.
-- They exist for when farmer-side product management reads/writes
-- `products` directly via supabase-js, the same way farmer onboarding
-- already does for `farmer_profiles`.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug in ('vegetables', 'fruits', 'eggs', 'dairy', 'meat', 'herbs', 'flowers', 'honey')),
  name text not null,
  sort_order integer not null default 0,
  icon_name text, -- non-binding hint for the frontend icon set; nullable
  created_at timestamptz not null default now()
);

alter table categories enable row level security;

drop policy if exists "categories are viewable by everyone" on categories;
create policy "categories are viewable by everyone"
  on categories for select
  using (true);

-- No insert/update/delete policy for `authenticated` — categories are
-- seeded/managed by whoever has direct (service-role/Studio) DB access,
-- never written to by the app.

insert into categories (slug, name, sort_order, icon_name) values
  ('vegetables', 'Vegetables', 1, 'eco'),
  ('fruits',     'Fruits',     2, 'local-grocery-store'),
  ('eggs',       'Eggs',       3, 'egg'),
  ('dairy',      'Dairy',      4, 'icecream'),
  ('meat',       'Meat',       5, 'restaurant'),
  ('herbs',      'Herbs',      6, 'grass'),
  ('flowers',    'Flowers',    7, 'local-florist'),
  ('honey',      'Honey',      8, 'hive')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references profiles (id) on delete cascade,
  category_id uuid not null references categories (id) on delete restrict,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  unit text not null, -- free text for now ('lb', 'each', 'dozen', 'bunch'...);
                       -- not constrained to an enum yet — the real set of
                       -- units farmers need isn't known until product CRUD
                       -- (a later checkpoint) ships, same "enforce loosely
                       -- until proven" approach as 0004's tax_id column.
  quantity_available integer not null default 0 check (quantity_available >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_farmer_id_idx on products (farmer_id);
create index if not exists products_category_id_idx on products (category_id);
-- Speeds up the feed's "does this farmer carry a matching active product"
-- EXISTS check, which is the hot path for category/search filtering.
create index if not exists products_active_category_farmer_idx
  on products (category_id, farmer_id) where is_active = true;

alter table products enable row level security;

drop policy if exists "active products are viewable by everyone, own products always" on products;
create policy "active products are viewable by everyone, own products always"
  on products for select
  using (is_active = true or auth.uid() = farmer_id);

drop policy if exists "farmers can manage their own products" on products;
create policy "farmers can manage their own products"
  on products for all
  using (auth.uid() = farmer_id)
  with check (auth.uid() = farmer_id);

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute procedure public.set_updated_at();
