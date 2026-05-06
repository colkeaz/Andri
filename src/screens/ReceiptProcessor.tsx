import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import {
  Camera as CameraIcon,
  CheckCircle2,
  ChevronLeft,
  PhilippinePeso,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Trash2,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BigButton } from "../components/BigButton";
import { dbService } from "../database/db";
import { processImageForText, ReceiptLineItem } from "../services/ocrService";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

export type ReceiptProcessorProps = {
  onBack: () => void;
};

export const ReceiptProcessor: React.FC<ReceiptProcessorProps> = ({ onBack }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedItems, setDetectedItems] = useState<ReceiptLineItem[]>([]);
  const [mode, setMode] = useState<"PURCHASE" | "SALE">("PURCHASE");
  const [isSaving, setIsSaving] = useState(false);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionWrap}>
        <Receipt color={COLORS.textSecondary} size={64} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionBody}>
          Please grant camera permission to scan receipts.
        </Text>
        <Pressable style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  const handleSnap = async () => {
    if (!cameraRef.current || isScanning) return;
    setIsScanning(true);
    setDetectedItems([]);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) throw new Error("Capture failed");

      const result = await processImageForText(photo.uri);
      if (result.items && result.items.length > 0) {
        // Enrich items with existing DB prices for Profit Guard
        const allProducts = await dbService.getProducts();
        const enriched = result.items.map(item => {
          const existing = allProducts.find(p => p.name.toUpperCase() === item.name.toUpperCase());
          return {
            ...item,
            existingId: existing?.id,
            suggestedPrice: Number((item.price * 1.15).toFixed(2))
          };
        });
        setDetectedItems(enriched);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("No items found", "Try taking a clearer photo of the receipt.");
      }
    } catch (error) {
      Alert.alert("Scan Failed", "Receipt could not be processed.");
    } finally {
      setIsScanning(false);
    }
  };

  const updateItem = (id: string, field: keyof ReceiptLineItem, value: string) => {
    setDetectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "quantity") return { ...item, quantity: parseInt(value, 10) || 0 };
        if (field === "price") return { ...item, price: parseFloat(value) || 0 };
        if (field === "name") return { ...item, name: value };
        return item;
      }),
    );
  };

  const removeItem = (id: string) => {
    setDetectedItems((prev) => prev.filter((item) => item.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSave = async () => {
    if (detectedItems.length === 0 || isSaving) return;
    
    setIsSaving(true);
    try {
      await dbService.processReceiptTransaction(detectedItems, mode);
      Alert.alert(
        "Success",
        `${detectedItems.length} items recorded as ${mode === 'PURCHASE' ? 'purchases' : 'sales'}.`,
        [{ text: "OK", onPress: onBack }]
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Save Failed", "There was a problem with the database.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderItem = ({ item }: { item: ReceiptLineItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <TextInput
          style={styles.itemNameInput}
          value={item.name}
          onChangeText={(v) => updateItem(item.id, "name", v)}
        />
        <Pressable onPress={() => removeItem(item.id)}>
          <Trash2 color={COLORS.error} size={20} />
        </Pressable>
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>QTY</Text>
          <TextInput
            style={styles.detailInput}
            value={String(item.quantity)}
            keyboardType="number-pad"
            onChangeText={(v) => updateItem(item.id, "quantity", v)}
          />
        </View>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>COST</Text>
          <View style={styles.priceRow}>
            <Text style={styles.currencyPrefix}>₱</Text>
            <TextInput
              style={styles.detailInput}
              value={String(item.price)}
              keyboardType="decimal-pad"
              onChangeText={(v) => updateItem(item.id, "price", v)}
            />
          </View>
        </View>
        <View style={[styles.detailBox, { backgroundColor: COLORS.primary + '10' }]}>
          <Text style={[styles.detailLabel, { color: COLORS.primary }]}>PROFIT GUARD™</Text>
          <Text style={[styles.totalValue, { color: COLORS.primary }]}>
            ₱{(item.price * 1.15).toFixed(2)}
          </Text>
        </View>
        <View style={[styles.detailBox, { borderRightWidth: 0 }]}>
          <Text style={styles.detailLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>₱{(item.quantity * item.price).toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <ChevronLeft color={COLORS.textPrimary} size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Receipt</Text>
        <View style={{ width: 28 }} />
      </View>

      {detectedItems.length === 0 ? (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.overlay}>
              <View style={styles.scanTarget} />
              <Text style={styles.scanHint}>Align receipt within the frame</Text>
            </View>
          </CameraView>
          <View style={styles.controls}>
            <BigButton
              title={isScanning ? "SCANNING..." : "SCAN RECEIPT"}
              onPress={handleSnap}
              icon={isScanning ? <ActivityIndicator color="#FFF" /> : <CameraIcon color="#FFF" size={24} />}
            />
          </View>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {/* Mode Switcher */}
          <View style={styles.modeSwitcher}>
            <Pressable
              style={[styles.modeBtn, mode === "PURCHASE" && styles.modeBtnActive]}
              onPress={() => setMode("PURCHASE")}
            >
              <ShoppingCart color={mode === "PURCHASE" ? "#FFF" : COLORS.primary} size={20} />
              <Text style={[styles.modeBtnText, mode === "PURCHASE" && styles.modeBtnTextActive]}>PURCHASE</Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, mode === "SALE" && styles.modeBtnActive]}
              onPress={() => setMode("SALE")}
            >
              <CheckCircle2 color={mode === "SALE" ? "#FFF" : COLORS.success} size={20} />
              <Text style={[styles.modeBtnText, mode === "SALE" && styles.modeBtnTextActive]}>SALE</Text>
            </Pressable>
          </View>

          <FlatList
            data={detectedItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />

          <View style={styles.footer}>
            <Pressable style={styles.resetBtn} onPress={() => setDetectedItems([])}>
              <RotateCcw color={COLORS.textSecondary} size={20} />
              <Text style={styles.resetBtnText}>Retry</Text>
            </Pressable>
            <BigButton
              title={isSaving ? "SAVING..." : `PROCESS ${detectedItems.length} ITEMS`}
              color={mode === "PURCHASE" ? COLORS.primary : COLORS.success}
              style={{ flex: 1 }}
              onPress={handleSave}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
  },
  backBtn: {
    padding: 4,
  },
  permissionWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  permissionTitle: { ...TYPOGRAPHY.h2 },
  permissionBody: { ...TYPOGRAPHY.body, textAlign: "center" },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: RADIUS.md,
    marginTop: 20,
  },
  permissionBtnText: { ...TYPOGRAPHY.buttonLabel },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanTarget: {
    width: "80%",
    height: "60%",
    borderWidth: 2,
    borderColor: "#FFF",
    borderRadius: RADIUS.lg,
    borderStyle: "dashed",
  },
  scanHint: {
    color: "#FFF",
    marginTop: 20,
    ...TYPOGRAPHY.bodyLarge,
  },
  controls: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  listContainer: {
    flex: 1,
  },
  modeSwitcher: {
    flexDirection: "row",
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.overlay,
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeBtnText: {
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: "#FFF",
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
    borderWidth: 1,
    borderColor: COLORS.overlay,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  itemNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    padding: 4,
  },
  itemDetails: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.overlay,
    paddingTop: 12,
  },
  detailBox: {
    flex: 1,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: COLORS.overlay,
  },
  detailLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: "700",
  },
  detailInput: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "600",
    padding: 0,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencyPrefix: {
    fontSize: 12,
    color: COLORS.success,
    marginRight: 2,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingBottom: 30,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.overlay,
  },
  resetBtn: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  resetBtnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
