import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { dbService } from '../database/db';
import { Package, AlertCircle } from 'lucide-react-native';

export const InventoryScreen: React.FC = () => {
  const [inventory, setInventory] = useState<any[]>([]);

  // Mock data for immediate visual feedback if DB is empty
  const mockInventory = [
    { id: '1', name: 'Coke 1.5L', quantity: 12, min_stock: 5 },
    { id: '2', name: 'Lucky Me Noodles', quantity: 2, min_stock: 10 },
    { id: '3', name: 'Bear Brand 320g', quantity: 45, min_stock: 10 },
    { id: '4', name: 'Egg (Large)', quantity: 120, min_stock: 50 },
  ];

  useEffect(() => {
    // In a real app, we would fetch from DB:
    // const data = await dbService.getProducts();
    // setInventory(data);
    setInventory(mockInventory);
  }, []);

  const renderItem = ({ item }: { item: any }) => {
    const isLow = item.quantity <= item.min_stock;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <Text style={TYPOGRAPHY.bodyLarge}>{item.name}</Text>
          <Text style={TYPOGRAPHY.body}>Stock: {item.quantity}</Text>
        </View>
        
        {isLow ? (
          <View style={[styles.badge, { backgroundColor: COLORS.danger }]}>
            <AlertCircle color={COLORS.white} size={16} />
            <Text style={styles.badgeText}>LOW</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: COLORS.success }]}>
            <Text style={styles.badgeText}>OK</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Package color={COLORS.primary} size={32} />
        <Text style={[TYPOGRAPHY.h1, { marginLeft: 10 }]}>Stock Inventory</Text>
      </View>
      
      <FlatList
        data={inventory}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[TYPOGRAPHY.body, { textAlign: 'center', marginTop: 50 }]}>
            No stock added yet.
          </Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.overlay,
  },
  list: {
    padding: SPACING.md,
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
  cardInfo: {
    flex: 1,
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
    fontSize: 14,
    marginLeft: 4,
  }
});
