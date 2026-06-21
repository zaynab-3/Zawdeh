create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  preferred_language text not null default 'en',
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 180),
  description text check (description is null or char_length(description) <= 2000),
  original_language text,
  saved_language text not null default 'en',
  source_type text not null default 'manual',
  source_platform text,
  source_url text,
  cuisine text,
  meal_type text,
  method text,
  servings numeric,
  prep_time_minutes integer check (prep_time_minutes is null or prep_time_minutes >= 0),
  cook_time_minutes integer check (cook_time_minutes is null or cook_time_minutes >= 0),
  is_favorite boolean not null default false,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position > 0),
  name text not null check (char_length(name) <= 160),
  quantity text check (quantity is null or char_length(quantity) <= 80),
  unit text check (unit is null or char_length(unit) <= 80),
  note text check (note is null or char_length(note) <= 500),
  role text,
  is_optional boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position > 0),
  instruction text not null check (char_length(instruction) <= 4000),
  timer_minutes integer check (timer_minutes is null or timer_minutes >= 0),
  created_at timestamptz not null default now()
);

create table public.recipe_notes (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null check (char_length(note) <= 4000),
  created_at timestamptz not null default now()
);

create table public.recipe_tags (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tag text not null check (char_length(tag) <= 80),
  created_at timestamptz not null default now()
);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 160),
  quantity text check (quantity is null or char_length(quantity) <= 80),
  unit text check (unit is null or char_length(unit) <= 80),
  category text,
  is_available boolean not null default true,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.favorite_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 160),
  category text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 160),
  quantity text check (quantity is null or char_length(quantity) <= 80),
  unit text check (unit is null or char_length(unit) <= 80),
  category text,
  source_recipe_id uuid references public.recipes(id) on delete set null,
  source_type text not null default 'manual',
  is_checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_date date not null,
  meal_slot text not null check (meal_slot in ('Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert')),
  recipe_id uuid references public.recipes(id) on delete set null,
  custom_title text check (custom_title is null or char_length(custom_title) <= 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cook_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'finished', 'abandoned')),
  current_step integer not null default 1 check (current_step > 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cook_session_notes (
  id uuid primary key default gen_random_uuid(),
  cook_session_id uuid not null references public.cook_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null check (char_length(note) <= 4000),
  created_at timestamptz not null default now()
);

create table public.recipe_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text,
  source_platform text,
  source_url text,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed', 'saved')),
  confidence text check (confidence is null or confidence in ('low', 'medium', 'high')),
  error_code text,
  created_recipe_id uuid references public.recipes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  action_date date not null default current_date,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, action, action_date)
);

create index recipes_user_id_created_at_idx on public.recipes (user_id, created_at desc);
create index recipes_user_id_favorite_idx on public.recipes (user_id, is_favorite) where is_deleted = false;
create index recipe_ingredients_recipe_id_position_idx on public.recipe_ingredients (recipe_id, position);
create index recipe_steps_recipe_id_position_idx on public.recipe_steps (recipe_id, position);
create index recipe_notes_recipe_id_created_at_idx on public.recipe_notes (recipe_id, created_at desc);
create index recipe_tags_recipe_id_idx on public.recipe_tags (recipe_id);
create unique index recipe_tags_user_recipe_tag_key on public.recipe_tags (user_id, recipe_id, lower(tag));
create index pantry_items_user_id_name_idx on public.pantry_items (user_id, lower(name));
create index favorite_ingredients_user_id_name_idx on public.favorite_ingredients (user_id, lower(name));
create index shopping_items_user_id_checked_idx on public.shopping_items (user_id, is_checked);
create index meal_plans_user_id_date_idx on public.meal_plans (user_id, planned_date);
create unique index meal_plans_user_date_slot_key on public.meal_plans (user_id, planned_date, meal_slot);
create index cook_sessions_user_id_recipe_idx on public.cook_sessions (user_id, recipe_id);
create index recipe_imports_user_id_created_at_idx on public.recipe_imports (user_id, created_at desc);
create index user_rate_limits_user_action_date_idx on public.user_rate_limits (user_id, action, action_date);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger recipes_set_updated_at before update on public.recipes for each row execute function public.set_updated_at();
create trigger pantry_items_set_updated_at before update on public.pantry_items for each row execute function public.set_updated_at();
create trigger shopping_items_set_updated_at before update on public.shopping_items for each row execute function public.set_updated_at();
create trigger meal_plans_set_updated_at before update on public.meal_plans for each row execute function public.set_updated_at();
create trigger cook_sessions_set_updated_at before update on public.cook_sessions for each row execute function public.set_updated_at();
create trigger recipe_imports_set_updated_at before update on public.recipe_imports for each row execute function public.set_updated_at();
create trigger user_rate_limits_set_updated_at before update on public.user_rate_limits for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_notes enable row level security;
alter table public.recipe_tags enable row level security;
alter table public.pantry_items enable row level security;
alter table public.favorite_ingredients enable row level security;
alter table public.shopping_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.cook_sessions enable row level security;
alter table public.cook_session_notes enable row level security;
alter table public.recipe_imports enable row level security;
alter table public.user_rate_limits enable row level security;

