import { Pressable, Text, View } from 'react-native';

import type { PantryItem } from '@/features/pantry/pantryTypes';
import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';

type PantryItemRowProps = {
  item: PantryItem;
  onRemove?: () => void;
  onToggle?: () => void;
  onToggleFavorite?: () => void;
};

export function PantryItemRow({ item, onRemove, onToggle, onToggleFavorite }: PantryItemRowProps) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        gap: spacing.md,
        padding: spacing.md,
      }}>
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '700' }}>
            {item.name}
          </Text>
          <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
            {[item.quantity, item.unit, item.category].filter(Boolean).join(' / ') || 'No details'}
          </Text>
        </View>
        <Text style={{ color: item.isAvailable ? colors.primary : colors.mutedText, fontSize: fontSize.sm }}>
          {item.isAvailable ? 'Available' : 'Missing'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          onPress={onToggle}
          style={({ pressed }) => ({
            borderColor: colors.border,
            borderRadius: borderRadius.pill,
            borderWidth: 1,
            opacity: pressed ? 0.75 : 1,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          })}>
          <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '700' }}>
            {item.isAvailable ? 'Mark missing' : 'Mark available'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onToggleFavorite}
          style={({ pressed }) => ({
            backgroundColor: colors.surfaceAlt,
            borderRadius: borderRadius.pill,
            opacity: pressed ? 0.75 : 1,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          })}>
          <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '700' }}>
            {item.isFavorite ? 'Unfavorite' : 'Favorite'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onRemove}
          style={({ pressed }) => ({
            borderColor: colors.danger,
            borderRadius: borderRadius.pill,
            borderWidth: 1,
            opacity: pressed ? 0.75 : 1,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          })}>
          <Text style={{ color: colors.danger, fontSize: fontSize.sm, fontWeight: '700' }}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}
