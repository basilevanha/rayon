-- ISC-02, ISC-03, ISC-05, ISC-06, SEC-04, QUA-03
begin;
select plan(18);

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
insert into auth.users (id, email) values ('66666666-6666-6666-6666-666666666666', 'a@pgtap.test');
select is(public.controle_inscription(pg_temp.event('a@pgtap.test', 'VALIDE'))->'error'->>'message',
  'code_invalide', 'une fois le compte créé, le code est définitivement consommé');

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
