import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import {
  Camera as CameraIcon,
  CheckCircle2,
  ChevronLeft,
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
import {
  AppHeader,
  EmptyState,
  NoticeBanner,
  StatusPill,
} from "../components/ui";
import { dbService } from "../database/db";
import { processImageForText, ReceiptLineItem } from "../services/ocrService";
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

export type ReceiptProcessorProps = {
  onBack: () => void;
};

function money(value: number) {
  return `PHP ${value.toFixed(2)}`;
}

export const ReceiptProcessor: React.FC<ReceiptProcessorProps> = ({ onBack }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedItems, setDetectedItems] = useState<ReceiptLineItem[]>([]);
  const [mode, setMode] = useState<"PURCHASE" | "SALE">("PURCHASE");
  const [isSaving, setIsSaving] = useState(false);

  const handleSnap = async () => {
    if (!cameraRef.current || isScanning) return;
    setIsScanning(true);
    setDetectedItems([]);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) throw new Error("Capture failed");

      const result = await processImageForText(photo.uri);
      if (result.items && result.items.length > 0) {
        const allProducts = await dbService.getProducts();
        const enriched = result.items.map((item) => {
          const existing = allProducts.find((p) => p.name.toUpperCase() === item.name.toUpperCase());
          return {
            ...item,
            existingId: existing?.id,
            suggestedPrice: Number((item.price * 1.15).toFixed(2)),
          };
        });
        setDetectedItems(enriched);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("No items found", "Try taking a clearer photo of the receipt.");
      }
    } catch (error) {
      Alert.alert("Scan Failed", error instanceof Error ? error.message : "Receipt could not be processed.");
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
        `${detectedItems.length} items recorded as ${mode === "PURCHASE" ? "purchases" : "sales"}.`,
        [{ text: "OK", onPress: onBack }],
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Save Failed", error instanceof Error ? error.message : "There was a problem with the database.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderItem = ({ item }: { item: ReceiptLineItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <TextInput style={styles.itemNameInput} value={item.name} onChangeText={(v) => updateItem(item.id, "name", v)} />
        <Pressable style={styles.deleteBtn} onPress={() => removeItem(item.id)}>
          <Trash2 color={COLORS.danger} size={18} />
        </Pressable>
      </View>
      <View style={styles.itemDetails}>
        <Field label="Qty">
          <TextInput style={styles.detailInput} value={String(item.quantity)} keyboardType="number-pad" onChangeText={(v) => updateItem(item.id, "quantity", v)} />
        </Field>
        <Field label="Cost">
          <TextInput style={styles.detailInput} value={String(item.price)} keyboardType="decimal-pad" onChangeText={(v) => updateItem(item.id, "price", v)} />
        </Field>
        <View style={styles.totalBox}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={styles.totalValue}>{money(item.quantity * item.price)}</Text>
        </View>
      </View>
      <NoticeBanner
        title="Profit Guard"
        message={`Suggested selling price: ${money(item.price * 1.15)}`}
        tone="primary"
      />
    </View>
  );

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionWrap}>
        <Receipt color={COLORS.primary} size={54} />
        <Text style={styles.permissionTitle}>Receipt scanner needs camera</Text>
        <Text style={styles.permissionBody}>You can grant access for OCR, or go back and use manual add instead.</Text>
        <BigButton title="Grant Camera Access" onPress={requestPermission} />
        <BigButton title="Back to Add Stock" variant="outlined" onPress={onBack} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {detectedItems.length === 0 ? (
        <>
          <View style={styles.camera}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
            <View style={styles.overlay}>
              <Pressable style={styles.floatingBack} onPress={onBack}>
                <ChevronLeft color={COLORS.white} size={24} />
              </Pressable>
              <View style={styles.scanTarget} />
              <Text style={styles.scanHint}>Align receipt within the frame</Text>
            </View>
          </View>
          <View style={styles.capturePanel}>
            <AppHeader
              eyebrow="Receipt OCR"
              title="Scan Receipt"
              subtitle="Capture a clear receipt, then edit parsed items before saving."
              icon={<View style={styles.headerIcon}><Receipt color={COLORS.primary} size={22} /></View>}
              right={<StatusPill label="Camera" tone="success" />}
            />
            <BigButton
              title={isScanning ? "Scanning..." : "Scan Receipt"}
              onPress={handleSnap}
              icon={isScanning ? <ActivityIndicator color={COLORS.white} /> : <CameraIcon color={COLORS.white} size={22} />}
              disabled={isScanning}
            />
          </View>
        </>
      ) : (
        <View style={styles.listContainer}>
          <View style={styles.topPanel}>
            <AppHeader
              eyebrow="Receipt OCR"
              title="Review Items"
              subtitle="Choose purchase to add stock or sale to deduct stock."
              icon={<Pressable style={styles.backBtn} onPress={onBack}><ChevronLeft color={COLORS.primary} size={22} /></Pressable>}
              right={<StatusPill label={`${detectedItems.length} items`} tone="primary" />}
            />
            <View style={styles.modeSwitcher}>
              <Pressable style={[styles.modeBtn, mode === "PURCHASE" && styles.modeBtnActive]} onPress={() => setMode("PURCHASE")}>
                <ShoppingCart color={mode === "PURCHASE" ? COLORS.white : COLORS.primary} size={18} />
                <Text style={[styles.modeBtnText, mode === "PURCHASE" && styles.modeBtnTextActive]}>Purchase</Text>
              </Pressable>
              <Pressable style={[styles.modeBtn, mode === "SALE" && styles.modeBtnActive]} onPress={() => setMode("SALE")}>
                <CheckCircle2 color={mode === "SALE" ? COLORS.white : COLORS.success} size={18} />
                <Text style={[styles.modeBtnText, mode === "SALE" && styles.modeBtnTextActive]}>Sale</Text>
              </Pressable>
            </View>
          </View>

          <FlatList
            data={detectedItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<EmptyState title="No items parsed" message="Try scanning again with better lighting." />}
          />

          <View style={styles.footer}>
            <Pressable style={styles.resetBtn} onPress={() => setDetectedItems([])}>
              <RotateCcw color={COLORS.textSecondary} size={20} />
              <Text style={styles.resetBtnText}>Retry</Text>
            </Pressable>
            <BigButton
              title={isSaving ? "Saving..." : `Process ${detectedItems.length} Items`}
              color={mode === "PURCHASE" ? COLORS.primary : COLORS.success}
              style={styles.footerButton}
              onPress={handleSave}
              disabled={isSaving}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={styles.detailBox}>
    <Text style={styles.detailLabel}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  permissionWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
    backgroundColor: COLORS.background,
  },
  permissionTitle: {
    ...TYPOGRAPHY.h2,
    textAlign: "center",
  },
  permissionBody: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    lineHeight: 22,
  },
  camera: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingBack: {
    position: "absolute",
    top: 58,
    left: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanTarget: {
    width: "78%",
    height: "58%",
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderStyle: "dashed",
  },
  scanHint: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.white,
    marginTop: SPACING.lg,
  },
  capturePanel: {
    padding: SPACING.md,
    paddingBottom: LAYOUT.bottomTabInset,
    backgroundColor: COLORS.background,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    flex: 1,
  },
  topPanel: {
    padding: SPACING.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  modeSwitcher: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  modeBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeBtnText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: 0,
    paddingBottom: 112,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.soft,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  itemNameInput: {
    flex: 1,
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  itemDetails: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    padding: SPACING.sm,
  },
  detailLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  detailInput: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
    padding: 0,
  },
  totalBox: {
    flex: 1.25,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#BBD5FF",
    padding: SPACING.sm,
  },
  totalValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingBottom: 24,
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
    ...TYPOGRAPHY.caption,
    marginTop: 4,
  },
  footerButton: {
    flex: 1,
  },
});
