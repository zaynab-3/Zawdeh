import * as React from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  getPendingImportResultCandidates,
  removePendingImportResultCandidate,
  setPendingImportReview,
} from '@/features/imports/importStore';
import type { RecipeImportReview } from '@/features/imports/importTypes';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

function uniqueValues(values: (string | undefined)[]) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function getSections(candidate: RecipeImportReview) {
  return uniqueValues([
    ...candidate.ingredients.map((ingredient) => ingredient.section),
    ...candidate.steps.map((step) => step.section),
  ]);
}

export default function ImportResultsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [candidates, setCandidates] = React.useState(() => getPendingImportResultCandidates());

  function handleReview(candidate: RecipeImportReview) {
    setPendingImportReview(candidate);
    router.push('/import/review');
  }

  function handleSkip(index: number) {
    setCandidates(removePendingImportResultCandidate(index));
  }

  if (candidates.length === 0) {
    return (
      <Screen title="Detected recipes">
        <EmptyState message="Clean text or screenshots from the Import tab first." title="No recipe candidates" />
        <AppButton onPress={() => router.replace('/import')}>Back to import</AppButton>
      </Screen>
    );
  }

  return (
    <Screen subtitle="Review and save one recipe at a time." title="Detected recipes">
      {candidates.map((candidate, index) => {
        const sections = getSections(candidate);

        return (
          <AppCard key={`${candidate.title}-${index}`}>
            <View style={{ gap: spacing.sm }}>
              <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
                {candidate.title}
              </Text>
              <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm, lineHeight: 20 }}>
                {candidate.ingredients.length} ingredients - {candidate.steps.length} steps
              </Text>
              <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm, lineHeight: 20 }}>
                Sections: {sections.length > 0 ? sections.join(', ') : 'Main'}
              </Text>
              <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm, lineHeight: 20 }}>
                Confidence: {candidate.confidence}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <AppButton onPress={() => handleReview(candidate)} style={{ flex: 1 }}>
                  Review
                </AppButton>
                <AppButton onPress={() => handleSkip(index)} style={{ flex: 1 }} variant="ghost">
                  Skip
                </AppButton>
              </View>
            </View>
          </AppCard>
        );
      })}
    </Screen>
  );
}
