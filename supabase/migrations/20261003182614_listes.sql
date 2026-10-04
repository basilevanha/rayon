-- Lot 4 : listes, membres et invitations à une liste
-- LST-01, LST-05 à LST-08, INV-01 à INV-03, ISC-02, ISC-05, CPT-04, SEC-01, SEC-03, TEC-03

-- Listes (LST-01). L'id est généré par l'appareil pour la création hors ligne (OFF-02).
create table public.lists (
  id uuid primary key,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 40),
  -- LST-01 : grille fixe, identique à LIST_EMOJIS (src/features/lists/schemas.ts).
  emoji text not null default '🛒' check (emoji in (
    '🛒', '🏠', '👪', '🥦', '🍎', '🥖', '🧀', '🥩', '🐟', '🍷', '☕', '🍼',
    '🐶', '🐱', '🧴', '🧹', '💊', '🌱', '🎉', '🎂', '🎄', '🏕️', '🏖️', '🏢'
  )),
  created_at timestamptz not null default now()
);

-- Appartenances : date d'arrivée et créateur (LST-06, LST-07).
create table public.list_members (
  list_id uuid not null references public.lists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  is_creator boolean not null default false,
  primary key (list_id, user_id)
);
create index list_members_user_id_idx on public.list_members (user_id);
create unique index list_members_one_creator_idx on public.list_members (list_id) where is_creator;

-- Invitations à une liste (INV-01). Mêmes colonnes de réservation que app_invitations
-- (ISC-05) ; accepted_at marque l'ajout effectif à la liste.
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  list_id uuid not null references public.lists (id) on delete cascade,
  issued_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  reserved_email text,
  used_at timestamptz,
  account_created_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create index invitations_list_id_created_at_idx on public.invitations (list_id, created_at);
create index invitations_issued_by_idx on public.invitations (issued_by);
create index invitations_reserved_email_idx on public.invitations (reserved_email);

-- LST-06 : un membre retiré ne revient qu'avec une invitation créée après son retrait.
create table public.list_removals (
  list_id uuid not null references public.lists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  removed_at timestamptz not null default clock_timestamp(),
  primary key (list_id, user_id)
);

-- Un code n'existe que dans une des deux tables : le hook en déduit son type (INV-01).
create function public.verifier_code_libre()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('code_invitation:' || new.code));
  if (tg_table_name = 'invitations'
      and exists (select 1 from public.app_invitations where code = new.code))
    or (tg_table_name = 'app_invitations'
      and exists (select 1 from public.invitations where code = new.code)) then
    raise exception 'code_deja_pris' using errcode = '23505';
  end if;
  return new;
end;
$$;
revoke execute on function public.verifier_code_libre() from public, anon, authenticated;

create trigger verifier_code_libre before insert or update of code on public.invitations
  for each row execute function public.verifier_code_libre();
create trigger verifier_code_libre before insert or update of code on public.app_invitations
  for each row execute function public.verifier_code_libre();

-- Aides pour la RLS : security definer, pour que les politiques ne se rappellent pas.
create function public.est_membre(p_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.list_members
    where list_id = p_list_id and user_id = (select auth.uid())
  );
$$;
revoke execute on function public.est_membre(uuid) from public, anon;
grant execute on function public.est_membre(uuid) to authenticated;

create function public.partage_une_liste(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.list_members moi
    join public.list_members autre using (list_id)
    where moi.user_id = (select auth.uid()) and autre.user_id = p_user_id
  );
$$;
revoke execute on function public.partage_une_liste(uuid) from public, anon;
grant execute on function public.partage_une_liste(uuid) to authenticated;

-- RLS (SEC-01) : les données d'une liste ne sont accessibles qu'à ses membres.
-- Seuls le nom et l'emoji s'écrivent directement (LST-05) ; le reste passe par des fonctions.
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.invitations enable row level security;
alter table public.list_removals enable row level security;
revoke all on public.lists, public.list_members, public.invitations, public.list_removals
  from anon, authenticated;
grant select, update (name, emoji) on public.lists to authenticated;
grant select on public.list_members to authenticated;
grant select (id, code, list_id, issued_by, expires_at, used_at, accepted_at, revoked_at, created_at)
  on public.invitations to authenticated;

-- CPT-04 : les co-membres ne voient que le nom affiché. Le rôle (CON-01) ne se lit
-- que pour son propre compte, via mon_profil().
revoke select on public.profiles from authenticated;
grant select (id, display_name) on public.profiles to authenticated;

