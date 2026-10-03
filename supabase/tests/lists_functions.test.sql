-- LST-01, LST-06, LST-07, LST-08, INV-01, INV-03, SEC-03, TEC-03, QUA-03
begin;
select plan(38);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'alice@pgtap.test'),
  ('b2222222-2222-2222-2222-222222222222', 'bob@pgtap.test'),
  ('c3333333-3333-3333-3333-333333333333', 'carol@pgtap.test');

-- Alice crée la liste.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$select public.creer_liste('11111111-0000-0000-0000-000000000001', ' Maison ', '🏠')$$,
  'création d''une liste (LST-01)');
select lives_ok($$select public.creer_liste('11111111-0000-0000-0000-000000000001', 'Maison', '🏠')$$,
  'rejeu de la création : sans effet');
select is((select count(*)::int from public.list_members), 1, 'le rejeu n''ajoute pas de membre');
select is((select name from public.lists), 'Maison', 'le nom est nettoyé des espaces');
select ok((select is_creator from public.list_members), 'le créateur est marqué');
select throws_ok($$select public.creer_liste(gen_random_uuid(), repeat('x', 41), '🛒')$$, '23514', null,
  'nom de plus de 40 caractères : refus');

create temp table codes (nom text primary key, code text);
grant all on codes to authenticated;
insert into codes select 'bob', code from public.creer_invitation('11111111-0000-0000-0000-000000000001');
insert into codes select 'revoquee', code from public.creer_invitation('11111111-0000-0000-0000-000000000001');
select ok((select bool_and(code ~ '^[A-HJ-NP-Z2-9]{6}$') from codes),
  'code de 6 caractères sans caractère ambigu (INV-01)');
select is((select issued_by from public.invitations where code = (select code from codes where nom = 'bob')),
  'a1111111-1111-1111-1111-111111111111'::uuid, 'l''émetteur est enregistré');
select lives_ok($$select public.revoquer_invitation(
  (select id from public.invitations where code = (select code from codes where nom = 'revoquee')))$$,
  'révocation par un membre');

-- Bob rejoint avec le lien.
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is(public.accepter_invitation(lower((select code from codes where nom = 'bob'))),
  '11111111-0000-0000-0000-000000000001'::uuid, 'invitation acceptée, en minuscules (TEC-03)');
select is(public.accepter_invitation((select code from codes where nom = 'bob')),
  '11111111-0000-0000-0000-000000000001'::uuid, 'second appel du même membre : sans effet');
select throws_ok($$select public.accepter_invitation('ZZZZZZ')$$, 'P0002', 'invitation_inconnue',
  'code inconnu : refus');

-- Carol essaie les codes invalides (INV-03).
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select throws_ok(format('select public.accepter_invitation(%L)', (select code from codes where nom = 'bob')),
  '22023', 'invitation_utilisee', 'code déjà utilisé : refus');
select throws_ok(format('select public.accepter_invitation(%L)', (select code from codes where nom = 'revoquee')),
  '22023', 'invitation_revoquee', 'code révoqué : refus');
reset role;
insert into public.invitations (code, list_id, expires_at)
  values ('EXP234', '11111111-0000-0000-0000-000000000001', now() - interval '1 minute');
insert into codes select 'id_expiree', id::text from public.invitations where code = 'EXP234';
set local role authenticated;
select throws_ok($$select public.accepter_invitation('EXP234')$$, '22023', 'invitation_expiree',
  'code expiré : refus');
select throws_ok(format('select public.revoquer_invitation(%L)', (select code from codes where nom = 'id_expiree')),
  '42501', 'non_membre', 'un non-membre ne révoque pas');

-- Carol rejoint avec un code valide.
reset role;
insert into public.invitations (code, list_id) values ('CAR234', '11111111-0000-0000-0000-000000000001');
set local role authenticated;
select lives_ok($$select public.accepter_invitation('CAR234')$$, 'Carol rejoint la liste');
reset role;
update public.list_members set joined_at = now() - interval '3 days'
  where user_id = 'a1111111-1111-1111-1111-111111111111';
update public.list_members set joined_at = now() - interval '2 days'
  where user_id = 'b2222222-2222-2222-2222-222222222222';
update public.list_members set joined_at = now() - interval '1 day'
  where user_id = 'c3333333-3333-3333-3333-333333333333';
set local role authenticated;

-- LST-06 : actions réservées au créateur.
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select throws_ok($$select public.retirer_membre('11111111-0000-0000-0000-000000000001',
  'c3333333-3333-3333-3333-333333333333')$$, '42501', 'reserve_au_createur',
  'un membre ne retire personne');
select throws_ok($$select public.supprimer_liste('11111111-0000-0000-0000-000000000001', 'Maison')$$,
  '42501', 'reserve_au_createur', 'un membre ne supprime pas la liste');

set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok($$select public.supprimer_liste('11111111-0000-0000-0000-000000000001', 'maison')$$,
  '22023', 'nom_incorrect', 'suppression avec un nom mal saisi : refus');
select throws_ok($$select public.retirer_membre('11111111-0000-0000-0000-000000000001',
  'a1111111-1111-1111-1111-111111111111')$$, '22023', 'createur_non_retirable',
  'le créateur ne se retire pas lui-même');
