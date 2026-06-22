import * as React from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppInput } from '@/components/ui/AppInput';
import {
  clearPendingImportReview,
  getPendingImportReview,
  getPendingImportReviewMessage,
} from '@/features/imports/importStore';
import type { RecipeIngredient, RecipeStep } from '@/features/recipes/recipeTypes';
import { parseRecipeLines, parseTags } from '@/features/recipes/recipeUtils';
import { useRecipes } from '@/features/recipes/useRecipes';
import { spacing, useThemeColors } from '@/lib/theme';
import { hasText, isHttpUrl } from '@/lib/validators';

function parseMinutes(value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseIngredients(value: string): RecipeIngredient[] {
  return parseRecipeLines(value).map((line, index) => {
    const [name, quantity, unit, note] = line.split('|').map((part) => part.trim());

    return {
      id: `ingredient-${index + 1}`,
      name,
      note: note || undefined,
      quantity: quantity || undefined,
      unit: unit || undefined,
    };
  });
}

function formatIngredients(ingredients: RecipeIngredient[]) {
  return ingredients
    .map((ingredient) =>
      [ingredient.name, ingredient.quantity, ingredient.unit, ingredient.note].filter(Boolean).join(' | '),
    )
    .join('\n');
}

function parseSteps(value: string): RecipeStep[] {
  return parseRecipeLines(value).map((instruction, index) => ({
    id: `step-${index + 1}`,
    instruction,
    position: index + 1,
  }));
}

export default function ReviewImportScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { saveRecipe } = useRecipes();
  const draft = React.useMemo(() => getPendingImportReview(), []);
  const reviewMessage = React.useMemo(() => getPendingImportReviewMessage(), []);
  const [cookTimeMinutes, setCookTimeMinutes] = React.useState(
    draft?.cookTimeMinutes ? String(draft.cookTimeMinutes) : '',
  );
  const [error, setError] = React.useState<string | null>(null);
  const [ingredients, setIngredients] = React.useState(draft ? formatIngredients(draft.ingredients) : '');
  const [instructions, setInstructions] = React.useState(draft?.steps.map((step) => step.instruction).join('\n') ?? '');
  const [notes, setNotes] = React.useState(draft?.notes ?? '');
  const [prepTimeMinutes, setPrepTimeMinutes] = React.useState(
    draft?.prepTimeMinutes ? String(draft.prepTimeMinutes) : '',
  );
  const [servings, setServings] = React.useState(draft?.servings ?? '');
  const [sourcePlatform, setSourcePlatform] = React.useState(draft?.sourcePlatform ?? 'Instagram');
  const [sourceUrl, setSourceUrl] = React.useState(draft?.sourceUrl ?? '');
  const [tags, setTags] = React.useState(draft?.tags.join(', ') ?? '');
  const [title, setTitle] = React.useState(draft?.title ?? '');

  async function handleSave() {
    const parsedIngredients = parseIngredients(ingredients);
    const parsedSteps = parseSteps(instructions);

    if (!hasText(title)) {
      setError('Recipe title is required.');
      return;
    }

    if (parsedIngredients.length === 0 && parsedSteps.length === 0) {
      setError('Add at least one ingredient or one instruction.');
      return;
    }

    if (!isHttpUrl(sourceUrl)) {
      setError('Source URL must start with http:// or https://.');
      return;
    }

    try {
      setError(null);
      const savedRecipe = await saveRecipe({
        cookTimeMinutes: parseMinutes(cookTimeMinutes),
        cookability: 'needs_shopping',
        cuisine: 'Home cooking',
        description: draft?.description ?? 'Imported from pasted text.',
        ingredients: parsedIngredients,
        mealType: 'Anytime',
        notes,
        prepTimeMinutes: parseMinutes(prepTimeMinutes),
        servings,
        sourcePlatform,
        sourceUrl,
        steps: parsedSteps,
        tags: parseTags(tags),
        title,
      });

      clearPendingImportReview();
      router.replace({ pathname: '/recipe/[id]', params: { id: savedRecipe.id } });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Recipe could not be saved.');
    }
  }

  if (!draft) {
    return (
      <Screen title="Review import">
        <EmptyState message="Paste caption text from the Import tab first." title="No import to review" />
      </Screen>
    );
  }

  return (
    <Screen subtitle="Edit the pasted recipe details before saving." title="Review import">
      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      {reviewMessage ? (
        <Text selectable style={{ color: colors.danger }}>
          {reviewMessage}
        </Text>
      ) : null}

      <AppCard>
        <AppInput label="Title" onChangeText={setTitle} value={title} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <AppInput
            containerStyle={{ flex: 1 }}
            label="Servings"
            onChangeText={setServings}
            value={servings}
          />
          <AppInput
            containerStyle={{ flex: 1 }}
            keyboardType="number-pad"
            label="Prep min"
            onChangeText={setPrepTimeMinutes}
            value={prepTimeMinutes}
          />
          <AppInput
            containerStyle={{ flex: 1 }}
            keyboardType="number-pad"
            label="Cook min"
            onChangeText={setCookTimeMinutes}
            value={cookTimeMinutes}
          />
        </View>
        <AppInput
          label="Ingredients"
          multiline
          onChangeText={setIngredients}
          placeholder="Tomatoes | 2 | cups"
          value={ingredients}
        />
        <AppInput
          label="Instructions"
          multiline
          onChangeText={setInstructions}
          placeholder="One instruction per line"
          value={instructions}
        />
        <AppInput label="Notes" multiline onChangeText={setNotes} value={notes} />
        <AppInput label="Tags" onChangeText={setTags} value={tags} />
      </AppCard>

      <AppCard>
        <AppInput editable={false} label="Confidence" value={draft.confidence} />
        <AppInput editable={false} label="Original language" value={draft.originalLanguage ?? 'Unknown'} />
        <AppInput label="Source platform" onChangeText={setSourcePlatform} value={sourcePlatform} />
        <AppInput label="Source URL" onChangeText={setSourceUrl} placeholder="https://..." value={sourceUrl} />
      </AppCard>

      <AppButton disabled={!hasText(title)} onPress={handleSave}>
        Save recipe
      </AppButton>
    </Screen>
  );
}
