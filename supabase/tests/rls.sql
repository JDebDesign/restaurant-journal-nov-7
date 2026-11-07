-- RLS test: two users must never read or change each other's data.
--
-- Run it in the Supabase SQL editor (or any SQL runner). It creates two throwaway users, impersonates
-- each in turn (role + JWT claims, exactly like PostgREST does) and ends by RAISING an exception so
-- that everything it created is rolled back. Expected result:
--     ERROR: RLS_TESTS_PASSED (NN checks)
-- Any other message names the check that failed.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  pid uuid;
  va uuid;      -- A's visit
  vb uuid;      -- B's visit
  wa uuid;      -- A's want-to-try
  sa uuid;      -- A's share
  n int;
  checks int := 0;

begin
  select id into pid from public.places order by name limit 1;

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change, email_change_token_new)
  values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-a@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', ''),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-b@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', '');

  select count(*) into n from public.profiles where id in (a, b);
  if n <> 2 then raise exception 'FAIL: signup trigger did not create both profiles (got %)', n; end if;
  checks := checks + 1;

  ---------------------------------------------------------------- user A creates data
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  set local role authenticated;

  insert into public.visits (place_id, note) values (pid, 'A secret') returning id into va;
  insert into public.visit_dishes (visit_id, name) values (va, 'A dish');
  insert into public.visit_tags (visit_id, tag_id) values (va, 'solo');
  insert into public.visit_photos (storage_path, visit_id) values (a::text || '/photo1.jpg', va);
  insert into public.want_to_try (place_id) values (pid) returning id into wa;
  insert into storage.objects (bucket_id, name) values ('visit-photos', a::text || '/photo1.jpg'), ('visit-photos', a::text || '/photo2.jpg');
  insert into public.shares (slug, title, payload, photo_paths)
    values ('rlstest01', 'A share', '{"v":1,"title":"A share","items":[]}', array[a::text || '/photo1.jpg'])
    returning id into sa;
  insert into public.share_items (share_id, place_id, visit_id, position) values (sa, pid, va, 0);

  select count(*) into n from public.visits where id = va;
  if n <> 1 then raise exception 'FAIL: A cannot read own visit'; end if;
  checks := checks + 1;

  perform public.update_visit(va, '{"feeling":"loved","dishes":["x","y"],"tag_ids":["solo","cozy"]}'::jsonb);
  select count(*) into n from public.visit_dishes where visit_id = va;
  if n <> 2 then raise exception 'FAIL: A update_visit did not replace dishes (got %)', n; end if;
  checks := checks + 1;

  ---------------------------------------------------------------- user B attacks
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  set local role authenticated;

  -- reads: nothing of A's is visible
  select count(*) into n from public.visits where id = va;                  if n <> 0 then raise exception 'FAIL: B can read A visit'; end if;
  select count(*) into n from public.visit_dishes where visit_id = va;      if n <> 0 then raise exception 'FAIL: B can read A dishes'; end if;
  select count(*) into n from public.visit_tags where visit_id = va;        if n <> 0 then raise exception 'FAIL: B can read A visit_tags'; end if;
  select count(*) into n from public.visit_photos;                          if n <> 0 then raise exception 'FAIL: B can read A photos'; end if;
  select count(*) into n from public.want_to_try;                           if n <> 0 then raise exception 'FAIL: B can read A want_to_try'; end if;
  select count(*) into n from public.shares;                                if n <> 0 then raise exception 'FAIL: B can read A shares'; end if;
  select count(*) into n from public.share_items;                           if n <> 0 then raise exception 'FAIL: B can read A share_items'; end if;
  select count(*) into n from public.profiles where id = a;                 if n <> 0 then raise exception 'FAIL: B can read A profile'; end if;
  select count(*) into n from storage.objects where bucket_id = 'visit-photos' and name like a::text || '/%';
  if n <> 1 then raise exception 'FAIL: B should see only the shared photo of A (got %)', n; end if;
  checks := checks + 9;

  -- writes: updates and deletes touch zero rows
  update public.visits set note = 'pwned' where id = va;
  get diagnostics n = row_count;  if n <> 0 then raise exception 'FAIL: B updated A visit'; end if;
  delete from public.visits where id = va;
  get diagnostics n = row_count;  if n <> 0 then raise exception 'FAIL: B deleted A visit'; end if;
  update public.profiles set display_name = 'pwned' where id = a;
  get diagnostics n = row_count;  if n <> 0 then raise exception 'FAIL: B updated A profile'; end if;
  delete from public.want_to_try where id = wa;
  get diagnostics n = row_count;  if n <> 0 then raise exception 'FAIL: B deleted A want'; end if;
  delete from public.shares where id = sa;
  get diagnostics n = row_count;  if n <> 0 then raise exception 'FAIL: B deleted A share'; end if;
  checks := checks + 5;

  -- writes: inserts that would attach B's rows to A's data are rejected
  begin insert into public.visit_dishes (visit_id, name) values (va, 'injected'); raise exception 'FAIL: B inserted a dish on A visit';
  exception when insufficient_privilege then null; end;
  begin insert into public.visit_tags (visit_id, tag_id) values (va, 'cozy'); raise exception 'FAIL: B inserted a tag on A visit';
  exception when insufficient_privilege then null; end;
  begin insert into public.visit_photos (storage_path, visit_id) values (b::text || '/x.jpg', va); raise exception 'FAIL: B attached a photo to A visit';
  exception when insufficient_privilege then null; end;
  begin insert into public.visits (place_id, user_id) values (pid, a); raise exception 'FAIL: B created a visit as A';
  exception when insufficient_privilege then null; end;
  begin insert into public.share_items (share_id, place_id, position) values (sa, pid, 1); raise exception 'FAIL: B added an item to A share';
  exception when insufficient_privilege then null; end;
  begin insert into public.shares (slug, title, payload, photo_paths) values ('rlstest02', 'x', '{}', array[a::text || '/photo2.jpg']); raise exception 'FAIL: B shared A private photo';
  exception when insufficient_privilege then null; end;
  begin insert into storage.objects (bucket_id, name) values ('visit-photos', a::text || '/evil.jpg'); raise exception 'FAIL: B wrote into A storage folder';
  exception when insufficient_privilege then null; end;
  checks := checks + 7;

  -- RPCs respect RLS too
  begin perform public.update_visit(va, '{"note":"pwned"}'::jsonb); raise exception 'FAIL: B update_visit on A visit succeeded';
  exception when no_data_found then null; end;
  begin perform public.convert_want(wa); raise exception 'FAIL: B convert_want on A want succeeded';
  exception when no_data_found then null; end;
  checks := checks + 2;

  -- B's own data is private to B, and B can use the app normally
  insert into public.visits (place_id, note) values (pid, 'B visit') returning id into vb;
  select count(*) into n from public.visits;  if n <> 1 then raise exception 'FAIL: B should see exactly its own visit (got %)', n; end if;
  checks := checks + 1;

  ---------------------------------------------------------------- A still intact
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  set local role authenticated;
  select count(*) into n from public.visits where id = va and note = 'A secret';
  if n <> 1 then raise exception 'FAIL: A visit was modified by B'; end if;
  select count(*) into n from public.visits where id = vb;
  if n <> 0 then raise exception 'FAIL: A can read B visit'; end if;
  checks := checks + 2;

  ---------------------------------------------------------------- logged-out visitor (anon)
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  select count(*) into n from public.visits;      if n <> 0 then raise exception 'FAIL: anon can read visits'; end if;
  select count(*) into n from public.shares;      if n <> 0 then raise exception 'FAIL: anon can read shares table'; end if;
  select count(*) into n from public.profiles;    if n <> 0 then raise exception 'FAIL: anon can read profiles'; end if;
  begin perform 1 from public.places limit 1; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL: anon can read places'; end if;
  exception when insufficient_privilege then null; end;
  begin insert into public.visits (place_id, user_id) values (pid, a); raise exception 'FAIL: anon inserted a visit';
  exception when insufficient_privilege then null; end;
  -- ...but a share link works, and exposes only the shared photo
  if public.get_share('rlstest01') ->> 'title' <> 'A share' then raise exception 'FAIL: anon cannot load share by slug'; end if;
  if public.get_share('nope-nope') is not null then raise exception 'FAIL: get_share returned data for an unknown slug'; end if;
  perform public.record_share_view('rlstest01');
  select count(*) into n from storage.objects where bucket_id = 'visit-photos' and name like a::text || '/%';
  if n <> 1 then raise exception 'FAIL: anon should see exactly the shared photo (got %)', n; end if;
  checks := checks + 8;

  reset role;
  select view_count into n from public.shares where id = sa;
  if n <> 1 then raise exception 'FAIL: record_share_view did not count (got %)', n; end if;
  checks := checks + 1;

  -- Roll everything back (users, rows, storage objects).
  raise exception 'RLS_TESTS_PASSED (% checks)', checks;
end
$$;
