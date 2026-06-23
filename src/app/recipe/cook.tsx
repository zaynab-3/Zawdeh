import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { IngredientRow } from '@/components/recipes/IngredientRow';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { createCookModeSession } from '@/features/cook-mode/cookModeApi';
import { getRecipeDetail } from '@/features/recipes/recipeApi';
import { groupRecipeItemsBySection } from '@/features/recipes/recipeUtils';
import type { RecipeDetail } from '@/features/recipes/recipeTypes';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

export default function CookModeScreen() {
  const colors = useThemeColors();
  const { id = 'mjadra' } = useLocalSearchParams<{ id?: string }>();
  const [note, setNote] = React.useState('');
  const [recipe, setRecipe] = React.useState<RecipeDetail | null>(null);
  const [session, setSession] = React.useState(() => createCookModeSession(id));

  React.useEffect(() => {
    let isMounted = true;

    getRecipeDetail(id)
      .then((nextRecipe) => {
        if (isMounted) {
          setRecipe(nextRecipe);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRecipe(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const currentStep = recipe?.steps[session.currentStep - 1];
  const ingredientGroups = React.useMemo(
    () => groupRecipeItemsBySection(recipe?.ingredients ?? []),
    [recipe?.ingredients],
  );

  function goNext() {
    if (!recipe) {
      return;
    }
    setSession((current) => ({
      ...current,
      currentStep: Math.min(recipe.steps.length, current.currentStep + 1),
    }));
  }

  function goPrevious() {
    setSession((current) => ({ ...current, currentStep: Math.max(1, current.currentStep - 1) }));
  }

  return (
    <Screen subtitle={recipe?.title ?? 'Step-by-step cooking'} title="Cook mode">
      <AppCard>
        <Text selectable style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: '800' }}>
          Step {session.currentStep}
        </Text>
        {currentStep?.section ? (
          <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md, fontWeight: '800' }}>
            {currentStep.section}
          </Text>
        ) : null}
        <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800', lineHeight: 26 }}>
          {currentStep?.instruction ?? 'Load a recipe to start cooking.'}
        </Text>
      </AppCard>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AppButton onPress={goPrevious} variant="secondary">
          Previous
        </AppButton>
        <AppButton onPress={goNext}>Next</AppButton>
      </View>

      <View style={{ gap: spacing.md }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
          Ingredient checklist
        </Text>
        {ingredientGroups.map((group, groupIndex) => (
          <React.Fragment key={`${group.title ?? 'ingredients'}-${groupIndex}`}>
            {group.title ? (
              <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
                {group.title}
              </Text>
            ) : null}
            {group.items.map((ingredient) => (
              <IngredientRow ingredient={ingredient} key={ingredient.id} />
            ))}
          </React.Fragment>
        ))}
      </View>

      <AppInput label="Cooking note" multiline onChangeText={setNote} placeholder="What changed this time?" value={note} />
      <AppButton>Finish session</AppButton>
    </Screen>
  );
}
