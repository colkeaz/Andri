import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { dbService } from '../database/db';
import { Package, AlertCircle, CircleX, Boxes } from 'lucide-react-native';

type InventoryItem = {
  id: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  min_stock: number;
};

const FALLBACK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Coke 1.5L', quantity: 12, min_stock: 5 },
  { id: '2', name: 'Lucky Me Noodles', quantity: 2, min_stock: 10 },
  { id: '3', name: 'Bear Brand 320g', quantity: 45, min_stock: 10 },
  { id: '4', name: 'Egg (Large)', quantity: 120, min_stock: 50 },
];

export const InventoryScreen: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const hydrateInventory = async () => {
    try {
      const products = await dbService.getProducts();
      if (!Array.isArray(products) || products.length === 0) {
        setInventory(FALLBACK_INVENTORY);
        setIsUsingFallback(true);
        return;
      }

      const mappedItems: InventoryItem[] = products.map((product: any) => ({
        id: String(product.id),
        name: product.name ?? 'Unnamed item',
        barcode: product.barcode ?? null,
        quantity: 0,
        min_stock: Number(product.min_stock_level ?? 5),
      }));

      setInventory(mappedItems);
      setIsUsingFallback(false);
    } catch {
      setInventory(FALLBACK_INVENTORY);
      setIsUsingFallback(true);
    }
  };

  useEffect(() => {
    const load = async () => {
      await hydrateInventory();
      setIsLoading(false);
    };

    load();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await hydrateInventory();
    setIsRefreshing(false);
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const isLow = item.quantity <= item.min_stock;
    
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, isLow && styles.lowCard]}
        onPress={() => setSelectedItem(item)}
      >
        <View style={styles.cardInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemMetaRow}>
            <Text style={styles.itemMeta}>Stock: {item.quantity}</Text>
            <Text style={styles.itemMeta}>Min: {item.min_stock}</Text>
          </View>
        </View>
        
        {isLow ? (
          <View style={[styles.badge, { backgroundColor: COLORS.danger }]}>
            <AlertCircle color={COLORS.white} size={16} />
            <Text style={styles.badgeText}>LOW STOCK</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: COLORS.success }]}>
            <Text style={styles.badgeText}>OK</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const lowStockCount = inventory.filter((item) => item.quantity <= item.min_stock).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Package color={COLORS.primary} size={32} />
        <Text style={[TYPOGRAPHY.h1, { marginLeft: 10 }]}>Stock Inventory</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Items</Text>
          <Text style={styles.metricValue}>{inventory.length}</Text>
        </View>
        <View style={[styles.metricCard, styles.metricAlertCard]}>
          <Text style={styles.metricLabel}>Low Stock</Text>
          <Text style={[styles.metricValue, { color: COLORS.danger }]}>{lowStockCount}</Text>
        </View>
      </View>

      {isUsingFallback ? (
        <Text style={styles.hintText}>
          Showing demo stock. Add items in the Add tab to load real product data.
        </Text>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your inventory...</Text>
        </View>
      ) : null}

      <FlatList
        data={inventory}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Boxes color={COLORS.textSecondary} size={28} />
            <Text style={styles.emptyTitle}>No stock added yet</Text>
            <Text style={styles.emptySubtitle}>
              Add inventory from the Add tab to start tracking availability.
            </Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent
        visible={!!selectedItem}
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={TYPOGRAPHY.h2}>Product Details</Text>
              <Pressable onPress={() => setSelectedItem(null)} hitSlop={8}>
                <CircleX color={COLORS.textSecondary} size={24} />
              </Pressable>
            </View>

            <Text style={styles.modalItemName}>{selectedItem?.name}</Text>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Current Stock</Text>
              <Text style={styles.modalValue}>{selectedItem?.quantity ?? 0}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Min. Stock</Text>
              <Text style={styles.modalValue}>{selectedItem?.min_stock ?? 0}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Barcode</Text>
              <Text style={styles.modalValue}>{selectedItem?.barcode ?? 'Not set'}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.overlay,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
  },
  metricAlertCard: {
    borderWidth: 1,
    borderColor: 'rgba(211,47,47,0.25)',
  },
  metricLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
  },
  metricValue: {
    ...TYPOGRAPHY.h2,
    marginTop: 4,
  },
  hintText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: 2,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    marginTop: 8,
  },
  list: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  lowCard: {
    borderWidth: 1,
    borderColor: 'rgba(211,47,47,0.25)',
  },
  cardInfo: {
    flex: 1,
  },
  itemName: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.textPrimary,
  },
  itemMetaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: 6,
  },
  itemMeta: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyState: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    marginTop: 6,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalItemName: {
    ...TYPOGRAPHY.bodyLarge,
    marginBottom: SPACING.md,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.overlay,
  },
  modalLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  modalValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginLeft: SPACING.md,
  },
});
