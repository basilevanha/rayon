-- MAG-04, MAG-05, DIS-02, ART-07, RNG-02, PRE-11, LST-04, NAV-06, TEC-03 : fonctions des magasins
begin;
select plan(41);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'alice@pgtap.test'),
  ('b2222222-2222-2222-2222-222222222222', 'bob@pgtap.test');

create temporary table r on commit drop as select id, name from public.rayons;
grant select on r to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- creer_magasin (MAG-04, MAG-05).
select lives_ok($$select public.creer_magasin('5f000000-0000-0000-0000-000000000001', '  Lidl pgTAP  ')$$,
  'un compte crée un magasin');
select is((select name from public.stores where id = '5f000000-0000-0000-0000-000000000001'), 'Lidl pgTAP',
  'le nom est enregistré sans espaces aux extrémités');
select lives_ok($$select public.creer_magasin('5f000000-0000-0000-0000-000000000001', 'Lidl pgTAP')$$,
  'un rejeu de la même création ne fait rien');
select throws_ok($$select public.creer_magasin(gen_random_uuid(), 'LIDL  pgtap')$$, '23505', 'nom_existant',
  'un nom identique après normalisation est refusé (MAG-04)');
select throws_ok($$select public.creer_magasin(gen_random_uuid(), '')$$, '23514', null,
  'un nom vide est refusé (MAG-01)');
select is((select count(*)::int from public.store_rayon_orders where store_id = '5f000000-0000-0000-0000-000000000001'),
  0, 'sans magasin source, l''ordre est celui de référence (aucune ligne, DIS-01)');
select throws_ok($$select public.creer_magasin(gen_random_uuid(), 'Fantôme', gen_random_uuid())$$,
  'P0002', 'magasin_introuvable', 'un magasin source inconnu est refusé');

-- ordonner_rayons (DIS-02).
select lives_ok($$select public.ordonner_rayons('5f000000-0000-0000-0000-000000000001',
  array(select id from r order by name = 'Boulangerie' desc, name))$$, 'un compte réordonne un magasin');
select is((select rayon_id from public.store_rayon_orders
  where store_id = '5f000000-0000-0000-0000-000000000001' order by position limit 1),
  (select id from r where name = 'Boulangerie'), 'le nouvel ordre est enregistré');
select is((select count(*)::int from public.store_rayon_orders where store_id = '5f000000-0000-0000-0000-000000000001'),
  36, 'l''ordre contient tous les rayons');
select throws_ok($$select public.ordonner_rayons('5f000000-0000-0000-0000-000000000001',
  array[(select id from r where name = 'Œufs'), (select id from r where name = 'Œufs')])$$,
  '22023', 'ordre_invalide', 'un rayon en double est refusé');
select throws_ok($$select public.ordonner_rayons('5f000000-0000-0000-0000-000000000001', array[gen_random_uuid()])$$,
  '22023', 'ordre_invalide', 'un rayon inconnu est refusé');
select throws_ok($$select public.ordonner_rayons(gen_random_uuid(), array[(select id from r limit 1)])$$,
  'P0002', 'magasin_introuvable', 'un magasin inconnu est refusé');

-- MAG-05 : un magasin créé depuis un autre reprend son ordre.
select public.creer_magasin('5f000000-0000-0000-0000-000000000002', 'Aldi pgTAP',
  '5f000000-0000-0000-0000-000000000001');
select results_eq(
  $$select rayon_id, position from public.store_rayon_orders
    where store_id = '5f000000-0000-0000-0000-000000000002' order by position$$,
  $$select rayon_id, position from public.store_rayon_orders
    where store_id = '5f000000-0000-0000-0000-000000000001' order by position$$,
  'un magasin créé depuis un autre reprend son ordre (MAG-05)');

-- ranger_article (ART-07, RNG-02).
select public.creer_liste('11111111-0000-0000-0000-000000000001', 'Maison', '🏠');
select public.creer_article('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
  'Bananes', (select id from r where name = 'Fruits et légumes'), null);
