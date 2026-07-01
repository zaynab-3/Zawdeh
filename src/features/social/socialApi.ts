import { getAuthenticatedUser } from '@/lib/supabaseSession';
import { getSupabase } from '@/lib/supabase';
import { throwIfDatabaseNotReady } from '@/lib/supabaseStatus';
import type { Database, SharePermission, Visibility } from '@/types/database';
import type {
  CollectionShareTarget,
  FollowCounts,
  FollowProfile,
  PagedQuery,
  RealtimeChangePayload,
  RecipeCollectionInput,
  RecipeShareTarget,
  ShareProfile,
  ShoppingListShareTarget,
  SocialNotification,
  UserProfile,
} from '@/features/social/socialTypes';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type RecipeRow = Database['public']['Tables']['recipes']['Row'];
type RecipeShareRow = Database['public']['Tables']['recipe_shares']['Row'];
type ShoppingListRow = Database['public']['Tables']['shopping_lists']['Row'];
type ShoppingListShareRow = Database['public']['Tables']['shopping_list_shares']['Row'];
type RecipeCollectionRow = Database['public']['Tables']['recipe_collections']['Row'];
type CollectionShareRow = Database['public']['Tables']['collection_shares']['Row'];
type CollectionRecipeRow = Database['public']['Tables']['collection_recipes']['Row'];

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function getRange(options: PagedQuery = {}) {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);

  return { from: offset, limit, to: offset + limit - 1 };
}

function normalizePermission(permission?: SharePermission): SharePermission {
  return permission === 'edit' ? 'edit' : 'view';
}

function normalizeUsername(username?: string | null) {
  if (username === undefined) {
    return undefined;
  }

  const trimmed = username?.trim().toLowerCase() ?? '';
  return trimmed || null;
}

function normalizeNullableText(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value?.trim() ?? '';
  return trimmed || null;
}

function normalizeSearchTerm(query: string) {
  return query.trim().replace(/[%(),]/g, ' ').replace(/\s+/g, ' ').slice(0, 64);
}

async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error('Sign in is required.');
  }

  return user;
}

function throwDatabaseError(error: unknown) {
  throwIfDatabaseNotReady(error);
  throw error;
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
    displayName: row.display_name ?? undefined,
    updatedAt: row.updated_at,
    userId: row.user_id,
    username: row.username ?? undefined,
  };
}

function mapNotification(row: NotificationRow): SocialNotification {
  return {
    actorUserId: row.actor_user_id ?? undefined,
    createdAt: row.created_at,
    entityId: row.entity_id,
    entityType: row.entity_type,
    id: row.id,
    metadata: row.metadata,
    readAt: row.read_at ?? undefined,
    type: row.type,
    userId: row.user_id,
  };
}

async function getProfilesByUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, UserProfile>();
  }

  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .in('user_id', userIds);

  if (error) {
    throwDatabaseError(error);
  }

  return new Map((data ?? []).map((row) => [row.user_id, mapProfile(row)]));
}

export async function getUserProfilesByIds(userIds: string[]) {
  return getProfilesByUserIds([...new Set(userIds)]);
}

export async function getOwnProfile(): Promise<UserProfile | null> {
  const user = await requireAuthenticatedUser();
  const { data, error } = await getSupabase().from('profiles').select('*').eq('user_id', user.id).maybeSingle();

  if (error) {
    throwDatabaseError(error);
  }

  return data ? mapProfile(data) : null;
}

export async function updateOwnProfile(input: {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
}) {
  const user = await requireAuthenticatedUser();
  const updates = {
    avatar_url: normalizeNullableText(input.avatarUrl),
    display_name: normalizeNullableText(input.displayName),
    username: normalizeUsername(input.username),
  };

  const { data, error } = await getSupabase()
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) {
    throwDatabaseError(error);
  }

  if (!data) {
    throw new Error('Profile could not be updated.');
  }

  return mapProfile(data);
}

export async function searchUserProfiles(query: string, options: PagedQuery = {}) {
  await requireAuthenticatedUser();

  const term = normalizeSearchTerm(query);

  if (!term) {
    return [];
  }

  const { from, to } = getRange(options);
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .order('username', { ascending: true, nullsFirst: false })
    .range(from, to);

  if (error) {
    throwDatabaseError(error);
  }

  return (data ?? []).map(mapProfile);
}

