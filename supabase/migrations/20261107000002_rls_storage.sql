-- Row-level security: users only ever see and change their own rows.
-- Public share pages never touch these tables directly; they use get_share() (next migration).

alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.tags enable row level security;
alter table public.visits enable row level security;
alter table public.visit_dishes enable row level security;
alter table public.visit_tags enable row level security;
alter table public.visit_photos enable row level security;
alter table public.want_to_try enable row level security;
alter table public.shares enable row level security;
alter table public.share_items enable row level security;

create policy profiles_own on public.profiles for all to authenticated
  using ((select auth.uid ()) = id) with check ((select auth.uid ()) = id);

-- Reference data: readable by signed-in users, written only with the service role / migrations.
create policy places_read on public.places for select to authenticated using (true);
create policy tags_read on public.tags for select to authenticated using (true);

create policy visits_own on public.visits for all to authenticated
  using (user_id = (select auth.uid ())) with check (user_id = (select auth.uid ()));

create policy visit_dishes_own on public.visit_dishes for all to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid ())))
  with check (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid ())));

create policy visit_tags_own on public.visit_tags for all to authenticated
  using (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid ())))
  with check (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid ())));

-- A row can only point at a visit the same user owns.
create policy visit_photos_own on public.visit_photos for all to authenticated
  using (user_id = (select auth.uid ()))
  with check (
    user_id = (select auth.uid ())
    and (visit_id is null or exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid ())))
  );

create policy want_own on public.want_to_try for all to authenticated
  using (user_id = (select auth.uid ()))
  with check (
    user_id = (select auth.uid ())
    and (converted_visit_id is null or exists (select 1 from public.visits v where v.id = converted_visit_id and v.user_id = (select auth.uid ())))
  );

-- Photo paths in a share must live in the sharer's own storage folder.
create policy shares_own on public.shares for all to authenticated
  using (user_id = (select auth.uid ()))
  with check (
    user_id = (select auth.uid ())
    and not exists (
      select 1 from unnest(photo_paths) p
      where p <> '' and split_part(p, '/', 1) <> (select auth.uid ())::text
    )
  );

create policy share_items_own on public.share_items for all to authenticated
  using (exists (select 1 from public.shares s where s.id = share_id and s.user_id = (select auth.uid ())))
  with check (
    exists (select 1 from public.shares s where s.id = share_id and s.user_id = (select auth.uid ()))
    and (visit_id is null or exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid ())))
  );

-- Photos: private bucket, one folder per user ("<user id>/<photo id>.jpg").
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-photos', 'visit-photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy visit_photos_objects_own on storage.objects for all to authenticated
  using (bucket_id = 'visit-photos' and (storage.foldername (name))[1] = (select auth.uid ())::text)
  with check (bucket_id = 'visit-photos' and (storage.foldername (name))[1] = (select auth.uid ())::text);
