-- LST-01, LST-05, CPT-04, SEC-01, QUA-03
begin;
select plan(23);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'alice@pgtap.test'),
  ('b2222222-2222-2222-2222-222222222222', 'bob@pgtap.test'),
  ('c3333333-3333-3333-3333-333333333333', 'carol@pgtap.test');
update public.profiles set display_name = 'Alice' where id = 'a1111111-1111-1111-1111-111111111111';
update public.profiles set display_name = 'Bob' where id = 'b2222222-2222-2222-2222-222222222222';
update public.profiles set display_name = 'Carol' where id = 'c3333333-3333-3333-3333-333333333333';

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.creer_liste('11111111-0000-0000-0000-000000000001', 'Maison', '🏠');
select public.creer_invitation('11111111-0000-0000-0000-000000000001');
reset role;
insert into public.list_members (list_id, user_id)
  values ('11111111-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222');

select is((select count(*)::int from pg_class
  where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity),
  0, 'RLS activée sur toutes les tables (SEC-01)');

set local role anon;
select throws_ok($$select * from public.lists$$, '42501', null, 'anon ne lit pas les listes');
select throws_ok($$select public.creer_liste(gen_random_uuid(), 'X', '🛒')$$, '42501', null,
  'anon ne crée pas de liste');
reset role;

-- Carol n'est pas membre.
set local role authenticated;
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select is((select count(*)::int from public.lists), 0, 'un non-membre ne lit aucune liste');
select is((select count(*)::int from public.list_members), 0, 'un non-membre ne lit aucun membre');
select is((select count(*)::int from public.invitations), 0, 'un non-membre ne lit aucune invitation');
select is((select count(*)::int from public.profiles), 1, 'un non-membre ne lit que son profil');
update public.lists set name = 'Piratée';
select throws_ok($$insert into public.lists (id, name) values (gen_random_uuid(), 'X')$$, '42501', null,
  'aucune insertion directe de liste');
select throws_ok($$insert into public.list_members (list_id, user_id)
  values ('11111111-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333')$$, '42501', null,
  'un non-membre ne s''ajoute pas lui-même');
select throws_ok($$delete from public.lists$$, '42501', null, 'aucune suppression directe de liste');
select throws_ok($$select public.creer_invitation('11111111-0000-0000-0000-000000000001')$$,
  '42501', 'non_membre', 'un non-membre ne génère pas d''invitation');
reset role;
select is((select name from public.lists where id = '11111111-0000-0000-0000-000000000001'), 'Maison',
  'un non-membre ne renomme pas la liste');

-- Bob est membre.
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*)::int from public.lists), 1, 'un membre lit sa liste');
select is((select count(*)::int from public.list_members), 2, 'un membre lit les membres de sa liste');
select is((select count(*)::int from public.invitations), 1, 'un membre lit les invitations de sa liste');
select is((select array_agg(display_name order by display_name) from public.profiles),
  array['Alice', 'Bob'], 'un membre lit le nom des co-membres, pas celui des autres comptes (CPT-04)');
select throws_ok($$select role from public.profiles$$, '42501', null,
  'le rôle des profils n''est pas lisible directement (CPT-04)');
select is((select role from public.mon_profil()), 'utilisateur', 'un compte lit son propre rôle');
select throws_ok($$select * from public.list_removals$$, '42501', null,
  'les retraits ne sont pas lisibles');
select throws_ok($$select public.creer_liste(gen_random_uuid(), 'X', '<b>')$$, '23514', null,
  'un emoji hors de la grille est refusé (LST-01)');
select throws_ok($$select reserved_email from public.invitations$$, '42501', null,
  'l''adresse réservée d''une invitation n''est pas lisible');
select throws_ok($$update public.list_members set is_creator = true$$, '42501', null,
  'un membre ne se nomme pas créateur');
update public.lists set name = 'Famille', emoji = '👪';
reset role;
select is((select name || emoji from public.lists where id = '11111111-0000-0000-0000-000000000001'),
  'Famille👪', 'un membre renomme la liste (LST-05)');

select * from finish();
rollback;
