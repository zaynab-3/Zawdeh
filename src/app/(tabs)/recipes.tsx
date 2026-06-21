import * as React from 'react';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { listRecipeSummaries } from '@/features/recipes/recipeApi';
import type { RecipeSummary } from '@/features/recipes/recipeTypes';
import { spacing, useThemeColors } from '@/lib/theme';

export default function RecipesScreen() {
  const colors = useThemeColors();
  const [isLoading, setIsLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [recipes, setRecipes] = React.useState<RecipeSummary[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    listRecipeSummaries(query)
      .then((nextRecipes) => {
        if (isMounted) {
          setRecipes(nextRecipes);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [query]);

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

      <Link href="/recipe/edit" asChild>
        <AppButton>Add recipe</AppButton>
      </Link>

      {isLoading ? <LoadingState label="Loading recipes" /> : null}

      {!isLoading && recipes.length === 0 ? (
        <EmptyState
          message="Save a recipe manually or import one from a caption."
          title="No recipes yet"
        />
      ) : null}

      <View style={{ gap: spacing.md }}>
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </View>

      <Text selectable style={{ color: colors.mutedText }}>
        Missing an ingredient will never block a recipe. Skip it, substitute it, shop for it, or keep cooking.
      </Text>
    </Screen>
  );
}
