import type { Json, NotificationEntityType, NotificationType, SharePermission, Visibility } from '@/types/database';

export type UserProfile = {
  avatarUrl?: string;
  createdAt: string;
  displayName?: string;
  updatedAt: string;
  userId: string;
  username?: string;
};

export type FollowCounts = {
  followers: number;
  following: number;
};

export type FollowProfile = {
  followedAt: string;
  profile: UserProfile;
};

export type PagedQuery = {
  limit?: number;
  offset?: number;
};

export type RecipeShareTarget = {
  permission?: SharePermission;
  recipeId: string;
  userId: string;
};

export type ShoppingListShareTarget = {
  listId: string;
  permission?: SharePermission;
  userId: string;
};

export type CollectionShareTarget = {
  collectionId: string;
  permission?: SharePermission;
  userId: string;
};

export type RecipeCollectionInput = {
  description?: string;
  name: string;
  visibility?: Visibility;
};

export type SocialNotification = {
  actorUserId?: string;
  createdAt: string;
  entityId: string;
  entityType: NotificationEntityType;
  id: string;
  metadata: Json;
  readAt?: string;
  type: NotificationType;
  userId: string;
};

export type RealtimeChangePayload = {
  eventType?: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
};

export type { SharePermission, Visibility };
