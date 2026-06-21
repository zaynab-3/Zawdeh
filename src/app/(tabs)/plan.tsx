import * as React from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { listMealPlanSlots } from '@/features/planner/plannerApi';
import type { MealPlanSlot, PlannerRange } from '@/features/planner/plannerTypes';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

const ranges: PlannerRange[] = ['Today', 'Tomorrow', 'This Week'];

export default function PlanScreen() {
  const colors = useThemeColors();
  const [range, setRange] = React.useState<PlannerRange>('Today');
  const [slots, setSlots] = React.useState<MealPlanSlot[]>([]);

  React.useEffect(() => {
    listMealPlanSlots(range).then(setSlots);
  }, [range]);

  return (
    <Screen subtitle="Assign recipes without forcing a perfect pantry match." title="Plan">
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {ranges.map((nextRange) => (
          <AppButton key={nextRange} onPress={() => setRange(nextRange)} variant={range === nextRange ? 'primary' : 'secondary'}>
            {nextRange}
          </AppButton>
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        {slots.map((slot) => (
          <AppCard key={slot.id}>
            <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
              {slot.label}
            </Text>
            <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md }}>
              {slot.recipeTitle ?? 'No recipe assigned'}
            </Text>
            <AppButton variant="secondary">Assign recipe</AppButton>
          </AppCard>
        ))}
      </View>
    </Screen>
  );
}
