import * as React from 'react';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { createReviewDraft } from '@/features/imports/importParser';

export default function ReviewImportScreen() {
  const draft = React.useMemo(
    () =>
      createReviewDraft({
        rawText: 'Imported recipe',
        sourcePlatform: 'Instagram',
        sourceType: 'caption',
      }),
    [],
  );
  const [ingredients, setIngredients] = React.useState(draft.ingredients.map((item) => item.name).join('\n'));
  const [instructions, setInstructions] = React.useState(draft.steps.map((step) => step.instruction).join('\n'));
  const [notes, setNotes] = React.useState(draft.notes);
  const [tags, setTags] = React.useState(draft.tags.join(', '));
  const [title, setTitle] = React.useState(draft.title);

  return (
    <Screen subtitle="Review before saving. AI output is never trusted blindly." title="Review import">
      <AppCard>
        <AppInput label="Title" onChangeText={setTitle} value={title} />
        <AppInput label="Ingredients" multiline onChangeText={setIngredients} value={ingredients} />
        <AppInput label="Instructions" multiline onChangeText={setInstructions} value={instructions} />
        <AppInput label="Notes" multiline onChangeText={setNotes} value={notes} />
        <AppInput label="Tags" onChangeText={setTags} value={tags} />
      </AppCard>
      <AppCard>
        <AppInput editable={false} label="Confidence" value={draft.confidence} />
      </AppCard>
      <AppButton>Save recipe</AppButton>
    </Screen>
  );
}