export async function followUser(targetUserId: string) {
  const user = await requireAuthenticatedUser();

  if (targetUserId === user.id) {
    throw new Error('You cannot follow yourself.');
  }

  const { error } = await getSupabase()
    .from('user_follows')
    .upsert(
      { follower_id: user.id, following_id: targetUserId },
      { ignoreDuplicates: true, onConflict: 'follower_id,following_id' },
    );

  if (error) {
    throwDatabaseError(error);
  }
}

export async function unfollowUser(targetUserId: string) {
  const user = await requireAuthenticatedUser();
  const { error } = await getSupabase()
    .from('user_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId);

  if (error) {
    throwDatabaseError(error);
  }
}

export async function isFollowingUser(targetUserId: string) {
  const user = await requireAuthenticatedUser();
  const { data, error } = await getSupabase()
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (error) {
    throwDatabaseError(error);
  }

  return Boolean(data);
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  await requireAuthenticatedUser();
  const supabase = getSupabase();
  const [{ count: followers, error: followersError }, { count: following, error: followingError }] = await Promise.all([
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);

  const error = followersError ?? followingError;

  if (error) {
    throwDatabaseError(error);
  }

  return {
    followers: followers ?? 0,
    following: following ?? 0,
  };
}

export async function listFollowers(userId: string, options: PagedQuery = {}): Promise<FollowProfile[]> {
  await requireAuthenticatedUser();
  const { from, to } = getRange(options);
  const { data, error } = await getSupabase()
    .from('user_follows')
    .select('follower_id, created_at')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throwDatabaseError(error);
  }

  const rows = data ?? [];
  const profilesById = await getProfilesByUserIds(rows.map((row) => row.follower_id));

  return rows
    .map((row) => {
      const profile = profilesById.get(row.follower_id);
      return profile ? { followedAt: row.created_at, profile } : null;
    })
    .filter((row): row is FollowProfile => Boolean(row));
}

export async function listFollowing(userId: string, options: PagedQuery = {}): Promise<FollowProfile[]> {
  await requireAuthenticatedUser();
  const { from, to } = getRange(options);
  const { data, error } = await getSupabase()
    .from('user_follows')
    .select('following_id, created_at')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throwDatabaseError(error);
  }

  const rows = data ?? [];
  const profilesById = await getProfilesByUserIds(rows.map((row) => row.following_id));

  return rows
    .map((row) => {
      const profile = profilesById.get(row.following_id);
      return profile ? { followedAt: row.created_at, profile } : null;
    })
    .filter((row): row is FollowProfile => Boolean(row));
}

export async function listAccessibleRecipes(options: PagedQuery & { visibility?: Visibility } = {}): Promise<RecipeRow[]> {
  await requireAuthenticatedUser();
  const { from, to } = getRange(options);
  let query = getSupabase()
    .from('recipes')
    .select('*')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (options.visibility) {
    query = query.eq('visibility', options.visibility);
  }

  const { data, error } = await query;

  if (error) {
    throwDatabaseError(error);
  }

  return data ?? [];
}

export async function setRecipeVisibility(recipeId: string, visibility: Visibility) {
  const user = await requireAuthenticatedUser();
  const { data, error } = await getSupabase()
    .from('recipes')
    .update({ visibility })
    .eq('id', recipeId)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();

  if (error) {
    throwDatabaseError(error);
  }

  if (!data) {
    throw new Error('Recipe was not found or cannot be edited.');
  }

  return data;
}

export async function shareRecipeWithUser(target: RecipeShareTarget): Promise<RecipeShareRow> {
  const user = await requireAuthenticatedUser();

  if (target.userId === user.id) {
    throw new Error('You cannot share a recipe with yourself.');
  }

  await setRecipeVisibility(target.recipeId, 'shared');

  const { data, error } = await getSupabase()
    .from('recipe_shares')
    .upsert(
      {
        owner_id: user.id,
        permission: normalizePermission(target.permission),
        recipe_id: target.recipeId,
        shared_with_user_id: target.userId,
      },
      { onConflict: 'recipe_id,shared_with_user_id' },
    )
    .select('*')
    .single();

  if (error) {
    throwDatabaseError(error);
  }

  if (!data) {
    throw new Error('Recipe share could not be saved.');
  }

  return data;
}

export async function removeRecipeShare(recipeId: string, userId: string) {
  const user = await requireAuthenticatedUser();
  const { error } = await getSupabase()
    .from('recipe_shares')
    .delete()
    .eq('owner_id', user.id)
    .eq('recipe_id', recipeId)
    .eq('shared_with_user_id', userId);

  if (error) {
    throwDatabaseError(error);
  }
}

