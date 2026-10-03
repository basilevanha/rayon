-- ART-02, ART-04, ART-08, COU-10, COL-04, OFF-05, LST-04, TEC-01, TEC-03
begin;
select plan(34);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'alice@pgtap.test'),
  ('b2222222-2222-2222-2222-222222222222', 'bob@pgtap.test'),
  ('c3333333-3333-3333-3333-333333333333', 'carol@pgtap.test');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.creer_liste('11111111-0000-0000-0000-000000000001', 'Maison', '🏠');
reset role;
insert into public.list_members (list_id, user_id)
  values ('11111111-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222');

-- Création (ART-03, OFF-05) : l'id vient de l'appareil.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(
  (select row(article_id, merged)::text from public.creer_article('aaaaaaaa-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001', '  Œufs  ', (select id from public.rayons where name = 'Œufs'), null)),
  row('aaaaaaaa-0000-0000-0000-000000000001'::uuid, false)::text,
  'creer_article crée l''article avec l''id de l''appareil');
reset role;
select is((select row(name, normalized_name, status, status_by, updated_by)::text from public.articles
  where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  row('Œufs', 'oeuf', 'a_acheter', 'a1111111-1111-1111-1111-111111111111'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid)::text,
  'nom nettoyé, nom normalisé, à acheter, auteur fixé (ART-01, REC-02, COL-02)');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(
  (select merged from public.creer_article('aaaaaaaa-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001', 'Œufs', (select id from public.rayons where name = 'Œufs'), null)),
  false, 'un rejeu de la même création ne fait rien (OFF-02)');
select is((select count(*)::int from public.articles), 1, 'le rejeu ne crée pas de doublon');
select throws_ok($$select public.creer_article(gen_random_uuid(), '11111111-0000-0000-0000-000000000001',
  repeat('x', 81), (select id from public.rayons where name = 'Autre'), null)$$, '23514', null,
  'un nom de plus de 80 caractères est refusé (ART-01)');
select throws_ok($$select public.creer_article(gen_random_uuid(), '11111111-0000-0000-0000-000000000001',
  '   ', (select id from public.rayons where name = 'Autre'), null)$$, '23514', null,
  'un nom vide est refusé (ART-01)');
select throws_ok($$select public.creer_article(gen_random_uuid(), '11111111-0000-0000-0000-000000000001',
  'Pain', (select id from public.rayons where name = 'Boulangerie'), 0)$$, '23514', null,
  'une quantité inférieure à 1 est refusée (ART-01)');
select throws_ok($$select public.creer_article(gen_random_uuid(), '11111111-0000-0000-0000-000000000001',
  'Pain', null, null)$$, '23502', null, 'le rayon est obligatoire (ART-01)');

-- Doublon (ART-04, OFF-05, TEC-01).
select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'catalogue');
select is(
  (select row(article_id, merged)::text from public.creer_article('aaaaaaaa-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000001', 'oeuf', (select id from public.rayons where name = 'Autre'), 6)),
  row('aaaaaaaa-0000-0000-0000-000000000001'::uuid, true)::text,
  'une création de même nom normalisé renvoie l''article existant (ART-04)');
reset role;
select is((select count(*)::int from public.articles), 1, 'aucun doublon n''est créé (TEC-01)');
select is((select row(status, quantity, rayon_id = (select id from public.rayons where name = 'Œufs'))::text
  from public.articles),
  row('a_acheter', 6, true)::text,
  'l''existant passe à acheter, prend la quantité saisie et garde son rayon (OFF-05)');

set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'caddie');
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.creer_article('aaaaaaaa-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000001', 'Oeufs', (select id from public.rayons where name = 'Œufs'), null);
reset role;
select is((select row(status, quantity)::text from public.articles),
  row('caddie', 6)::text,
  'un article du caddie y reste, et une quantité vide ne remplace pas la sienne (ART-04, OFF-05)');
select is((select updated_by from public.articles), 'b2222222-2222-2222-2222-222222222222'::uuid,
  'une fusion sans changement ne touche pas l''article (COL-02)');

-- Statut (COU-10, COL-04).
select is((select status_by from public.articles), 'b2222222-2222-2222-2222-222222222222'::uuid,
  'status_by désigne qui a mis l''article au caddie (COL-04)');
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'caddie');
update public.articles set quantity = 12;
reset role;
select is((select row(status, status_by, updated_by)::text from public.articles),
  row('caddie', 'b2222222-2222-2222-2222-222222222222'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid)::text,
  'set_status fixe sans inverser, et une autre modification ne change pas status_by (COU-10, COL-04)');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'catalogue');
