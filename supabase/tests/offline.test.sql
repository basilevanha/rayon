-- OFF-04, OFF-05, LST-04, COL-01 : rejeu hors ligne et temps réel
begin;
select plan(29);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'alice@pgtap.test'),
  ('b2222222-2222-2222-2222-222222222222', 'bob@pgtap.test'),
  ('c3333333-3333-3333-3333-333333333333', 'carol@pgtap.test');

-- SEC-01 : aucune table publiée en postgres_changes (les suppressions y échappent à la RLS).
select is(
  (select count(*)::int from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname = 'public'),
  0, 'aucune table publique en postgres_changes');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.creer_liste('11111111-0000-0000-0000-000000000001', 'Maison', '🏠');
select public.creer_article('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
  'Lait', (select id from public.rayons where name = 'Produits laitiers'));
select public.creer_article('aaaaaaaa-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
  'Pain', (select id from public.rayons where name = 'Boulangerie'));
reset role;
insert into public.list_members (list_id, user_id)
  values ('11111111-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222');

-- Bob met le lait au caddie pendant qu'Alice, hors ligne, le retire (OFF-04).
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'caddie', 'a_acheter');
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok($$select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'catalogue', 'a_acheter')$$,
  'P0001', 'deja_au_caddie', 'un retrait rejoué sur un article mis au caddie par un autre est refusé');
select throws_ok($$select public.supprimer_article('aaaaaaaa-0000-0000-0000-000000000001', 'a_acheter')$$,
  'P0001', 'deja_au_caddie', 'une suppression rejouée sur un article mis au caddie par un autre est refusée');
reset role;
select is((select row(status, deleted_at)::text from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  row('caddie', null::timestamptz)::text, 'l''article reste dans le caddie de Bob');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'a_acheter', 'a_acheter')$$,
  'seul un retrait est concerné : remettre à acheter reste possible');
select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'caddie', 'a_acheter');
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'caddie', 'caddie');
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'catalogue', 'a_acheter')$$,
  'un article qu''on a mis soi-même au caddie se retire');
select public.set_status('aaaaaaaa-0000-0000-0000-000000000002', 'caddie', 'a_acheter');
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select lives_ok($$select public.set_status('aaaaaaaa-0000-0000-0000-000000000002', 'catalogue', 'caddie')$$,
  'un retrait fait en voyant l''article au caddie (confirmé, COL-04) est appliqué');
select lives_ok($$select public.set_status('aaaaaaaa-0000-0000-0000-000000000002', 'a_acheter')$$,
  'sans statut vu, set_status reste utilisable');

-- Suppression (ART-08) par fonction.
select public.supprimer_article('aaaaaaaa-0000-0000-0000-000000000002', 'a_acheter');
reset role;
select is((select deleted_at from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000002'), now(),
  'supprimer_article supprime doucement');
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select lives_ok($$select public.supprimer_article('aaaaaaaa-0000-0000-0000-000000000002', 'a_acheter')$$,
  'un rejeu de la suppression ne fait rien');
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select throws_ok($$select public.supprimer_article('aaaaaaaa-0000-0000-0000-000000000001', null)$$,
  'P0002', 'article_introuvable', 'un non-membre ne supprime rien');
reset role;

-- OFF-05 : une création fusionnée, rejouée plus tard, ne touche plus l'article.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(
  (select row(article_id, merged)::text from public.creer_article('aaaaaaaa-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000001', 'lait', (select id from public.rayons where name = 'Autre'), 2)),
  row('aaaaaaaa-0000-0000-0000-000000000001'::uuid, true)::text, 'la création est fusionnée');
select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'catalogue', 'a_acheter');
select is(
  (select row(article_id, merged)::text from public.creer_article('aaaaaaaa-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000001', 'lait', (select id from public.rayons where name = 'Autre'), 2)),
  row('aaaaaaaa-0000-0000-0000-000000000001'::uuid, true)::text, 'le rejeu renvoie l''article fusionné');