reset role;
update public.lists set activity_at = '2000-01-01' where id = '11111111-0000-0000-0000-000000000001';
set local role authenticated;
select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001',
  (select id from r where name = 'Pommes de terre et oignons'));
select is((select rayon_id from public.article_store_rayons
  where article_id = 'aaaaaaaa-0000-0000-0000-000000000001' and store_id = '5f000000-0000-0000-0000-000000000001'),
  (select id from r where name = 'Pommes de terre et oignons'), 'un rangement est créé dans le magasin (ART-07)');
select is((select rayon_id from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  (select id from r where name = 'Fruits et légumes'), 'le rayon de l''article ne change pas');
select isnt((select activity_at from public.lists where id = '11111111-0000-0000-0000-000000000001'),
  '2000-01-01'::timestamptz, 'un rangement compte comme activité de la liste (NAV-06)');
select lives_ok($$select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001',
  '5f000000-0000-0000-0000-000000000001', (select id from r where name = 'Pommes de terre et oignons'))$$,
  'ranger deux fois au même endroit ne fait rien');
select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001',
  (select id from r where name = 'Fruits et légumes'));
select is((select count(*)::int from public.article_store_rayons where article_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0, 'un rangement identique au rayon est supprimé (RNG-02)');
select throws_ok($$select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001', null,
  (select id from r where name = 'Autre'))$$, 'P0002', 'magasin_introuvable',
  'sans magasin, seul le changement « Dans tous les magasins » est possible');

-- « Dans tous les magasins » : le rayon change et les rangements sont effacés.
select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001',
  (select id from r where name = 'Autre'));
select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000002',
  (select id from r where name = 'Monde'));
select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001',
  (select id from r where name = 'Fruits secs et noix'), true);
select is((select rayon_id from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  (select id from r where name = 'Fruits secs et noix'), '« Dans tous les magasins » change le rayon (ART-07)');
select is((select count(*)::int from public.article_store_rayons where article_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0, '« Dans tous les magasins » efface les rangements (RNG-02)');

-- RNG-02 : un rayon modifié directement (vue « Défaut ») supprime le rangement devenu identique.
select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001',
  (select id from r where name = 'Œufs'));
select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000002',
  (select id from r where name = 'Monde'));
update public.articles set rayon_id = (select id from r where name = 'Œufs')
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select array_agg(store_id) from public.article_store_rayons
  where article_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  array['5f000000-0000-0000-0000-000000000002'::uuid],
  'en vue « Défaut », le rangement devenu identique disparaît, les autres restent (ART-07, RNG-02)');

-- choisir_vue (PRE-11).
select public.choisir_vue('11111111-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001');
select is((select store_id from public.list_views where list_id = '11111111-0000-0000-0000-000000000001'),
  '5f000000-0000-0000-0000-000000000001'::uuid, 'la vue choisie est enregistrée');
select public.choisir_vue('11111111-0000-0000-0000-000000000001', null);
select is((select store_id from public.list_views where list_id = '11111111-0000-0000-0000-000000000001'),
  null, '« Défaut » s''enregistre comme une vue sans magasin');
select throws_ok($$select public.choisir_vue('11111111-0000-0000-0000-000000000001', gen_random_uuid())$$,
  'P0002', 'magasin_introuvable', 'un magasin inconnu n''est pas une vue');

-- copier_liste (LST-04) : les rangements suivent les articles copiés.
select public.copier_liste('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
  'Copie', '🛒', array['aaaaaaaa-0000-0000-0000-000000000001'::uuid],
  array['aaaaaaaa-0000-0000-0000-000000000002'::uuid]);
select results_eq(
  $$select store_id, rayon_id from public.article_store_rayons
    where article_id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  $$select store_id, rayon_id from public.article_store_rayons
    where article_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'la copie d''une liste reprend les rangements (LST-04)');
