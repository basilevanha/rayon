-- Lot 6 : hors ligne et temps réel
-- COL-01, INV-04, OFF-04, OFF-05, LST-04, ART-08, SEC-01

-- COL-01 : les modifications d'une liste sont diffusées à ses membres par Realtime
-- Broadcast, sur des canaux privés : « list:<id> » pour les membres d'une liste,
-- « user:<id> » pour un compte. Pas de postgres_changes : Realtime n'y applique pas la RLS
-- aux suppressions, qui partiraient vers tous les comptes (SEC-01).

-- Un compte n'écoute que son propre canal et celui des listes dont il est membre.
create function public.peut_ecouter(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_topic = 'user:' || (select auth.uid())::text then true
    when p_topic ~ '^list:[0-9a-f-]{36}$' then public.est_membre(substr(p_topic, 6)::uuid)
    else false
  end;
$$;
revoke execute on function public.peut_ecouter(text) from public, anon;
grant execute on function public.peut_ecouter(text) to authenticated;

create policy "Un compte écoute ses canaux" on realtime.messages
  for select to authenticated
  using (extension = 'broadcast' and (select public.peut_ecouter(realtime.topic())));

-- Article créé ou modifié (y compris statut et suppression douce). Colonnes listées une
-- à une : une colonne ajoutée plus tard n'est pas diffusée sans le décider.
create function public.diffuser_article()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('id', new.id, 'list_id', new.list_id, 'name', new.name,
      'normalized_name', new.normalized_name, 'rayon_id', new.rayon_id, 'status', new.status,
      'status_by', new.status_by, 'quantity', new.quantity, 'updated_by', new.updated_by,
      'updated_at', new.updated_at, 'deleted_at', new.deleted_at),
    'article', 'list:' || new.list_id, true);
  return null;
end;
$$;
revoke execute on function public.diffuser_article() from public, anon, authenticated;
create trigger diffuser_article after insert or update on public.articles
  for each row execute function public.diffuser_article();

-- Nom, emoji ou activité d'une liste (NAV-06).
create function public.diffuser_liste()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('id', new.id, 'name', new.name, 'emoji', new.emoji,
      'activity_at', new.activity_at),
    'list', 'list:' || new.id, true);
  return null;
end;
$$;
revoke execute on function public.diffuser_liste() from public, anon, authenticated;
create trigger diffuser_liste after update on public.lists
  for each row execute function public.diffuser_liste();

-- Arrivée (INV-04) ou départ d'un membre. Le compte concerné est aussi prévenu sur son
-- canal : un membre retiré, ou dont la liste est supprimée, ne lit plus « list:<id> ».
create function public.diffuser_membre()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.list_members := coalesce(new, old);
  v_event text := case when tg_op = 'INSERT' then 'member_joined' else 'member_left' end;
  v_payload jsonb := jsonb_build_object('list_id', v_row.list_id, 'user_id', v_row.user_id);
begin
  perform realtime.send(v_payload, v_event, 'list:' || v_row.list_id, true);
  perform realtime.send(v_payload, v_event, 'user:' || v_row.user_id, true);
  return null;
end;
$$;
revoke execute on function public.diffuser_membre() from public, anon, authenticated;
create trigger diffuser_membre after insert or delete on public.list_members
  for each row execute function public.diffuser_membre();

-- OFF-05 : id d'une création fusionnée avec un article existant. Un rejeu tardif de la
-- même création renvoie l'article conservé sans le modifier à nouveau.
create table public.article_aliases (
  id uuid primary key,
  article_id uuid not null references public.articles (id) on delete cascade
);
create index article_aliases_article_id_idx on public.article_aliases (article_id);
-- Lue et écrite seulement par creer_article (security definer).
alter table public.article_aliases enable row level security;
revoke all on public.article_aliases from anon, authenticated;

-- OFF-04 : un retrait n'est appliqué que si l'appareil voyait l'article dans l'état où il
-- est encore. Refusé si un autre membre l'a mis au caddie depuis : faute de pouvoir
-- confirmer (COL-04), le retrait n'a pas lieu.
create function public.verifier_retrait(v_article public.articles, p_seen_status text)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_seen_status is not null
     and p_seen_status <> 'caddie'
     and v_article.status = 'caddie'
     and v_article.status_by is distinct from (select auth.uid()) then
    raise exception 'deja_au_caddie' using detail = coalesce(v_article.status_by::text, '');
  end if;
end;
$$;
revoke execute on function public.verifier_retrait(public.articles, text) from public, anon, authenticated;