grant usage on schema public to authenticated;

revoke all on table
  public.profiles,
  public.recipes,
  public.recipe_ingredients,
  public.recipe_steps,
  public.recipe_notes,
  public.recipe_tags,
  public.pantry_items,
  public.favorite_ingredients,
  public.shopping_items,
  public.meal_plans,
  public.cook_sessions,
  public.cook_session_notes,
  public.recipe_imports,
  public.user_rate_limits
from anon;

grant select, insert, update, delete on table
  public.profiles,
  public.recipes,
  public.recipe_ingredients,
  public.recipe_steps,
  public.recipe_notes,
  public.recipe_tags,
  public.pantry_items,
  public.favorite_ingredients,
  public.shopping_items,
  public.meal_plans,
  public.cook_sessions,
  public.cook_session_notes,
  public.recipe_imports,
  public.user_rate_limits
to authenticated;

create policy "profiles select own rows" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles insert own rows" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles update own rows" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles delete own rows" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy "recipes select own rows" on public.recipes for select to authenticated using ((select auth.uid()) = user_id);
create policy "recipes insert own rows" on public.recipes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "recipes update own rows" on public.recipes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "recipes delete own rows" on public.recipes for delete to authenticated using ((select auth.uid()) = user_id);

create policy "recipe ingredients select own rows" on public.recipe_ingredients for select to authenticated using ((select auth.uid()) = user_id);
create policy "recipe ingredients insert own rows" on public.recipe_ingredients for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.recipes where recipes.id = recipe_ingredients.recipe_id and recipes.user_id = (select auth.uid())));
create policy "recipe ingredients update own rows" on public.recipe_ingredients for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.recipes where recipes.id = recipe_ingredients.recipe_id and recipes.user_id = (select auth.uid())));
create policy "recipe ingredients delete own rows" on public.recipe_ingredients for delete to authenticated using ((select auth.uid()) = user_id);

create policy "recipe steps select own rows" on public.recipe_steps for select to authenticated using ((select auth.uid()) = user_id);
create policy "recipe steps insert own rows" on public.recipe_steps for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.recipes where recipes.id = recipe_steps.recipe_id and recipes.user_id = (select auth.uid())));
create policy "recipe steps update own rows" on public.recipe_steps for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.recipes where recipes.id = recipe_steps.recipe_id and recipes.user_id = (select auth.uid())));
create policy "recipe steps delete own rows" on public.recipe_steps for delete to authenticated using ((select auth.uid()) = user_id);

create policy "recipe notes select own rows" on public.recipe_notes for select to authenticated using ((select auth.uid()) = user_id);
create policy "recipe notes insert own rows" on public.recipe_notes for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.recipes where recipes.id = recipe_notes.recipe_id and recipes.user_id = (select auth.uid())));
create policy "recipe notes update own rows" on public.recipe_notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.recipes where recipes.id = recipe_notes.recipe_id and recipes.user_id = (select auth.uid())));
create policy "recipe notes delete own rows" on public.recipe_notes for delete to authenticated using ((select auth.uid()) = user_id);

create policy "recipe tags select own rows" on public.recipe_tags for select to authenticated using ((select auth.uid()) = user_id);
create policy "recipe tags insert own rows" on public.recipe_tags for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.recipes where recipes.id = recipe_tags.recipe_id and recipes.user_id = (select auth.uid())));
create policy "recipe tags update own rows" on public.recipe_tags for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.recipes where recipes.id = recipe_tags.recipe_id and recipes.user_id = (select auth.uid())));
create policy "recipe tags delete own rows" on public.recipe_tags for delete to authenticated using ((select auth.uid()) = user_id);

