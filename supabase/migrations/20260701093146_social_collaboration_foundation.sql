create extension if not exists pg_trgm with schema extensions;

alter table public.profiles
add column if not exists username text;

alter table public.profiles
add constraint profiles_username_format
check (username is null or username ~ '^[A-Za-z0-9_]{3,30}$');

create unique index profiles_username_unique_idx
on public.profiles (lower(username))
where username is not null;

create index profiles_username_trgm_idx
on public.profiles using gin (username gin_trgm_ops)
where username is not null;

create index profiles_display_name_trgm_idx
on public.profiles using gin (display_name gin_trgm_ops)
where display_name is not null;

alter table public.recipes
add column if not exists visibility text not null default 'private';

alter table public.recipes
add constraint recipes_visibility_check
check (visibility in ('private', 'shared', 'public'));

alter table public.meal_plans
add column if not exists visibility text not null default 'private';

alter table public.meal_plans
add constraint meal_plans_visibility_check
check (visibility in ('private', 'shared', 'public'));

create unique index recipes_id_user_id_key
on public.recipes (id, user_id);

create index recipes_visibility_updated_at_idx
on public.recipes (visibility, updated_at desc)
where is_deleted = false;

create index meal_plans_visibility_date_idx
on public.meal_plans (visibility, planned_date);

create table public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index user_follows_following_id_created_at_idx
on public.user_follows (following_id, created_at desc);

create table public.recipe_shares (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'view' check (permission in ('view', 'edit')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, shared_with_user_id),
  check (owner_id <> shared_with_user_id),
  foreign key (recipe_id, owner_id) references public.recipes(id, user_id) on delete cascade
);

create index recipe_shares_shared_with_idx
on public.recipe_shares (shared_with_user_id, created_at desc);