export async function listRecipeShares(recipeId: string): Promise<RecipeShareRow[]> {
  const user = await requireAuthenticatedUser();
  const { data, error } = await getSupabase()
    .from('recipe_shares')
    .select('*')
    .eq('owner_id', user.id)
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false });

  if (error) {
    throwDatabaseError(error);
  }

  return data ?? [];
}

export async function listRecipeShareProfiles(recipeId: string): Promise<ShareProfile[]> {
  const shares = await listRecipeShares(recipeId);
  const profilesById = await getProfilesByUserIds(shares.map((share) => share.shared_with_user_id));

  return shares
    .map((share) => {
      const profile = profilesById.get(share.shared_with_user_id);

      return profile
        ? {
            createdAt: share.created_at,
            permission: share.permission,
            profile,
            userId: share.shared_with_user_id,
          }
        : null;
    })
    .filter((share): share is ShareProfile => Boolean(share));
}

export async function createShoppingList(name = 'My shopping list', visibility: Visibility = 'private') {
  const user = await requireAuthenticatedUser();
  const trimmedName = name.trim() || 'My shopping list';
  const { data, error } = await getSupabase()
    .from('shopping_lists')
    .insert({ name: trimmedName, user_id: user.id, visibility })
    .select('*')
    .single();

  if (error) {
    throwDatabaseError(error);
  }

  if (!data) {
    throw new Error('Shopping list could not be created.');
  }

  return data;
}

export async function listShoppingLists(options: PagedQuery & { visibility?: Visibility } = {}): Promise<ShoppingListRow[]> {
  await requireAuthenticatedUser();
  const { from, to } = getRange(options);
  let query = getSupabase().from('shopping_lists').select('*').order('updated_at', { ascending: false }).range(from, to);

  if (options.visibility) {
    query = query.eq('visibility', options.visibility);
  }

  const { data, error } = await query;

  if (error) {
    throwDatabaseError(error);
  }

  return data ?? [];
}

export async function listOwnedShoppingLists(options: PagedQuery = {}) {
  const user = await requireAuthenticatedUser();
  const { from, to } = getRange(options);
  const { data, error } = await getSupabase()
    .from('shopping_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) {
    throwDatabaseError(error);
  }

  return data ?? [];
}

export async function setShoppingListVisibility(listId: string, visibility: Visibility) {
  const user = await requireAuthenticatedUser();
  const { data, error } = await getSupabase()
    .from('shopping_lists')
    .update({ visibility })
    .eq('id', listId)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();

  if (error) {
    throwDatabaseError(error);
  }

  if (!data) {
    throw new Error('Shopping list was not found or cannot be edited.');
  }

  return data;
}

export async function shareShoppingListWithUser(target: ShoppingListShareTarget): Promise<ShoppingListShareRow> {
  const user = await requireAuthenticatedUser();

  if (target.userId === user.id) {
    throw new Error('You cannot share a list with yourself.');
  }

  await setShoppingListVisibility(target.listId, 'shared');

  const { data, error } = await getSupabase()
    .from('shopping_list_shares')
    .upsert(
      {
        list_id: target.listId,
        owner_id: user.id,
        permission: normalizePermission(target.permission),
        shared_with_user_id: target.userId,
      },
      { onConflict: 'list_id,shared_with_user_id' },
    )
    .select('*')
    .single();

  if (error) {
    throwDatabaseError(error);
  }

  if (!data) {
    throw new Error('Shopping list share could not be saved.');
  }

  return data;
}

export async function removeShoppingListShare(listId: string, userId: string) {
  const user = await requireAuthenticatedUser();
  const { error } = await getSupabase()
    .from('shopping_list_shares')
    .delete()
    .eq('owner_id', user.id)
    .eq('list_id', listId)
    .eq('shared_with_user_id', userId);

  if (error) {
    throwDatabaseError(error);
  }
}

export async function listShoppingListShares(listId: string): Promise<ShoppingListShareRow[]> {
  const user = await requireAuthenticatedUser();
  const { data, error } = await getSupabase()
    .from('shopping_list_shares')
    .select('*')
    .eq('owner_id', user.id)
    .eq('list_id', listId)
    .order('created_at', { ascending: false });

  if (error) {
    throwDatabaseError(error);
  }

  return data ?? [];
}