create policy "pantry items select own rows" on public.pantry_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "pantry items insert own rows" on public.pantry_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "pantry items update own rows" on public.pantry_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "pantry items delete own rows" on public.pantry_items for delete to authenticated using ((select auth.uid()) = user_id);

create policy "favorite ingredients select own rows" on public.favorite_ingredients for select to authenticated using ((select auth.uid()) = user_id);
create policy "favorite ingredients insert own rows" on public.favorite_ingredients for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "favorite ingredients update own rows" on public.favorite_ingredients for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "favorite ingredients delete own rows" on public.favorite_ingredients for delete to authenticated using ((select auth.uid()) = user_id);

create policy "shopping items select own rows" on public.shopping_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "shopping items insert own rows" on public.shopping_items for insert to authenticated with check ((select auth.uid()) = user_id and (source_recipe_id is null or exists (select 1 from public.recipes where recipes.id = shopping_items.source_recipe_id and recipes.user_id = (select auth.uid()))));
create policy "shopping items update own rows" on public.shopping_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and (source_recipe_id is null or exists (select 1 from public.recipes where recipes.id = shopping_items.source_recipe_id and recipes.user_id = (select auth.uid()))));
create policy "shopping items delete own rows" on public.shopping_items for delete to authenticated using ((select auth.uid()) = user_id);

create policy "meal plans select own rows" on public.meal_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "meal plans insert own rows" on public.meal_plans for insert to authenticated with check ((select auth.uid()) = user_id and (recipe_id is null or exists (select 1 from public.recipes where recipes.id = meal_plans.recipe_id and recipes.user_id = (select auth.uid()))));
create policy "meal plans update own rows" on public.meal_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and (recipe_id is null or exists (select 1 from public.recipes where recipes.id = meal_plans.recipe_id and recipes.user_id = (select auth.uid()))));
create policy "meal plans delete own rows" on public.meal_plans for delete to authenticated using ((select auth.uid()) = user_id);

create policy "cook sessions select own rows" on public.cook_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "cook sessions insert own rows" on public.cook_sessions for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.recipes where recipes.id = cook_sessions.recipe_id and recipes.user_id = (select auth.uid())));
create policy "cook sessions update own rows" on public.cook_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.recipes where recipes.id = cook_sessions.recipe_id and recipes.user_id = (select auth.uid())));
create policy "cook sessions delete own rows" on public.cook_sessions for delete to authenticated using ((select auth.uid()) = user_id);

create policy "cook session notes select own rows" on public.cook_session_notes for select to authenticated using ((select auth.uid()) = user_id);
create policy "cook session notes insert own rows" on public.cook_session_notes for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.cook_sessions where cook_sessions.id = cook_session_notes.cook_session_id and cook_sessions.user_id = (select auth.uid())));
create policy "cook session notes update own rows" on public.cook_session_notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.cook_sessions where cook_sessions.id = cook_session_notes.cook_session_id and cook_sessions.user_id = (select auth.uid())));
create policy "cook session notes delete own rows" on public.cook_session_notes for delete to authenticated using ((select auth.uid()) = user_id);

create policy "recipe imports select own rows" on public.recipe_imports for select to authenticated using ((select auth.uid()) = user_id);
create policy "recipe imports insert own rows" on public.recipe_imports for insert to authenticated with check ((select auth.uid()) = user_id and (created_recipe_id is null or exists (select 1 from public.recipes where recipes.id = recipe_imports.created_recipe_id and recipes.user_id = (select auth.uid()))));
create policy "recipe imports update own rows" on public.recipe_imports for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and (created_recipe_id is null or exists (select 1 from public.recipes where recipes.id = recipe_imports.created_recipe_id and recipes.user_id = (select auth.uid()))));
create policy "recipe imports delete own rows" on public.recipe_imports for delete to authenticated using ((select auth.uid()) = user_id);

create policy "user rate limits select own rows" on public.user_rate_limits for select to authenticated using ((select auth.uid()) = user_id);
create policy "user rate limits insert own rows" on public.user_rate_limits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user rate limits update own rows" on public.user_rate_limits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user rate limits delete own rows" on public.user_rate_limits for delete to authenticated using ((select auth.uid()) = user_id);
