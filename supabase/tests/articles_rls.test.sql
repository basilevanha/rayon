-- RAY-01, RAY-02, ART-01, COL-02, SEC-01, QUA-03 : rayons et articles
begin;
select plan(32);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'alice@pgtap.test'),
  ('b2222222-2222-2222-2222-222222222222', 'bob@pgtap.test'),
  ('c3333333-3333-3333-3333-333333333333', 'carol@pgtap.test');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.creer_liste('11111111-0000-0000-0000-000000000001', 'Maison', '🏠');
select public.creer_article('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
  'Lait', (select id from public.rayons where name = 'Produits laitiers'), null);
reset role;
insert into public.list_members (list_id, user_id)
  values ('11111111-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222');

-- Rayons (RAY-01, RAY-02).
select is((select array_agg(name order by reference_order) from public.rayons), array[
  'Fruits et légumes', 'Pommes de terre et oignons', 'Fruits secs et noix', 'Légumineuses', 'Œufs',
  'Boulangerie', 'Boucherie', 'Poissonnerie', 'Charcuterie et traiteur', 'Fromages', 'Produits laitiers',
  'Surgelés', 'Pâtes, riz et féculents', 'Conserves et plats préparés', 'Sauces et condiments', 'Épices',
  'Asie', 'Monde', 'Pâtes à tartiner et confitures', 'Céréales et biscottes', 'Café, thé et cacao',
  'Biscuits et gâteaux', 'Confiserie et chocolat', 'Chips et apéritif', 'Farine et pâtisserie', 'Eaux',
  'Jus et sodas', 'Bières', 'Vins et champagnes', 'Alcools forts', 'Hygiène et beauté',
  'Entretien et maison', 'Ustensiles de cuisine', 'Bébé', 'Animaux', 'Autre'],
  'les 36 rayons initiaux, dans l''ordre de l''annexe §18');
select is((select name from public.rayons order by reference_order desc limit 1), 'Autre',
  '« Autre » est le dernier rayon de l''ordre de référence');
select is((select count(*)::int from public.rayons where not deletable), 1, 'seul « Autre » est non supprimable');

set local role anon;
select throws_ok($$select * from public.rayons$$, '42501', null, 'anon ne lit pas les rayons');
select throws_ok($$select * from public.articles$$, '42501', null, 'anon ne lit pas les articles');
select throws_ok($$select public.creer_article(gen_random_uuid(), '11111111-0000-0000-0000-000000000001',
  'Pain', (select id from public.rayons limit 1), null)$$, '42501', null, 'anon ne crée pas d''article');
select throws_ok($$select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'caddie')$$, '42501', null,
  'anon ne change pas de statut');
select throws_ok($$select public.copier_liste('11111111-0000-0000-0000-000000000001', gen_random_uuid(), 'X', '🛒')$$,
  '42501', null, 'anon ne copie pas de liste');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select is((select count(*)::int from public.rayons), 36, 'tout compte connecté lit les rayons');
select throws_ok($$insert into public.rayons (name, reference_order) values ('Pirate', 99)$$, '42501', null,
  'un utilisateur ne crée pas de rayon (RAY-02)');
select throws_ok($$update public.rayons set name = 'Pirate'$$, '42501', null,
  'un utilisateur ne renomme pas de rayon (RAY-02)');
select throws_ok($$delete from public.rayons$$, '42501', null, 'un utilisateur ne supprime pas de rayon (RAY-02)');

-- Carol n'est pas membre de la liste d'Alice, mais a la sienne (SEC-01).
select public.creer_liste('33333333-0000-0000-0000-000000000003', 'Carol', '🛒');
select public.creer_article('cccccccc-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003',
  'Lait', (select id from public.rayons where name = 'Produits laitiers'), null);
select is((select array_agg(id) from public.articles), array['cccccccc-0000-0000-0000-000000000001'::uuid],
  'un compte ne lit que les articles de ses listes');
update public.articles set name = 'Piraté', deleted_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select throws_ok($$select public.creer_article(gen_random_uuid(), '11111111-0000-0000-0000-000000000001',
  'Pain', (select id from public.rayons where name = 'Boulangerie'), null)$$, '42501', 'non_membre', 'un non-membre ne crée pas d''article');
select throws_ok($$select public.set_status('aaaaaaaa-0000-0000-0000-000000000001', 'caddie')$$,
  'P0002', 'article_introuvable', 'l''article d''une autre liste est introuvable, comme un article inconnu');
select throws_ok($$select public.creer_article('aaaaaaaa-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000003', 'Lait', (select id from public.rayons where name = 'Autre'), null)$$,
  '23505', 'identifiant_invalide', 'l''id d''un article d''une autre liste ne fusionne rien');
select throws_ok($$update public.articles set list_id = '11111111-0000-0000-0000-000000000001'$$, '42501', null,
  'un article ne change pas de liste');
select throws_ok($$select public.copier_liste('33333333-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000001', 'X', '🛒')$$, '23505', 'liste_existante',
  'une copie ne s''écrit pas dans la liste d''un autre');
reset role;
select is((select row(name, deleted_at)::text from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  row('Lait', null::timestamptz)::text, 'un non-membre ne modifie ni ne supprime un article');

-- Bob est membre.
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*)::int from public.articles), 1, 'un membre lit les articles de sa liste');
select throws_ok($$insert into public.articles (id, list_id, name, rayon_id)
  values (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', 'Pain', (select id from public.rayons where name = 'Boulangerie'))$$,
  '42501', null, 'aucune insertion directe : la création passe par creer_article (ART-03, ART-04)');
select throws_ok($$delete from public.articles$$, '42501', null,
  'aucune suppression définitive : elle est douce (ART-08)');
select throws_ok($$update public.articles set status = 'caddie'$$, '42501', null,
  'le statut ne s''écrit que par set_status (COU-10)');
select throws_ok($$update public.articles set status_by = auth.uid()$$, '42501', null,
  'l''auteur de la mise au caddie ne s''écrit pas directement (COL-04)');
select throws_ok($$update public.articles set updated_at = now() - interval '1 day'$$, '42501', null,
  'l''horodatage ne s''écrit pas directement (COL-02)');
select throws_ok($$update public.articles set updated_by = auth.uid()$$, '42501', null,
  'l''auteur ne s''écrit pas directement (COL-02)');
select throws_ok($$update public.articles set id = gen_random_uuid()$$, '42501', null, 'l''id ne change pas');
select throws_ok($$update public.articles set created_at = now()$$, '42501', null, 'la date de création ne change pas');
select throws_ok($$update public.articles set normalized_name = 'x'$$, '428C9', null,
  'le nom normalisé ne s''écrit pas (TEC-01)');
update public.articles set quantity = 2;
reset role;
select is((select updated_by from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'b2222222-2222-2222-2222-222222222222'::uuid,
  'l''auteur d''une modification est fixé par le serveur (COL-02)');
select is((select quantity from public.articles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 2, 'un membre modifie la quantité (ART-06)');

set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select throws_ok($$update public.articles set rayon_id = gen_random_uuid()$$, '23503', null,
  'le rayon doit exister (ART-01)');
reset role;

select * from finish();
rollback;
