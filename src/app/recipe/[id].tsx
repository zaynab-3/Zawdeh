import * as React from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { IngredientRow } from '@/components/recipes/IngredientRow';
import { RecipeStepRow } from '@/components/recipes/RecipeStepRow';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/features/auth/useAuth';
import { AddToCollectionPanel } from '@/features/collections/AddToCollectionPanel';
import { useI18n } from '@/features/preferences/i18n';
import { RecipeShareModal } from '@/features/recipes/components/RecipeShareModal';
import { RecipeVisibilitySelector } from '@/features/recipes/components/RecipeVisibilitySelector';
import { groupRecipeItemsBySection } from '@/features/recipes/recipeUtils';
import { useRecipe } from '@/features/recipes/useRecipes';
import { useShoppingList } from '@/features/shopping/useShoppingList';
import type { Visibility } from '@/types/database';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

export default function RecipeDetailScreen() {
  const colors = useThemeColors();
  const { formatLanguageName, formatRecipeTime, formatSourcePlatform, getCookabilityLabel, t } = useI18n();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const recipeId = typeof id === 'string' ? id : undefined;
  const { error, isLoading, isTranslating, recipe, removeRecipe, toggleFavorite } = useRecipe(recipeId);
  const { addRecipeIngredients } = useShoppingList();
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = React.useState(false);
  const [visibilityOverride, setVisibilityOverride] = React.useState<{
    recipeId: string;
    visibility: Visibility;
  } | null>(null);
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
  const isOwner = !user || !recipe?.userId || recipe.userId === user.id;
  const activeVisibilityOverride =
    visibilityOverride && visibilityOverride.recipeId === recipe?.id ? visibilityOverride.visibility : null;
  const currentVisibility =
    activeVisibilityOverride ?? recipe?.visibility ?? 'private';

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
          ? `${count} ${count === 1 ? t('recipe.ingredient') : t('common.ingredients')} ${t('recipe.addedToShopping')}`
          : t('recipe.shoppingAlreadyHasIngredients'),
    }));
  }

  async function deleteCurrentRecipe() {
    if (!recipe || isDeleting) {
      return;
    }

    try {
      setDeleteError(null);
      setIsDeleting(true);
      await removeRecipe(recipe.id);
      router.replace('/recipes');
    } catch (deleteRecipeError) {
      setDeleteError(deleteRecipeError instanceof Error ? deleteRecipeError.message : t('recipe.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  }

  function confirmDeleteRecipe() {
    Alert.alert(t('recipe.deleteConfirmMessage'), undefined, [
      { text: t('action.cancel'), style: 'cancel' },
      {
        onPress: () => {
          void deleteCurrentRecipe();
        },
        style: 'destructive',
        text: t('action.delete'),
      },
    ]);
  }

  if (isLoading) {
    return (
      <Screen title={t('recipe.loading')}>
        <LoadingState label={t('recipe.loading')} />
      </Screen>
    );
  }

  if (!recipe) {
    return (
      <Screen title={t('recipe.loading')}>
        <EmptyState message={t('recipe.notFoundMessage')} title={t('recipe.notFoundTitle')} />
      </Screen>
    );
  }

  if (isTranslating) {
    return (
      <Screen title={t('recipe.translating')}>
        <LoadingState label={t('recipe.translating')} />
      </Screen>
    );
  }

  return (
    <Screen subtitle={recipe.description} title={recipe.title}>
      {(deleteError ?? error) ? (
        <Text selectable style={{ color: colors.danger }}>
          {deleteError ?? error}
        </Text>
      ) : null}
      {isTranslating ? (
        <Text selectable style={{ color: colors.mutedText }}>
          {t('recipe.translating')}
        </Text>
      ) : null}

      <AppCard>
        <Text selectable style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: '800' }}>
          {getCookabilityLabel(recipe.cookability)}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md }}>
          {recipe.cuisine} {t('recipe.cuisineMealSeparator')} {recipe.mealType}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
          {[recipe.servings ? `${recipe.servings} ${t('common.servings')}` : null, formatRecipeTime(recipe.prepTimeMinutes), formatRecipeTime(recipe.cookTimeMinutes)]
            .filter(Boolean)
            .join(' / ') || t('time.notSet')}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
          {t('language.importedLanguage', { language: formatLanguageName(recipe.originalLanguage) })}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
          {t('recipe.importedSource', { source: formatSourcePlatform(recipe.sourcePlatform ?? recipe.sourceType) })}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
          Visibility: {currentVisibility}
        </Text>
      </AppCard>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {recipe.steps.length > 0 ? (
          <Link href={{ pathname: '/recipe/cook', params: { id: recipe.id } }} asChild>
            <AppButton>{t('action.startCooking')}</AppButton>
          </Link>
        ) : null}
        {isOwner ? (
          <>
            <Link href={{ pathname: '/recipe/edit', params: { id: recipe.id } }} asChild>
              <AppButton variant="secondary">{t('action.edit')}</AppButton>
            </Link>
            <AppButton onPress={() => toggleFavorite(recipe.id)} variant="ghost">
              {recipe.isFavorite ? t('action.unfavorite') : t('action.favorite')}
            </AppButton>
            <AppButton onPress={() => setIsShareModalVisible(true)} variant="secondary">
              Share
            </AppButton>
            <AppButton disabled={isDeleting} onPress={confirmDeleteRecipe} variant="danger">
              {isDeleting ? t('recipe.deleting') : t('action.deleteRecipe')}
            </AppButton>
          </>
        ) : (
          <Text selectable style={{ color: colors.mutedText }}>
            Shared recipe / owner controls hidden
          </Text>
        )}
      </View>

      {isOwner ? (
        <>
          <RecipeVisibilitySelector
            onChanged={(visibility) => setVisibilityOverride({ recipeId: recipe.id, visibility })}
            recipeId={recipe.id}
            visibility={currentVisibility}
          />
          <AddToCollectionPanel recipeId={recipe.id} />
          <RecipeShareModal
            onClose={() => setIsShareModalVisible(false)}
            recipeId={recipe.id}
            visible={isShareModalVisible}
          />
        </>
      ) : null}

      <View style={{ gap: spacing.md }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
          {t('recipeDetail.ingredients')}
        </Text>
        <Text selectable style={{ color: colors.mutedText }}>
          {t('recipe.ingredientsHelp')}
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
          {t('action.addMissingToShopping')}
        </AppButton>
        {activeIngredientState.statusMessage ? (
          <Text selectable style={{ color: colors.primary }}>
            {activeIngredientState.statusMessage}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing.md }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
          {t('recipeDetail.steps')}
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
            {t('recipe.noSteps')}
          </Text>
        )}
      </View>

      {recipe.notes.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
            {t('recipe.notes')}
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
