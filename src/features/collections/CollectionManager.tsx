import * as React from 'react';
import { Alert, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { CollectionVisibilitySelector } from '@/features/collections/CollectionVisibilitySelector';
import {
  createRecipeCollection,
  deleteRecipeCollection,
  listCollectionRecipes,
  listOwnedRecipeCollections,
  listRecipeCollections,
  updateRecipeCollection,
} from '@/features/social/socialApi';
import type { Database, Visibility } from '@/types/database';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';
import { hasText } from '@/lib/validators';

type RecipeCollection = Database['public']['Tables']['recipe_collections']['Row'];
type CollectionScope = 'mine' | 'shared' | 'public';

const scopes: { label: string; value: CollectionScope }[] = [
  { label: 'Mine', value: 'mine' },
  { label: 'Shared', value: 'shared' },
  { label: 'Public', value: 'public' },
];

function CollectionCard({
  collection,
  onChanged,
  onDelete,
  recipeCount,
  scope,
}: {
  collection: RecipeCollection;
  onChanged: () => Promise<void>;
  onDelete: (collectionId: string) => void;
  recipeCount: number;
  scope: CollectionScope;
}) {
  const colors = useThemeColors();
  const [name, setName] = React.useState(collection.name);
  const [error, setError] = React.useState<string | null>(null);
  const isOwnerScope = scope === 'mine';

  async function rename() {
    if (!hasText(name) || name.trim() === collection.name) {
      return;
    }

    try {
      setError(null);
      await updateRecipeCollection(collection.id, { name });
      await onChanged();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Collection could not be renamed.');
    }
  }

  return (
    <AppCard>
      <View style={{ gap: spacing.sm }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
          {collection.name}
        </Text>
        <Text selectable style={{ color: colors.mutedText }}>
          {recipeCount} recipes / {collection.visibility}
        </Text>
      </View>
      {isOwnerScope ? (
        <>
          <AppInput label="Collection name" onChangeText={setName} value={name} />
          {error ? (
            <Text selectable style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <AppButton disabled={!hasText(name) || name.trim() === collection.name} onPress={rename} variant="secondary">
              Rename
            </AppButton>
            <AppButton onPress={() => onDelete(collection.id)} variant="danger">
              Delete
            </AppButton>
          </View>
          <CollectionVisibilitySelector collectionId={collection.id} onChanged={onChanged} visibility={collection.visibility as Visibility} />
        </>
      ) : null}
    </AppCard>
  );
}

export function CollectionManager() {
  const colors = useThemeColors();
  const [collections, setCollections] = React.useState<RecipeCollection[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [name, setName] = React.useState('');
  const [recipeCounts, setRecipeCounts] = React.useState<Record<string, number>>({});
  const [scope, setScope] = React.useState<CollectionScope>('mine');

  const refresh = React.useCallback(async () => {
    try {
      setError(null);
      const visibleCollections =
        scope === 'mine'
          ? await listOwnedRecipeCollections({ limit: 50 })
          : await listRecipeCollections({ limit: 50, visibility: scope as Visibility });
      const counts = await Promise.all(
        visibleCollections.map(async (collection) => ({
          count: (await listCollectionRecipes(collection.id)).length,
          id: collection.id,
        })),
      );

      setCollections(visibleCollections);
      setRecipeCounts(Object.fromEntries(counts.map((item) => [item.id, item.count])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Collections could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timeout);
  }, [refresh]);

  async function createCollection() {
    if (!hasText(name)) {
      return;
    }

    try {
      setError(null);
      await createRecipeCollection({ name });
      setName('');
      await refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Collection could not be created.');
    }
  }

  function confirmDelete(collectionId: string) {
    Alert.alert('Delete collection?', 'Recipes stay saved, but this directory is removed.', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => {
          void deleteRecipeCollection(collectionId).then(refresh).catch((deleteError: unknown) => {
            setError(deleteError instanceof Error ? deleteError.message : 'Collection could not be deleted.');
          });
        },
        style: 'destructive',
        text: 'Delete',
      },
    ]);
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {scopes.map((option) => (
          <AppButton key={option.value} onPress={() => setScope(option.value)} variant={scope === option.value ? 'primary' : 'secondary'}>
            {option.label}
          </AppButton>
        ))}
      </View>
      {scope === 'mine' ? (
        <AppCard>
          <AppInput label="New collection" onChangeText={setName} placeholder="Dinner, Baking, For Mama" value={name} />
          <AppButton disabled={!hasText(name)} onPress={createCollection}>
            Create collection
          </AppButton>
        </AppCard>
      ) : null}
      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      {isLoading ? <LoadingState label="Loading collections" /> : null}
      {!isLoading && collections.length === 0 ? (
        <EmptyState message="Create one or open a shared/public collection later." title="No collections" />
      ) : null}
      {collections.map((collection) => (
        <CollectionCard
          collection={collection}
          key={collection.id}
          onChanged={refresh}
          onDelete={confirmDelete}
          recipeCount={recipeCounts[collection.id] ?? 0}
          scope={scope}
        />
      ))}
    </View>
  );
}