create index recipe_shares_owner_idx
on public.recipe_shares (owner_id, recipe_id);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My shopping list' check (char_length(name) <= 120),
  visibility text not null default 'private' check (visibility in ('private', 'shared', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index shopping_lists_id_user_id_key
on public.shopping_lists (id, user_id);

create unique index shopping_lists_user_name_key
on public.shopping_lists (user_id, lower(name));

create index shopping_lists_user_updated_idx
on public.shopping_lists (user_id, updated_at desc);

create index shopping_lists_visibility_updated_idx
on public.shopping_lists (visibility, updated_at desc);

alter table public.shopping_items
add column if not exists list_id uuid;

insert into public.shopping_lists (user_id, name)
select distinct user_id, 'My shopping list'
from public.shopping_items
on conflict do nothing;

update public.shopping_items as item
set list_id = list.id
from public.shopping_lists as list
where item.list_id is null
  and item.user_id = list.user_id
  and list.name = 'My shopping list';

alter table public.shopping_items
add constraint shopping_items_list_owner_fk
foreign key (list_id, user_id) references public.shopping_lists(id, user_id) on delete cascade;

create index shopping_items_list_checked_idx
on public.shopping_items (list_id, is_checked, name);

create table public.shopping_list_shares (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'view' check (permission in ('view', 'edit')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (list_id, shared_with_user_id),
  check (owner_id <> shared_with_user_id),
  foreign key (list_id, owner_id) references public.shopping_lists(id, user_id) on delete cascade
);

create index shopping_list_shares_shared_with_idx
on public.shopping_list_shares (shared_with_user_id, created_at desc);

create index shopping_list_shares_owner_idx
on public.shopping_list_shares (owner_id, list_id);

create table public.recipe_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  visibility text not null default 'private' check (visibility in ('private', 'shared', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index recipe_collections_id_user_id_key
on public.recipe_collections (id, user_id);

create unique index recipe_collections_user_name_key
on public.recipe_collections (user_id, lower(name));

create index recipe_collections_visibility_updated_idx
on public.recipe_collections (visibility, updated_at desc);

create table public.collection_shares (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'view' check (permission in ('view', 'edit')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, shared_with_user_id),
  check (owner_id <> shared_with_user_id),
  foreign key (collection_id, owner_id) references public.recipe_collections(id, user_id) on delete cascade
);

create index collection_shares_shared_with_idx
on public.collection_shares (shared_with_user_id, created_at desc);

create index collection_shares_owner_idx
on public.collection_shares (owner_id, collection_id);

create table public.collection_recipes (
  collection_id uuid not null references public.recipe_collections(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, recipe_id),
  foreign key (collection_id, owner_id) references public.recipe_collections(id, user_id) on delete cascade
);

create index collection_recipes_recipe_id_idx
on public.collection_recipes (recipe_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  type text not null check (
    type in (
      'user_followed',
      'recipe_shared',
      'recipe_access_removed',
      'shopping_list_shared',
      'shopping_list_access_removed',
      'collection_shared',
      'collection_access_removed'
    )
  ),
  entity_type text not null check (entity_type in ('profile', 'recipe', 'shopping_list', 'collection')),
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
on public.notifications (user_id, created_at desc)
where read_at is null;

create index notifications_user_created_at_idx
on public.notifications (user_id, created_at desc);

create or replace function public.can_view_recipe(target_recipe_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.recipes as recipe
    where recipe.id = target_recipe_id
      and (
        recipe.user_id = (select auth.uid())
        or (
          recipe.is_deleted = false
          and (
            recipe.visibility = 'public'
            or (
              recipe.visibility = 'shared'
              and exists (
                select 1
                from public.recipe_shares as share
                where share.recipe_id = recipe.id
                  and share.shared_with_user_id = (select auth.uid())
              )
            )
          )
        )
      )
  );
$$;

create or replace function public.can_edit_recipe(target_recipe_id uuid, target_owner_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.recipes as recipe
    where recipe.id = target_recipe_id
      and recipe.user_id = target_owner_id
      and (
        recipe.user_id = (select auth.uid())
        or (
          recipe.visibility = 'shared'
          and exists (
            select 1
            from public.recipe_shares as share
            where share.recipe_id = recipe.id
              and share.owner_id = recipe.user_id
              and share.shared_with_user_id = (select auth.uid())
              and share.permission = 'edit'
          )
        )
      )
  );
$$;

create or replace function public.can_view_shopping_list(target_list_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.shopping_lists as list
    where list.id = target_list_id
      and (
        list.user_id = (select auth.uid())
        or list.visibility = 'public'
        or (
          list.visibility = 'shared'
          and exists (
            select 1
            from public.shopping_list_shares as share
            where share.list_id = list.id
              and share.shared_with_user_id = (select auth.uid())
          )
        )
      )
  );
$$;

create or replace function public.can_edit_shopping_list(target_list_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.shopping_lists as list
    where list.id = target_list_id
      and (
        list.user_id = (select auth.uid())
        or (
          list.visibility = 'shared'
          and exists (
            select 1
            from public.shopping_list_shares as share
            where share.list_id = list.id
              and share.owner_id = list.user_id
              and share.shared_with_user_id = (select auth.uid())
              and share.permission = 'edit'
          )
        )
      )
  );
$$;

create or replace function public.can_view_collection(target_collection_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.recipe_collections as collection
    where collection.id = target_collection_id
      and (
        collection.user_id = (select auth.uid())
        or collection.visibility = 'public'
        or (
          collection.visibility = 'shared'
          and exists (
            select 1
            from public.collection_shares as share
            where share.collection_id = collection.id
              and share.shared_with_user_id = (select auth.uid())
          )
        )
      )
  );
$$;

create or replace function public.can_manage_collection(target_collection_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.recipe_collections as collection
    where collection.id = target_collection_id
      and collection.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.can_view_recipe(uuid) from public;
revoke execute on function public.can_edit_recipe(uuid, uuid) from public;
revoke execute on function public.can_view_shopping_list(uuid) from public;
revoke execute on function public.can_edit_shopping_list(uuid) from public;
revoke execute on function public.can_view_collection(uuid) from public;
revoke execute on function public.can_manage_collection(uuid) from public;

grant execute on function public.can_view_recipe(uuid) to authenticated;
grant execute on function public.can_edit_recipe(uuid, uuid) to authenticated;
grant execute on function public.can_view_shopping_list(uuid) to authenticated;
grant execute on function public.can_edit_shopping_list(uuid) to authenticated;
grant execute on function public.can_view_collection(uuid) to authenticated;
grant execute on function public.can_manage_collection(uuid) to authenticated;

create trigger recipe_shares_set_updated_at
before update on public.recipe_shares
for each row execute function public.set_updated_at();

create trigger shopping_lists_set_updated_at
before update on public.shopping_lists
for each row execute function public.set_updated_at();

create trigger shopping_list_shares_set_updated_at
before update on public.shopping_list_shares
for each row execute function public.set_updated_at();

create trigger recipe_collections_set_updated_at
before update on public.recipe_collections
for each row execute function public.set_updated_at();

create trigger collection_shares_set_updated_at
before update on public.collection_shares
for each row execute function public.set_updated_at();

alter table public.user_follows enable row level security;
alter table public.recipe_shares enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_shares enable row level security;
alter table public.recipe_collections enable row level security;
alter table public.collection_shares enable row level security;
alter table public.collection_recipes enable row level security;
alter table public.notifications enable row level security;

grant usage on schema public to authenticated;

revoke all on table
  public.user_follows,
  public.recipe_shares,
  public.shopping_lists,
  public.shopping_list_shares,
  public.recipe_collections,
  public.collection_shares,
  public.collection_recipes,
  public.notifications
from anon;

grant select, insert, update, delete on table
  public.user_follows,
  public.recipe_shares,
  public.shopping_lists,
  public.shopping_list_shares,
  public.recipe_collections,
  public.collection_shares,
  public.collection_recipes,
  public.notifications
to authenticated;

drop policy if exists "profiles select own rows" on public.profiles;
drop policy if exists "profiles insert own rows" on public.profiles;
drop policy if exists "profiles update own rows" on public.profiles;
drop policy if exists "profiles delete own rows" on public.profiles;

create policy "profiles select authenticated rows"
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null);

create policy "profiles insert own rows"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id and id = user_id);

create policy "profiles update own rows"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and id = user_id);

create policy "profiles delete own rows"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "user follows select authenticated rows"
on public.user_follows
for select
to authenticated
using ((select auth.uid()) is not null);

create policy "user follows insert own follows"
on public.user_follows
for insert
to authenticated
with check ((select auth.uid()) = follower_id and follower_id <> following_id);

create policy "user follows delete own follows"
on public.user_follows
for delete
to authenticated
using ((select auth.uid()) = follower_id);

drop policy if exists "recipes select own rows" on public.recipes;
drop policy if exists "recipes insert own rows" on public.recipes;
drop policy if exists "recipes update own rows" on public.recipes;
drop policy if exists "recipes delete own rows" on public.recipes;

create policy "recipes select visible rows"
on public.recipes
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (
    user_id = (select auth.uid())
    or (
      is_deleted = false
      and (
        visibility = 'public'
        or (
          visibility = 'shared'
          and exists (
            select 1
            from public.recipe_shares as share
            where share.recipe_id = recipes.id
              and share.shared_with_user_id = (select auth.uid())
          )
        )
      )
    )
  )
);

create policy "recipes insert own rows"
on public.recipes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "recipes update owner or editor rows"
on public.recipes
for update
to authenticated
using (
  user_id = (select auth.uid())
  or (
    visibility = 'shared'
    and exists (
      select 1
      from public.recipe_shares as share
      where share.recipe_id = recipes.id
        and share.owner_id = recipes.user_id
        and share.shared_with_user_id = (select auth.uid())
        and share.permission = 'edit'
    )
  )
)
with check (
  user_id = (select auth.uid())
  or (
    visibility = 'shared'
    and exists (
      select 1
      from public.recipe_shares as share
      where share.recipe_id = recipes.id
        and share.owner_id = recipes.user_id
        and share.shared_with_user_id = (select auth.uid())
        and share.permission = 'edit'
    )
  )
);

create policy "recipes delete own rows"
on public.recipes
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "recipe ingredients select own rows" on public.recipe_ingredients;
drop policy if exists "recipe ingredients insert own rows" on public.recipe_ingredients;
drop policy if exists "recipe ingredients update own rows" on public.recipe_ingredients;
drop policy if exists "recipe ingredients delete own rows" on public.recipe_ingredients;

create policy "recipe ingredients select visible recipe rows"
on public.recipe_ingredients
for select
to authenticated
using (public.can_view_recipe(recipe_id));

create policy "recipe ingredients insert editable recipe rows"
on public.recipe_ingredients
for insert
to authenticated
with check (public.can_edit_recipe(recipe_id, user_id));

create policy "recipe ingredients update editable recipe rows"
on public.recipe_ingredients
for update
to authenticated
using (public.can_edit_recipe(recipe_id, user_id))
with check (public.can_edit_recipe(recipe_id, user_id));

create policy "recipe ingredients delete editable recipe rows"
on public.recipe_ingredients
for delete
to authenticated
using (public.can_edit_recipe(recipe_id, user_id));

drop policy if exists "recipe steps select own rows" on public.recipe_steps;
drop policy if exists "recipe steps insert own rows" on public.recipe_steps;
drop policy if exists "recipe steps update own rows" on public.recipe_steps;
drop policy if exists "recipe steps delete own rows" on public.recipe_steps;

create policy "recipe steps select visible recipe rows"
on public.recipe_steps
for select
to authenticated
using (public.can_view_recipe(recipe_id));

create policy "recipe steps insert editable recipe rows"
on public.recipe_steps
for insert
to authenticated
with check (public.can_edit_recipe(recipe_id, user_id));

create policy "recipe steps update editable recipe rows"
on public.recipe_steps
for update
to authenticated
using (public.can_edit_recipe(recipe_id, user_id))
with check (public.can_edit_recipe(recipe_id, user_id));

create policy "recipe steps delete editable recipe rows"
on public.recipe_steps
for delete
to authenticated
using (public.can_edit_recipe(recipe_id, user_id));

drop policy if exists "recipe notes select own rows" on public.recipe_notes;
drop policy if exists "recipe notes insert own rows" on public.recipe_notes;
drop policy if exists "recipe notes update own rows" on public.recipe_notes;
drop policy if exists "recipe notes delete own rows" on public.recipe_notes;

create policy "recipe notes select visible recipe rows"
on public.recipe_notes
for select
to authenticated
using (public.can_view_recipe(recipe_id));

create policy "recipe notes insert editable recipe rows"
on public.recipe_notes
for insert
to authenticated
with check (public.can_edit_recipe(recipe_id, user_id));

create policy "recipe notes update editable recipe rows"
on public.recipe_notes
for update
to authenticated
using (public.can_edit_recipe(recipe_id, user_id))
with check (public.can_edit_recipe(recipe_id, user_id));

create policy "recipe notes delete editable recipe rows"
on public.recipe_notes
for delete
to authenticated
using (public.can_edit_recipe(recipe_id, user_id));

drop policy if exists "recipe tags select own rows" on public.recipe_tags;
drop policy if exists "recipe tags insert own rows" on public.recipe_tags;
drop policy if exists "recipe tags update own rows" on public.recipe_tags;
drop policy if exists "recipe tags delete own rows" on public.recipe_tags;

create policy "recipe tags select visible recipe rows"
on public.recipe_tags
for select
to authenticated
using (public.can_view_recipe(recipe_id));

create policy "recipe tags insert editable recipe rows"
on public.recipe_tags
for insert
to authenticated
with check (public.can_edit_recipe(recipe_id, user_id));

create policy "recipe tags update editable recipe rows"
on public.recipe_tags
for update
to authenticated
using (public.can_edit_recipe(recipe_id, user_id))
with check (public.can_edit_recipe(recipe_id, user_id));

create policy "recipe tags delete editable recipe rows"
on public.recipe_tags
for delete
to authenticated
using (public.can_edit_recipe(recipe_id, user_id));

create policy "recipe shares select involved rows"
on public.recipe_shares
for select
to authenticated
using (owner_id = (select auth.uid()) or shared_with_user_id = (select auth.uid()));

create policy "recipe shares insert owner rows"
on public.recipe_shares
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and exists (
    select 1
    from public.recipes as recipe
    where recipe.id = recipe_shares.recipe_id
      and recipe.user_id = (select auth.uid())
  )
);

create policy "recipe shares update owner rows"
on public.recipe_shares
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and exists (
    select 1
    from public.recipes as recipe
    where recipe.id = recipe_shares.recipe_id
      and recipe.user_id = (select auth.uid())
  )
);

create policy "recipe shares delete owner rows"
on public.recipe_shares
for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "shopping lists select visible rows"
on public.shopping_lists
for select
to authenticated
using (
  user_id = (select auth.uid())
  or visibility = 'public'
  or (
    visibility = 'shared'
    and exists (
      select 1
      from public.shopping_list_shares as share
      where share.list_id = shopping_lists.id
        and share.shared_with_user_id = (select auth.uid())
    )
  )
);

create policy "shopping lists insert own rows"
on public.shopping_lists
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "shopping lists update own rows"
on public.shopping_lists
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "shopping lists delete own rows"
on public.shopping_lists
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "shopping items select own rows" on public.shopping_items;
drop policy if exists "shopping items insert own rows" on public.shopping_items;
drop policy if exists "shopping items update own rows" on public.shopping_items;
drop policy if exists "shopping items delete own rows" on public.shopping_items;

create policy "shopping items select visible list rows"
on public.shopping_items
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (list_id is not null and public.can_view_shopping_list(list_id))
);

