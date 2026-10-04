-- MAG-01, DIS-01, RNG-01, PRE-11, SEC-01, QUA-03 : RLS des magasins, ordres, rangements et vues
begin;
select plan(31);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'alice@pgtap.test'),
  ('b2222222-2222-2222-2222-222222222222', 'bob@pgtap.test'),
  ('c3333333-3333-3333-3333-333333333333', 'carol@pgtap.test');

-- Alice crée une liste, un article, un magasin, un rangement et une vue ; Bob est membre.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.creer_liste('11111111-0000-0000-0000-000000000001', 'Maison', '🏠');
select public.creer_article('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
  'Bananes', (select id from public.rayons where name = 'Fruits et légumes'), null);
select public.creer_magasin('5f000000-0000-0000-0000-000000000001', 'Carrefour pgTAP');
select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001',
  (select id from public.rayons where name = 'Pommes de terre et oignons'));
select public.choisir_vue('11111111-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001');
reset role;
insert into public.list_members (list_id, user_id)
  values ('11111111-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222');

-- Anonyme : rien.
set local role anon;
select throws_ok($$select * from public.stores$$, '42501', null, 'anon ne lit pas les magasins');
select throws_ok($$select * from public.store_rayon_orders$$, '42501', null, 'anon ne lit pas l''ordre des magasins');
select throws_ok($$select * from public.article_store_rayons$$, '42501', null, 'anon ne lit pas les rangements');
select throws_ok($$select * from public.list_views$$, '42501', null, 'anon ne lit pas les vues');
select throws_ok($$select public.creer_magasin(gen_random_uuid(), 'Anonyme')$$, '42501', null,
  'anon ne crée pas de magasin');
select throws_ok($$select public.ordonner_rayons('5f000000-0000-0000-0000-000000000001',
  array[(select id from public.rayons limit 1)])$$, '42501', null, 'anon ne réordonne pas un magasin');
select throws_ok($$select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001', null,
  (select id from public.rayons limit 1), true)$$, '42501', null, 'anon ne range pas d''article');
select throws_ok($$select public.choisir_vue('11111111-0000-0000-0000-000000000001', null)$$, '42501', null,
  'anon ne choisit pas de vue');
reset role;

-- Carol n'est pas membre de la liste d'Alice.
set local role authenticated;
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select is((select name from public.stores where id = '5f000000-0000-0000-0000-000000000001'), 'Carrefour pgTAP',
  'tout compte connecté lit les magasins (MAG-04)');
select is((select count(*)::int from public.article_store_rayons), 0,
  'un non-membre ne lit pas les rangements d''une liste (SEC-01)');
select is((select count(*)::int from public.list_views), 0, 'un compte ne lit pas la vue d''un autre (QUA-03)');
select throws_ok($$select public.ranger_article('aaaaaaaa-0000-0000-0000-000000000001',
  '5f000000-0000-0000-0000-000000000001', (select id from public.rayons where name = 'Autre'))$$,
  'P0002', 'article_introuvable', 'un non-membre ne range pas un article d''une autre liste');
select throws_ok($$select public.choisir_vue('11111111-0000-0000-0000-000000000001', null)$$, '42501', 'non_membre',
  'un non-membre ne choisit pas de vue pour une autre liste');

-- Aucune écriture directe : tout passe par les fonctions de TEC-03.
select throws_ok($$insert into public.stores (id, name) values (gen_random_uuid(), 'Direct')$$, '42501', null,
  'aucune création directe de magasin (MAG-04)');
select throws_ok($$update public.stores set name = 'Renommé'$$, '42501', null,
  'un magasin ne se renomme pas en V1 (MAG-01)');
select throws_ok($$delete from public.stores$$, '42501', null, 'un magasin ne se supprime pas en V1 (MAG-01)');
select throws_ok($$insert into public.store_rayon_orders (store_id, rayon_id, position)
  values ('5f000000-0000-0000-0000-000000000001', (select id from public.rayons limit 1), 1)$$, '42501', null,
  'l''ordre d''un magasin ne s''écrit que par ordonner_rayons (DIS-02)');
select throws_ok($$delete from public.store_rayon_orders$$, '42501', null,
  'l''ordre d''un magasin ne se supprime pas directement');
select throws_ok($$insert into public.article_store_rayons (article_id, store_id, list_id, rayon_id)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001', (select id from public.rayons limit 1))$$, '42501', null,
  'un rangement ne s''écrit que par ranger_article (ART-07)');
select throws_ok($$insert into public.list_views (user_id, list_id)
  values ('a1111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000001')$$, '42501', null,
  'une vue ne s''écrit que par choisir_vue');
reset role;
select is((select count(*)::int from public.article_store_rayons
  where article_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 1, 'le rangement d''Alice est intact');

-- Bob est membre : il lit les rangements, pas la vue d'Alice.
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*)::int from public.article_store_rayons), 1,
  'un membre lit les rangements de sa liste (RNG-01)');
select is((select count(*)::int from public.list_views), 0, 'un membre ne lit pas la vue d''un autre membre');
select throws_ok($$update public.article_store_rayons set rayon_id = (select id from public.rayons where name = 'Autre')$$,
  '42501', null, 'un membre ne modifie pas un rangement directement');
select throws_ok($$delete from public.list_views$$, '42501', null, 'une vue ne se supprime pas directement');
select throws_ok($$delete from public.article_store_rayons$$, '42501', null,
  'un membre ne supprime pas un rangement directement');
select throws_ok($$update public.article_store_rayons set list_id = '11111111-0000-0000-0000-000000000001'$$,
  '42501', null, 'un rangement ne change pas de liste');
select throws_ok($$update public.list_views set store_id = null$$, '42501', null,
  'une vue ne se modifie pas directement');
select throws_ok($$update public.store_rayon_orders set position = 0$$, '42501', null,
  'l''ordre d''un magasin ne se modifie pas directement');
select public.quitter_liste('11111111-0000-0000-0000-000000000001');
select is((select count(*)::int from public.article_store_rayons), 0,
  'un ancien membre ne lit plus les rangements de la liste');
reset role;

-- Alice lit sa vue.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is((select store_id from public.list_views), '5f000000-0000-0000-0000-000000000001'::uuid,
  'un compte lit sa vue (PRE-11)');
reset role;

select * from finish();
rollback;
