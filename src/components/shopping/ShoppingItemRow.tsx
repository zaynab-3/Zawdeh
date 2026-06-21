import { Pressable, Text, View } from 'react-native';

import type { ShoppingItem } from '@/features/shopping/shoppingTypes';
import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';

type ShoppingItemRowProps = {
  item: ShoppingItem;
  onRemove?: () => void;
  onToggle?: () => void;
};

export function ShoppingItemRow({ item, onRemove, onToggle }: ShoppingItemRowProps) {
  const colors = useThemeColors();

  return (
    <View
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
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.isChecked }}
        onPress={onToggle}
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
      </Pressable>
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
            {[item.quantity, item.unit, item.category].filter(Boolean).join(' / ')}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onRemove}
        style={({ pressed }) => ({
          borderColor: colors.border,
          borderRadius: borderRadius.pill,
          borderWidth: 1,
          opacity: pressed ? 0.75 : 1,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        })}>
        <Text style={{ color: colors.mutedText, fontSize: fontSize.sm, fontWeight: '700' }}>Remove</Text>
      </Pressable>
    </View>
  );
}