create policy "shopping items insert editable list rows"
on public.shopping_items
for insert
to authenticated
with check (
  (
    (list_id is null and user_id = (select auth.uid()))
    or (
      list_id is not null
      and public.can_edit_shopping_list(list_id)
      and exists (
        select 1
        from public.shopping_lists as list
        where list.id = shopping_items.list_id
          and list.user_id = shopping_items.user_id
      )
    )
  )
  and (source_recipe_id is null or public.can_view_recipe(source_recipe_id))
);

create policy "shopping items update editable list rows"
on public.shopping_items
for update
to authenticated
using (
  user_id = (select auth.uid())
  or (list_id is not null and public.can_edit_shopping_list(list_id))
)
with check (
  (
    (list_id is null and user_id = (select auth.uid()))
    or (
      list_id is not null
      and public.can_edit_shopping_list(list_id)
      and exists (
        select 1
        from public.shopping_lists as list
        where list.id = shopping_items.list_id
          and list.user_id = shopping_items.user_id
      )
    )
  )
  and (source_recipe_id is null or public.can_view_recipe(source_recipe_id))
);

create policy "shopping items delete editable list rows"
on public.shopping_items
for delete
to authenticated
using (
  user_id = (select auth.uid())
  or (list_id is not null and public.can_edit_shopping_list(list_id))
);