select is((select list_id from public.article_store_rayons where article_id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  '11111111-0000-0000-0000-000000000002'::uuid, 'les rangements copiés appartiennent à la nouvelle liste');
-- Cas limites (audit RLS).
select is((select list_id from public.article_store_rayons
  where article_id = 'aaaaaaaa-0000-0000-0000-000000000001' and store_id = '5f000000-0000-0000-0000-000000000002'),
  '11111111-0000-0000-0000-000000000001'::uuid, 'un rangement appartient à la liste de son article');
select throws_ok($$select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001',
  '5f000000-0000-0000-0000-000000000001', gen_random_uuid())$$, 'P0002', 'rayon_introuvable',
  'un rayon inconnu est refusé');
select public.creer_article('aaaaaaaa-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001',
  'Kiwis', (select id from r where name = 'Fruits et légumes'), null);
select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000004', '5f000000-0000-0000-0000-000000000001',
  (select id from r where name = 'Monde'));
select public.supprimer_article('aaaaaaaa-0000-0000-0000-000000000004', 'a_acheter');
select throws_ok($$select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000004',
  '5f000000-0000-0000-0000-000000000001', (select id from r where name = 'Autre'))$$, 'P0002', 'article_introuvable',
  'un article supprimé ne se range pas');
select public.copier_liste('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003',
  'Copie 2', '🛒');
select is((select count(*)::int from public.article_store_rayons
  where list_id = '11111111-0000-0000-0000-000000000003'), 1,
  'la copie ne reprend pas les rangements d''un article supprimé');
select throws_ok($$select public.creer_magasin(gen_random_uuid(), repeat('x', 61))$$, '23514', null,
  'un nom de plus de 60 caractères est refusé (MAG-01)');
select throws_ok($$select public.creer_magasin(gen_random_uuid(), 'Lidl' || chr(8203) || 'pgTAP')$$, '23514', null,
  'un nom avec un caractère invisible est refusé (MAG-04)');
select throws_ok($$select public.creer_magasin(gen_random_uuid(), 'Lidl' || chr(10) || 'pgTAP')$$, '23514', null,
  'un nom avec un caractère de contrôle est refusé');
select throws_ok($$select public.ordonner_rayons('5f000000-0000-0000-0000-000000000001',
  array[(select id from r where name = 'Œufs')])$$, '22023', 'ordre_invalide',
  'un ordre partiel est refusé : tous les rayons y figurent (DIS-01)');
reset role;

-- COL-01 : les rangements sont diffusés sur le canal de leur liste.
select ok((select count(*) > 0 from realtime.messages
  where topic = 'list:11111111-0000-0000-0000-000000000001' and event = 'placement'
    and payload ->> 'rayon_id' is not null),
  'un rangement créé est diffusé sur le canal de sa liste');
select ok((select count(*) > 0 from realtime.messages
  where topic = 'list:11111111-0000-0000-0000-000000000001' and event = 'placement'
    and payload ? 'rayon_id' and payload ->> 'rayon_id' is null),
  'un rangement supprimé est diffusé sans rayon');
select is((select count(*)::int from realtime.messages
  where event = 'placement' and topic <> 'list:' || (payload ->> 'list_id')), 0,
  'un rangement n''est diffusé que sur le canal de sa liste');

-- Bob n'a pas créé le magasin d'Alice : son id ne se réutilise pas.
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select throws_ok($$select public.creer_magasin('5f000000-0000-0000-0000-000000000001', 'Autre nom')$$,
  '23505', 'identifiant_invalide', 'l''id d''un magasin d''un autre compte ne se réutilise pas');
select lives_ok($$select public.ordonner_rayons('5f000000-0000-0000-0000-000000000001',
  array(select id from r order by name))$$, 'tout compte modifie l''ordre d''un magasin (DIS-02)');
reset role;

select * from finish();
rollback;
