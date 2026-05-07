import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import {
  AlertCircle,
  Boxes,
  CircleX,
  Edit3,
  Package,
  Scan,
  Search,
  Trash2,
} from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AppHeader,
  AppScreen,
  EmptyState,
  LoadingState,
  MetricTile,
  PremiumCard,
  StatusPill,
} from "../components/ui";
import { dbService } from "../database/db";
import { getAggregatedInventory } from "../logic/inventoryHelper";
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

type InventoryItem = {
  id: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  min_stock: number;
  sellingPrice: number;
  costPrice: number;
};

type EditForm = {
  name: string;
  barcode: string;
  quantity: string;
  sellingPrice: string;
  costPrice: string;
  min_stock: string;
};

export default function InventoryScreen() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    barcode: "",
    quantity: "",
    sellingPrice: "",
    costPrice: "",
    min_stock: "",
  });

  const loadData = useCallback(async () => {
    try {
      const data = await getAggregatedInventory();
      setInventory(data);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openEdit = (item: InventoryItem) => {
    setEditTarget(item);
    setEditForm({
      name: item.name,
      barcode: item.barcode || "",
      quantity: item.quantity.toString(),
      sellingPrice: item.sellingPrice.toString(),
      costPrice: item.costPrice.toString(),
      min_stock: item.min_stock.toString(),
    });
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      await dbService.updateProduct(editTarget.id, {
        name: editForm.name,
        barcode: editForm.barcode,
        quantity: parseInt(editForm.quantity) || 0,
        sellingPrice: parseFloat(editForm.sellingPrice) || 0,
        costPrice: parseFloat(editForm.costPrice) || 0,
        min_stock: parseInt(editForm.min_stock) || 0,
      });
      await loadData();
      setEditTarget(null);
    } catch (err) {
      Alert.alert("Error", "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (item: InventoryItem) => {
    Alert.alert(
      "Delete Item",
      `Are you sure you want to remove ${item.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dbService.deleteProduct(item.id);
              await loadData();
            } catch (err) {
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  const money = (val: number) => `₱${val.toLocaleString()}`;

  const filteredInventory = searchQuery.trim()
    ? inventory.filter((i) => i.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : inventory;
  const lowStockCount = inventory.filter((i) => i.quantity <= i.min_stock).length;
  const stockedPct = inventory.length > 0
    ? Math.round(((inventory.length - lowStockCount) / inventory.length) * 100)
    : 100;

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const isLow = item.quantity <= item.min_stock;
    const pct = Math.min(1, item.quantity / Math.max(1, item.min_stock * 2));

    return (
      <PremiumCard style={[styles.productCard, isLow && styles.productCardLow]}>
        <Pressable style={styles.productMain} onPress={() => openEdit(item)}>
          <View style={styles.productTop}>
            <View style={styles.productIcon}>
              <Package color={isLow ? COLORS.danger : COLORS.primary} size={20} />
            </View>
            <View style={styles.productText}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.itemMeta}>{item.quantity} in stock · Min {item.min_stock}</Text>
            </View>
            <StatusPill
              label={isLow ? "Low" : "OK"}
              tone={isLow ? "danger" : "success"}
              icon={isLow ? <AlertCircle color={COLORS.danger} size={12} /> : undefined}
            />
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(pct * 100)}%` as any,
                  backgroundColor: isLow ? COLORS.danger : COLORS.success,
                },
              ]}
            />
          </View>

          <View style={styles.productBottom}>
            <Text style={styles.priceTag}>{money(item.sellingPrice)}</Text>
            {item.barcode ? <Text style={styles.barcodeText}>#{item.barcode}</Text> : null}
          </View>
        </Pressable>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => openEdit(item)} hitSlop={8}>
            <Edit3 color={COLORS.primary} size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => confirmDelete(item)} hitSlop={8}>
            <Trash2 color={COLORS.danger} size={18} />
          </TouchableOpacity>
        </View>
      </PremiumCard>
    );
  };

  return (
    <AppScreen scroll={false}>
      <View style={styles.inner}>
        <AppHeader
          title="Stock Room"
          subtitle="Search, edit, and protect your shop inventory."
          right={<StatusPill label={`${stockedPct}% stocked`} tone={stockedPct >= 70 ? "success" : "warning"} />}
        />

        <View style={styles.metricsRow}>
          <MetricTile label="Items" value={inventory.length} caption="Tracked" tone="primary" />
          <MetricTile label="Low" value={lowStockCount} caption="Need action" tone={lowStockCount > 0 ? "danger" : "success"} />
          <MetricTile label="Stocked" value={`${stockedPct}%`} caption="Healthy" tone={stockedPct >= 70 ? "success" : "warning"} />
        </View>

        <View style={styles.searchRow}>
          <Search color={COLORS.textSecondary} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <CircleX color={COLORS.textTertiary} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <LoadingState message="Loading your stock..." />
        ) : filteredInventory.length === 0 ? (
          <EmptyState
            title={searchQuery ? "No matches" : "Empty Shelf"}
            message={searchQuery ? "Try a different search term." : "Start by adding items to your stock room."}
            icon={<Boxes color={COLORS.primary} size={30} />}
          />
        ) : (
          <FlatList
            data={filteredInventory}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal animationType="slide" transparent visible={!!editTarget} onRequestClose={() => setEditTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditTarget(null)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Product</Text>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Product Name</Text>
                <TextInput style={styles.input} value={editForm.name} onChangeText={(t) => setEditForm({ ...editForm, name: t })} placeholder="e.g. Piattos 40g" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Barcode (Optional)</Text>
                <TextInput style={styles.input} value={editForm.barcode} onChangeText={(t) => setEditForm({ ...editForm, barcode: t })} placeholder="Scan or type barcode" />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput style={styles.input} value={editForm.quantity} onChangeText={(t) => setEditForm({ ...editForm, quantity: t })} keyboardType="numeric" />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Min. Stock</Text>
                  <TextInput style={styles.input} value={editForm.min_stock} onChangeText={(t) => setEditForm({ ...editForm, min_stock: t })} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Cost Price</Text>
                  <TextInput style={styles.input} value={editForm.costPrice} onChangeText={(t) => setEditForm({ ...editForm, costPrice: t })} keyboardType="numeric" />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Selling Price</Text>
                  <TextInput style={styles.input} value={editForm.sellingPrice} onChangeText={(t) => setEditForm({ ...editForm, sellingPrice: t })} keyboardType="numeric" />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]} onPress={() => setEditTarget(null)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed, isSaving && styles.disabled]} onPress={handleSave} disabled={isSaving}>
                <Text style={styles.btnPrimaryText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenPadding,
  },
  metricsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 52,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  list: {
    paddingTop: SPACING.xs,
    paddingBottom: LAYOUT.bottomTabInset,
  },
  productCard: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  productCardLow: {
    borderColor: "#F4B7B7",
  },
  productMain: {
    flex: 1,
  },
  productTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  productIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  productText: {
    flex: 1,
  },
  itemName: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
  },
  itemMeta: {
    ...TYPOGRAPHY.caption,
    marginTop: 3,
  },
  progressBar: {
    height: 5,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.pill,
    overflow: "hidden",
    marginTop: SPACING.md,
  },
  progressFill: {
    height: 5,
    borderRadius: RADIUS.pill,
  },
  productBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  priceTag: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  barcodeText: {
    ...TYPOGRAPHY.caption,
    flex: 1,
    textAlign: "right",
  },
  cardActions: {
    gap: SPACING.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    ...SHADOW.modal,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.overlay,
    alignSelf: "center",
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.lg,
  },
  modalForm: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    height: 52,
    paddingHorizontal: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  btnPrimary: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.white,
  },
  btnSecondary: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
});
