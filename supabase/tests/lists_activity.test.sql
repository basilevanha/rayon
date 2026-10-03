-- NAV-06 : date d'activité des listes
begin;
select plan(6);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'alice@pgtap.test'),
  ('b2222222-2222-2222-2222-222222222222', 'bob@pgtap.test');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.creer_liste('11111111-0000-0000-0000-000000000001', 'Maison', '🏠');
reset role;
select is((select activity_at from public.lists where id = '11111111-0000-0000-0000-000000000001'), now(), 'une liste créée est active à sa création');

create function pg_temp.vieillir() returns void language sql as $$
  update public.lists set activity_at = now() - interval '1 day' where id = '11111111-0000-0000-0000-000000000001'
$$;

select pg_temp.vieillir();
set local role authenticated;
update public.lists set name = 'Famille';
reset role;
select is((select activity_at from public.lists where id = '11111111-0000-0000-0000-000000000001'), now(), 'renommer la liste la rend active');

select pg_temp.vieillir();
insert into public.list_members (list_id, user_id)
  values ('11111111-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222');
select is((select activity_at from public.lists where id = '11111111-0000-0000-0000-000000000001'), now(), 'l''arrivée d''un membre rend la liste active');

select pg_temp.vieillir();
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.quitter_liste('11111111-0000-0000-0000-000000000001');
reset role;
select is((select activity_at from public.lists where id = '11111111-0000-0000-0000-000000000001'), now(), 'le départ d''un membre rend la liste active');

select pg_temp.vieillir();
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok($$update public.lists set activity_at = now() + interval '1 year'$$, '42501', null,
  'un membre ne fixe pas lui-même la date d''activité');
select count(*) from public.lists;
reset role;
select is((select activity_at from public.lists where id = '11111111-0000-0000-0000-000000000001'), now() - interval '1 day',
  'lire la liste ne change pas son activité');

select * from finish();
rollback;
