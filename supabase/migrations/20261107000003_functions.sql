-- Atomic multi-table edits (SECURITY INVOKER: RLS still applies) and the public share reads.

-- Patch keys: visited_on, feeling, note, recommendable, price_paid_level, dishes (text[]), tag_ids (text[]).
-- Only keys present in the patch change; an explicit JSON null clears a nullable column.
create function public.update_visit (p_id uuid, p_patch jsonb) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  locked uuid;
begin
  -- Row lock serialises concurrent autosaves of the same visit.
  select id into locked from public.visits where id = p_id for update;
  if locked is null then
    raise exception 'visit not found' using errcode = 'P0002';
  end if;

  update public.visits set
    visited_on = case when p_patch ? 'visited_on' then (p_patch ->> 'visited_on')::date else visited_on end,
    feeling = case when p_patch ? 'feeling' then (p_patch ->> 'feeling')::public.feeling else feeling end,
    note = case when p_patch ? 'note' then coalesce(p_patch ->> 'note', '') else note end,
    recommendable = case when p_patch ? 'recommendable' then (p_patch ->> 'recommendable')::boolean else recommendable end,
    price_paid_level = case when p_patch ? 'price_paid_level' then (p_patch ->> 'price_paid_level')::smallint else price_paid_level end
  where id = p_id;

  if p_patch ? 'dishes' then
    delete from public.visit_dishes where visit_id = p_id;
    insert into public.visit_dishes (visit_id, name, position)
    select p_id, d.name, (d.ord - 1)::smallint
    from jsonb_array_elements_text (p_patch -> 'dishes') with ordinality as d (name, ord);
  end if;

  if p_patch ? 'tag_ids' then
    delete from public.visit_tags where visit_id = p_id;
    insert into public.visit_tags (visit_id, tag_id)
    select distinct p_id, t.tag from jsonb_array_elements_text (p_patch -> 'tag_ids') as t (tag);
  end if;
end
$$;

-- One tap: turn a want-to-try into a visit and link them. Idempotent.
create function public.convert_want (p_id uuid) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  w public.want_to_try;
  vid uuid;
begin
  select * into w from public.want_to_try where id = p_id for update;
  if not found then
    raise exception 'want-to-try not found' using errcode = 'P0002';
  end if;
  if w.converted_visit_id is not null then
    return w.converted_visit_id;
  end if;
  insert into public.visits (place_id) values (w.place_id) returning id into vid;
  update public.want_to_try set converted_visit_id = vid where id = p_id;
  return vid;
end
$$;

-- Public (logged-out) share reads. SECURITY DEFINER on purpose: anon has no table access.
create function public.get_share (p_slug text) returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', s.slug, 'title', s.title, 'created_at', s.created_at, 'view_count', s.view_count,
    'payload', s.payload, 'photo_paths', to_jsonb (s.photo_paths)
  )
  from public.shares s
  where s.slug = p_slug
$$;

create function public.record_share_view (p_slug text) returns void
language sql
security definer
set search_path = ''
as $$
  update public.shares set view_count = view_count + 1 where slug = p_slug
$$;

-- Lets anyone with a share link load that share's photos (and only those) from the private bucket.
create function public.is_shared_photo (p_path text) returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.shares s where p_path = any (s.photo_paths))
$$;

revoke all on function public.get_share (text), public.record_share_view (text), public.is_shared_photo (text) from public;
grant execute on function public.get_share (text), public.record_share_view (text), public.is_shared_photo (text)
  to anon, authenticated;

create policy visit_photos_objects_shared on storage.objects for select to anon, authenticated
  using (bucket_id = 'visit-photos' and public.is_shared_photo (name));
