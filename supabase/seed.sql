-- Données locales uniquement. Codes d'invitation à l'application pour tester l'inscription.
insert into public.app_invitations (code, expires_at, used_at, revoked_at, reserved_email, account_created_at) values
  ('BIENVENUE', now() + interval '14 days', null, null, null, null),
  ('BASILE', now() + interval '14 days', null, null, null, null),
  ('EXPIREE', now() - interval '1 day', null, null, null, null),
  ('REVOQUEE', now() + interval '14 days', null, now(), null, null),
  ('UTILISEE', now() + interval '14 days', now() - interval '1 day', null, 'deja@example.com', now() - interval '1 day');
