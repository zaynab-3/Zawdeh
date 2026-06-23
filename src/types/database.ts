export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update> = {
  Insert: Insert;
  Relationships: [];
  Row: Row;
  Update: Update;
};

type TimestampColumns = {
  created_at: string;
  updated_at: string;
};

type OwnedRow = {
  id: string;
  user_id: string;
};

type RecipeRow = OwnedRow &
  TimestampColumns & {
    cook_time_minutes: number | null;
    cuisine: string | null;
    deleted_at: string | null;
    description: string | null;
    is_deleted: boolean;
    is_favorite: boolean;
    meal_type: string | null;
    method: string | null;
    original_language: string | null;
    prep_time_minutes: number | null;
    saved_language: string;
    servings: string | null;
    source_platform: string | null;
    source_type: string;
    source_url: string | null;
    title: string;
  };

type RecipeInsert = {
  cook_time_minutes?: number | null;
  cuisine?: string | null;
  deleted_at?: string | null;
  description?: string | null;
  id?: string;
  is_deleted?: boolean;
  is_favorite?: boolean;
  meal_type?: string | null;
  method?: string | null;
  original_language?: string | null;
  prep_time_minutes?: number | null;
  saved_language?: string;
  servings?: string | null;
  source_platform?: string | null;
  source_type?: string;
  source_url?: string | null;
  title: string;
  user_id: string;
};

type RecipeUpdate = Partial<Omit<RecipeInsert, 'id' | 'user_id'>> & {
  deleted_at?: string | null;
  updated_at?: string;
};

type RecipeIngredientRow = OwnedRow & {
  created_at: string;
  is_optional: boolean;
  name: string;
  note: string | null;
  position: number;
  quantity: string | null;
  recipe_id: string;
  role: string | null;
  section: string | null;
  unit: string | null;
};

type RecipeIngredientInsert = {
  id?: string;
  is_optional?: boolean;
  name: string;
  note?: string | null;
  position: number;
  quantity?: string | null;
  recipe_id: string;
  role?: string | null;
  section?: string | null;
  unit?: string | null;
  user_id: string;
};

type RecipeStepRow = OwnedRow & {
  created_at: string;
  instruction: string;
  position: number;
  recipe_id: string;
  section: string | null;
  timer_minutes: number | null;
};

type RecipeStepInsert = {
  id?: string;
  instruction: string;
  position: number;
  recipe_id: string;
  section?: string | null;
  timer_minutes?: number | null;
  user_id: string;
};

type RecipeNoteRow = OwnedRow & {
  created_at: string;
  note: string;
  recipe_id: string;
};

type RecipeNoteInsert = {
  id?: string;
  note: string;
  recipe_id: string;
  user_id: string;
};

type RecipeTagRow = OwnedRow & {
  created_at: string;
  recipe_id: string;
  tag: string;
};

type RecipeTagInsert = {
  id?: string;
  recipe_id: string;
  tag: string;
  user_id: string;
};

type PantryItemRow = OwnedRow &
  TimestampColumns & {
    category: string | null;
    is_available: boolean;
    is_favorite: boolean;
    name: string;
    quantity: string | null;
    unit: string | null;
  };

type PantryItemInsert = {
  category?: string | null;
  id?: string;
  is_available?: boolean;
  is_favorite?: boolean;
  name: string;
  quantity?: string | null;
  unit?: string | null;
  user_id: string;
};

type PantryItemUpdate = Partial<Omit<PantryItemInsert, 'id' | 'user_id'>> & {
  updated_at?: string;
};

type FavoriteIngredientRow = OwnedRow & {
  category: string | null;
  created_at: string;
  name: string;
};

type FavoriteIngredientInsert = {
  category?: string | null;
  id?: string;
  name: string;
  user_id: string;
};

type ShoppingItemRow = OwnedRow &
  TimestampColumns & {
    category: string | null;
    is_checked: boolean;
    name: string;
    quantity: string | null;
    source_recipe_id: string | null;
    source_type: string;
    unit: string | null;
  };

