-- Lot 5 : rayons et articles
-- RAY-01, RAY-02, ART-01 à ART-04, ART-08, REC-02, COU-10, COL-02, COL-04, OFF-05, LST-04,
-- NAV-06, TEC-01, TEC-03, SEC-01

-- REC-02 : même règle que src/lib/normalize.ts (cas partagés : normalize.cases.ts).
-- Minuscules, « œ » et « æ » développés, accents retirés, espaces réduits, puis « s » ou
-- « x » final retiré des mots d'au moins 4 lettres (lettres comptées avant ce retrait).
-- Limite : seules les plages usuelles de diacritiques sont retirées (le TS retire tous les
-- \p{M}), ce qui suffit aux écritures latines ; [[:alpha:]] suit la locale de la base.
create function public.normaliser_nom(p_name text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(string_agg(
    case
      when char_length(regexp_replace(word, '[^[:alpha:]]', '', 'g')) >= 4
        then regexp_replace(word, '[sx]$', '')
      else word
    end,
    ' ' order by position), '')
  from unnest(string_to_array(
    btrim(regexp_replace(
      regexp_replace(
        normalize(replace(replace(lower(p_name), 'œ', 'oe'), 'æ', 'ae'), nfd),
        '[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯]', '', 'g'),
      '\s+', ' ', 'g')),
    ' ')) with ordinality as words (word, position)
  where word <> '';
$$;

-- RAY-01 : liste fixe, commune à toute l'application. Données de référence, présentes
-- aussi en production : elles vivent dans la migration, pas dans seed.sql.
create table public.rayons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name = btrim(name) and char_length(name) between 1 and 40),
  reference_order integer not null unique,
  -- ADM-03 : « Autre » ne peut pas être supprimé.
  deletable boolean not null default true
);

-- Annexe §18 du SPEC.
insert into public.rayons (name, reference_order, deletable)
select name, ordinality * 10, name <> 'Autre'
from unnest(array[
  'Fruits et légumes',
  'Pommes de terre et oignons',
  'Fruits secs et noix',
  'Légumineuses',
  'Œufs',
  'Boulangerie',
  'Boucherie',
  'Poissonnerie',
  'Charcuterie et traiteur',
  'Fromages',
  'Produits laitiers',
  'Surgelés',
  'Pâtes, riz et féculents',
  'Conserves et plats préparés',
  'Sauces et condiments',
  'Épices',
  'Asie',
  'Monde',
  'Pâtes à tartiner et confitures',
  'Céréales et biscottes',
  'Café, thé et cacao',
  'Biscuits et gâteaux',
  'Confiserie et chocolat',
  'Chips et apéritif',
  'Farine et pâtisserie',
  'Eaux',
  'Jus et sodas',
  'Bières',
  'Vins et champagnes',
  'Alcools forts',
  'Hygiène et beauté',
  'Entretien et maison',
  'Ustensiles de cuisine',
  'Bébé',
  'Animaux',
  'Autre'
]) with ordinality as r (name, ordinality);

