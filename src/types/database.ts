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

export type Visibility = 'private' | 'shared' | 'public';
export type SharePermission = 'view' | 'edit';
export type NotificationType =
  | 'user_followed'
  | 'recipe_shared'
  | 'recipe_access_removed'
  | 'shopping_list_shared'
  | 'shopping_list_access_removed'
  | 'collection_shared'
  | 'collection_access_removed';
export type NotificationEntityType = 'profile' | 'recipe' | 'shopping_list' | 'collection';

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
    visibility: Visibility;
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
  visibility?: Visibility;
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

type RecipeTranslationRow = OwnedRow &
  TimestampColumns & {
    content: Json;
    provider: string;
    recipe_id: string;
    target_language: string;
  };

type RecipeTranslationInsert = {
  content: Json;
  id?: string;
  provider?: string;
  recipe_id: string;
  target_language: string;
  user_id: string;
};

type RecipeTranslationUpdate = Partial<Omit<RecipeTranslationInsert, 'id' | 'recipe_id' | 'user_id'>> & {
  updated_at?: string;
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
    list_id: string | null;
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
  list_id?: string | null;
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
    username: string | null;
  };

type ProfileInsert = {
  avatar_url?: string | null;
  display_name?: string | null;
  id: string;
  preferred_language?: string;
  theme?: string;
  user_id: string;
  username?: string | null;
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
    visibility: Visibility;
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

type UserFollowRow = {
  created_at: string;
  follower_id: string;
  following_id: string;
};

type UserFollowInsert = {
  follower_id: string;
  following_id: string;
};

type UserFollowUpdate = Partial<UserFollowInsert>;

type ShareRow = TimestampColumns & {
  id: string;
  owner_id: string;
  permission: SharePermission;
  shared_with_user_id: string;
};

type RecipeShareRow = ShareRow & {
  recipe_id: string;
};

type RecipeShareInsert = {
  id?: string;
  owner_id: string;
  permission?: SharePermission;
  recipe_id: string;
  shared_with_user_id: string;
};

type RecipeShareUpdate = Partial<Pick<RecipeShareInsert, 'permission'>> & {
  updated_at?: string;
};

type ShoppingListRow = OwnedRow &
  TimestampColumns & {
    name: string;
    visibility: Visibility;
  };

type ShoppingListInsert = {
  id?: string;
  name?: string;
  user_id: string;
  visibility?: Visibility;
};

type ShoppingListUpdate = Partial<Omit<ShoppingListInsert, 'id' | 'user_id'>> & {
  updated_at?: string;
};

type ShoppingListShareRow = ShareRow & {
  list_id: string;
};

type ShoppingListShareInsert = {
  id?: string;
  list_id: string;
  owner_id: string;
  permission?: SharePermission;
  shared_with_user_id: string;
};

type ShoppingListShareUpdate = Partial<Pick<ShoppingListShareInsert, 'permission'>> & {
  updated_at?: string;
};

type RecipeCollectionRow = OwnedRow &
  TimestampColumns & {
    description: string | null;
    name: string;
    visibility: Visibility;
  };

type RecipeCollectionInsert = {
  description?: string | null;
  id?: string;
  name: string;
  user_id: string;
  visibility?: Visibility;
};

type RecipeCollectionUpdate = Partial<Omit<RecipeCollectionInsert, 'id' | 'user_id'>> & {
  updated_at?: string;
};

type CollectionShareRow = ShareRow & {
  collection_id: string;
};

type CollectionShareInsert = {
  collection_id: string;
  id?: string;
  owner_id: string;
  permission?: SharePermission;
  shared_with_user_id: string;
};

type CollectionShareUpdate = Partial<Pick<CollectionShareInsert, 'permission'>> & {
  updated_at?: string;
};

type CollectionRecipeRow = {
  collection_id: string;
  created_at: string;
  owner_id: string;
  recipe_id: string;
};

type CollectionRecipeInsert = {
  collection_id: string;
  owner_id: string;
  recipe_id: string;
};

type NotificationRow = {
  actor_user_id: string | null;
  created_at: string;
  entity_id: string;
  entity_type: NotificationEntityType;
  id: string;
  metadata: Json;
  read_at: string | null;
  type: NotificationType;
  user_id: string;
};

type NotificationUpdate = Partial<Pick<NotificationRow, 'read_at'>>;

export type Database = {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      cook_session_notes: Table<RecipeNoteRow & { cook_session_id: string }, { cook_session_id: string; note: string; user_id: string; id?: string }, Partial<{ note: string }>>;
      cook_sessions: Table<CookSessionRow, { recipe_id: string; user_id: string; current_step?: number; id?: string; status?: string }, Partial<{ current_step: number; finished_at: string | null; status: string }>>;
      collection_recipes: Table<CollectionRecipeRow, CollectionRecipeInsert, Partial<CollectionRecipeInsert>>;
      collection_shares: Table<CollectionShareRow, CollectionShareInsert, CollectionShareUpdate>;
      favorite_ingredients: Table<FavoriteIngredientRow, FavoriteIngredientInsert, Partial<FavoriteIngredientInsert>>;
      meal_plans: Table<MealPlanRow, { meal_slot: string; planned_date: string; user_id: string; custom_title?: string | null; id?: string; recipe_id?: string | null; visibility?: Visibility }, Partial<{ custom_title: string | null; meal_slot: string; planned_date: string; recipe_id: string | null; visibility: Visibility }>>;
      notifications: Table<NotificationRow, never, NotificationUpdate>;
      pantry_items: Table<PantryItemRow, PantryItemInsert, PantryItemUpdate>;
      profiles: Table<ProfileRow, ProfileInsert, ProfileUpdate>;
      recipe_collections: Table<RecipeCollectionRow, RecipeCollectionInsert, RecipeCollectionUpdate>;
      recipe_imports: Table<RecipeImportRow, { user_id: string; confidence?: string | null; created_recipe_id?: string | null; error_code?: string | null; id?: string; source_platform?: string | null; source_type?: string | null; source_url?: string | null; status?: string }, Partial<{ confidence: string | null; created_recipe_id: string | null; error_code: string | null; source_platform: string | null; source_type: string | null; source_url: string | null; status: string }>>;
      recipe_ingredients: Table<RecipeIngredientRow, RecipeIngredientInsert, Partial<RecipeIngredientInsert>>;
      recipe_notes: Table<RecipeNoteRow, RecipeNoteInsert, Partial<RecipeNoteInsert>>;
      recipe_shares: Table<RecipeShareRow, RecipeShareInsert, RecipeShareUpdate>;
      recipe_steps: Table<RecipeStepRow, RecipeStepInsert, Partial<RecipeStepInsert>>;
      recipe_tags: Table<RecipeTagRow, RecipeTagInsert, Partial<RecipeTagInsert>>;
      recipe_translations: Table<RecipeTranslationRow, RecipeTranslationInsert, RecipeTranslationUpdate>;
      recipes: Table<RecipeRow, RecipeInsert, RecipeUpdate>;
      shopping_list_shares: Table<ShoppingListShareRow, ShoppingListShareInsert, ShoppingListShareUpdate>;
      shopping_lists: Table<ShoppingListRow, ShoppingListInsert, ShoppingListUpdate>;
      shopping_items: Table<ShoppingItemRow, ShoppingItemInsert, ShoppingItemUpdate>;
      user_follows: Table<UserFollowRow, UserFollowInsert, UserFollowUpdate>;
      user_rate_limits: Table<UserRateLimitRow, { action: string; user_id: string; action_date?: string; count?: number; id?: string }, Partial<{ action: string; action_date: string; count: number }>>;
    };
    Views: Record<string, never>;
  };
};