type ShoppingItemInsert = {
  category?: string | null;
  id?: string;
  is_checked?: boolean;
  name: string;
  quantity?: string | null;
  source_recipe_id?: string | null;
  source_type?: string;
  unit?: string | null;
  user_id: string;
};

type ShoppingItemUpdate = Partial<Omit<ShoppingItemInsert, 'id' | 'user_id'>> & {
  updated_at?: string;
};

type ProfileRow = OwnedRow &
  TimestampColumns & {
    avatar_url: string | null;
    display_name: string | null;
    preferred_language: string;
    theme: string;
  };

type ProfileInsert = {
  avatar_url?: string | null;
  display_name?: string | null;
  id: string;
  preferred_language?: string;
  theme?: string;
  user_id: string;
};

type ProfileUpdate = Partial<Omit<ProfileInsert, 'id' | 'user_id'>> & {
  updated_at?: string;
};

type MealPlanRow = OwnedRow &
  TimestampColumns & {
    custom_title: string | null;
    meal_slot: string;
    planned_date: string;
    recipe_id: string | null;
  };

type CookSessionRow = OwnedRow &
  TimestampColumns & {
    current_step: number;
    finished_at: string | null;
    recipe_id: string;
    started_at: string;
    status: string;
  };

type RecipeImportRow = OwnedRow &
  TimestampColumns & {
    confidence: string | null;
    created_recipe_id: string | null;
    error_code: string | null;
    source_platform: string | null;
    source_type: string | null;
    source_url: string | null;
    status: string;
  };

type UserRateLimitRow = OwnedRow &
  TimestampColumns & {
    action: string;
    action_date: string;
    count: number;
  };

export type Database = {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      cook_session_notes: Table<RecipeNoteRow & { cook_session_id: string }, { cook_session_id: string; note: string; user_id: string; id?: string }, Partial<{ note: string }>>;
      cook_sessions: Table<CookSessionRow, { recipe_id: string; user_id: string; current_step?: number; id?: string; status?: string }, Partial<{ current_step: number; finished_at: string | null; status: string }>>;
      favorite_ingredients: Table<FavoriteIngredientRow, FavoriteIngredientInsert, Partial<FavoriteIngredientInsert>>;
      meal_plans: Table<MealPlanRow, { meal_slot: string; planned_date: string; user_id: string; custom_title?: string | null; id?: string; recipe_id?: string | null }, Partial<{ custom_title: string | null; meal_slot: string; planned_date: string; recipe_id: string | null }>>;
      pantry_items: Table<PantryItemRow, PantryItemInsert, PantryItemUpdate>;
      profiles: Table<ProfileRow, ProfileInsert, ProfileUpdate>;
      recipe_imports: Table<RecipeImportRow, { user_id: string; confidence?: string | null; created_recipe_id?: string | null; error_code?: string | null; id?: string; source_platform?: string | null; source_type?: string | null; source_url?: string | null; status?: string }, Partial<{ confidence: string | null; created_recipe_id: string | null; error_code: string | null; source_platform: string | null; source_type: string | null; source_url: string | null; status: string }>>;
      recipe_ingredients: Table<RecipeIngredientRow, RecipeIngredientInsert, Partial<RecipeIngredientInsert>>;
      recipe_notes: Table<RecipeNoteRow, RecipeNoteInsert, Partial<RecipeNoteInsert>>;
      recipe_steps: Table<RecipeStepRow, RecipeStepInsert, Partial<RecipeStepInsert>>;
      recipe_tags: Table<RecipeTagRow, RecipeTagInsert, Partial<RecipeTagInsert>>;
      recipes: Table<RecipeRow, RecipeInsert, RecipeUpdate>;
      shopping_items: Table<ShoppingItemRow, ShoppingItemInsert, ShoppingItemUpdate>;
      user_rate_limits: Table<UserRateLimitRow, { action: string; user_id: string; action_date?: string; count?: number; id?: string }, Partial<{ action: string; action_date: string; count: number }>>;
    };
    Views: Record<string, never>;
  };
};
