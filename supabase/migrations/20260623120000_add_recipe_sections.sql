alter table public.recipe_ingredients
add column if not exists section text;

alter table public.recipe_steps
add column if not exists section text;
