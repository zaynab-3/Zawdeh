import { Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import type { Visibility } from '@/types/database';
import { spacing, useThemeColors } from '@/lib/theme';

type VisibilitySegmentedControlProps = {
  disabled?: boolean;
  onChange: (visibility: Visibility) => void | Promise<void>;
  value: Visibility;
};

const visibilityOptions: { label: string; value: Visibility }[] = [
  { label: 'Private', value: 'private' },
  { label: 'Shared', value: 'shared' },
  { label: 'Public', value: 'public' },
];

export function VisibilitySegmentedControl({ disabled, onChange, value }: VisibilitySegmentedControlProps) {
  const colors = useThemeColors();

  return (
    <View style={{ gap: spacing.sm }}>
      <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
        Visibility
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {visibilityOptions.map((option) => (
          <AppButton
            disabled={disabled}
            key={option.value}
            onPress={() => onChange(option.value)}
            variant={value === option.value ? 'primary' : 'secondary'}>
            {option.label}
          </AppButton>
        ))}
      </View>
      <Text selectable style={{ color: colors.mutedText }}>
        Private is owner-only. Shared requires explicit access. Public can be discovered by signed-in users.
      </Text>
    </View>
  );
}
