-- Lot 7 : magasins, ordre des rayons, rangements et vue sélectionnée
-- MAG-01, MAG-04, MAG-05, DIS-01, DIS-02, RNG-01, RNG-02, ART-07, PRE-11, LST-04, TEC-03, SEC-01

-- MAG-01 : un magasin n'est qu'un nom en V1, unique une fois normalisé (REC-02). L'id est
-- généré par l'appareil, pour qu'un rejeu de la création ne crée pas de doublon.
create table public.stores (
  id uuid primary key,
  -- Ni caractère de contrôle, ni caractère invisible (espace de largeur nulle, sens
  -- d'écriture) : un nom ne doit pas imiter celui d'un autre magasin (MAG-04).
  name text not null check (
    name = btrim(name) and char_length(name) between 1 and 60
    and name !~ '[[:cntrl:]\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]'
  ),
  normalized_name text not null generated always as (public.normaliser_nom(name)) stored,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index stores_normalized_name_idx on public.stores (normalized_name);
create index stores_created_by_idx on public.stores (created_by);

-- DIS-01 : ordre des rayons d'un magasin, commun à tous. Sans ligne pour un magasin, c'est
-- l'ordre de référence. Un rayon absent (ajouté depuis, ADM-03) se place selon TEC-02.
create table public.store_rayon_orders (
  store_id uuid not null references public.stores (id) on delete cascade,
  rayon_id uuid not null references public.rayons (id) on delete cascade,
  position integer not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (store_id, rayon_id)
);
create index store_rayon_orders_rayon_id_idx on public.store_rayon_orders (rayon_id);
create index store_rayon_orders_updated_by_idx on public.store_rayon_orders (updated_by);

-- RNG-01 : rayon d'un article dans un magasin, quand il diffère de son rayon. Propre à la
-- liste, partagé par ses membres.
-- La clé (article_id, list_id) garantit qu'un rangement appartient à la liste de son article.
alter table public.articles add constraint articles_id_list_id_key unique (id, list_id);
create table public.article_store_rayons (
  article_id uuid not null,
  store_id uuid not null references public.stores (id) on delete cascade,
  list_id uuid not null references public.lists (id) on delete cascade,
  rayon_id uuid not null references public.rayons (id),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (article_id, store_id),
  foreign key (article_id, list_id) references public.articles (id, list_id) on delete cascade
);
create index article_store_rayons_list_id_idx on public.article_store_rayons (list_id);
create index article_store_rayons_store_id_idx on public.article_store_rayons (store_id);
create index article_store_rayons_rayon_id_idx on public.article_store_rayons (rayon_id);
create index article_store_rayons_updated_by_idx on public.article_store_rayons (updated_by);

-- PRE-11 : vue sélectionnée par compte et par liste. store_id vide : « Défaut ».
create table public.list_views (
  user_id uuid not null references public.profiles (id) on delete cascade,
  list_id uuid not null references public.lists (id) on delete cascade,
  store_id uuid references public.stores (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, list_id)
);
create index list_views_list_id_idx on public.list_views (list_id);
create index list_views_store_id_idx on public.list_views (store_id);

-- RLS (SEC-01). Magasins et ordres : lus par tout compte connecté, écrits seulement par
-- creer_magasin et ordonner_rayons. Rangements : lus par les membres de la liste, écrits
-- par ranger_article. Vue : lue par son compte seul, écrite par choisir_vue.
alter table public.stores enable row level security;
alter table public.store_rayon_orders enable row level security;
alter table public.article_store_rayons enable row level security;
alter table public.list_views enable row level security;
revoke all on public.stores, public.store_rayon_orders, public.article_store_rayons, public.list_views
  from anon, authenticated;
-- Les auteurs des magasins et des ordres ne sont pas exposés à tous les comptes.
grant select (id, name, normalized_name, created_at) on public.stores to authenticated;
grant select (store_id, rayon_id, position, updated_at) on public.store_rayon_orders to authenticated;
grant select on public.article_store_rayons, public.list_views to authenticated;

create policy "Un compte connecté lit les magasins" on public.stores
  for select to authenticated
  using (true);

create policy "Un compte connecté lit l'ordre des magasins" on public.store_rayon_orders
  for select to authenticated
  using (true);

create policy "Un membre lit les rangements de sa liste" on public.article_store_rayons
  for select to authenticated
  using ((select public.est_membre(list_id)));

create policy "Un compte lit ses vues" on public.list_views
  for select to authenticated
  using (user_id = (select auth.uid()));

-- MAG-04, MAG-05. Rejouable : une création déjà faite par l'appelant ne fait rien. Un nom
-- déjà pris (après normalisation) est refusé. L'ordre de départ est celui du magasin
-- source, ou l'ordre de référence sans source.
create function public.creer_magasin(p_id uuid, p_name text, p_source_store_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_created_by uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'non_connecte' using errcode = '42501';
  end if;
  select created_by into v_created_by from public.stores where id = p_id;
  if found then
    if v_created_by is distinct from (select auth.uid()) then
      raise exception 'identifiant_invalide' using errcode = '23505';
    end if;
    return;
  end if;
  if p_source_store_id is not null
    and not exists (select 1 from public.stores where id = p_source_store_id) then
    raise exception 'magasin_introuvable' using errcode = 'P0002';
  end if;
  begin
    insert into public.stores (id, name, created_by) values (p_id, btrim(p_name), (select auth.uid()))
      on conflict (id) do nothing;
  exception when unique_violation then
    raise exception 'nom_existant' using errcode = '23505';
  end;
  -- Deux rejeux simultanés : le second trouve le magasin créé par le premier.
  if not found then
    select created_by into v_created_by from public.stores where id = p_id;
    if v_created_by is distinct from (select auth.uid()) then
      raise exception 'identifiant_invalide' using errcode = '23505';
    end if;
    return;
  end if;
  insert into public.store_rayon_orders (store_id, rayon_id, position, updated_by)
    select p_id, rayon_id, position, (select auth.uid())
    from public.store_rayon_orders
    where store_id = p_source_store_id;
end;
$$;

-- DIS-02 : remplace l'ordre entier du magasin, d'un bloc. Deux réordonnancements
-- simultanés s'appliquent l'un après l'autre : le dernier l'emporte (COL-02).
create function public.ordonner_rayons(p_store_id uuid, p_rayon_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'non_connecte' using errcode = '42501';
  end if;
  perform 1 from public.stores where id = p_store_id for update;
  if not found then
    raise exception 'magasin_introuvable' using errcode = 'P0002';
  end if;
  -- DIS-01 : tous les rayons figurent dans l'ordre d'un magasin.
  if coalesce(cardinality(p_rayon_ids), 0) <> (select count(*) from public.rayons)
    or (select count(distinct r) from unnest(p_rayon_ids) as r) <> cardinality(p_rayon_ids)
    or exists (
      select 1 from unnest(p_rayon_ids) as r
      where not exists (select 1 from public.rayons where id = r)
    ) then
    raise exception 'ordre_invalide' using errcode = '22023';
  end if;
  delete from public.store_rayon_orders where store_id = p_store_id;
  insert into public.store_rayon_orders (store_id, rayon_id, position, updated_by)
    select p_store_id, r.id, r.position, (select auth.uid())
    from unnest(p_rayon_ids) with ordinality as r (id, position);
end;
$$;

-- ART-07, RNG-02. Avec p_partout, le rayon de l'article change et ses rangements sont
-- effacés. Sinon, son rangement dans le magasin change ; un rangement identique à son
-- rayon est supprimé. Idempotente : un rangement déjà en place ne change rien.
create function public.ranger_article(
  p_article_id uuid,
  p_store_id uuid,
  p_rayon_id uuid,
  p_partout boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article public.articles;
begin
  select * into v_article from public.articles
    where id = p_article_id and deleted_at is null and public.est_membre(list_id)
    for update;
  if not found then
    raise exception 'article_introuvable' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.rayons where id = p_rayon_id) then
    raise exception 'rayon_introuvable' using errcode = 'P0002';
  end if;

  if p_partout then
    delete from public.article_store_rayons where article_id = p_article_id;
    if v_article.rayon_id <> p_rayon_id then
      update public.articles set rayon_id = p_rayon_id where id = p_article_id;
    end if;
    return;
  end if;

  if p_store_id is null or not exists (select 1 from public.stores where id = p_store_id) then
    raise exception 'magasin_introuvable' using errcode = 'P0002';
  end if;
  if p_rayon_id = v_article.rayon_id then
    delete from public.article_store_rayons where article_id = p_article_id and store_id = p_store_id;
  else
    insert into public.article_store_rayons (article_id, store_id, list_id, rayon_id, updated_by)
      values (p_article_id, p_store_id, v_article.list_id, p_rayon_id, (select auth.uid()))
      on conflict (article_id, store_id) do update
        set rayon_id = excluded.rayon_id, updated_by = excluded.updated_by, updated_at = now()
        where public.article_store_rayons.rayon_id <> excluded.rayon_id;
  end if;
end;
$$;

-- PRE-11 : la vue choisie pour une liste. updated_at désigne la dernière vue choisie.
create function public.choisir_vue(p_list_id uuid, p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_membre(p_list_id) then
    raise exception 'non_membre' using errcode = '42501';
  end if;
  if p_store_id is not null and not exists (select 1 from public.stores where id = p_store_id) then
    raise exception 'magasin_introuvable' using errcode = 'P0002';
  end if;
  insert into public.list_views (user_id, list_id, store_id)
    values ((select auth.uid()), p_list_id, p_store_id)
    on conflict (user_id, list_id) do update
      set store_id = excluded.store_id, updated_at = now();
end;
$$;

revoke execute on function
  public.creer_magasin(uuid, text, uuid),
  public.ordonner_rayons(uuid, uuid[]),
  public.ranger_article(uuid, uuid, uuid, boolean),
  public.choisir_vue(uuid, uuid)
  from public, anon;
grant execute on function
  public.creer_magasin(uuid, text, uuid),
  public.ordonner_rayons(uuid, uuid[]),
  public.ranger_article(uuid, uuid, uuid, boolean),
  public.choisir_vue(uuid, uuid)
  to authenticated;

-- RNG-02 : quand le rayon d'un article change, un rangement devenu identique disparaît.
create function public.nettoyer_rangements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.article_store_rayons where article_id = new.id and rayon_id = new.rayon_id;
  return null;
end;
$$;
revoke execute on function public.nettoyer_rangements() from public, anon, authenticated;

create trigger nettoyer_rangements after update of rayon_id on public.articles
  for each row when (old.rayon_id is distinct from new.rayon_id)
  execute function public.nettoyer_rangements();

-- NAV-06 : un rangement modifie la liste, comme un changement de rayon.
create trigger marquer_activite_rangements after insert or update or delete on public.article_store_rayons
  for each row execute function public.marquer_activite_membres();

-- COL-01 : rangement créé, modifié ou supprimé (rayon_id vide), diffusé aux membres.
create function public.diffuser_rangement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.article_store_rayons := coalesce(new, old);
begin
  perform realtime.send(
    jsonb_build_object('article_id', v_row.article_id, 'store_id', v_row.store_id,
      'list_id', v_row.list_id,
      'rayon_id', case when tg_op = 'DELETE' then null else v_row.rayon_id end,
      'updated_by', case when tg_op = 'DELETE' then (select auth.uid()) else v_row.updated_by end,
      'updated_at', case when tg_op = 'DELETE' then now() else v_row.updated_at end),
    'placement', 'list:' || v_row.list_id, true);
  return null;
end;
$$;
revoke execute on function public.diffuser_rangement() from public, anon, authenticated;
create trigger diffuser_rangement after insert or update or delete on public.article_store_rayons
  for each row execute function public.diffuser_rangement();

-- LST-04 : la copie reprend aussi les rangements des articles copiés.
create or replace function public.copier_liste(
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
  -- Les ids sont tirés une seule fois (CTE matérialisée), pour copier les rangements.
  with copies as materialized (
    select a.id as source_id, coalesce(ids.new_id, gen_random_uuid()) as new_id, a.name, a.rayon_id
    from public.articles a
    left join unnest(p_source_article_ids, p_article_ids) as ids (source_id, new_id)
      on ids.source_id = a.id
    where a.list_id = p_source_id and a.deleted_at is null
  ), articles_copies as (
    insert into public.articles (id, list_id, name, rayon_id, status)
      select new_id, p_id, name, rayon_id, 'catalogue' from copies
  )
  insert into public.article_store_rayons (article_id, store_id, list_id, rayon_id, updated_by)
    select c.new_id, r.store_id, p_id, r.rayon_id, (select auth.uid())
    from copies c
    join public.article_store_rayons r on r.article_id = c.source_id;
end;
$$;