create policy "shopping list shares select involved rows"
on public.shopping_list_shares
for select
to authenticated
using (owner_id = (select auth.uid()) or shared_with_user_id = (select auth.uid()));

create policy "shopping list shares insert owner rows"
on public.shopping_list_shares
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and exists (
    select 1
    from public.shopping_lists as list
    where list.id = shopping_list_shares.list_id
      and list.user_id = (select auth.uid())
  )
);

create policy "shopping list shares update owner rows"
on public.shopping_list_shares
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and exists (
    select 1
    from public.shopping_lists as list
    where list.id = shopping_list_shares.list_id
      and list.user_id = (select auth.uid())
  )
);

create policy "shopping list shares delete owner rows"
on public.shopping_list_shares
for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "recipe collections select visible rows"
on public.recipe_collections
for select
to authenticated
using (
  user_id = (select auth.uid())
  or visibility = 'public'
  or (
    visibility = 'shared'
    and exists (
      select 1
      from public.collection_shares as share
      where share.collection_id = recipe_collections.id
        and share.shared_with_user_id = (select auth.uid())
    )
  )
);

create policy "recipe collections insert own rows"
on public.recipe_collections
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "recipe collections update own rows"
on public.recipe_collections
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "recipe collections delete own rows"
on public.recipe_collections
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "collection shares select involved rows"
on public.collection_shares
for select
to authenticated
using (owner_id = (select auth.uid()) or shared_with_user_id = (select auth.uid()));

