import * as React from 'react';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { hasText } from '@/lib/validators';

export default function EditRecipeScreen() {
  const [ingredients, setIngredients] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  const [title, setTitle] = React.useState('');

  return (
    <Screen subtitle="Manual add/edit placeholder. Supabase writes will live in recipeApi." title="Save my version">
      <AppInput label="Title" onChangeText={setTitle} placeholder="Recipe name" value={title} />
      <AppInput
        label="Ingredients"
        multiline
        onChangeText={setIngredients}
        placeholder="One ingredient per line"
        value={ingredients}
      />
      <AppInput
        label="Instructions"
        multiline
        onChangeText={setInstructions}
        placeholder="One step per line"
        value={instructions}
      />
      <AppButton disabled={!hasText(title)}>Save recipe</AppButton>
    </Screen>
  );
}
