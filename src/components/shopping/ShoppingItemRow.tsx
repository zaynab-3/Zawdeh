import { Pressable, Text, View } from 'react-native';

import type { ShoppingItem } from '@/features/shopping/shoppingTypes';
import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';

type ShoppingItemRowProps = {
  item: ShoppingItem;
  onToggle?: () => void;
};

export function ShoppingItemRow({ item, onToggle }: ShoppingItemRowProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.isChecked }}
      onPress={onToggle}
      style={{
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.md,
      }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: item.isChecked ? colors.primary : 'transparent',
          borderColor: colors.primary,
          borderRadius: borderRadius.sm,
          borderWidth: 1,
          height: 24,
          justifyContent: 'center',
          width: 24,
        }}>
        <Text style={{ color: colors.primaryText, fontSize: fontSize.sm }}>{item.isChecked ? 'x' : ''}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          selectable
          style={{
            color: item.isChecked ? colors.mutedText : colors.text,
            fontSize: fontSize.md,
            fontWeight: '700',
            textDecorationLine: item.isChecked ? 'line-through' : 'none',
          }}>
          {item.name}
        </Text>
        {item.quantity ? (
          <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
            {item.quantity}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
