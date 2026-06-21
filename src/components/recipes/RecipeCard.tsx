import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { getCookabilityLabel } from '@/features/recipes/recipeUtils';
import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';
import type { RecipeSummary } from '@/features/recipes/recipeTypes';

type RecipeCardProps = {
  recipe: RecipeSummary;
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const colors = useThemeColors();

  return (
    <Link href={{ pathname: '/recipe/[id]', params: { id: recipe.id } }} asChild>
      <Pressable accessibilityRole="button">
        <AppCard>
          <View style={{ gap: spacing.sm }}>
            <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
              <Text selectable style={{ color: colors.text, flex: 1, fontSize: fontSize.lg, fontWeight: '800' }}>
                {recipe.title}
              </Text>
              <Text style={{ color: colors.accent, fontSize: fontSize.sm }}>
                {recipe.isFavorite ? 'Favorite' : 'Save'}
              </Text>
            </View>
            <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md, lineHeight: 21 }}>
              {recipe.description}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                borderRadius: borderRadius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}>
              <Text style={{ color: colors.text, fontSize: fontSize.sm }}>{getCookabilityLabel(recipe.cookability)}</Text>
            </View>
            {recipe.tags.slice(0, 2).map((tag) => (
              <View
                key={tag}
                style={{
                  borderColor: colors.border,
                  borderRadius: borderRadius.pill,
                  borderWidth: 1,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                }}>
                <Text style={{ color: colors.mutedText, fontSize: fontSize.sm }}>{tag}</Text>
              </View>
            ))}
          </View>
        </AppCard>
      </Pressable>
    </Link>
  );
}
