-- CPT-04, SEC-01, QUA-03
begin;
select plan(18);

select is((select count(*)::int from pg_class
  where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity),
  0, 'RLS activée sur toutes les tables (SEC-01)');

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@pgtap.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@pgtap.test');
insert into public.app_invitations (code, issued_by) values
  ('ALICE1', '11111111-1111-1111-1111-111111111111'),
  ('BOB1', '22222222-2222-2222-2222-222222222222');

select is((select count(*)::int from public.profiles
  where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2, 'un profil est créé pour chaque compte');

set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', null, 'anon ne lit pas les profils');
select throws_ok($$select * from public.app_invitations$$, '42501', null, 'anon ne lit pas les invitations');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is((select count(*)::int from public.profiles), 1, 'un compte ne lit que son profil');

update public.profiles set display_name = 'Alice' where id = '11111111-1111-1111-1111-111111111111';
select is((select display_name from public.profiles), 'Alice', 'un compte modifie son nom affiché');

update public.profiles set display_name = 'Pirate' where id = '22222222-2222-2222-2222-222222222222';
reset role;
select is((select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  null, 'un compte ne modifie pas le profil d''un autre');
set local role authenticated;

select throws_ok(
  $$update public.profiles set role = 'administrateur' where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'un compte ne peut pas changer son rôle');
select throws_ok($$insert into public.profiles (id) values (gen_random_uuid())$$, '42501', null,
  'un compte ne crée pas de profil');
select throws_ok($$delete from public.profiles$$, '42501', null, 'un compte ne supprime pas de profil');

select throws_ok(
  $$update public.profiles set display_name = '   ' where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'nom affiché vide refusé');
select throws_ok(
  $$update public.profiles set display_name = null where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'nom affiché remis à nul refusé (CPT-04)');
select throws_ok(
  $$update public.profiles set display_name = repeat('a', 31) where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'nom affiché de 31 caractères refusé');
select throws_ok(
  $$update public.profiles set display_name = ' Alice' where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'nom affiché non nettoyé refusé');

select throws_ok($$select * from public.app_settings$$, '42501', null,
  'app_settings inaccessible à authenticated');

select is((select array_agg(code) from public.app_invitations), array['ALICE1'],
  'un compte ne voit que les invitations qu''il a émises');
select throws_ok($$update public.app_invitations set used_at = null$$, '42501', null,
  'un compte ne modifie pas une invitation');
select throws_ok($$insert into public.app_invitations (code) values ('PIRATE')$$, '42501', null,
  'un compte ne crée pas d''invitation directement');

select * from finish();
rollback;
