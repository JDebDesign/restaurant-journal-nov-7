-- Reference schema for the Supabase step. Not applied by the front end today.
-- Mirrors src/data/types.ts. Row-level security: users only see their own rows;
-- public share pages are served by an Edge Function / server route using the service role.

create extension if not exists pg_trgm;

create type feeling as enum ('loved', 'liked', 'meh');
create type tag_kind as enum ('occasion', 'vibe');
create type source_type as enum ('instagram', 'tiktok', 'maps', 'other');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  home_city text not null default '',
  created_at timestamptz not null default now()
);

create table places (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique not null,
  name text not null,
  address text,
  neighborhood text,
  lat double precision not null,
  lng double precision not null,
  price_level smallint check (price_level between 1 and 4),
  cuisine text,
  google_maps_url text,
  website text,
  last_synced_at timestamptz not null default now()
);
create index on places (neighborhood);
create index places_name_trgm on places using gin (name gin_trgm_ops);

create table visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  place_id uuid not null references places,
  visited_on date not null default current_date,
  feeling feeling,
  note text not null default '',
  recommendable boolean not null default false,
  price_paid_level smallint check (price_paid_level between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on visits (user_id, visited_on desc);

create table visit_dishes (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits on delete cascade,
  name text not null,
  is_standout boolean not null default true
);
create index visit_dishes_name_trgm on visit_dishes using gin (name gin_trgm_ops);

create table visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits on delete set null, -- null until attached (feeds the nudge)
  user_id uuid not null references profiles on delete cascade,
  storage_path text not null,
  taken_at timestamptz,
  lat double precision,
  lng double precision
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  kind tag_kind not null,
  label text not null unique
);

create table visit_tags (
  visit_id uuid references visits on delete cascade,
  tag_id uuid references tags on delete cascade,
  primary key (visit_id, tag_id)
);

create table want_to_try (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  place_id uuid not null references places,
  source_url text,
  source_type source_type,
  note text not null default '',
  created_at timestamptz not null default now(),
  converted_visit_id uuid references visits on delete set null
);

create table shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  slug text unique not null,
  title text not null,
  created_at timestamptz not null default now(),
  view_count integer not null default 0
);

create table share_items (
  share_id uuid references shares on delete cascade,
  place_id uuid not null references places,
  visit_id uuid references visits on delete set null,
  position smallint not null,
  primary key (share_id, position)
);

insert into tags (kind, label) values
  ('occasion', 'date night'), ('occasion', 'groups'), ('occasion', 'solo'), ('occasion', 'family'),
  ('occasion', 'impress visitors'), ('occasion', 'brunch'), ('occasion', 'late night'), ('occasion', 'quick bite'),
  ('vibe', 'cozy'), ('vibe', 'lively'), ('vibe', 'outdoor');

-- RLS (to be completed and covered by a test that signs in as two users):
alter table profiles enable row level security;
alter table visits enable row level security;
alter table visit_photos enable row level security;
alter table want_to_try enable row level security;
alter table shares enable row level security;
alter table visit_dishes enable row level security;
alter table visit_tags enable row level security;
alter table share_items enable row level security;
alter table places enable row level security;
alter table tags enable row level security;

create policy own_profile on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_visits on visits for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_photos on visit_photos for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_want on want_to_try for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_shares on shares for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_dishes on visit_dishes for all
  using (exists (select 1 from visits v where v.id = visit_id and v.user_id = auth.uid()))
  with check (exists (select 1 from visits v where v.id = visit_id and v.user_id = auth.uid()));
create policy own_visit_tags on visit_tags for all
  using (exists (select 1 from visits v where v.id = visit_id and v.user_id = auth.uid()))
  with check (exists (select 1 from visits v where v.id = visit_id and v.user_id = auth.uid()));
create policy own_share_items on share_items for all
  using (exists (select 1 from shares s where s.id = share_id and s.user_id = auth.uid()))
  with check (exists (select 1 from shares s where s.id = share_id and s.user_id = auth.uid()));
create policy read_places on places for select to authenticated using (true);
create policy read_tags on tags for select to authenticated using (true);
-- Note: no anon policies. Public /r/[slug] reads go through a server route with the service role.
