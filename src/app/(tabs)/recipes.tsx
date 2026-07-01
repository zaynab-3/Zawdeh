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
import { useAuth } from '@/features/auth/useAuth';
import { useI18n } from '@/features/preferences/i18n';
import { type RecipeListScope } from '@/features/recipes/recipeApi';
import { useRecipes } from '@/features/recipes/useRecipes';
import { spacing, useThemeColors } from '@/lib/theme';

export default function RecipesScreen() {
  const colors = useThemeColors();
  const { t } = useI18n();
  const { user } = useAuth();
  const [scope, setScope] = React.useState<RecipeListScope>('mine');
  const {
    error,
    favoriteRecipes,
    filteredRecipes,
    isLoading,
    isTranslating,
    query,
    recentRecipes,
    recipes,
    setQuery,
    toggleFavorite,
  } = useRecipes({ scope });
  const recipeScopes: { label: string; value: RecipeListScope }[] = [
    { label: 'Mine', value: 'mine' },
    { label: 'Shared', value: 'shared' },
    { label: 'Public', value: 'public' },
  ];

  return (
    <Screen
      action={
        <Link href="/settings" asChild>
          <AppButton variant="ghost">{t('action.settings')}</AppButton>
        </Link>
      }
      subtitle={t('recipe.subtitle')}
      title={t('recipe.title')}>
      <AppInput label={t('recipe.search')} onChangeText={setQuery} placeholder={t('recipe.searchPlaceholder')} value={query} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {recipeScopes.map((option) => (
          <AppButton key={option.value} onPress={() => setScope(option.value)} variant={scope === option.value ? 'primary' : 'secondary'}>
            {option.label}
          </AppButton>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Link href="/recipe/edit" asChild>
          <AppButton style={{ flex: 1 }}>{t('action.addRecipe')}</AppButton>
        </Link>
        <Link href={'/collections' as never} asChild>
          <AppButton style={{ flex: 1 }} variant="secondary">
            Collections
          </AppButton>
        </Link>
        <Link href="/import" asChild>
          <AppButton style={{ flex: 1 }} variant="secondary">
            {t('action.import')}
          </AppButton>
        </Link>
      </View>

      <AppCard>
        <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {recipes.length} {t('common.saved')}
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {favoriteRecipes.length} {t('common.favorites')}
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {recentRecipes.length} {t('common.recent')}
          </Text>
        </View>
      </AppCard>

      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      {isLoading ? <LoadingState label={t('recipe.loadingRecipes')} /> : null}
      {!isLoading && isTranslating ? (
        <Text selectable style={{ color: colors.mutedText }}>
          {t('recipe.translating')}
        </Text>
      ) : null}

      {!isLoading && filteredRecipes.length === 0 ? (
        <EmptyState
          message={query ? t('recipe.emptySearchMessage') : t('recipe.emptyMessage')}
          title={query ? t('recipe.emptySearchTitle') : t('recipe.emptyTitle')}
        />
      ) : null}

      {favoriteRecipes.length > 0 && !query ? (
        <View style={{ gap: spacing.md }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {t('recipe.favorites')}
          </Text>
          {favoriteRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              onToggleFavorite={!user || recipe.userId === user.id ? () => toggleFavorite(recipe.id) : undefined}
              recipe={recipe}
            />
          ))}
        </View>
      ) : null}

      {filteredRecipes.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {query ? t('recipe.searchResults') : t('recipe.allSaved')}
          </Text>
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              onToggleFavorite={!user || recipe.userId === user.id ? () => toggleFavorite(recipe.id) : undefined}
              recipe={recipe}
            />
          ))}
        </View>
      ) : null}

      <Text selectable style={{ color: colors.mutedText }}>
        {t('recipe.tip')}
      </Text>
    </Screen>
  );
}
