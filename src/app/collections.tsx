import { Screen } from '@/components/layout/Screen';
import { CollectionManager } from '@/features/collections/CollectionManager';

export default function CollectionsScreen() {
  return (
    <Screen subtitle="Organize recipes into private, shared, or public directories." title="Collections">
      <CollectionManager />
    </Screen>
  );
}
