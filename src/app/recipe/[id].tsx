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
import { getCookabilityLabel, formatRecipeTime, groupRecipeItemsBySection } from '@/features/recipes/recipeUtils';
import { useRecipe } from '@/features/recipes/useRecipes';
import { useShoppingList } from '@/features/shopping/useShoppingList';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

export default function RecipeDetailScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const recipeId = typeof id === 'string' ? id : undefined;
  const { error, isLoading, recipe, toggleFavorite } = useRecipe(recipeId);
  const { addRecipeIngredients } = useShoppingList();
  const [ingredientState, setIngredientState] = React.useState<{
    checkedIngredientIds: string[];
    recipeId?: string;
    statusMessage: string | null;
  }>({
    checkedIngredientIds: [],
    recipeId,
    statusMessage: null,
  });
  const activeIngredientState =
    ingredientState.recipeId === recipeId
      ? ingredientState
      : { checkedIngredientIds: [], recipeId, statusMessage: null };

  const missingIngredients = React.useMemo(
    () =>
      recipe?.ingredients.filter((ingredient) => !activeIngredientState.checkedIngredientIds.includes(ingredient.id)) ??
      [],
    [activeIngredientState.checkedIngredientIds, recipe],
  );
  const ingredientGroups = React.useMemo(
    () => groupRecipeItemsBySection(recipe?.ingredients ?? []),
    [recipe?.ingredients],
  );
  const stepGroups = React.useMemo(() => groupRecipeItemsBySection(recipe?.steps ?? []), [recipe?.steps]);

  function toggleIngredient(idToToggle: string) {
    setIngredientState((current) => {
      const currentIds = current.recipeId === recipeId ? current.checkedIngredientIds : [];

      return {
        checkedIngredientIds: currentIds.includes(idToToggle)
          ? currentIds.filter((ingredientId) => ingredientId !== idToToggle)
          : [...currentIds, idToToggle],
        recipeId,
        statusMessage: null,
      };
    });
  }

  async function addMissingToShopping() {
    if (!recipe) {
      return;
    }

    const count = await addRecipeIngredients(recipe.id, missingIngredients);
    setIngredientState((current) => ({
      ...current,
      recipeId,
      statusMessage:
        count > 0
          ? `${count} ${count === 1 ? 'ingredient' : 'ingredients'} added to shopping.`
          : 'Shopping already has these ingredients.',
    }));
  }

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
      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      <AppCard>
        <Text selectable style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: '800' }}>
          {getCookabilityLabel(recipe.cookability)}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md }}>
          {recipe.cuisine} / {recipe.mealType}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
          {[recipe.servings ? `${recipe.servings} servings` : null, formatRecipeTime(recipe.prepTimeMinutes), formatRecipeTime(recipe.cookTimeMinutes)]
            .filter(Boolean)
            .join(' / ') || 'Time and servings not set'}
        </Text>
        {recipe.sourcePlatform ? (
          <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
            Source: {recipe.sourcePlatform}
          </Text>
        ) : null}
      </AppCard>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {recipe.steps.length > 0 ? (
          <Link href={{ pathname: '/recipe/cook', params: { id: recipe.id } }} asChild>
            <AppButton>Start cooking</AppButton>
          </Link>
        ) : null}
        <Link href={{ pathname: '/recipe/edit', params: { id: recipe.id } }} asChild>
          <AppButton variant="secondary">Edit</AppButton>
        </Link>
        <AppButton onPress={() => toggleFavorite(recipe.id)} variant="ghost">
          {recipe.isFavorite ? 'Unfavorite' : 'Favorite'}
        </AppButton>
      </View>

      <View style={{ gap: spacing.md }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
          Ingredients
        </Text>
        <Text selectable style={{ color: colors.mutedText }}>
          Tap ingredients you already have. Unchecked items can be added to shopping.
        </Text>
        {ingredientGroups.map((group, groupIndex) => (
          <React.Fragment key={`${group.title ?? 'ingredients'}-${groupIndex}`}>
            {group.title ? (
              <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
                {group.title}
              </Text>
            ) : null}
            {group.items.map((ingredient) => (
              <IngredientRow
                ingredient={ingredient}
                isChecked={activeIngredientState.checkedIngredientIds.includes(ingredient.id)}
                key={ingredient.id}
                onToggle={() => toggleIngredient(ingredient.id)}
              />
            ))}
          </React.Fragment>
        ))}
        <AppButton disabled={missingIngredients.length === 0} onPress={addMissingToShopping} variant="secondary">
          Add missing to shopping
        </AppButton>
        {activeIngredientState.statusMessage ? (
          <Text selectable style={{ color: colors.primary }}>
            {activeIngredientState.statusMessage}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing.md }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
          Steps
        </Text>
        {recipe.steps.length > 0 ? (
          stepGroups.map((group, groupIndex) => (
            <React.Fragment key={`${group.title ?? 'steps'}-${groupIndex}`}>
              {group.title ? (
                <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
                  {group.title}
                </Text>
              ) : null}
              {group.items.map((step) => (
                <RecipeStepRow key={step.id} step={step} />
              ))}
            </React.Fragment>
          ))
        ) : (
          <Text selectable style={{ color: colors.mutedText }}>
            No steps added yet. Edit this recipe to add instructions.
          </Text>
        )}
      </View>

      {recipe.notes.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
            Notes
          </Text>
          {recipe.notes.map((note) => (
            <AppCard key={note}>
              <Text selectable style={{ color: colors.text }}>
                {note}
              </Text>
            </AppCard>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