reset role;
select is((select row(status, quantity, status_by)::text from public.articles),
  row('catalogue', null::int, 'a1111111-1111-1111-1111-111111111111'::uuid)::text,
  'le retour au catalogue vide la quantité (ART-02)');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok($$select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'perdu')$$,
  '22023', 'statut_invalide', 'un statut inconnu est refusé');
select throws_ok($$select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', null)$$,
  '22023', 'statut_invalide', 'un statut vide est refusé');
select throws_ok($$update public.articles set quantity = 4 where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '23514', null, 'un article au catalogue n''a pas de quantité (ART-02)');
select throws_ok($$select public.set_status(gen_random_uuid(), 'caddie')$$,
  'P0002', 'article_introuvable', 'un article inconnu est signalé');

-- Renommer (ART-06, TEC-01).
select public.creer_article('aaaaaaaa-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000001', 'Pain', (select id from public.rayons where name = 'Boulangerie'), null);
select throws_ok($$update public.articles set name = 'Œuf' where id = 'aaaaaaaa-0000-0000-0000-000000000004'$$,
  '23505', null, 'renommer en un nom déjà pris est refusé (TEC-01)');
update public.articles set name = 'Pain gris', rayon_id = (select id from public.rayons where name = 'Autre')
  where id = 'aaaaaaaa-0000-0000-0000-000000000004';
reset role;
select is((select row(name, normalized_name)::text from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  row('Pain gris', 'pain gri')::text, 'renommer met à jour le nom normalisé');

-- Suppression douce (ART-08).
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
update public.articles set deleted_at = '2999-01-01' where id = 'aaaaaaaa-0000-0000-0000-000000000004';
select is((select deleted_at from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000004'), now(),
  'la date de suppression est celle du serveur (ART-08)');
select throws_ok($$update public.articles set name = 'Pain blanc' where id = 'aaaaaaaa-0000-0000-0000-000000000004'$$,
  'P0002', 'article_introuvable', 'un article supprimé ne se modifie plus');
select throws_ok($$select public.set_status('aaaaaaaa-0000-0000-0000-000000000004', 'a_acheter')$$,
  'P0002', 'article_introuvable', 'un article supprimé ne change plus de statut');
select is(
  (select merged from public.creer_article('aaaaaaaa-0000-0000-0000-000000000005',
    '11111111-0000-0000-0000-000000000001', 'Pain gris', (select id from public.rayons where name = 'Boulangerie'), null)),
  false, 'un article supprimé ne bloque pas la création d''un article de même nom');
select throws_ok($$update public.articles set deleted_at = null where id = 'aaaaaaaa-0000-0000-0000-000000000004'$$,
  '23505', null, 'annuler la suppression échoue si un article de même nom existe (ART-08)');
update public.articles set deleted_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000005';
update public.articles set deleted_at = null where id = 'aaaaaaaa-0000-0000-0000-000000000004';
reset role;
select is((select deleted_at from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000004'), null,
  'sinon, annuler la suppression restaure l''article (ART-08)');

-- Copie d'une liste (LST-04).
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.set_status('aaaaaaaa-0000-0000-0000-000000000004', 'a_acheter');
update public.articles set quantity = 3 where id = 'aaaaaaaa-0000-0000-0000-000000000004';
select public.copier_liste('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002',
  'Chalet', '🏕️');
select public.copier_liste('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002',
  'Chalet', '🏕️');
reset role;
select is((select row(name, emoji)::text from public.lists where id = '22222222-0000-0000-0000-000000000002'),
  row('Chalet', '🏕️')::text, 'la copie crée une liste');
select is((select array_agg(user_id) from public.list_members where list_id = '22222222-0000-0000-0000-000000000002'),
  array['b2222222-2222-2222-2222-222222222222'::uuid], 'sans les membres (LST-04)');
select is(
  (select array_agg(row(name, status, quantity, (select r.name from public.rayons r where r.id = rayon_id))::text order by name)
   from public.articles where list_id = '22222222-0000-0000-0000-000000000002'),
  array[row('Œufs', 'catalogue', null::int, 'Œufs')::text, row('Pain gris', 'catalogue', null::int, 'Autre')::text],
  'les articles non supprimés, au catalogue, avec leur rayon (LST-04)');
select is((select count(*)::int from public.articles a1 join public.articles a2 using (id)
  where a1.list_id <> a2.list_id), 0, 'les articles copiés ont de nouveaux identifiants');
select is((select count(*)::int from public.articles where list_id = '22222222-0000-0000-0000-000000000002'), 2,
  'un rejeu de la copie ne duplique rien');

set local role authenticated;
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select throws_ok($$select public.copier_liste('11111111-0000-0000-0000-000000000001', gen_random_uuid(), 'X', '🛒')$$,
  '42501', 'non_membre', 'un non-membre ne copie pas une liste');
reset role;

select * from finish();
rollback;
