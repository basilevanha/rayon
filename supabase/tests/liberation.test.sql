-- ISC-05 : libération des codes non confirmés
begin;
select plan(9);

delete from public.app_invitations;
insert into auth.users (id, email, created_at, email_confirmed_at) values
  ('33333333-3333-3333-3333-333333333333', 'ancien@pgtap.test', now() - interval '25 hours', null),
  ('44444444-4444-4444-4444-444444444444', 'recent@pgtap.test', now() - interval '1 hour', null),
  ('55555555-5555-5555-5555-555555555555', 'confirme@pgtap.test', now() - interval '25 hours', now());
insert into public.app_invitations (code, expires_at, used_at, reserved_email, account_created_at) values
  ('ANCIEN', now() + interval '14 days', now() - interval '25 hours', 'ancien@pgtap.test', now() - interval '25 hours'),
  ('RECENT', now() + interval '14 days', now() - interval '1 hour', 'recent@pgtap.test', now() - interval '1 hour'),
  ('CONFIRME', now() + interval '14 days', now() - interval '25 hours', 'confirme@pgtap.test', now() - interval '25 hours'),
  ('ORPHELIN', now() + interval '14 days', now() - interval '20 minutes', 'jamais@pgtap.test', null),
  ('ENCOURS', now() + interval '14 days', now() - interval '1 minute', 'encours@pgtap.test', null),
  ('SUPPRIME', now() + interval '14 days', now() - interval '2 days', 'supprime@pgtap.test', now() - interval '2 days');

select public.liberer_inscriptions_non_confirmees();

select ok(not exists (select 1 from auth.users where id = '33333333-3333-3333-3333-333333333333'),
  'compte non confirmé de plus de 24 h supprimé');
select is((select reserved_email from public.app_invitations where code = 'ANCIEN'), null,
  'son code redevient utilisable');
select ok(exists (select 1 from auth.users where id = '44444444-4444-4444-4444-444444444444'),
  'compte non confirmé récent conservé');
select isnt((select used_at from public.app_invitations where code = 'RECENT'), null,
  'son code reste consommé');
select ok(exists (select 1 from auth.users where id = '55555555-5555-5555-5555-555555555555'),
  'compte confirmé conservé');
select isnt((select used_at from public.app_invitations where code = 'CONFIRME'), null,
  'son code reste consommé');
select is((select used_at from public.app_invitations where code = 'ORPHELIN'), null,
  'code consommé sans compte depuis plus de 15 minutes : libéré');
select isnt((select used_at from public.app_invitations where code = 'ENCOURS'), null,
  'code consommé il y a moins de 15 minutes : conservé');

select isnt((select used_at from public.app_invitations where code = 'SUPPRIME'), null,
  'code d''un compte créé puis supprimé : jamais réutilisable');

select * from finish();
rollback;
