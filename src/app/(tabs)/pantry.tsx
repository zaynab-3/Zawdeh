import * as React from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { FavoriteIngredientChip } from '@/components/pantry/FavoriteIngredientChip';
import { PantryItemRow } from '@/components/pantry/PantryItemRow';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { listFavoriteIngredients, listPantryItems } from '@/features/pantry/pantryApi';
import type { FavoriteIngredient, PantryItem } from '@/features/pantry/pantryTypes';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

export default function PantryScreen() {
  const colors = useThemeColors();
  const [favorites, setFavorites] = React.useState<FavoriteIngredient[]>([]);
  const [items, setItems] = React.useState<PantryItem[]>([]);
  const [name, setName] = React.useState('');

  React.useEffect(() => {
    listPantryItems().then(setItems);
    listFavoriteIngredients().then(setFavorites);
  }, []);

  function toggleAvailable(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, isAvailable: !item.isAvailable } : item)),
    );
  }

  return (
    <Screen subtitle="Keep common staples and favorites close." title="Pantry">
      <AppInput label="Add ingredient" onChangeText={setName} placeholder="Mint, bulgur, laban" value={name} />
      <AppButton disabled={!name.trim()}>Add to pantry</AppButton>

      <View style={{ gap: spacing.sm }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
          Favorite ingredients
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {favorites.map((ingredient) => (
            <FavoriteIngredientChip key={ingredient.id} ingredient={ingredient} />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        {items.map((item) => (
          <PantryItemRow key={item.id} item={item} onToggle={() => toggleAvailable(item.id)} />
        ))}
      </View>
    </Screen>
  );
}
