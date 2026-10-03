-- NAV-06 : les listes sont classées par activité, la plus récente en premier.
-- L'activité d'une liste est sa dernière modification par un membre : création, nom ou
-- emoji, arrivée ou départ d'un membre. Les articles s'y ajouteront au lot 5.

alter table public.lists add column activity_at timestamptz not null default now();
create index lists_activity_at_idx on public.lists (activity_at desc);

-- Nom ou emoji modifié : la liste remonte. Le client ne peut pas écrire activity_at
-- (seuls name et emoji lui sont accordés en écriture).
create function public.marquer_activite_liste()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.activity_at := now();
  return new;
end;
$$;
revoke execute on function public.marquer_activite_liste() from public, anon, authenticated;

create trigger marquer_activite_liste before update of name, emoji on public.lists
  for each row execute function public.marquer_activite_liste();

-- Arrivée ou départ d'un membre. Lors de la suppression d'une liste, la cascade ne
-- trouve plus la liste : la mise à jour est sans effet.
create function public.marquer_activite_membres()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.lists set activity_at = now()
    where id = coalesce(new.list_id, old.list_id);
  return null;
end;
$$;
revoke execute on function public.marquer_activite_membres() from public, anon, authenticated;

create trigger marquer_activite_membres after insert or delete on public.list_members
  for each row execute function public.marquer_activite_membres();
