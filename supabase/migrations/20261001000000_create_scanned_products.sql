create table public.scanned_products (
  barcode text primary key,
  product_name text,
  brands text,
  calories_100g numeric,
  protein_100g numeric,
  carbohydrates_100g numeric,
  fat_100g numeric,
  fiber_100g numeric,
  sugars_100g numeric,
  serving_size text,
  serving_quantity numeric,
  source text not null default 'openfoodfacts',
  source_updated_at timestamptz,
  raw_product jsonb not null default '{}'::jsonb,
  first_scanned_at timestamptz not null default now(),
  last_scanned_at timestamptz not null default now()
);

alter table public.scanned_products enable row level security;

create policy "Authenticated users can read scanned products"
on public.scanned_products
for select
to authenticated
using (true);

create policy "Authenticated users can save scanned products"
on public.scanned_products
for insert
to authenticated
with check (true);

create policy "Authenticated users can update scanned products"
on public.scanned_products
for update
to authenticated
using (true)
with check (true);

create index scanned_products_product_name_idx
  on public.scanned_products using gin (to_tsvector('simple', coalesce(product_name, '')));
