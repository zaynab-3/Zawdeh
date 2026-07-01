import * as React from 'react';

import { useAuth } from '@/features/auth/useAuth';
import {
  followUser,
  getFollowCounts,
  getUnreadNotificationCount,
  isFollowingUser,
  listNotifications,
  searchUserProfiles,
  subscribeToUserNotifications,
  unfollowUser,
} from '@/features/social/socialApi';
import type { FollowCounts, SocialNotification, UserProfile } from '@/features/social/socialTypes';
import { getSafeDataErrorMessage } from '@/lib/supabaseStatus';

export function useNotifications() {
  const { user } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(Boolean(user));
  const [notifications, setNotifications] = React.useState<SocialNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const refresh = React.useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const [nextNotifications, nextUnreadCount] = await Promise.all([
        listNotifications({ limit: 30 }),
        getUnreadNotificationCount(),
      ]);

      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
    } catch (loadError) {
      setError(getSafeDataErrorMessage(loadError, 'Notifications could not be loaded.'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timeout);
  }, [refresh]);

  React.useEffect(() => {
    if (!user) {
      return undefined;
    }

    return subscribeToUserNotifications(user.id, () => {
      void refresh();
    });
  }, [refresh, user]);

  return {
    error,
    isLoading,
    notifications,
    refresh,
    unreadCount,
  };
}

export function useProfileSearch(initialQuery = '') {
  const [error, setError] = React.useState<string | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [profiles, setProfiles] = React.useState<UserProfile[]>([]);
  const [query, setQuery] = React.useState(initialQuery);

  React.useEffect(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      const timeout = setTimeout(() => {
        setProfiles([]);
        setIsSearching(false);
        setError(null);
      }, 0);

      return () => clearTimeout(timeout);
    }

    let isMounted = true;
    const timeout = setTimeout(() => {
      setIsSearching(true);
      searchUserProfiles(normalizedQuery, { limit: 20 })
        .then((nextProfiles) => {
          if (isMounted) {
            setProfiles(nextProfiles);
            setError(null);
          }
        })
        .catch((searchError) => {
          if (isMounted) {
            setError(getSafeDataErrorMessage(searchError, 'User search failed.'));
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsSearching(false);
          }
        });
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [query]);

  return {
    error,
    isSearching,
    profiles,
    query,
    setQuery,
  };
}

export function useFollowState(targetUserId?: string) {
  const [counts, setCounts] = React.useState<FollowCounts>({ followers: 0, following: 0 });
  const [error, setError] = React.useState<string | null>(null);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(Boolean(targetUserId));

  const refresh = React.useCallback(async () => {
    if (!targetUserId) {
      setCounts({ followers: 0, following: 0 });
      setIsFollowing(false);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const [nextCounts, nextIsFollowing] = await Promise.all([
        getFollowCounts(targetUserId),
        isFollowingUser(targetUserId),
      ]);

      setCounts(nextCounts);
      setIsFollowing(nextIsFollowing);
    } catch (loadError) {
      setError(getSafeDataErrorMessage(loadError, 'Follow state could not be loaded.'));
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timeout);
  }, [refresh]);

  const follow = React.useCallback(async () => {
    if (!targetUserId) {
      return;
    }

    try {
      setError(null);
      await followUser(targetUserId);
      await refresh();
    } catch (followError) {
      setError(getSafeDataErrorMessage(followError, 'Could not follow this user.'));
    }
  }, [refresh, targetUserId]);

  const unfollow = React.useCallback(async () => {
    if (!targetUserId) {
      return;
    }

    try {
      setError(null);
      await unfollowUser(targetUserId);
      await refresh();
    } catch (unfollowError) {
      setError(getSafeDataErrorMessage(unfollowError, 'Could not unfollow this user.'));
    }
  }, [refresh, targetUserId]);

  return {
    counts,
    error,
    follow,
    isFollowing,
    isLoading,
    refresh,
    unfollow,
  };
}
