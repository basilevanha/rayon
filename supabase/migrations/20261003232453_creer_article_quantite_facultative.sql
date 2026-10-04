-- Lot 5c : la quantité de creer_article est facultative (ART-01), pour que les types
-- générés l'acceptent vide. Corps inchangé.

-- ART-03, ART-04, OFF-05. Idempotente : un rejeu de la même création ne fait rien.
-- Si un article de même nom normalisé existe, il est conservé : il passe à « à acheter »
-- s'il était au catalogue, reste dans le caddie s'il y était, et prend la quantité saisie
-- si elle est renseignée. Le rayon saisi est alors abandonné.
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
