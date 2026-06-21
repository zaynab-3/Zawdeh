import * as React from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { IngredientRow } from '@/components/recipes/IngredientRow';
import { RecipeStepRow } from '@/components/recipes/RecipeStepRow';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { getRecipeDetail } from '@/features/recipes/recipeApi';
import type { RecipeDetail } from '@/features/recipes/recipeTypes';
import { getCookabilityLabel } from '@/features/recipes/recipeUtils';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

export default function RecipeDetailScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [recipe, setRecipe] = React.useState<RecipeDetail | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    getRecipeDetail(id)
      .then((nextRecipe) => {
        if (isMounted) {
          setRecipe(nextRecipe);
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
  }, [id]);

  if (isLoading) {
    return (
      <Screen title="Recipe">
        <LoadingState label="Loading recipe" />
      </Screen>
    );
  }

  if (!recipe) {
    return (
      <Screen title="Recipe">
        <EmptyState message="This saved recipe was not found." title="Recipe unavailable" />
      </Screen>
    );
  }

  return (
    <Screen subtitle={recipe.description} title={recipe.title}>
      <AppCard>
        <Text selectable style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: '800' }}>
          {getCookabilityLabel(recipe.cookability)}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md }}>
          {recipe.cuisine} / {recipe.mealType}
        </Text>
      </AppCard>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Link href={{ pathname: '/recipe/cook', params: { id: recipe.id } }} asChild>
          <AppButton>Start cooking</AppButton>
        </Link>
        <Link href={{ pathname: '/recipe/edit', params: { id: recipe.id } }} asChild>
          <AppButton variant="secondary">Edit</AppButton>
        </Link>
      </View>

      <View style={{ gap: spacing.md }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
          Ingredients
        </Text>
        {recipe.ingredients.map((ingredient) => (
          <IngredientRow ingredient={ingredient} key={ingredient.id} />
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
          Steps
        </Text>
        {recipe.steps.map((step) => (
          <RecipeStepRow key={step.id} step={step} />
        ))}
      </View>
    </Screen>
  );
}
