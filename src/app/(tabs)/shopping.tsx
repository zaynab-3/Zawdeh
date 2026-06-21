import * as React from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { FavoriteIngredientChip } from '@/components/pantry/FavoriteIngredientChip';
import { ShoppingItemRow } from '@/components/shopping/ShoppingItemRow';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePantry } from '@/features/pantry/usePantry';
import { useShoppingList } from '@/features/shopping/useShoppingList';
import { spacing, useThemeColors } from '@/lib/theme';
import { hasText } from '@/lib/validators';

export default function ShoppingScreen() {
  const colors = useThemeColors();
  const {
    addItem,
    clearCompleted,
    completedItems,
    error,
    filteredItems,
    isLoading,
    openItems,
    query,
    removeItem,
    setQuery,
    toggleItem,
  } = useShoppingList();
  const { favorites } = usePantry();
  const [category, setCategory] = React.useState('');
  const [name, setName] = React.useState('');
  const [quantity, setQuantity] = React.useState('');
  const [unit, setUnit] = React.useState('');

  async function handleAddItem() {
    if (!hasText(name)) {
      return;
    }

    await addItem({ category, name, quantity, unit });
    setName('');
    setQuantity('');
    setUnit('');
  }

  return (
    <Screen subtitle="Add anything manually or collect missing recipe ingredients." title="Shopping">
      <AppInput label="Search shopping" onChangeText={setQuery} placeholder="Tomatoes, rice, cheese" value={query} />

      <AppCard>
        <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {openItems.length} open
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {completedItems.length} done
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {filteredItems.length} shown
          </Text>
        </View>
      </AppCard>

      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      <AppInput label="Add item" onChangeText={setName} placeholder="Tomatoes, rice, cheese" value={name} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AppInput
          containerStyle={{ flex: 1 }}
          label="Qty"
          onChangeText={setQuantity}
          placeholder="3"
          value={quantity}
        />
        <AppInput containerStyle={{ flex: 1 }} label="Unit" onChangeText={setUnit} placeholder="large" value={unit} />
      </View>
      <AppInput label="Category" onChangeText={setCategory} placeholder="Produce, dairy, spices" value={category} />
      <AppButton disabled={!hasText(name)} onPress={handleAddItem}>
        Add item
      </AppButton>

      {favorites.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            Quick add favorites
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {favorites.map((ingredient) => (
              <FavoriteIngredientChip
                ingredient={ingredient}
                key={ingredient.id}
                onPress={() => addItem({ category: ingredient.category, name: ingredient.name })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {isLoading ? <LoadingState label="Loading shopping list" /> : null}

      {!isLoading && filteredItems.length === 0 ? (
        <EmptyState
          message={query ? 'Try another shopping search.' : 'Add items manually or from a recipe detail screen.'}
          title={query ? 'No matching items' : 'Shopping list is empty'}
        />
      ) : null}

      <View style={{ gap: spacing.md }}>
        {filteredItems.map((item) => (
          <ShoppingItemRow
            item={item}
            key={item.id}
            onRemove={() => removeItem(item.id)}
            onToggle={() => toggleItem(item.id)}
          />
        ))}
      </View>

      <AppButton disabled={completedItems.length === 0} onPress={clearCompleted} variant="secondary">
        Clear completed
      </AppButton>
    </Screen>
  );
}
