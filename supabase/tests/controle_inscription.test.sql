-- ISC-02, ISC-03, ISC-05, ISC-06, SEC-04, QUA-03
begin;
select plan(27);

delete from public.app_invitations;
update public.app_settings set signup_mode = 'invitation', account_cap = 1000;

insert into public.app_invitations (code, expires_at, used_at, revoked_at, reserved_email) values
  ('VALIDE', now() + interval '14 days', null, null, null),
  ('EXPIREE', now() - interval '1 day', null, null, null),
  ('REVOQUEE', now() + interval '14 days', null, now(), null),
  ('UTILISEE', now() + interval '14 days', now() - interval '1 day', null, 'autre@pgtap.test');

create function pg_temp.event(email text, code text) returns jsonb language sql as $$
  select jsonb_build_object(
    'metadata', jsonb_build_object('name', 'before-user-created'),
    'user', jsonb_build_object(
      'email', email,
      'user_metadata', case when code is null then '{}'::jsonb
                            else jsonb_build_object('invitation_code', code) end
    )
  )
$$;

select is(public.controle_inscription(pg_temp.event('a@pgtap.test', null))->'error'->>'message',
  'inscription_sur_invitation', 'sans code : refus');
select is(public.controle_inscription(pg_temp.event('a@pgtap.test', 'INCONNU'))->'error'->>'message',
  'code_invalide', 'code inconnu : refus');
select is(public.controle_inscription(pg_temp.event('a@pgtap.test', 'EXPIREE'))->'error'->>'message',
  'code_invalide', 'code expiré : refus');
select is(public.controle_inscription(pg_temp.event('a@pgtap.test', 'REVOQUEE'))->'error'->>'message',
  'code_invalide', 'code révoqué : refus');
select is(public.controle_inscription(pg_temp.event('a@pgtap.test', 'UTILISEE'))->'error'->>'message',
  'code_invalide', 'code déjà utilisé : refus');

update public.app_settings set account_cap = (select count(*) from auth.users);
select is(public.controle_inscription(pg_temp.event('a@pgtap.test', 'VALIDE'))->'error'->>'message',
  'inscriptions_completes', 'plafond atteint : refus même avec un code valide');
select is((select used_at from public.app_invitations where code = 'VALIDE'), null,
  'plafond atteint : le code n''est pas consommé');
update public.app_settings set account_cap = (select count(*) from auth.users) + 1;
select is(public.controle_inscription(pg_temp.event('a@pgtap.test', ' valide ')), '{}'::jsonb,
  'code valide (minuscules, espaces) à la limite du plafond : accepté');
select isnt((select used_at from public.app_invitations where code = 'VALIDE'), null,
  'code valide : consommé');
select is((select reserved_email from public.app_invitations where code = 'VALIDE'), 'a@pgtap.test',
  'code valide : réservé à l''adresse');
select is(public.controle_inscription(pg_temp.event('b@pgtap.test', 'VALIDE'))->'error'->>'message',
  'inscriptions_completes', 'un code consommé sans compte encore créé compte dans le plafond');
update public.app_settings set account_cap = 1000;
select is(public.controle_inscription(pg_temp.event('b@pgtap.test', 'VALIDE'))->'error'->>'message',
  'code_invalide', 'second usage par une autre adresse : refus');
select is(public.controle_inscription(pg_temp.event('A@pgtap.test', 'VALIDE')), '{}'::jsonb,
  'nouvel essai de la même adresse sans compte créé : accepté');
insert into auth.users (id, email, raw_user_meta_data) values
  ('66666666-6666-6666-6666-666666666666', 'a@pgtap.test', '{"invitation_code": "valide"}');
select is(public.controle_inscription(pg_temp.event('a@pgtap.test', 'VALIDE'))->'error'->>'message',
  'code_invalide', 'une fois le compte créé, le code est définitivement consommé');

-- INV-02 : une invitation à une liste vaut autorisation d'inscription.
insert into public.lists (id, name) values ('11111111-0000-0000-0000-000000000009', 'Maison');
insert into public.invitations (code, list_id, expires_at, accepted_at, used_at) values
  ('LST234', '11111111-0000-0000-0000-000000000009', now() + interval '7 days', null, null),
  ('LSTEXP', '11111111-0000-0000-0000-000000000009', now() - interval '1 day', null, null),
  ('LSTACC', '11111111-0000-0000-0000-000000000009', now() + interval '7 days', now(), now());
select is(public.controle_inscription(pg_temp.event('d@pgtap.test', 'lst234')), '{}'::jsonb,
  'code de liste valide : accepté');
select is((select reserved_email from public.invitations where code = 'LST234'), 'd@pgtap.test',
  'code de liste : réservé à l''adresse');
select is(public.controle_inscription(pg_temp.event('e@pgtap.test', 'LSTEXP'))->'error'->>'message',
  'invitation_expiree', 'code de liste expiré : refus motivé (INV-03)');
select is(public.controle_inscription(pg_temp.event('e@pgtap.test', 'LSTACC'))->'error'->>'message',
  'invitation_utilisee', 'code de liste déjà accepté : refus motivé (INV-03)');
insert into public.invitations (code, list_id, revoked_at)
  values ('LSTREV', '11111111-0000-0000-0000-000000000009', now());
select is(public.controle_inscription(pg_temp.event('e@pgtap.test', 'LSTREV'))->'error'->>'message',
  'invitation_revoquee', 'code de liste révoqué : refus motivé (INV-03)');
-- Un code d'application réservé à la même adresse lors d'un essai raté.
insert into public.app_invitations (code, used_at, reserved_email)
  values ('AUTRE2', now(), 'd@pgtap.test');
insert into auth.users (id, email, raw_user_meta_data) values
  ('77777777-7777-7777-7777-777777777777', 'd@pgtap.test', '{"invitation_code": "LST234"}');
select isnt((select account_created_at from public.invitations where code = 'LST234'), null,
  'création du compte : le code de liste utilisé est marqué');
select is((select account_created_at from public.app_invitations where code = 'AUTRE2'), null,
  'création du compte : un autre code réservé à l''adresse n''est pas consommé (ISC-05)');
set local role authenticated;
set local request.jwt.claims = '{"sub": "77777777-7777-7777-7777-777777777777", "role": "authenticated"}';
select is(public.accepter_invitation('LST234'), '11111111-0000-0000-0000-000000000009'::uuid,
  'à la première connexion, le nouveau compte rejoint la liste (INV-02)');
reset role;
select is(public.controle_inscription(pg_temp.event('f@pgtap.test', 'LST234'))->'error'->>'message',
  'invitation_utilisee', 'un code de liste accepté ne sert pas à une autre inscription');

update public.app_settings set signup_mode = 'ouvert';
select is(public.controle_inscription(pg_temp.event('c@pgtap.test', null)), '{}'::jsonb,
  'mode ouvert sans code : accepté');
update public.app_settings set account_cap = 0;
select is(public.controle_inscription(pg_temp.event('c@pgtap.test', null))->'error'->>'message',
  'inscriptions_completes', 'mode ouvert : le plafond reste actif');

select ok(not has_function_privilege('anon', 'public.controle_inscription(jsonb)', 'execute'),
  'anon ne peut pas exécuter le hook');
select ok(not has_function_privilege('authenticated', 'public.controle_inscription(jsonb)', 'execute'),
  'authenticated ne peut pas exécuter le hook');

select * from finish();
rollback;