export async function listShoppingListShareProfiles(listId: string): Promise<ShareProfile[]> {
  const shares = await listShoppingListShares(listId);
  const profilesById = await getProfilesByUserIds(shares.map((share) => share.shared_with_user_id));

  return shares
    .map((share) => {
      const profile = profilesById.get(share.shared_with_user_id);

      return profile
        ? {
            createdAt: share.created_at,
            permission: share.permission,
            profile,
            userId: share.shared_with_user_id,
          }
        : null;
    })
    .filter((share): share is ShareProfile => Boolean(share));
}

export async function createRecipeCollection(input: RecipeCollectionInput): Promise<RecipeCollectionRow> {
  const user = await requireAuthenticatedUser();
  const { data, error } = await getSupabase()
    .from('recipe_collections')
    .insert({
      description: normalizeNullableText(input.description) ?? null,
      name: input.name.trim(),
      user_id: user.id,
      visibility: input.visibility ?? 'private',
    })
    .select('*')
    .single();

  if (error) {
    throwDatabaseError(error);
  }

  if (!data) {
    throw new Error('Collection could not be created.');
  }

  return data;
}

export async function listRecipeCollections(
  options: PagedQuery & { visibility?: Visibility } = {},
): Promise<RecipeCollectionRow[]> {
  await requireAuthenticatedUser();
  const { from, to } = getRange(options);
  let query = getSupabase()
    .from('recipe_collections')
    .select('*')
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (options.visibility) {
    query = query.eq('visibility', options.visibility);
  }

  const { data, error } = await query;

  if (error) {
    throwDatabaseError(error);
  }

  return data ?? [];
}

export async function listOwnedRecipeCollections(options: PagedQuery = {}): Promise<RecipeCollectionRow[]> {
  const user = await requireAuthenticatedUser();
  const { from, to } = getRange(options);
  const { data, error } = await getSupabase()
    .from('recipe_collections')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) {
    throwDatabaseError(error);
  }

  return data ?? [];
}

export async function updateRecipeCollection(collectionId: string, input: Partial<RecipeCollectionInput>) {
  const user = await requireAuthenticatedUser();
  const updates: Database['public']['Tables']['recipe_collections']['Update'] = {};

  if (input.description !== undefined) {
    updates.description = normalizeNullableText(input.description) ?? null;
  }

  if (input.name !== undefined) {
    const name = normalizeNullableText(input.name);

    if (!name) {
      throw new Error('Collection name is required.');
    }

    updates.name = name;
  }

  if (input.visibility !== undefined) {
    updates.visibility = input.visibility;
  }

  const { data, error } = await getSupabase()
    .from('recipe_collections')
    .update(updates)
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();

  if (error) {
    throwDatabaseError(error);
  }

  if (!data) {
    throw new Error('Collection was not found or cannot be edited.');
  }

  return data;
}

export async function deleteRecipeCollection(collectionId: string) {
  const user = await requireAuthenticatedUser();
  const { error } = await getSupabase()
    .from('recipe_collections')
    .delete()
    .eq('id', collectionId)
    .eq('user_id', user.id);

  if (error) {
    throwDatabaseError(error);
  }
}

export async function addRecipeToCollection(collectionId: string, recipeId: string): Promise<CollectionRecipeRow> {
  const user = await requireAuthenticatedUser();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('collection_recipes')
    .insert({
      collection_id: collectionId,
      owner_id: user.id,
      recipe_id: recipeId,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existingMembership, error: selectError } = await supabase
        .from('collection_recipes')
        .select('*')
        .eq('collection_id', collectionId)
        .eq('recipe_id', recipeId)
        .single();

      if (selectError) {
        throwDatabaseError(selectError);
      }

      if (!existingMembership) {
        throw new Error('Collection recipe membership could not be read.');
      }

      return existingMembership;
    }

    throwDatabaseError(error);
  }

  if (!data) {
    throw new Error('Recipe could not be added to the collection.');
  }

  return data;
}

export async function removeRecipeFromCollection(collectionId: string, recipeId: string) {
  const user = await requireAuthenticatedUser();
  const { error } = await getSupabase()
    .from('collection_recipes')
    .delete()
    .eq('collection_id', collectionId)
    .eq('owner_id', user.id)
    .eq('recipe_id', recipeId);

  if (error) {
    throwDatabaseError(error);
  }
}

export async function listCollectionRecipes(collectionId: string): Promise<CollectionRecipeRow[]> {
  await requireAuthenticatedUser();
  const { data, error } = await getSupabase()
    .from('collection_recipes')
    .select('*')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false });

  if (error) {
    throwDatabaseError(error);
  }

  return data ?? [];
}

export async function setCollectionVisibility(collectionId: string, visibility: Visibility) {
  return updateRecipeCollection(collectionId, { visibility });
}

