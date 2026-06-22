import * as React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { LoadingState } from '@/components/ui/LoadingState';
import type { RecipeDetail, RecipeDraft, RecipeIngredient, RecipeStep } from '@/features/recipes/recipeTypes';
import { parseRecipeLines, parseTags } from '@/features/recipes/recipeUtils';
import { useRecipe } from '@/features/recipes/useRecipes';
import { spacing, useThemeColors } from '@/lib/theme';
import { hasText, isHttpUrl } from '@/lib/validators';

function parseMinutes(value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function formatIngredients(ingredients: RecipeIngredient[]) {
  return ingredients
    .map((ingredient) =>
      [ingredient.name, ingredient.quantity, ingredient.unit, ingredient.note].filter(Boolean).join(' | '),
    )
    .join('\n');
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

function parseSteps(value: string): RecipeStep[] {
  return parseRecipeLines(value).map((instruction, index) => ({
    id: `step-${index + 1}`,
    instruction,
    position: index + 1,
  }));
}

type SaveRecipe = (draft: RecipeDraft) => Promise<RecipeDetail>;

type EditRecipeFormProps = {
  loadError: string | null;
  recipe: RecipeDetail | null;
  saveRecipe: SaveRecipe;
};

function EditRecipeForm({ loadError, recipe, saveRecipe }: EditRecipeFormProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const [cookTimeMinutes, setCookTimeMinutes] = React.useState(
    recipe?.cookTimeMinutes ? String(recipe.cookTimeMinutes) : '',
  );
  const [cuisine, setCuisine] = React.useState(recipe?.cuisine ?? 'Home cooking');
  const [description, setDescription] = React.useState(recipe?.description ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [ingredients, setIngredients] = React.useState(recipe ? formatIngredients(recipe.ingredients) : '');
  const [instructions, setInstructions] = React.useState(
    recipe ? recipe.steps.map((step) => step.instruction).join('\n') : '',
  );
  const [mealType, setMealType] = React.useState(recipe?.mealType ?? 'Anytime');
  const [notes, setNotes] = React.useState(recipe ? recipe.notes.join('\n') : '');
  const [prepTimeMinutes, setPrepTimeMinutes] = React.useState(
    recipe?.prepTimeMinutes ? String(recipe.prepTimeMinutes) : '',
  );
  const [servings, setServings] = React.useState(recipe?.servings ?? '');
  const [sourcePlatform, setSourcePlatform] = React.useState(recipe?.sourcePlatform ?? 'Manual');
  const [sourceUrl, setSourceUrl] = React.useState(recipe?.sourceUrl ?? '');
  const [tags, setTags] = React.useState(recipe ? recipe.tags.join(', ') : '');
  const [title, setTitle] = React.useState(recipe?.title ?? '');

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
        cookability: recipe?.cookability ?? 'needs_shopping',
        cuisine,
        description,
        id: recipe?.id,
        ingredients: parsedIngredients,
        isFavorite: recipe?.isFavorite,
        mealType,
        notes,
        prepTimeMinutes: parseMinutes(prepTimeMinutes),
        servings,
        sourcePlatform,
        sourceUrl,
        steps: parsedSteps,
        tags: parseTags(tags),
        title,
      });

      router.replace({ pathname: '/recipe/[id]', params: { id: savedRecipe.id } });
    } catch {
      setError('Recipe could not be saved.');
    }
  }

  return (
    <Screen subtitle="Save a recipe manually while database writes are still being configured." title="Save my version">
      {loadError ? (
        <Text selectable style={{ color: colors.danger }}>
          {loadError}
        </Text>
      ) : null}
      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      <AppInput label="Title" onChangeText={setTitle} placeholder="Recipe name" value={title} />
      <AppInput
        label="Description"
        multiline
        onChangeText={setDescription}
        placeholder="Short summary"
        value={description}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AppInput
          containerStyle={{ flex: 1 }}
          label="Cuisine"
          onChangeText={setCuisine}
          placeholder="Lebanese"
          value={cuisine}
        />
        <AppInput
          containerStyle={{ flex: 1 }}
          label="Meal"
          onChangeText={setMealType}
          placeholder="Dinner"
          value={mealType}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AppInput
          containerStyle={{ flex: 1 }}
          keyboardType="number-pad"
          label="Prep min"
          onChangeText={setPrepTimeMinutes}
          placeholder="10"
          value={prepTimeMinutes}
        />
        <AppInput
          containerStyle={{ flex: 1 }}
          keyboardType="number-pad"
          label="Cook min"
          onChangeText={setCookTimeMinutes}
          placeholder="25"
          value={cookTimeMinutes}
        />
      </View>
      <AppInput label="Servings" onChangeText={setServings} placeholder="4" value={servings} />
      <AppInput
        label="Ingredients"
        multiline
        onChangeText={setIngredients}
        placeholder="Rice | 1 | cup"
        value={ingredients}
      />
      <AppInput
        label="Instructions"
        multiline
        onChangeText={setInstructions}
        placeholder="One step per line"
        value={instructions}
      />
      <AppInput label="Tags" onChangeText={setTags} placeholder="pantry, quick, vegan" value={tags} />
      <AppInput label="Notes" multiline onChangeText={setNotes} placeholder="One note per line" value={notes} />
      <AppInput label="Source" onChangeText={setSourcePlatform} placeholder="Manual, Instagram, TikTok" value={sourcePlatform} />
      <AppInput label="Source URL" onChangeText={setSourceUrl} placeholder="https://..." value={sourceUrl} />
      <AppButton disabled={!hasText(title)} onPress={handleSave}>
        Save recipe
      </AppButton>
    </Screen>
  );
}

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const recipeId = typeof id === 'string' ? id : undefined;
  const { error: loadError, isLoading, recipe, saveRecipe } = useRecipe(recipeId);

  if (recipeId && isLoading) {
    return (
      <Screen title="Save my version">
        <LoadingState label="Loading recipe" />
      </Screen>
    );
  }

  return <EditRecipeForm key={recipe?.id ?? 'new'} loadError={loadError} recipe={recipe} saveRecipe={saveRecipe} />;
}