create policy "collection shares insert owner rows"
on public.collection_shares
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and exists (
    select 1
    from public.recipe_collections as collection
    where collection.id = collection_shares.collection_id
      and collection.user_id = (select auth.uid())
  )
);

create policy "collection shares update owner rows"
on public.collection_shares
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and owner_id <> shared_with_user_id
  and exists (
    select 1
    from public.recipe_collections as collection
    where collection.id = collection_shares.collection_id
      and collection.user_id = (select auth.uid())
  )
);

create policy "collection shares delete owner rows"
on public.collection_shares
for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "collection recipes select visible rows"
on public.collection_recipes
for select
to authenticated
using (public.can_view_collection(collection_id) and public.can_view_recipe(recipe_id));

create policy "collection recipes insert own collection rows"
on public.collection_recipes
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and public.can_manage_collection(collection_id)
  and exists (
    select 1
    from public.recipes as recipe
    where recipe.id = collection_recipes.recipe_id
      and recipe.user_id = (select auth.uid())
  )
);

create policy "collection recipes delete own collection rows"
on public.collection_recipes
for delete
to authenticated
using (owner_id = (select auth.uid()) and public.can_manage_collection(collection_id));

create policy "notifications select own rows"
on public.notifications
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "notifications update read state own rows"
on public.notifications
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.notify_user_followed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, actor_user_id, type, entity_type, entity_id)
  values (new.following_id, new.follower_id, 'user_followed', 'profile', new.follower_id);

  return new;
