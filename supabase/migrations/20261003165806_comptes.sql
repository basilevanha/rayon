-- Lot 2 : comptes et inscription sur invitation
-- ISC-01, ISC-02, ISC-03, ISC-05, ISC-06, CPT-04, SEC-01, SEC-04

-- Réglages de l'application (ISC-01, ISC-04, ISC-06) : une seule ligne.
create table public.app_settings (
  id boolean primary key default true check (id),
  signup_mode text not null default 'invitation' check (signup_mode in ('invitation', 'ouvert')),
  account_cap integer not null default 100 check (account_cap >= 0),
  invitation_quota integer not null default 3 check (invitation_quota >= 0)
);
insert into public.app_settings default values;

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

-- Profils (CPT-04, CON-01)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name = btrim(display_name) and char_length(display_name) between 1 and 30),
  role text not null default 'utilisateur' check (role in ('utilisateur', 'editeur', 'administrateur')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "Un compte lit son profil" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "Un compte modifie son profil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and display_name is not null);

-- Invitations à l'application (ISC-04, ISC-05)
create table public.app_invitations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  issued_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  reserved_email text,
  used_at timestamptz,
  -- Renseigné quand le compte est réellement créé : distingue un code orphelin
  -- (création échouée) d'un code dont le compte a été supprimé depuis.
  account_created_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index app_invitations_issued_by_idx on public.app_invitations (issued_by);
create index app_invitations_reserved_email_idx on public.app_invitations (reserved_email);

alter table public.app_invitations enable row level security;
revoke all on public.app_invitations from anon, authenticated;
grant select on public.app_invitations to authenticated;

create policy "Un compte lit les invitations qu'il a émises" on public.app_invitations
  for select to authenticated
  using (issued_by = (select auth.uid()));

-- Création du profil à l'inscription
create function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  update public.app_invitations
    set account_created_at = now()
    where reserved_email = lower(new.email) and account_created_at is null;
  return new;
end;
$$;
revoke execute on function public.creer_profil() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.creer_profil();

-- Hook « Before User Created » (ISC-02, ISC-03, ISC-05, ISC-06, SEC-04).
-- Mode, plafond et code sont vérifiés dans la même transaction ; les verrous
-- empêchent qu'un code serve deux fois ou que le plafond soit dépassé.
create function public.controle_inscription(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.app_settings;
  v_email text := lower(event -> 'user' ->> 'email');
  v_code text := upper(btrim(event -> 'user' -> 'user_metadata' ->> 'invitation_code'));
  v_invitation public.app_invitations;
begin
  select * into v_settings from public.app_settings for update;

  -- Le hook peut être validé avant l'insertion du compte : les codes consommés
  -- depuis moins de 15 minutes sans compte créé comptent dans le plafond.
  if (select count(*) from auth.users)
     + (select count(*) from public.app_invitations i
        where i.used_at > now() - interval '15 minutes'
          and i.account_created_at is null)
     >= v_settings.account_cap then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'inscriptions_completes'));
  end if;

  if v_settings.signup_mode = 'ouvert' then
    return '{}'::jsonb;
  end if;

  if v_code is null or v_code = '' then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'inscription_sur_invitation'));
  end if;

  select * into v_invitation from public.app_invitations where code = v_code for update;

  if v_invitation.id is null
    or v_invitation.revoked_at is not null
    or v_invitation.expires_at <= now()
    -- ISC-05 : un code consommé reste utilisable par l'adresse qui l'a réservé
    -- tant qu'aucun compte n'a été créé (nouvel essai après un échec).
    or (v_invitation.used_at is not null
        and (v_invitation.reserved_email is distinct from v_email
             or v_invitation.account_created_at is not null)) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'code_invalide'));
  end if;

  update public.app_invitations
    set used_at = now(), reserved_email = v_email
    where id = v_invitation.id;

  return '{}'::jsonb;
end;
$$;
revoke execute on function public.controle_inscription(jsonb) from public, anon, authenticated;
grant execute on function public.controle_inscription(jsonb) to supabase_auth_admin;

-- Libération des codes (ISC-05) : comptes non confirmés après 24 h, et codes
-- consommés depuis plus de 15 minutes sans qu'aucun compte n'ait été créé.
create function public.liberer_inscriptions_non_confirmees()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  with supprimes as (
    delete from auth.users
      where email_confirmed_at is null and created_at < now() - interval '24 hours'
      returning lower(email) as email
  )
  update public.app_invitations i
    set used_at = null, reserved_email = null, account_created_at = null
    where i.reserved_email in (select email from supprimes);

  update public.app_invitations i
    set used_at = null, reserved_email = null
    where i.used_at < now() - interval '15 minutes'
      and i.account_created_at is null;
end;
$$;
revoke execute on function public.liberer_inscriptions_non_confirmees() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule(
  'liberer-inscriptions-non-confirmees',
  '0 * * * *',
  $$select public.liberer_inscriptions_non_confirmees()$$
);
