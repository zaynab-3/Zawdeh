import { Pressable, Text, View } from 'react-native';

import type { PantryItem } from '@/features/pantry/pantryTypes';
import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';

type PantryItemRowProps = {
  item: PantryItem;
  onToggle?: () => void;
};

export function PantryItemRow({ item, onToggle }: PantryItemRowProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onToggle}
      style={{
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        flexDirection: 'row',
        gap: spacing.md,
        justifyContent: 'space-between',
        padding: spacing.md,
      }}>
      <View style={{ flex: 1 }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '700' }}>
          {item.name}
        </Text>
        {item.quantity ? (
          <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
            {item.quantity}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: item.isAvailable ? colors.primary : colors.mutedText, fontSize: fontSize.sm }}>
        {item.isAvailable ? 'Available' : 'Missing'}
      </Text>
    </Pressable>
  );
}