reset role;
select is((select status from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'catalogue',
  'sans le remettre à acheter');
select is((select count(*)::int from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000003'), 0,
  'l''id fusionné ne crée jamais d''article');

-- LST-04 : la copie réutilise les ids générés par l'appareil.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.copier_liste('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002',
  'Chalet', '🏕️', array['aaaaaaaa-0000-0000-0000-000000000001'::uuid],
  array['bbbbbbbb-0000-0000-0000-000000000001'::uuid]);
reset role;
select is((select row(list_id, name, status)::text from public.articles where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  row('22222222-0000-0000-0000-000000000002'::uuid, 'Lait', 'catalogue')::text,
  'l''article copié porte l''id de l''appareil');
select is((select count(*)::int from public.articles where list_id = '22222222-0000-0000-0000-000000000002'), 1,
  'les articles supprimés ne sont pas copiés');

set local role authenticated;
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select public.creer_liste('33333333-0000-0000-0000-000000000003', 'Carol', '🛒');
select public.creer_article('cccccccc-0000-0000-0000-000000000009', '33333333-0000-0000-0000-000000000003',
  'Thé', (select id from public.rayons where name = 'Autre'));
select throws_ok($$select public.copier_liste('33333333-0000-0000-0000-000000000003',
  '44444444-0000-0000-0000-000000000004', 'X', '🛒', array['cccccccc-0000-0000-0000-000000000009'::uuid],
  array['bbbbbbbb-0000-0000-0000-000000000001'::uuid])$$, '23505', null,
  'un id déjà pris n''est pas réutilisé');
reset role;
select is((select list_id from public.articles where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  '22222222-0000-0000-0000-000000000002'::uuid, 'l''article existant n''a pas changé de liste');

-- COL-01, INV-04 : diffusion sur canaux privés, lisibles des seuls ayants droit.
select ok((select count(*) > 0 from realtime.messages
  where topic = 'list:11111111-0000-0000-0000-000000000001' and event = 'article'),
  'une écriture d''article est diffusée sur le canal de sa liste');
select ok((select count(*) > 0 from realtime.messages
  where topic = 'list:11111111-0000-0000-0000-000000000001' and event = 'member_joined'
    and payload ->> 'user_id' = 'b2222222-2222-2222-2222-222222222222'),
  'l''arrivée d''un membre est diffusée (INV-04)');
set local role authenticated;
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select set_config('realtime.topic', 'list:11111111-0000-0000-0000-000000000001', true);
select is((select count(*)::int from realtime.messages), 0,
  'un non-membre ne lit pas le canal d''une liste');
select set_config('realtime.topic', 'user:b2222222-2222-2222-2222-222222222222', true);
select is((select count(*)::int from realtime.messages), 0,
  'un compte ne lit pas le canal d''un autre');
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select set_config('realtime.topic', 'list:11111111-0000-0000-0000-000000000001', true);
select ok((select count(*) > 0 from realtime.messages), 'un membre lit le canal de sa liste');
select throws_ok($$insert into realtime.messages (topic, extension, event, payload, private)
  values ('list:11111111-0000-0000-0000-000000000001', 'broadcast', 'article', '{}', true)$$,
  '42501', null, 'un membre ne diffuse rien lui-même');
reset role;
select public.retirer_membre('11111111-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222')
  from (select set_config('request.jwt.claims',
    '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}', true)) as _;
select ok((select count(*) > 0 from realtime.messages
  where topic = 'user:b2222222-2222-2222-2222-222222222222' and event = 'member_left'),
  'un membre retiré est prévenu sur son propre canal');
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select set_config('realtime.topic', 'list:11111111-0000-0000-0000-000000000001', true);
select is((select count(*)::int from realtime.messages), 0,
  'un membre retiré ne lit plus le canal de la liste');
reset role;

-- Rejeu d'une copie après avoir quitté la source (LST-04, OFF-02).
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok($$select public.copier_liste('11111111-0000-0000-0000-000000000001', gen_random_uuid(),
  'X', '🛒', array[gen_random_uuid()], '{}')$$, '22023', 'identifiants_incoherents',
  'des tableaux d''ids de tailles différentes sont refusés');
select public.quitter_liste('11111111-0000-0000-0000-000000000001');
select lives_ok($$select public.copier_liste('11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002', 'Chalet', '🏕️')$$,
  'le rejeu d''une copie déjà faite passe, même après avoir quitté la source');
reset role;

select * from finish();
rollback;