-- COU-10, OFF-04. p_seen_status : statut vu par l'appareil au moment de l'action.
drop function public.set_status(uuid, text);
create function public.set_status(p_article_id uuid, p_status text, p_seen_status text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article public.articles;
begin
  if p_status is null or p_status not in ('catalogue', 'a_acheter', 'caddie') then
    raise exception 'statut_invalide' using errcode = '22023';
  end if;
  -- Un article d'une autre liste est « introuvable », comme un article inconnu.
  select * into v_article from public.articles
    where id = p_article_id and public.est_membre(list_id)
    for update;
  if not found or v_article.deleted_at is not null then
    raise exception 'article_introuvable' using errcode = 'P0002';
  end if;
  if v_article.status = p_status then
    return;
  end if;
  if p_status = 'catalogue' then
    perform public.verifier_retrait(v_article, p_seen_status);
  end if;
  update public.articles set
    status = p_status,
    status_by = (select auth.uid()),
    quantity = case when p_status = 'catalogue' then null else quantity end
  where id = p_article_id;
end;
$$;

-- ART-08, OFF-04 : suppression douce, idempotente (un rejeu ne fait rien).
create function public.supprimer_article(p_article_id uuid, p_seen_status text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article public.articles;
begin
  select * into v_article from public.articles
    where id = p_article_id and public.est_membre(list_id)
    for update;
  if not found then
    raise exception 'article_introuvable' using errcode = 'P0002';
  end if;
  if v_article.deleted_at is not null then
    return;
  end if;
  perform public.verifier_retrait(v_article, p_seen_status);
  update public.articles set deleted_at = now() where id = p_article_id;
end;
$$;

-- ART-03, ART-04, OFF-05 : comme avant, en mémorisant l'id d'une création fusionnée.
create or replace function public.creer_article(
  p_id uuid,
  p_list_id uuid,
  p_name text,
  p_rayon_id uuid,
  p_quantity integer default null
)
returns table (article_id uuid, merged boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := btrim(p_name);
  v_norm text := public.normaliser_nom(p_name);
  v_list_id uuid;
  v_existing_id uuid;
begin
  if v_uid is null or not public.est_membre(p_list_id) then
    raise exception 'non_membre' using errcode = '42501';
  end if;

  -- Deux créations simultanées du même nom, ou deux rejeux du même id, sont traités
  -- l'un après l'autre.
  perform pg_advisory_xact_lock(hashtext('article:' || p_list_id || ':' || v_norm));

  -- OFF-05 : rejeu d'une création déjà fusionnée.
  select a.article_id into v_existing_id
    from public.article_aliases a
    join public.articles ar on ar.id = a.article_id
    where a.id = p_id and ar.list_id = p_list_id;
  if found then
    return query select v_existing_id, true;
    return;
  end if;

  select list_id into v_list_id from public.articles where id = p_id;
  if found then
    if v_list_id = p_list_id then
      return query select p_id, false;
      return;
    end if;
    raise exception 'identifiant_invalide' using errcode = '23505';
  end if;

  for attempt in 1..2 loop
    select id into v_existing_id from public.articles
      where list_id = p_list_id and normalized_name = v_norm and deleted_at is null
      for update;
    if found then
      -- Sans changement réel, l'article n'est pas touché : ni auteur, ni horodatage,
      -- ni activité de la liste (COL-02, NAV-06).
      update public.articles set
        status = case when status = 'catalogue' then 'a_acheter' else status end,
        status_by = case when status = 'catalogue' then v_uid else status_by end,
        quantity = coalesce(p_quantity, quantity)
      where id = v_existing_id
        and (status = 'catalogue' or quantity is distinct from coalesce(p_quantity, quantity));
      insert into public.article_aliases (id, article_id) values (p_id, v_existing_id)
        on conflict (id) do nothing;
      return query select v_existing_id, true;
      return;
    end if;

    begin
      insert into public.articles (id, list_id, name, rayon_id, quantity, status, status_by)
        values (p_id, p_list_id, v_name, p_rayon_id, p_quantity, 'a_acheter', v_uid);
      return query select p_id, false;
      return;
    exception when unique_violation then
      -- Un renommage ou une annulation de suppression concurrents ont pris le nom :
      -- on repasse par la fusion.
      if attempt = 2 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

-- LST-04 : la copie réutilise les ids d'articles générés par l'appareil (affichage
-- immédiat hors ligne). p_source_article_ids[i] est copié sous p_article_ids[i] ; un
-- article de la source absent de ces tableaux (ajouté depuis) reçoit un nouvel id.
drop function public.copier_liste(uuid, uuid, text, text);
create function public.copier_liste(
  p_source_id uuid,
  p_id uuid,
  p_name text,
  p_emoji text,
  p_source_article_ids uuid[] default '{}',
  p_article_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Rejeu : creer_liste ne fait rien si l'appelant en est membre, et refuse sinon. Testé
  -- avant la source : une copie déjà faite ne bloque pas la file si la source est quittée.
  if exists (select 1 from public.lists where id = p_id) then
    perform public.creer_liste(p_id, p_name, p_emoji);
    return;
  end if;
  if not public.est_membre(p_source_id) then
    raise exception 'non_membre' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_source_article_ids), 0) <> coalesce(cardinality(p_article_ids), 0) then
    raise exception 'identifiants_incoherents' using errcode = '22023';
  end if;
  perform public.creer_liste(p_id, p_name, p_emoji);
  insert into public.articles (id, list_id, name, rayon_id, status)
    select coalesce(ids.new_id, gen_random_uuid()), p_id, a.name, a.rayon_id, 'catalogue'
    from public.articles a
    left join unnest(p_source_article_ids, p_article_ids) as ids (source_id, new_id)
      on ids.source_id = a.id
    where a.list_id = p_source_id and a.deleted_at is null;
end;
$$;

revoke execute on function
  public.set_status(uuid, text, text),
  public.supprimer_article(uuid, text),
  public.copier_liste(uuid, uuid, text, text, uuid[], uuid[])
  from public, anon;
grant execute on function
  public.set_status(uuid, text, text),
  public.supprimer_article(uuid, text),
  public.copier_liste(uuid, uuid, text, text, uuid[], uuid[])
  to authenticated;
