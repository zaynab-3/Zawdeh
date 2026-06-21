import * as React from 'react';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useRecipes } from '@/features/recipes/useRecipes';
import { spacing, useThemeColors } from '@/lib/theme';

export default function RecipesScreen() {
  const colors = useThemeColors();
  const {
    error,
    favoriteRecipes,
    filteredRecipes,
    isLoading,
    query,
    recentRecipes,
    recipes,
    setQuery,
    toggleFavorite,
  } = useRecipes();

  return (
    <Screen
      action={
        <Link href="/settings" asChild>
          <AppButton variant="ghost">Settings</AppButton>
        </Link>
      }
      subtitle="Saved recipes, favorites, and cookability at a glance."
      title="Recipes">
      <AppInput label="Search recipes" onChangeText={setQuery} placeholder="Mjadra, pantry, imported" value={query} />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Link href="/recipe/edit" asChild>
          <AppButton style={{ flex: 1 }}>Add recipe</AppButton>
        </Link>
        <Link href="/import" asChild>
          <AppButton style={{ flex: 1 }} variant="secondary">
            Import
          </AppButton>
        </Link>
      </View>

      <AppCard>
        <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {recipes.length} saved
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {favoriteRecipes.length} favorites
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {recentRecipes.length} recent
          </Text>
        </View>
      </AppCard>

      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      {isLoading ? <LoadingState label="Loading recipes" /> : null}

      {!isLoading && filteredRecipes.length === 0 ? (
        <EmptyState
          message={query ? 'Try another recipe name, tag, cuisine, or ingredient.' : 'Save a recipe manually or import one from a caption.'}
          title={query ? 'No matching recipes' : 'No recipes yet'}
        />
      ) : null}

      {favoriteRecipes.length > 0 && !query ? (
        <View style={{ gap: spacing.md }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            Favorites
          </Text>
          {favoriteRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} onToggleFavorite={() => toggleFavorite(recipe.id)} recipe={recipe} />
          ))}
        </View>
      ) : null}

      {filteredRecipes.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {query ? 'Search results' : 'All saved recipes'}
          </Text>
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} onToggleFavorite={() => toggleFavorite(recipe.id)} recipe={recipe} />
          ))}
        </View>
      ) : null}

      <Text selectable style={{ color: colors.mutedText }}>
        Missing an ingredient will never block a recipe. Skip it, substitute it, shop for it, or keep cooking.
      </Text>
    </Screen>
  );
}
