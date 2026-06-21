import * as React from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ShoppingItemRow } from '@/components/shopping/ShoppingItemRow';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { listShoppingItems } from '@/features/shopping/shoppingApi';
import type { ShoppingItem } from '@/features/shopping/shoppingTypes';
import { spacing } from '@/lib/theme';

export default function ShoppingScreen() {
  const [items, setItems] = React.useState<ShoppingItem[]>([]);
  const [name, setName] = React.useState('');

  React.useEffect(() => {
    listShoppingItems().then(setItems);
  }, []);

  function toggleItem(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, isChecked: !item.isChecked } : item)),
    );
  }

  function clearCompleted() {
    setItems((current) => current.filter((item) => !item.isChecked));
  }

  return (
    <Screen subtitle="Add anything manually or collect missing recipe ingredients." title="Shopping">
      <AppInput label="Add item" onChangeText={setName} placeholder="Tomatoes, rice, cheese" value={name} />
      <AppButton disabled={!name.trim()}>Add item</AppButton>

      <View style={{ gap: spacing.md }}>
        {items.map((item) => (
          <ShoppingItemRow key={item.id} item={item} onToggle={() => toggleItem(item.id)} />
        ))}
      </View>

      <AppButton onPress={clearCompleted} variant="secondary">
        Clear completed
      </AppButton>
    </Screen>
  );
}
