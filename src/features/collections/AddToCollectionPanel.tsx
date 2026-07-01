import * as React from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import {
  addRecipeToCollection,
  createRecipeCollection,
  listCollectionRecipes,
  listOwnedRecipeCollections,
  removeRecipeFromCollection,
} from '@/features/social/socialApi';
import type { Database } from '@/types/database';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

type RecipeCollection = Database['public']['Tables']['recipe_collections']['Row'];

type AddToCollectionPanelProps = {
  recipeId: string;
};

export function AddToCollectionPanel({ recipeId }: AddToCollectionPanelProps) {
  const colors = useThemeColors();
  const [collections, setCollections] = React.useState<RecipeCollection[]>([]);
  const [collectionIdsWithRecipe, setCollectionIdsWithRecipe] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      setError(null);
      const ownedCollections = await listOwnedRecipeCollections({ limit: 50 });
      const memberships = await Promise.all(
        ownedCollections.map(async (collection) => ({
          collectionId: collection.id,
          recipes: await listCollectionRecipes(collection.id),
        })),
      );
      const nextIds = new Set(
        memberships
          .filter((membership) => membership.recipes.some((recipe) => recipe.recipe_id === recipeId))
          .map((membership) => membership.collectionId),
      );

      setCollections(ownedCollections);
      setCollectionIdsWithRecipe(nextIds);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Collections could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [recipeId]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timeout);
  }, [refresh]);

  async function createDefaultCollection() {
    try {
      setError(null);
      await createRecipeCollection({ name: 'New collection' });
      await refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Collection could not be created.');
    }
  }

  async function toggleCollection(collectionId: string) {
    try {
      setError(null);
      if (collectionIdsWithRecipe.has(collectionId)) {
        await removeRecipeFromCollection(collectionId, recipeId);
      } else {
        await addRecipeToCollection(collectionId, recipeId);
      }
      await refresh();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Collection could not be updated.');
    }
  }

  return (
    <AppCard>
      <View style={{ gap: spacing.md }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
          Collections
        </Text>
        {error ? (
          <Text selectable style={{ color: colors.danger }}>
            {error}
          </Text>
        ) : null}
        {isLoading ? (
          <Text selectable style={{ color: colors.mutedText }}>
            Loading collections...
          </Text>
        ) : null}
        {!isLoading && collections.length === 0 ? (
          <Text selectable style={{ color: colors.mutedText }}>
            Create a collection to organize this recipe.
          </Text>
        ) : null}
        {collections.map((collection) => {
          const isAdded = collectionIdsWithRecipe.has(collection.id);

          return (
            <View
              key={collection.id}
              style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
                  {collection.name}
                </Text>
                <Text selectable style={{ color: colors.mutedText }}>
                  {collection.visibility}
                </Text>
              </View>
              <AppButton onPress={() => toggleCollection(collection.id)} variant={isAdded ? 'ghost' : 'secondary'}>
                {isAdded ? 'Remove' : 'Add'}
              </AppButton>
            </View>
          );
        })}
        <AppButton onPress={createDefaultCollection} variant="secondary">
          New collection
        </AppButton>
      </View>
    </AppCard>
  );
}