create function public.mon_profil()
returns table (id uuid, display_name text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.role from public.profiles p where p.id = (select auth.uid());
$$;
revoke execute on function public.mon_profil() from public, anon;
grant execute on function public.mon_profil() to authenticated;

create policy "Un membre lit sa liste" on public.lists
  for select to authenticated
  using ((select public.est_membre(id)));

create policy "Un membre renomme sa liste" on public.lists
  for update to authenticated
  using ((select public.est_membre(id)))
  with check ((select public.est_membre(id)));

create policy "Un membre lit les membres de sa liste" on public.list_members
  for select to authenticated
  using ((select public.est_membre(list_id)));

create policy "Un membre lit les invitations de sa liste" on public.invitations
  for select to authenticated
  using ((select public.est_membre(list_id)));

-- CPT-04 : le nom affiché est visible des membres des listes partagées.
create policy "Un compte lit le profil des membres de ses listes" on public.profiles
  for select to authenticated
  using ((select public.partage_une_liste(id)));

-- LST-01. Idempotente : un rejeu (OFF-02) ne crée rien de plus.
create function public.creer_liste(p_id uuid, p_name text, p_emoji text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'non_authentifie' using errcode = '42501';
  end if;
  if exists (select 1 from public.lists where id = p_id) then
    if public.est_membre(p_id) then
      return;
    end if;
    raise exception 'liste_existante' using errcode = '23505';
  end if;
  insert into public.lists (id, name, emoji) values (p_id, btrim(p_name), p_emoji);
  insert into public.list_members (list_id, user_id, is_creator) values (p_id, v_uid, true);
end;
$$;

-- LST-07, LST-08 : le rôle de créateur passe au membre le plus ancien ; le départ
-- du dernier membre supprime la liste.
create function public.quitter_liste(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_was_creator boolean;
begin
  perform 1 from public.lists where id = p_list_id for update;
  if not found then
    return;
  end if;

  delete from public.list_members
    where list_id = p_list_id and user_id = (select auth.uid())
    returning is_creator into v_was_creator;
  if not found then
    return;
  end if;

  if not exists (select 1 from public.list_members where list_id = p_list_id) then
    delete from public.lists where id = p_list_id;
  elsif v_was_creator then
    update public.list_members set is_creator = true
      where list_id = p_list_id
        and user_id = (select user_id from public.list_members
                       where list_id = p_list_id
                       order by joined_at, user_id
                       limit 1);
  end if;
end;
$$;

-- LST-06 : seul le créateur retire un membre.
create function public.retirer_membre(p_list_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.lists where id = p_list_id for update;
  if not found then
    return;
  end if;
  if not exists (select 1 from public.list_members
                 where list_id = p_list_id and user_id = (select auth.uid()) and is_creator) then
    raise exception 'reserve_au_createur' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'createur_non_retirable' using errcode = '22023';
  end if;
  delete from public.list_members where list_id = p_list_id and user_id = p_user_id;
  if found then
    insert into public.list_removals (list_id, user_id) values (p_list_id, p_user_id)
      on conflict (list_id, user_id) do update set removed_at = excluded.removed_at;
  end if;
end;
$$;

-- LST-06 : seul le créateur supprime la liste, après avoir saisi son nom.
create function public.supprimer_liste(p_list_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select name into v_name from public.lists where id = p_list_id for update;
  if not found then
    return;
  end if;
  if not exists (select 1 from public.list_members
                 where list_id = p_list_id and user_id = (select auth.uid()) and is_creator) then
    raise exception 'reserve_au_createur' using errcode = '42501';
  end if;
  if btrim(p_name) is distinct from v_name then
    raise exception 'nom_incorrect' using errcode = '22023';
  end if;
  delete from public.lists where id = p_list_id;
end;
$$;

-- INV-01, SEC-03 : tout membre génère une invitation, 20 par jour et par liste au plus.
create function public.creer_invitation(p_list_id uuid)
returns table (id uuid, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
begin
  if not public.est_membre(p_list_id) then
    raise exception 'non_membre' using errcode = '42501';
  end if;
  -- Verrou sur la liste : le comptage et l'insertion ne se croisent pas.
  perform 1 from public.lists l where l.id = p_list_id for update;
  if (select count(*) from public.invitations i
      where i.list_id = p_list_id and i.created_at > now() - interval '1 day') >= 20 then
    raise exception 'limite_invitations' using errcode = '54000';
  end if;

  loop
    v_bytes := extensions.gen_random_bytes(6);
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, get_byte(v_bytes, i) % 32 + 1, 1);
    end loop;
    exit when not exists (select 1 from public.invitations i where i.code = v_code)
      and not exists (select 1 from public.app_invitations a where a.code = v_code);
  end loop;

  return query
    insert into public.invitations as i (code, list_id, issued_by)
      values (v_code, p_list_id, (select auth.uid()))
      returning i.id, i.code, i.expires_at;
end;
$$;

-- INV-01 : tout membre révoque une invitation non utilisée de sa liste.
create function public.revoquer_invitation(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_list_id uuid;
begin
  select list_id into v_list_id from public.invitations where id = p_id for update;
  if not found then
    return;
  end if;
  if not public.est_membre(v_list_id) then
    raise exception 'non_membre' using errcode = '42501';
  end if;
  update public.invitations set revoked_at = coalesce(revoked_at, now())
    where id = p_id and accepted_at is null;
end;
$$;

-- TEC-03, INV-02, INV-03 : ajoute le compte à la liste et consomme le code.
-- Un code réservé à l'inscription (hook) reste acceptable par cette adresse.
create function public.accepter_invitation(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_invitation public.invitations;
begin
  if v_uid is null then
    raise exception 'non_authentifie' using errcode = '42501';
  end if;
  select lower(email) into v_email from auth.users where id = v_uid;

  select * into v_invitation from public.invitations
    where code = upper(btrim(p_code)) for update;
  if not found then
    raise exception 'invitation_inconnue' using errcode = 'P0002';
  end if;

  -- Rejeu ou double ouverture du lien : déjà membre, rien à faire.
  if exists (select 1 from public.list_members
             where list_id = v_invitation.list_id and user_id = v_uid) then
    return v_invitation.list_id;
  end if;

  if v_invitation.revoked_at is not null then
    raise exception 'invitation_revoquee' using errcode = '22023';
  end if;
  if v_invitation.accepted_at is not null
    or (v_invitation.used_at is not null and v_invitation.reserved_email is distinct from v_email) then
    raise exception 'invitation_utilisee' using errcode = '22023';
  end if;
  if v_invitation.used_at is null and v_invitation.expires_at <= now() then
    raise exception 'invitation_expiree' using errcode = '22023';
  end if;
  if exists (select 1 from public.list_removals
             where list_id = v_invitation.list_id and user_id = v_uid
               and removed_at >= v_invitation.created_at) then
    raise exception 'invitation_anterieure_au_retrait' using errcode = '22023';
  end if;

  update public.invitations
    set used_at = coalesce(used_at, now()), reserved_email = v_email, accepted_at = now()
    where id = v_invitation.id;
  insert into public.list_members (list_id, user_id) values (v_invitation.list_id, v_uid);
  delete from public.list_removals where list_id = v_invitation.list_id and user_id = v_uid;
  return v_invitation.list_id;
end;
$$;

-- INV-02 : à la première connexion, le compte rejoint les listes dont il a utilisé
-- le code pour s'inscrire, même s'il n'est pas revenu par le lien.
create function public.accepter_invitations_en_attente()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_invitation public.invitations;
begin
  select lower(email) into v_email from auth.users where id = v_uid;
  for v_invitation in
    select * from public.invitations
      where reserved_email = v_email
        and account_created_at is not null
        and accepted_at is null
        and revoked_at is null
      for update
  loop
    update public.invitations set accepted_at = now() where id = v_invitation.id;
    insert into public.list_members (list_id, user_id) values (v_invitation.list_id, v_uid)
      on conflict do nothing;
    return next v_invitation.list_id;
  end loop;
end;
$$;

revoke execute on function
  public.creer_liste(uuid, text, text),
  public.quitter_liste(uuid),
  public.retirer_membre(uuid, uuid),
  public.supprimer_liste(uuid, text),
  public.creer_invitation(uuid),
  public.revoquer_invitation(uuid),
  public.accepter_invitation(text),
  public.accepter_invitations_en_attente()
  from public, anon;
grant execute on function
  public.creer_liste(uuid, text, text),
  public.quitter_liste(uuid),
  public.retirer_membre(uuid, uuid),
  public.supprimer_liste(uuid, text),
  public.creer_invitation(uuid),
  public.revoquer_invitation(uuid),
  public.accepter_invitation(text),
  public.accepter_invitations_en_attente()
  to authenticated;

-- Création du profil : marque le code utilisé à l'inscription, et lui seul (ISC-05),
-- qu'il s'agisse d'une invitation à l'application ou à une liste.
create or replace function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(btrim(new.raw_user_meta_data ->> 'invitation_code'));
begin
  insert into public.profiles (id) values (new.id);
  update public.app_invitations
    set account_created_at = now()
    where code = v_code and reserved_email = lower(new.email) and account_created_at is null;
  update public.invitations
    set account_created_at = now()
    where code = v_code and reserved_email = lower(new.email)
      and account_created_at is null and accepted_at is null;
  return new;
end;
$$;

-- Hook « Before User Created » : accepte aussi les invitations à une liste (INV-02),
-- avec les mêmes règles de réservation (ISC-05) et de plafond (ISC-06).
create or replace function public.controle_inscription(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.app_settings;
  v_email text := lower(event -> 'user' ->> 'email');
  v_code text := upper(btrim(event -> 'user' -> 'user_metadata' ->> 'invitation_code'));
  v_app public.app_invitations;
  v_list public.invitations;
begin
  select * into v_settings from public.app_settings for update;

  -- Le hook peut être validé avant l'insertion du compte : les codes consommés
  -- depuis moins de 15 minutes sans compte créé comptent dans le plafond.
  if (select count(*) from auth.users)
     + (select count(*) from public.app_invitations i
        where i.used_at > now() - interval '15 minutes'
          and i.account_created_at is null)
     + (select count(*) from public.invitations i
        where i.used_at > now() - interval '15 minutes'
          and i.account_created_at is null
          and i.accepted_at is null)
     >= v_settings.account_cap then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'inscriptions_completes'));
  end if;

  if v_settings.signup_mode = 'ouvert' then
    return '{}'::jsonb;
  end if;

  if v_code is null or v_code = '' then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'inscription_sur_invitation'));
  end if;

  select * into v_app from public.app_invitations where code = v_code for update;
  if found then
    if v_app.revoked_at is not null
      or v_app.expires_at <= now()
      -- ISC-05 : un code consommé reste utilisable par l'adresse qui l'a réservé
      -- tant qu'aucun compte n'a été créé (nouvel essai après un échec).
      or (v_app.used_at is not null
          and (v_app.reserved_email is distinct from v_email
               or v_app.account_created_at is not null)) then
      return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'code_invalide'));
    end if;
    update public.app_invitations
      set used_at = now(), reserved_email = v_email
      where id = v_app.id;
    return '{}'::jsonb;
  end if;

  select * into v_list from public.invitations where code = v_code for update;
  if not found then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'code_invalide'));
  end if;
  -- INV-03 : le motif est précisé pour proposer de demander un nouveau lien.
  if v_list.revoked_at is not null then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'invitation_revoquee'));
  end if;
  if v_list.accepted_at is not null
    or (v_list.used_at is not null
        and (v_list.reserved_email is distinct from v_email
             or v_list.account_created_at is not null)) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'invitation_utilisee'));
  end if;
  if v_list.expires_at <= now() then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'invitation_expiree'));
  end if;
  update public.invitations
    set used_at = now(), reserved_email = v_email
    where id = v_list.id;
  return '{}'::jsonb;
end;
$$;

-- Libération des codes (ISC-05), étendue aux invitations à une liste non encore acceptées.
create or replace function public.liberer_inscriptions_non_confirmees()
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
  ),
  apps as (
    update public.app_invitations i
      set used_at = null, reserved_email = null, account_created_at = null
      where i.reserved_email in (select email from supprimes)
  )
  update public.invitations i
    set used_at = null, reserved_email = null, account_created_at = null
    where i.reserved_email in (select email from supprimes)
      and i.accepted_at is null;

  update public.app_invitations i
    set used_at = null, reserved_email = null
    where i.used_at < now() - interval '15 minutes'
      and i.account_created_at is null;

  update public.invitations i
    set used_at = null, reserved_email = null
    where i.used_at < now() - interval '15 minutes'
      and i.account_created_at is null
      and i.accepted_at is null;
end;
$$;