export async function shareCollectionWithUser(target: CollectionShareTarget): Promise<CollectionShareRow> {
  const user = await requireAuthenticatedUser();

  if (target.userId === user.id) {
    throw new Error('You cannot share a collection with yourself.');
  }

  await setCollectionVisibility(target.collectionId, 'shared');

  const { data, error } = await getSupabase()
    .from('collection_shares')
    .upsert(
      {
        collection_id: target.collectionId,
        owner_id: user.id,
        permission: normalizePermission(target.permission),
        shared_with_user_id: target.userId,
      },
      { onConflict: 'collection_id,shared_with_user_id' },
    )
    .select('*')
    .single();

  if (error) {
    throwDatabaseError(error);
  }

  if (!data) {
    throw new Error('Collection share could not be saved.');
  }

  return data;
}

export async function removeCollectionShare(collectionId: string, userId: string) {
  const user = await requireAuthenticatedUser();
  const { error } = await getSupabase()
    .from('collection_shares')
    .delete()
    .eq('owner_id', user.id)
    .eq('collection_id', collectionId)
    .eq('shared_with_user_id', userId);

  if (error) {
    throwDatabaseError(error);
  }
}

export async function listCollectionShares(collectionId: string): Promise<CollectionShareRow[]> {
  const user = await requireAuthenticatedUser();
  const { data, error } = await getSupabase()
    .from('collection_shares')
    .select('*')
    .eq('owner_id', user.id)
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false });

  if (error) {
    throwDatabaseError(error);
  }

  return data ?? [];
}

export async function listCollectionShareProfiles(collectionId: string): Promise<ShareProfile[]> {
  const shares = await listCollectionShares(collectionId);
  const profilesById = await getProfilesByUserIds(shares.map((share) => share.shared_with_user_id));

  return shares
    .map((share) => {
      const profile = profilesById.get(share.shared_with_user_id);

      return profile
        ? {
            createdAt: share.created_at,
            permission: share.permission,
            profile,
            userId: share.shared_with_user_id,
          }
        : null;
    })
    .filter((share): share is ShareProfile => Boolean(share));
}

export async function listNotifications(options: PagedQuery & { unreadOnly?: boolean } = {}) {
  const user = await requireAuthenticatedUser();
  const { from, to } = getRange(options);
  let query = getSupabase()
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options.unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;

  if (error) {
    throwDatabaseError(error);
  }

  return (data ?? []).map(mapNotification);
}

export async function getUnreadNotificationCount() {
  const user = await requireAuthenticatedUser();
  const { count, error } = await getSupabase()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error) {
    throwDatabaseError(error);
  }

  return count ?? 0;
}

export async function markNotificationRead(notificationId: string) {
  const user = await requireAuthenticatedUser();
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    throwDatabaseError(error);
  }
}

export async function markAllNotificationsRead() {
  const user = await requireAuthenticatedUser();
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error) {
    throwDatabaseError(error);
  }
}

function subscribeToScopedTable(
  channelName: string,
  table: string,
  filter: string,
  onChange: (payload: RealtimeChangePayload) => void,
) {
  const supabase = getSupabase();
  const uniqueChannelName = `${channelName}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  const channel = supabase
    .channel(uniqueChannelName)
    .on('postgres_changes', { event: '*', filter, schema: 'public', table }, (payload) => {
      onChange(payload as RealtimeChangePayload);
    })
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`Realtime subscription failed for ${channelName}`, error);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToUserNotifications(userId: string, onChange: (payload: RealtimeChangePayload) => void) {
  return subscribeToScopedTable(`notifications:${userId}`, 'notifications', `user_id=eq.${userId}`, onChange);
}

export function subscribeToRecipeChanges(recipeId: string, onChange: (payload: RealtimeChangePayload) => void) {
  return subscribeToScopedTable(`recipe:${recipeId}`, 'recipes', `id=eq.${recipeId}`, onChange);
}

export function subscribeToShoppingListItems(listId: string, onChange: (payload: RealtimeChangePayload) => void) {
  return subscribeToScopedTable(`shopping-list:${listId}`, 'shopping_items', `list_id=eq.${listId}`, onChange);
}

export function subscribeToCollectionRecipes(collectionId: string, onChange: (payload: RealtimeChangePayload) => void) {
  return subscribeToScopedTable(
    `collection-recipes:${collectionId}`,
    'collection_recipes',
    `collection_id=eq.${collectionId}`,
    onChange,
  );
}
