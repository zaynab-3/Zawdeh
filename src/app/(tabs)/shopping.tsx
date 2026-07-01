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
import { useAuth } from '@/features/auth/useAuth';
import { usePantry } from '@/features/pantry/usePantry';
import { useI18n } from '@/features/preferences/i18n';
import { ShoppingListShareModal } from '@/features/shopping/components/ShoppingListShareModal';
import { ShoppingListVisibilitySelector } from '@/features/shopping/components/ShoppingListVisibilitySelector';
import { getOrCreateDefaultShoppingList } from '@/features/shopping/shoppingApi';
import { useShoppingList } from '@/features/shopping/useShoppingList';
import { listOwnedShoppingLists, listShoppingLists } from '@/features/social/socialApi';
import type { Database, Visibility } from '@/types/database';
import { spacing, useThemeColors } from '@/lib/theme';
import { hasText } from '@/lib/validators';

type ShoppingList = Database['public']['Tables']['shopping_lists']['Row'];
type ShoppingScope = 'mine' | 'shared' | 'public';

const shoppingScopes: { label: string; value: ShoppingScope }[] = [
  { label: 'Mine', value: 'mine' },
  { label: 'Shared', value: 'shared' },
  { label: 'Public', value: 'public' },
];

export default function ShoppingScreen() {
  const colors = useThemeColors();
  const { t } = useI18n();
  const { user } = useAuth();
  const [isShareModalVisible, setIsShareModalVisible] = React.useState(false);
  const [listError, setListError] = React.useState<string | null>(null);
  const [lists, setLists] = React.useState<ShoppingList[]>([]);
  const [scope, setScope] = React.useState<ShoppingScope>('mine');
  const [selectedListId, setSelectedListId] = React.useState<string | undefined>();
  const selectedList = React.useMemo(
    () => lists.find((list) => list.id === selectedListId) ?? lists[0],
    [lists, selectedListId],
  );
  const isListOwner = !user || Boolean(selectedList && selectedList.user_id === user.id);
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
  } = useShoppingList({ listId: selectedList?.id, readOnly: !isListOwner });
  const { favorites } = usePantry();
  const [category, setCategory] = React.useState('');
  const [name, setName] = React.useState('');
  const [quantity, setQuantity] = React.useState('');
  const [unit, setUnit] = React.useState('');

  const refreshLists = React.useCallback(async () => {
    if (!user) {
      setLists([]);
      return;
    }

    try {
      setListError(null);
      if (scope === 'mine') {
        const ownedLists = await listOwnedShoppingLists({ limit: 50 });
        const nextLists = ownedLists.length > 0 ? ownedLists : [await getOrCreateDefaultShoppingList(user.id)];
        setLists(nextLists);
        setSelectedListId((current) => (current && nextLists.some((list) => list.id === current) ? current : nextLists[0]?.id));
        return;
      }

      const nextLists = await listShoppingLists({ limit: 50, visibility: scope as Visibility });
      setLists(nextLists);
      setSelectedListId((current) => (current && nextLists.some((list) => list.id === current) ? current : nextLists[0]?.id));
    } catch (loadError) {
      setListError(loadError instanceof Error ? loadError.message : 'Shopping lists could not be loaded.');
    }
  }, [scope, user]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      void refreshLists();
    }, 0);

    return () => clearTimeout(timeout);
  }, [refreshLists]);

  async function handleAddItem() {
    if (!hasText(name)) {
      return;
    }

    await addItem({ category, listId: selectedList?.id, name, quantity, unit });
    setName('');
    setQuantity('');
    setUnit('');
  }

  return (
    <Screen subtitle={t('shopping.subtitle')} title={t('shopping.title')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {shoppingScopes.map((option) => (
          <AppButton key={option.value} onPress={() => setScope(option.value)} variant={scope === option.value ? 'primary' : 'secondary'}>
            {option.label}
          </AppButton>
        ))}
      </View>
      {listError ? (
        <Text selectable style={{ color: colors.danger }}>
          {listError}
        </Text>
      ) : null}
      {lists.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {lists.map((list) => (
            <AppButton
              key={list.id}
              onPress={() => setSelectedListId(list.id)}
              variant={selectedList?.id === list.id ? 'primary' : 'secondary'}>
              {list.name}
            </AppButton>
          ))}
        </View>
      ) : null}
      {selectedList ? (
        <AppCard>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {selectedList.name}
          </Text>
          <Text selectable style={{ color: colors.mutedText }}>
            {selectedList.visibility} {isListOwner ? '/ owner' : '/ read-only'}
          </Text>
          {isListOwner ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <AppButton onPress={() => setIsShareModalVisible(true)} variant="secondary">
                Share list
              </AppButton>
            </View>
          ) : null}
        </AppCard>
      ) : null}
      {selectedList && isListOwner ? (
        <>
          <ShoppingListVisibilitySelector
            listId={selectedList.id}
            onChanged={refreshLists}
            visibility={selectedList.visibility}
          />
          <ShoppingListShareModal
            listId={selectedList.id}
            onClose={() => setIsShareModalVisible(false)}
            visible={isShareModalVisible}
          />
        </>
      ) : null}
      <AppInput label={t('shopping.search')} onChangeText={setQuery} placeholder={t('shopping.placeholder')} value={query} />

      <AppCard>
        <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {openItems.length} {t('common.open')}
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {completedItems.length} {t('common.done')}
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {filteredItems.length} {t('common.shown')}
          </Text>
        </View>
      </AppCard>

      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      {isListOwner ? (
        <>
          <AppInput label={t('shopping.addItem')} onChangeText={setName} placeholder={t('shopping.placeholder')} value={name} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <AppInput
              containerStyle={{ flex: 1 }}
              label={t('common.qty')}
              onChangeText={setQuantity}
              placeholder="3"
              value={quantity}
            />
            <AppInput containerStyle={{ flex: 1 }} label={t('common.unit')} onChangeText={setUnit} placeholder="large" value={unit} />
          </View>
          <AppInput label={t('common.category')} onChangeText={setCategory} placeholder={t('shopping.categoryPlaceholder')} value={category} />
          <AppButton disabled={!hasText(name)} onPress={handleAddItem}>
            {t('action.addItem')}
          </AppButton>
        </>
      ) : (
        <Text selectable style={{ color: colors.mutedText }}>
          Shared shopping lists are read-only unless edit access is granted later.
        </Text>
      )}

      {isListOwner && favorites.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            {t('shopping.quickAddFavorites')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {favorites.map((ingredient) => (
              <FavoriteIngredientChip
                ingredient={ingredient}
                key={ingredient.id}
                onPress={() => addItem({ category: ingredient.category, listId: selectedList?.id, name: ingredient.name })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {isLoading ? <LoadingState label={t('shopping.loading')} /> : null}

      {!isLoading && filteredItems.length === 0 ? (
        <EmptyState
          message={query ? t('shopping.noMatchesMessage') : t('shopping.emptyMessage')}
          title={query ? t('shopping.noMatchesTitle') : t('shopping.emptyTitle')}
        />
      ) : null}

      <View style={{ gap: spacing.md }}>
        {filteredItems.map((item) => (
          <ShoppingItemRow
            item={item}
            key={item.id}
            onRemove={isListOwner ? () => removeItem(item.id) : undefined}
            onToggle={isListOwner ? () => toggleItem(item.id) : undefined}
          />
        ))}
      </View>

      {isListOwner ? (
        <AppButton disabled={completedItems.length === 0} onPress={clearCompleted} variant="secondary">
          {t('action.clearCompleted')}
        </AppButton>
      ) : null}
    </Screen>
  );
}