select lives_ok($$select public.retirer_membre('11111111-0000-0000-0000-000000000001',
  'c3333333-3333-3333-3333-333333333333')$$, 'le créateur retire un membre');
select is((select count(*)::int from public.list_members), 2, 'le membre retiré n''est plus dans la liste');

-- Un membre retiré revient avec une nouvelle invitation.
insert into codes select 'retour', code from public.creer_invitation('11111111-0000-0000-0000-000000000001');
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select throws_ok($$select public.accepter_invitation('CAR234')$$, '22023', 'invitation_utilisee',
  'l''ancien code ne sert plus');
select lives_ok(format('select public.accepter_invitation(%L)', (select code from codes where nom = 'retour')),
  'un membre retiré revient avec une nouvelle invitation (LST-06)');
reset role;
update public.list_members set joined_at = now() - interval '1 day'
  where user_id = 'c3333333-3333-3333-3333-333333333333';
set local role authenticated;

-- LST-06 : une invitation créée avant le retrait ne sert pas au membre retiré.
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
insert into codes select 'avant_retrait', code from public.creer_invitation('11111111-0000-0000-0000-000000000001');
select public.retirer_membre('11111111-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333');
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select throws_ok(format('select public.accepter_invitation(%L)', (select code from codes where nom = 'avant_retrait')),
  '22023', 'invitation_anterieure_au_retrait', 'un code créé avant le retrait est refusé au membre retiré');
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
insert into codes select 'apres_retrait', code from public.creer_invitation('11111111-0000-0000-0000-000000000001');
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select lives_ok(format('select public.accepter_invitation(%L)', (select code from codes where nom = 'apres_retrait')),
  'un code créé après le retrait est accepté');
reset role;
update public.list_members set joined_at = now() - interval '1 day'
  where user_id = 'c3333333-3333-3333-3333-333333333333';
set local role authenticated;

-- LST-07 : le créateur quitte, le rôle passe au plus ancien.
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$select public.quitter_liste('11111111-0000-0000-0000-000000000001')$$, 'le créateur quitte');
select lives_ok($$select public.quitter_liste('11111111-0000-0000-0000-000000000001')$$,
  'rejeu du départ : sans effet');
reset role;
select is((select user_id from public.list_members
  where list_id = '11111111-0000-0000-0000-000000000001' and is_creator),
  'b2222222-2222-2222-2222-222222222222'::uuid, 'le rôle passe au membre le plus ancien (LST-07)');

-- LST-08 : le départ du dernier membre supprime la liste.
set local role authenticated;
set local request.jwt.claims = '{"sub": "b2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select public.quitter_liste('11111111-0000-0000-0000-000000000001');
set local request.jwt.claims = '{"sub": "c3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select public.quitter_liste('11111111-0000-0000-0000-000000000001');
reset role;
select is((select count(*)::int from public.lists where id = '11111111-0000-0000-0000-000000000001'), 0,
  'le départ du dernier membre supprime la liste (LST-08)');
select is((select count(*)::int from public.invitations where list_id = '11111111-0000-0000-0000-000000000001'),
  0, 'les invitations de la liste sont supprimées avec elle');

-- SEC-03 : 20 invitations par jour et par liste.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select public.creer_liste('11111111-0000-0000-0000-000000000002', 'Bureau', '🏢');
select lives_ok($$select public.creer_invitation('11111111-0000-0000-0000-000000000002')
  from generate_series(1, 20)$$, '20 invitations dans la journée');
select throws_ok($$select public.creer_invitation('11111111-0000-0000-0000-000000000002')$$,
  '54000', 'limite_invitations', 'la 21e est refusée (SEC-03)');
reset role;

-- INV-02 : un compte inscrit avec un code de liste la rejoint à sa première connexion,
-- même s'il n'est pas revenu par le lien.
insert into public.invitations (code, list_id, used_at, reserved_email)
  values ('DAV234', '11111111-0000-0000-0000-000000000002', now(), 'dave@pgtap.test');
insert into auth.users (id, email, raw_user_meta_data)
  values ('d4444444-4444-4444-4444-444444444444', 'dave@pgtap.test', '{"invitation_code": "DAV234"}');
set local role authenticated;
set local request.jwt.claims = '{"sub": "d4444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select is(array(select public.accepter_invitations_en_attente()),
  array['11111111-0000-0000-0000-000000000002'::uuid], 'la liste de l''invitation est rejointe');
select is(array(select public.accepter_invitations_en_attente()), array[]::uuid[],
  'second appel : rien de plus');
reset role;

-- Codes uniques entre les deux tables d'invitations.
select throws_ok(format('insert into public.app_invitations (code) values (%L)',
  (select code from public.invitations where list_id = '11111111-0000-0000-0000-000000000002' limit 1)), '23505', 'code_deja_pris',
  'un code de liste ne peut pas servir d''invitation à l''application');
select throws_ok($$insert into public.invitations (code, list_id)
  values ('O0I1AB', '11111111-0000-0000-0000-000000000002')$$, '23514', null,
  'les caractères ambigus sont refusés');

select * from finish();
rollback;
