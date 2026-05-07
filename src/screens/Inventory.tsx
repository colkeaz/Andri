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
import React, { useCallback, useState } from "react";
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
  minStock: string;
};

function money(value: number) {
  return `PHP ${value.toFixed(2)}`;
}

function safeNum(val: string): number | undefined {
  const n = parseFloat(val);
  return Number.isNaN(n) ? undefined : n;
}

function safeInt(val: string): number | undefined {
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? undefined : n;
}

export const InventoryScreen: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<EditForm>({
    name: "",
    barcode: "",
    quantity: "",
    sellingPrice: "",
    costPrice: "",
    minStock: "",
  });

  const loadInventory = useCallback(async () => {
    const products = await getAggregatedInventory();
    setInventory(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        quantity: p.totalStock,
        min_stock: p.minStockLevel,
        sellingPrice: p.sellingPrice,
        costPrice: p.costPrice,
      })),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = async () => {
        try {
          await loadInventory();
        } catch (error) {
          setInventory([]);
          Alert.alert("Inventory Unavailable", error instanceof Error ? error.message : "Could not load inventory.");
        } finally {
          if (active) setIsLoading(false);
        }
      };
      run();
      return () => {
        active = false;
      };
    }, [loadInventory]),
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadInventory();
    setIsRefreshing(false);
  };

  const openEdit = (item: InventoryItem) => {
    setForm({
      name: item.name,
      barcode: item.barcode ?? "",
      quantity: String(item.quantity),
      sellingPrice: String(item.sellingPrice),
      costPrice: String(item.costPrice),
      minStock: String(item.min_stock),
    });
    setEditTarget(item);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (isScanning) return;
    setIsScanning(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setForm((f) => ({ ...f, barcode: data }));
    setShowScanner(false);
    setIsScanning(false);
  };

  const startScanning = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Permission Required", "Camera permission is needed to scan barcodes.");
        return;
      }
    }
    setShowScanner(true);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    const name = form.name.trim();
    if (!name) {
      Alert.alert("Validation", "Product name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      await dbService.updateProduct(editTarget.id, {
        name,
        barcode: form.barcode.trim() || null,
        minStockLevel: safeInt(form.minStock) ?? editTarget.min_stock,
      });
      await dbService.updateInventoryPrices(editTarget.id, {
        quantity: safeInt(form.quantity),
        sellingPrice: safeNum(form.sellingPrice),
        costPrice: safeNum(form.costPrice),
      });
      setEditTarget(null);
      await loadInventory();
    } catch (err) {
      Alert.alert("Save Failed", err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (item: InventoryItem) => {
    const doDelete = async () => {
      try {
        await dbService.deleteProduct(item.id);
        await loadInventory();
      } catch (err) {
        Alert.alert("Delete Failed", err instanceof Error ? err.message : "Could not delete product.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Remove "${item.name}" and all stock records?`)) doDelete();
      return;
    }

    Alert.alert("Delete Product", `Remove "${item.name}" and all stock records?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: doDelete },
    ]);
  };

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
          eyebrow="Inventory"
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
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={10}>
              <CircleX color={COLORS.textSecondary} size={20} />
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <LoadingState label="Loading inventory..." />
        ) : (
          <FlatList
            data={filteredInventory}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                title={searchQuery.trim() ? "No matching items" : "Your shop is empty"}
                message={searchQuery.trim() ? "Try another product name or clear the search." : "Add your first product from the Add Stock tab."}
                icon={<Boxes color={COLORS.primary} size={30} />}
              />
            }
          />
        )}
      </View>

      <Modal animationType="slide" transparent visible={!!editTarget} onRequestClose={() => setEditTarget(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Package color={COLORS.primary} size={20} />
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Edit Product</Text>
                <Text style={styles.modalSubtitle}>Changes update all live views.</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Field label="Product Name">
                <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Coke 1.5L" placeholderTextColor={COLORS.textSecondary} />
              </Field>

              <Field label="Barcode">
                <View style={styles.barcodeInputRow}>
                  <TextInput style={[styles.input, styles.inputFlex]} value={form.barcode} onChangeText={(v) => setForm((f) => ({ ...f, barcode: v }))} placeholder="Optional barcode" placeholderTextColor={COLORS.textSecondary} keyboardType="number-pad" />
                  <TouchableOpacity style={styles.inlineScanBtn} onPress={startScanning}>
                    <Scan color={COLORS.white} size={20} />
                  </TouchableOpacity>
                </View>
              </Field>

              <View style={styles.row}>
                <Field label="Selling Price" style={styles.rowField}>
                  <TextInput style={styles.input} value={form.sellingPrice} onChangeText={(v) => setForm((f) => ({ ...f, sellingPrice: v }))} placeholder="0.00" placeholderTextColor={COLORS.textSecondary} keyboardType="decimal-pad" />
                </Field>
                <Field label="Cost Price" style={styles.rowField}>
                  <TextInput style={styles.input} value={form.costPrice} onChangeText={(v) => setForm((f) => ({ ...f, costPrice: v }))} placeholder="0.00" placeholderTextColor={COLORS.textSecondary} keyboardType="decimal-pad" />
                </Field>
              </View>

              <View style={styles.row}>
                <Field label="Quantity" style={styles.rowField}>
                  <TextInput style={styles.input} value={form.quantity} onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))} placeholder="0" placeholderTextColor={COLORS.textSecondary} keyboardType="number-pad" />
                </Field>
                <Field label="Min Stock" style={styles.rowField}>
                  <TextInput style={styles.input} value={form.minStock} onChangeText={(v) => setForm((f) => ({ ...f, minStock: v }))} placeholder="5" placeholderTextColor={COLORS.textSecondary} keyboardType="number-pad" />
                </Field>
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

      <Modal visible={showScanner} animationType="slide">
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={isScanning ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a"] }}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerHint}>Align barcode inside the frame</Text>
            <TouchableOpacity style={styles.cancelScanBtn} onPress={() => setShowScanner(false)}>
              <Text style={styles.cancelScanBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode; style?: any }> = ({ label, children, style }) => (
  <View style={[styles.fieldWrap, style]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    padding: SPACING.md,
    paddingBottom: 0,
  },
  metricsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    paddingHorizontal: SPACING.md,
    minHeight: 54,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
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
    backgroundColor: "rgba(15,23,42,0.38)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: "90%",
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
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 3,
  },
  fieldWrap: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 7,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    paddingHorizontal: SPACING.md,
    minHeight: 52,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputFlex: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  rowField: {
    flex: 1,
  },
  barcodeInputRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  inlineScanBtn: {
    width: 52,
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  btnSecondary: {
    flex: 1,
    minHeight: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    ...TYPOGRAPHY.bodyBold,
  },
  btnPrimary: {
    flex: 1,
    minHeight: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    ...TYPOGRAPHY.buttonLabel,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.78,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  scannerOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.55)",
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: RADIUS.xl,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  scannerHint: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.white,
    marginTop: SPACING.lg,
  },
  cancelScanBtn: {
    position: "absolute",
    bottom: 50,
    paddingHorizontal: SPACING.xl,
    minHeight: 52,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelScanBtnText: {
    color: COLORS.white,
    fontWeight: "800",
  },
});
