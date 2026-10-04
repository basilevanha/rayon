-- Données locales uniquement. Codes d'invitation à l'application pour tester l'inscription.
insert into public.app_invitations (code, expires_at, used_at, revoked_at, reserved_email, account_created_at) values
  ('BIENVENUE', now() + interval '14 days', null, null, null, null),
  ('BASILE', now() + interval '14 days', null, null, null, null),
  ('EXPIREE', now() - interval '1 day', null, null, null, null),
  ('REVOQUEE', now() + interval '14 days', null, now(), null, null),
  ('UTILISEE', now() + interval '14 days', now() - interval '1 day', null, 'deja@example.com', now() - interval '1 day');

-- Magasins (MAG-01). Colruyt Wavre suit l'ordre de référence ; Delhaize Wavre commence par
-- la boulangerie et place les produits laitiers juste après les fruits et légumes (DIS-01).
insert into public.stores (id, name) values
  ('5e000000-0000-0000-0000-000000000001', 'Colruyt Wavre'),
  ('5e000000-0000-0000-0000-000000000002', 'Delhaize Wavre');
insert into public.store_rayon_orders (store_id, rayon_id, position)
select '5e000000-0000-0000-0000-000000000002', id,
  row_number() over (order by case name
    when 'Boulangerie' then 0
    when 'Produits laitiers' then 15
    else reference_order end)
from public.rayons;
