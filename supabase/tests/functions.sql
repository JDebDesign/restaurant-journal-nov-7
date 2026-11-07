-- Functional test for the database side of the app: signup trigger, quick-log defaults, update_visit
-- patch semantics, convert_want, constraints and delete behaviour. Like rls.sql it ends by RAISING so
-- everything rolls back. Expected result: ERROR: FUNCTIONAL_TESTS_PASSED (22 checks)

do $$
declare
  a uuid := gen_random_uuid();
  pid uuid;
  v uuid; v2 uuid; w uuid; s uuid; ph uuid;
  r record;
  n int; d text[];
  checks int := 0;
begin
  select id into pid from public.places where google_place_id = 'fixture_miller-union';
  if pid is null then raise exception 'FAIL: seeded place missing'; end if;

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
  values (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'func-a@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', '');

  select display_name, home_city into r from public.profiles where id = a;
  if r.display_name <> 'Func-A' or r.home_city <> 'Atlanta' then raise exception 'FAIL: profile defaults (% / %)', r.display_name, r.home_city; end if;
  checks := checks + 1;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  set local role authenticated;

  -- quick log: only the place is needed
  insert into public.visits (place_id) values (pid) returning id into v;
  select * into r from public.visits where id = v;
  if r.user_id <> a or r.visited_on <> current_date or r.feeling is not null or r.note <> '' or r.recommendable then raise exception 'FAIL: minimal visit defaults'; end if;
  checks := checks + 1;

  -- full patch; dish order preserved; tags deduplicated
  perform public.update_visit(v, '{"feeling":"loved","note":"great","recommendable":true,"price_paid_level":3,"visited_on":"2026-10-01","dishes":["Zeta","Alpha","Mid"],"tag_ids":["solo","cozy","solo"]}'::jsonb);
  select * into r from public.visits where id = v;
  if r.feeling <> 'loved' or r.note <> 'great' or not r.recommendable or r.price_paid_level <> 3 or r.visited_on <> date '2026-10-01' then raise exception 'FAIL: patch columns'; end if;
  select array_agg(name order by position) into d from public.visit_dishes where visit_id = v;
  if d <> array['Zeta','Alpha','Mid'] then raise exception 'FAIL: dish order %', d; end if;
  select count(*) into n from public.visit_tags where visit_id = v;
  if n <> 2 then raise exception 'FAIL: tag dedupe (got %)', n; end if;
  checks := checks + 3;

  -- explicit nulls clear; absent keys leave data alone
  perform public.update_visit(v, '{"feeling":null,"price_paid_level":null}'::jsonb);
  select * into r from public.visits where id = v;
  if r.feeling is not null or r.price_paid_level is not null then raise exception 'FAIL: null did not clear'; end if;
  if r.note <> 'great' or not r.recommendable then raise exception 'FAIL: absent keys were modified'; end if;
  select count(*) into n from public.visit_dishes where visit_id = v;
  if n <> 3 then raise exception 'FAIL: dishes changed by unrelated patch (got %)', n; end if;
  perform public.update_visit(v, '{"dishes":[],"tag_ids":[]}'::jsonb);
  select count(*) into n from public.visit_dishes where visit_id = v; if n <> 0 then raise exception 'FAIL: dishes not cleared'; end if;
  select count(*) into n from public.visit_tags where visit_id = v;   if n <> 0 then raise exception 'FAIL: tags not cleared'; end if;
  checks := checks + 5;

  -- want-to-try conversion: atomic and idempotent
  insert into public.want_to_try (place_id, source_url, source_type) values (pid, 'https://www.instagram.com/p/x/', 'instagram') returning id into w;
  v2 := public.convert_want(w);
  select count(*) into n from public.visits where id = v2 and place_id = pid;
  if n <> 1 then raise exception 'FAIL: convert_want did not create the visit'; end if;
  if (select converted_visit_id from public.want_to_try where id = w) <> v2 then raise exception 'FAIL: want not linked'; end if;
  if public.convert_want(w) <> v2 then raise exception 'FAIL: convert_want not idempotent'; end if;
  select count(*) into n from public.visits; if n <> 2 then raise exception 'FAIL: convert_want created a duplicate (got %)', n; end if;
  checks := checks + 4;

  -- constraints
  begin insert into public.visit_dishes (visit_id, name) values (v, repeat('x', 81)); raise exception 'FAIL: long dish accepted';
  exception when check_violation then null; end;
  begin insert into public.shares (slug, title, payload) values ('Bad Slug!', 't', '{}'); raise exception 'FAIL: bad slug accepted';
  exception when check_violation then null; end;
  insert into public.shares (slug, title, payload) values ('funcshare1', 't', '{"v":1}') returning id into s;
  begin insert into public.share_items (share_id, place_id, position) values (s, pid, 5); raise exception 'FAIL: 6th share item accepted';
  exception when check_violation then null; end;
  begin insert into public.visits (place_id, price_paid_level) values (pid, 5); raise exception 'FAIL: price 5 accepted';
  exception when check_violation then null; end;
  checks := checks + 4;

  -- deleting a visit un-attaches its photo and un-links the want / share item, but keeps those rows
  insert into public.visit_photos (storage_path, visit_id) values (a::text || '/p.jpg', v2) returning id into ph;
  insert into public.share_items (share_id, place_id, visit_id, position) values (s, pid, v2, 0);
  delete from public.visits where id = v2;
  if (select visit_id from public.visit_photos where id = ph) is not null then raise exception 'FAIL: photo still attached'; end if;
  if (select converted_visit_id from public.want_to_try where id = w) is not null then raise exception 'FAIL: want still linked'; end if;
  if (select visit_id from public.share_items where share_id = s and position = 0) is not null then raise exception 'FAIL: share item still linked'; end if;
  delete from public.shares where id = s;
  select count(*) into n from public.share_items where share_id = s; if n <> 0 then raise exception 'FAIL: share_items not cascaded'; end if;
  checks := checks + 4;

  reset role;
  raise exception 'FUNCTIONAL_TESTS_PASSED (% checks)', checks;
end
$$;
