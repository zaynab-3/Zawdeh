import * as React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { LoadingState } from '@/components/ui/LoadingState';
import { useI18n } from '@/features/preferences/i18n';
import type { RecipeDetail, RecipeDraft, RecipeIngredient, RecipeStep } from '@/features/recipes/recipeTypes';
import { parseRecipeLines, parseTags } from '@/features/recipes/recipeUtils';
import { useRecipe } from '@/features/recipes/useRecipes';
import { VisibilitySegmentedControl } from '@/features/social/components/VisibilitySegmentedControl';
import type { Visibility } from '@/types/database';
import { spacing, useThemeColors } from '@/lib/theme';
import { hasText, isHttpUrl } from '@/lib/validators';

function getKnownSections(items: { section?: string }[]) {
  return new Set(
    items.map((item) => item.section?.trim().toLowerCase()).filter((item): item is string => Boolean(item)),
  );
}

function normalizeSectionTitle(value: string) {
  return value.trim().replace(/:$/u, '');
}

function isSectionHeading(line: string, knownSections: Set<string>) {
  const normalized = normalizeSectionTitle(line).toLowerCase();
  return Boolean(normalized && !line.includes('|') && (line.trim().endsWith(':') || knownSections.has(normalized)));
}

function parseMinutes(value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function formatIngredients(ingredients: RecipeIngredient[]) {
  const hasSections = ingredients.some((ingredient) => ingredient.section);
  const lines: string[] = [];
  let currentSection: string | undefined;

  ingredients.forEach((ingredient) => {
    if (hasSections && ingredient.section !== currentSection) {
      if (lines.length > 0) {
        lines.push('');
      }

      currentSection = ingredient.section;
      lines.push(currentSection || 'Main');
    }

    lines.push([ingredient.name, ingredient.quantity, ingredient.unit, ingredient.note].filter(Boolean).join(' | '));
  });

  return lines.join('\n');
}

function parseIngredients(value: string, knownSections: Set<string>): RecipeIngredient[] {
  let currentSection: string | undefined;

  return parseRecipeLines(value).flatMap((line, index) => {
    if (isSectionHeading(line, knownSections)) {
      currentSection = normalizeSectionTitle(line);
      return [];
    }

    const [name, quantity, unit, note] = line.split('|').map((part) => part.trim());

    return [
      {
        id: `ingredient-${index + 1}`,
        name,
        note: note || undefined,
        quantity: quantity || undefined,
        section: currentSection,
        unit: unit || undefined,
      },
    ];
  });
}

function formatSteps(steps: RecipeStep[]) {
  const hasSections = steps.some((step) => step.section);
  const lines: string[] = [];
  let currentSection: string | undefined;

  steps.forEach((step) => {
    if (hasSections && step.section !== currentSection) {
      if (lines.length > 0) {
        lines.push('');
      }

      currentSection = step.section;
      lines.push(currentSection || 'Main');
    }

    lines.push(step.instruction);
  });

  return lines.join('\n');
}

function parseSteps(value: string, knownSections: Set<string>): RecipeStep[] {
  let currentSection: string | undefined;

  return parseRecipeLines(value).flatMap((instruction, index) => {
    if (isSectionHeading(instruction, knownSections)) {
      currentSection = normalizeSectionTitle(instruction);
      return [];
    }

    return [
      {
        id: `step-${index + 1}`,
        instruction,
        position: index + 1,
        section: currentSection,
      },
    ];
  });
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
  const { language, t } = useI18n();
  const [cookTimeMinutes, setCookTimeMinutes] = React.useState(
    recipe?.cookTimeMinutes ? String(recipe.cookTimeMinutes) : '',
  );
  const [cuisine, setCuisine] = React.useState(recipe?.cuisine ?? t('recipe.defaultCuisine'));
  const [description, setDescription] = React.useState(recipe?.description ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [ingredients, setIngredients] = React.useState(recipe ? formatIngredients(recipe.ingredients) : '');
  const [instructions, setInstructions] = React.useState(recipe ? formatSteps(recipe.steps) : '');
  const [mealType, setMealType] = React.useState(recipe?.mealType ?? t('recipe.defaultMeal'));
  const [notes, setNotes] = React.useState(recipe ? recipe.notes.join('\n') : '');
  const [prepTimeMinutes, setPrepTimeMinutes] = React.useState(
    recipe?.prepTimeMinutes ? String(recipe.prepTimeMinutes) : '',
  );
  const [servings, setServings] = React.useState(recipe?.servings ?? '');
  const [sourcePlatform, setSourcePlatform] = React.useState(recipe?.sourcePlatform ?? 'Manual');
  const [sourceUrl, setSourceUrl] = React.useState(recipe?.sourceUrl ?? '');
  const [tags, setTags] = React.useState(recipe ? recipe.tags.join(', ') : '');
  const [title, setTitle] = React.useState(recipe?.title ?? '');
  const [visibility, setVisibility] = React.useState<Visibility>(recipe?.visibility ?? 'private');
  const knownIngredientSections = React.useMemo(() => getKnownSections(recipe?.ingredients ?? []), [recipe]);
  const knownStepSections = React.useMemo(() => getKnownSections(recipe?.steps ?? []), [recipe]);

  async function handleSave() {
    const parsedIngredients = parseIngredients(ingredients, knownIngredientSections);
    const parsedSteps = parseSteps(instructions, knownStepSections);

    if (!hasText(title)) {
      setError(t('edit.titleRequired'));
      return;
    }

    if (parsedIngredients.length === 0 && parsedSteps.length === 0) {
      setError(t('edit.addInstructionError'));
      return;
    }

    if (!isHttpUrl(sourceUrl)) {
      setError(t('edit.urlError'));
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
        originalLanguage: recipe?.originalLanguage,
        prepTimeMinutes: parseMinutes(prepTimeMinutes),
        savedLanguage: recipe?.originalLanguage ?? recipe?.savedLanguage ?? language,
        servings,
        sourcePlatform,
        sourceType: recipe?.sourceType ?? (sourcePlatform === 'Manual' ? 'manual' : 'caption'),
        sourceUrl,
        steps: parsedSteps,
        tags: parseTags(tags),
        title,
        visibility,
      });

      router.replace({ pathname: '/recipe/[id]', params: { id: savedRecipe.id } });
    } catch {
      setError(t('edit.saveError'));
    }
  }

  return (
    <Screen subtitle={t('edit.subtitle')} title={t('edit.title')}>
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

      <AppInput label={t('common.title')} onChangeText={setTitle} placeholder={t('edit.recipeNamePlaceholder')} value={title} />
      <VisibilitySegmentedControl onChange={setVisibility} value={visibility} />
      <AppInput
        label={t('edit.description')}
        multiline
        onChangeText={setDescription}
        placeholder={t('edit.descriptionPlaceholder')}
        value={description}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AppInput
          containerStyle={{ flex: 1 }}
          label={t('common.cuisine')}
          onChangeText={setCuisine}
          placeholder={t('edit.cuisinePlaceholder')}
          value={cuisine}
        />
        <AppInput
          containerStyle={{ flex: 1 }}
          label={t('edit.meal')}
          onChangeText={setMealType}
          placeholder={t('edit.mealPlaceholder')}
          value={mealType}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AppInput
          containerStyle={{ flex: 1 }}
          keyboardType="number-pad"
          label={t('common.prepMin')}
          onChangeText={setPrepTimeMinutes}
          placeholder="10"
          value={prepTimeMinutes}
        />
        <AppInput
          containerStyle={{ flex: 1 }}
          keyboardType="number-pad"
          label={t('common.cookMin')}
          onChangeText={setCookTimeMinutes}
          placeholder="25"
          value={cookTimeMinutes}
        />
      </View>
      <AppInput label={t('common.servings')} onChangeText={setServings} placeholder="4" value={servings} />
      <AppInput
        label={t('recipeDetail.ingredients')}
        multiline
        onChangeText={setIngredients}
        placeholder={t('edit.ingredientsPlaceholder')}
        value={ingredients}
      />
      <AppInput
        label={t('review.instructionsLabel')}
        multiline
        onChangeText={setInstructions}
        placeholder={t('edit.instructionsPlaceholder')}
        value={instructions}
      />
      <AppInput label={t('common.tags')} onChangeText={setTags} placeholder={t('edit.tagsPlaceholder')} value={tags} />
      <AppInput label={t('recipe.notes')} multiline onChangeText={setNotes} placeholder={t('edit.notesPlaceholder')} value={notes} />
      <AppInput label={t('edit.source')} onChangeText={setSourcePlatform} placeholder={t('edit.sourcePlaceholder')} value={sourcePlatform} />
      <AppInput label={t('common.sourceLink')} onChangeText={setSourceUrl} placeholder="https://..." value={sourceUrl} />
      <AppButton disabled={!hasText(title)} onPress={handleSave}>
        {t('action.saveRecipe')}
      </AppButton>
    </Screen>
  );
}

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const recipeId = typeof id === 'string' ? id : undefined;
  const { error: loadError, isLoading, recipe, saveRecipe } = useRecipe(recipeId, { translate: false });
  const { t } = useI18n();

  if (recipeId && isLoading) {
    return (
      <Screen title={t('edit.title')}>
        <LoadingState label={t('edit.loadRecipe')} />
      </Screen>
    );
  }

  return <EditRecipeForm key={recipe?.id ?? 'new'} loadError={loadError} recipe={recipe} saveRecipe={saveRecipe} />;
}
