import * as React from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { FavoriteIngredientChip } from '@/components/pantry/FavoriteIngredientChip';
import { PantryItemRow } from '@/components/pantry/PantryItemRow';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePantry } from '@/features/pantry/usePantry';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';
import { hasText } from '@/lib/validators';

export default function PantryScreen() {
  const colors = useThemeColors();
  const {
    addFavorite,
    addItem,
    availableItems,
    error,
    favorites,
    filteredItems,
    isLoading,
    missingItems,
    query,
    quickAddFavorite,
    removeItem,
    setQuery,
    toggleAvailable,
    toggleFavorite,
  } = usePantry();
  const [category, setCategory] = React.useState('');
  const [favoriteName, setFavoriteName] = React.useState('');
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

  async function handleAddFavorite() {
    if (!hasText(favoriteName)) {
      return;
    }

    await addFavorite({ category, id: '', name: favoriteName });
    setFavoriteName('');
  }

  return (
    <Screen subtitle="Keep common staples and favorites close." title="Pantry">
      <AppInput label="Search pantry" onChangeText={setQuery} placeholder="Mint, bulgur, laban" value={query} />

      <AppCard>
        <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {availableItems.length} available
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {missingItems.length} missing
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {favorites.length} favorites
          </Text>
        </View>
      </AppCard>

      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <AppInput label="Add ingredient" onChangeText={setName} placeholder="Mint, bulgur, laban" value={name} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <AppInput
            containerStyle={{ flex: 1 }}
            label="Qty"
            onChangeText={setQuantity}
            placeholder="2"
            value={quantity}
          />
          <AppInput containerStyle={{ flex: 1 }} label="Unit" onChangeText={setUnit} placeholder="cups" value={unit} />
        </View>
        <AppInput label="Category" onChangeText={setCategory} placeholder="Produce, staples, spices" value={category} />
        <AppButton disabled={!hasText(name)} onPress={handleAddItem}>
          Add to pantry
        </AppButton>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
          Favorite ingredients
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <AppInput
            containerStyle={{ flex: 1 }}
            label="New favorite"
            onChangeText={setFavoriteName}
            placeholder="Garlic"
            value={favoriteName}
          />
          <View style={{ justifyContent: 'flex-end' }}>
            <AppButton disabled={!hasText(favoriteName)} onPress={handleAddFavorite} variant="secondary">
              Save
            </AppButton>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {favorites.map((ingredient) => (
            <FavoriteIngredientChip
              key={ingredient.id}
              ingredient={ingredient}
              onPress={() => quickAddFavorite(ingredient)}
            />
          ))}
        </View>
      </View>

      {isLoading ? <LoadingState label="Loading pantry" /> : null}

      {!isLoading && filteredItems.length === 0 ? (
        <EmptyState
          message={query ? 'Try another pantry search.' : 'Add your first staple ingredient.'}
          title={query ? 'No matching pantry items' : 'Pantry is empty'}
        />
      ) : null}

      <View style={{ gap: spacing.md }}>
        {filteredItems.map((item) => (
          <PantryItemRow
            item={item}
            key={item.id}
            onRemove={() => removeItem(item.id)}
            onToggle={() => toggleAvailable(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        ))}
      </View>
    </Screen>
  );
}