end;
$$;

create or replace function public.notify_recipe_share_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, actor_user_id, type, entity_type, entity_id, metadata)
  values (
    new.shared_with_user_id,
    new.owner_id,
    'recipe_shared',
    'recipe',
    new.recipe_id,
    jsonb_build_object('permission', new.permission)
  );

  return new;
end;
$$;

create or replace function public.notify_recipe_share_removed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from auth.users where id = old.shared_with_user_id) then
    insert into public.notifications (user_id, actor_user_id, type, entity_type, entity_id)
    values (old.shared_with_user_id, old.owner_id, 'recipe_access_removed', 'recipe', old.recipe_id);
  end if;

  return old;
end;
$$;

create or replace function public.notify_shopping_list_share_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, actor_user_id, type, entity_type, entity_id, metadata)
  values (
    new.shared_with_user_id,
    new.owner_id,
    'shopping_list_shared',
    'shopping_list',
    new.list_id,
    jsonb_build_object('permission', new.permission)
  );

  return new;
end;
$$;

create or replace function public.notify_shopping_list_share_removed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from auth.users where id = old.shared_with_user_id) then
    insert into public.notifications (user_id, actor_user_id, type, entity_type, entity_id)
    values (old.shared_with_user_id, old.owner_id, 'shopping_list_access_removed', 'shopping_list', old.list_id);
  end if;

  return old;
end;
$$;

create or replace function public.notify_collection_share_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, actor_user_id, type, entity_type, entity_id, metadata)
  values (
    new.shared_with_user_id,
    new.owner_id,
    'collection_shared',
    'collection',
    new.collection_id,
    jsonb_build_object('permission', new.permission)
  );

  return new;
end;
$$;

create or replace function public.notify_collection_share_removed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from auth.users where id = old.shared_with_user_id) then
    insert into public.notifications (user_id, actor_user_id, type, entity_type, entity_id)
    values (old.shared_with_user_id, old.owner_id, 'collection_access_removed', 'collection', old.collection_id);
  end if;

  return old;
end;
$$;

revoke execute on function public.notify_user_followed() from public;
revoke execute on function public.notify_recipe_share_created() from public;
revoke execute on function public.notify_recipe_share_removed() from public;
revoke execute on function public.notify_shopping_list_share_created() from public;
revoke execute on function public.notify_shopping_list_share_removed() from public;
revoke execute on function public.notify_collection_share_created() from public;
revoke execute on function public.notify_collection_share_removed() from public;

create trigger user_follows_notify_insert
after insert on public.user_follows
for each row execute function public.notify_user_followed();

create trigger recipe_shares_notify_insert
after insert on public.recipe_shares
for each row execute function public.notify_recipe_share_created();

create trigger recipe_shares_notify_delete
after delete on public.recipe_shares
for each row execute function public.notify_recipe_share_removed();

create trigger shopping_list_shares_notify_insert
after insert on public.shopping_list_shares
for each row execute function public.notify_shopping_list_share_created();

create trigger shopping_list_shares_notify_delete
after delete on public.shopping_list_shares
for each row execute function public.notify_shopping_list_share_removed();

create trigger collection_shares_notify_insert
after insert on public.collection_shares
for each row execute function public.notify_collection_share_created();

create trigger collection_shares_notify_delete
after delete on public.collection_shares
for each row execute function public.notify_collection_share_removed();

do $$
declare
  table_name text;
  realtime_tables text[] := array[
    'notifications',
    'user_follows',
    'recipes',
    'recipe_shares',
    'shopping_lists',
    'shopping_items',
    'shopping_list_shares',
    'recipe_collections',
    'collection_shares',
    'collection_recipes'
  ];
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array realtime_tables loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;
