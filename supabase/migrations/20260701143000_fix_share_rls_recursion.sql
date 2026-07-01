create or replace function public.owns_recipe(target_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.recipes
    where id = target_recipe_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_shopping_list(target_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shopping_lists
    where id = target_list_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_collection(target_collection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.recipe_collections
    where id = target_collection_id
      and user_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_recipe(uuid) from public;
revoke execute on function public.owns_shopping_list(uuid) from public;
revoke execute on function public.owns_collection(uuid) from public;

grant execute on function public.owns_recipe(uuid) to authenticated;
grant execute on function public.owns_shopping_list(uuid) to authenticated;
grant execute on function public.owns_collection(uuid) to authenticated;

drop policy if exists "recipe shares insert owner rows" on public.recipe_shares;
drop policy if exists "recipe shares update owner rows" on public.recipe_shares;

create policy "recipe shares insert owner rows"
on public.recipe_shares
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and public.owns_recipe(recipe_id)
);

create policy "recipe shares update owner rows"
on public.recipe_shares
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and public.owns_recipe(recipe_id)
);

drop policy if exists "shopping list shares insert owner rows" on public.shopping_list_shares;
drop policy if exists "shopping list shares update owner rows" on public.shopping_list_shares;

create policy "shopping list shares insert owner rows"
on public.shopping_list_shares
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and public.owns_shopping_list(list_id)
);

create policy "shopping list shares update owner rows"
on public.shopping_list_shares
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and public.owns_shopping_list(list_id)
);

drop policy if exists "collection shares insert owner rows" on public.collection_shares;
drop policy if exists "collection shares update owner rows" on public.collection_shares;

create policy "collection shares insert owner rows"
on public.collection_shares
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and public.owns_collection(collection_id)
);

create policy "collection shares update owner rows"
on public.collection_shares
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and public.owns_collection(collection_id)
);