-- ART-01. L'id est généré par l'appareil (OFF-05). Le nom normalisé est calculé par la
-- base, jamais fourni par le client (TEC-01).
create table public.articles (
  id uuid primary key,
  list_id uuid not null references public.lists (id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
  normalized_name text not null generated always as (public.normaliser_nom(name)) stored,
  rayon_id uuid not null references public.rayons (id),
  status text not null default 'catalogue' check (status in ('catalogue', 'a_acheter', 'caddie')),
  -- COL-04 : auteur du dernier changement de statut, que les autres modifications ne touchent pas.
  status_by uuid references public.profiles (id) on delete set null,
  quantity integer check (quantity >= 1),
  created_at timestamptz not null default now(),
  -- COL-02 : auteur et horodatage serveur, fixés par trigger.
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- ART-02 : la quantité revient à vide au catalogue.
  constraint articles_quantite_hors_catalogue check (status <> 'catalogue' or quantity is null)
);
-- TEC-01
create unique index articles_list_id_normalized_name_idx
  on public.articles (list_id, normalized_name) where deleted_at is null;
create index articles_list_id_idx on public.articles (list_id);
create index articles_rayon_id_idx on public.articles (rayon_id);

-- COL-02 : le serveur fixe l'auteur et l'horodatage de chaque écriture.
-- ART-08 : la date de suppression est celle du serveur, et un article supprimé ne se
-- modifie plus ; seule l'annulation de la suppression reste possible.
create function public.horodater_article()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.deleted_at is not null and new.deleted_at is not null then
      raise exception 'article_introuvable' using errcode = 'P0002';
    end if;
    if old.deleted_at is null and new.deleted_at is not null then
      new.deleted_at := now();
    end if;
  end if;
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.horodater_article() from public, anon, authenticated;

create trigger horodater_article before insert or update on public.articles
  for each row execute function public.horodater_article();

-- NAV-06 : ajout, modification, changement de statut ou retrait d'un article.
create trigger marquer_activite_articles after insert or update on public.articles
  for each row execute function public.marquer_activite_membres();

-- RLS (SEC-01). Les rayons se lisent par tout compte connecté et ne s'écrivent qu'en
-- administration (ADM-03, lot 10). Les articles ne sont accessibles qu'aux membres :
-- la création passe par creer_article, le statut par set_status, la suppression est douce.
alter table public.rayons enable row level security;
alter table public.articles enable row level security;
revoke all on public.rayons, public.articles from anon, authenticated;
grant select on public.rayons to authenticated;
grant select, update (name, rayon_id, quantity, deleted_at) on public.articles to authenticated;

create policy "Un compte connecté lit les rayons" on public.rayons
  for select to authenticated
  using (true);

create policy "Un membre lit les articles de sa liste" on public.articles
  for select to authenticated
  using ((select public.est_membre(list_id)));

create policy "Un membre modifie les articles de sa liste" on public.articles
  for update to authenticated
  using ((select public.est_membre(list_id)))
  with check ((select public.est_membre(list_id)));

-- ART-03, ART-04, OFF-05. Idempotente : un rejeu de la même création ne fait rien.
-- Si un article de même nom normalisé existe, il est conservé : il passe à « à acheter »
-- s'il était au catalogue, reste dans le caddie s'il y était, et prend la quantité saisie
-- si elle est renseignée. Le rayon saisi est alors abandonné.
create function public.creer_article(
  p_id uuid,
  p_list_id uuid,
  p_name text,
  p_rayon_id uuid,
  p_quantity integer
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

-- COU-10 : fixe le statut, ne l'inverse jamais. Idempotente : un statut déjà en place
-- ne change rien, pas même status_by (COL-04). Le retour au catalogue vide la quantité (ART-02).
create function public.set_status(p_article_id uuid, p_status text)
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
  update public.articles set
    status = p_status,
    status_by = (select auth.uid()),
    quantity = case when p_status = 'catalogue' then null else quantity end
  where id = p_article_id;
end;
$$;

-- LST-04 : copie les articles non supprimés au catalogue, avec leur rayon, sans quantité
-- ni membres. Idempotente comme creer_liste.
create function public.copier_liste(p_source_id uuid, p_id uuid, p_name text, p_emoji text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_membre(p_source_id) then
    raise exception 'non_membre' using errcode = '42501';
  end if;
  -- Rejeu : creer_liste ne fait rien si l'appelant en est membre, et refuse sinon.
  if exists (select 1 from public.lists where id = p_id) then
    perform public.creer_liste(p_id, p_name, p_emoji);
    return;
  end if;
  perform public.creer_liste(p_id, p_name, p_emoji);
  insert into public.articles (id, list_id, name, rayon_id, status)
    select gen_random_uuid(), p_id, name, rayon_id, 'catalogue'
    from public.articles
    where list_id = p_source_id and deleted_at is null;
end;
$$;

revoke execute on function
  public.creer_article(uuid, uuid, text, uuid, integer),
  public.set_status(uuid, text),
  public.copier_liste(uuid, uuid, text, text)
  from public, anon;
grant execute on function
  public.creer_article(uuid, uuid, text, uuid, integer),
  public.set_status(uuid, text),
  public.copier_liste(uuid, uuid, text, text)
  to authenticated;
