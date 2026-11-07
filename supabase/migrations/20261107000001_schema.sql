-- Recd schema. Mirrors src/data/types.ts (camelCase there, snake_case here).

create type public.feeling as enum ('loved', 'liked', 'meh');
create type public.tag_kind as enum ('occasion', 'vibe');
create type public.source_type as enum ('instagram', 'tiktok', 'maps', 'other');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  home_city text not null default '',
  created_at timestamptz not null default now()
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  google_place_id text not null unique,
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
create index places_neighborhood_idx on public.places (neighborhood);

-- Tag ids are stable slugs ("date-night") so the app and seed data can refer to them directly.
create table public.tags (
  id text primary key,
  kind public.tag_kind not null,
  label text not null unique
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id),
  visited_on date not null default current_date,
  feeling public.feeling,
  note text not null default '' check (char_length(note) <= 1000),
  recommendable boolean not null default false,
  price_paid_level smallint check (price_paid_level between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visits_user_visited_idx on public.visits (user_id, visited_on desc);
create index visits_place_idx on public.visits (place_id);

create table public.visit_dishes (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  is_standout boolean not null default true,
  position smallint not null default 0
);
create index visit_dishes_visit_idx on public.visit_dishes (visit_id);

create table public.visit_tags (
  visit_id uuid not null references public.visits (id) on delete cascade,
  tag_id text not null references public.tags (id),
  primary key (visit_id, tag_id)
);
create index visit_tags_tag_idx on public.visit_tags (tag_id);

-- visit_id stays null until the photo is attached to a visit (feeds the "log these?" nudge).
create table public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references public.visits (id) on delete set null,
  user_id uuid not null default auth.uid () references public.profiles (id) on delete cascade,
  storage_path text not null,
  taken_at timestamptz,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);
create index visit_photos_visit_idx on public.visit_photos (visit_id);
create index visit_photos_user_idx on public.visit_photos (user_id);

create table public.want_to_try (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id),
  source_url text check (char_length(source_url) <= 2048),
  source_type public.source_type,
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  converted_visit_id uuid references public.visits (id) on delete set null
);
create index want_user_idx on public.want_to_try (user_id);
create index want_place_idx on public.want_to_try (place_id);
create index want_converted_idx on public.want_to_try (converted_visit_id);

-- `payload` is a snapshot of the card (what the public page renders); `photo_paths[i]` is the
-- storage path of item i's photo ('' when none). Public reads go through get_share().
create table public.shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]{6,32}$'),
  title text not null check (char_length(title) <= 200),
  payload jsonb not null check (octet_length(payload::text) < 50000),
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  view_count integer not null default 0
);
create index shares_user_idx on public.shares (user_id);
create index shares_photo_paths_idx on public.shares using gin (photo_paths);

create table public.share_items (
  share_id uuid not null references public.shares (id) on delete cascade,
  place_id uuid not null references public.places (id),
  visit_id uuid references public.visits (id) on delete set null,
  position smallint not null check (position between 0 and 4), -- up to 5 places per card
  primary key (share_id, position)
);
create index share_items_place_idx on public.share_items (place_id);
create index share_items_visit_idx on public.share_items (visit_id);

create function public.touch_updated_at () returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;
create trigger visits_touch before update on public.visits
for each row execute function public.touch_updated_at ();

-- Every new auth user gets a profile row.
create function public.handle_new_user () returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, home_city)
  values (new.id, initcap(split_part(coalesce(new.email, ''), '@', 1)), 'Atlanta')
  on conflict (id) do nothing;
  return new;
end
$$;
revoke all on function public.handle_new_user () from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user ();
