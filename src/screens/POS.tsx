import { useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import {
  AlertTriangle, CheckCircle2, Minus, Plus,
  ScanLine, ShoppingBag, Trash2,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet,
  Text, TouchableOpacity, Vibration, View,
} from "react-native";
import { BigButton } from "../components/BigButton";
import { executeSaleTransaction } from "../database/transactions";
import { getAggregatedInventory } from "../logic/inventoryHelper";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

type CartItem = {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type StockItem = {
  id: string;
  name: string;
  barcode: string | null;
  totalStock: number;
  minStockLevel: number;
  sellingPrice: number;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const POSScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [inventory, setInventory]     = useState<StockItem[]>([]);
  const [scanned, setScanned]         = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showError, setShowError]     = useState<string | null>(null);

  // ── Load inventory on focus ────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setIsLoadingInventory(true);
        const rows = await getAggregatedInventory();
        if (active) { setInventory(rows); setIsLoadingInventory(false); }
      };
      load();
      return () => { active = false; };
    }, []),
  );

  const total = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  // ── Camera permission screen ───────────────────────────────────────────────

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.permissionWrap}>
        <ScanLine color={COLORS.textSecondary} size={64} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionBody}>Please grant camera permission to scan barcodes at checkout.</Text>
        <Pressable style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const addItemToCart = (stockItem: StockItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === stockItem.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === stockItem.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          id:        `${stockItem.id}-${Date.now()}`,
          productId: stockItem.id,
          name:      stockItem.name,
          quantity:  1,
          unitPrice: stockItem.sellingPrice > 0 ? stockItem.sellingPrice : 15,
        },
      ];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (id: string) =>
    setCart((prev) => prev.filter((i) => i.id !== id));

  // Quick-add tile: show qty in cart; + always adds, − removes one
  const cartQtyFor = (productId: string) =>
    cart.find((i) => i.productId === productId)?.quantity ?? 0;

  // ── Barcode scan ──────────────────────────────────────────────────────────

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(50);
    const matched = inventory.find((i) => i.barcode === data);
    if (matched) {
      addItemToCart(matched);
    }
    setTimeout(() => setScanned(false), 2000);
  };

  // ── Sale flow ─────────────────────────────────────────────────────────────

  const openConfirm = () => {
    if (cart.length === 0) return;
    setShowConfirm(true);
  };

  const executeSale = async () => {
    setShowConfirm(false);
    setIsProcessingSale(true);
    try {
      await executeSaleTransaction(
        cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCart([]);
      const refreshed = await getAggregatedInventory();
      setInventory(refreshed);
    } catch (error) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      // re-open confirm with error is unnecessary — just surface alert via modal
      setShowConfirm(false);
      // Use a small timeout so state flushes before showing the error modal
      setTimeout(() => {
        setShowError(error instanceof Error ? error.message : "Could not complete this sale.");
      }, 100);
    } finally {
      setIsProcessingSale(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Barcode Scanner ── */}
      <CameraView
        style={styles.scannerArea}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a"] }}
      >
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame}>
            {scanned
              ? <CheckCircle2 color={COLORS.success} size={48} />
              : <ScanLine color={COLORS.white} size={48} style={{ opacity: 0.9 }} />}
          </View>
          <Text style={styles.scanHint}>{scanned ? "Scanned!" : "Point at barcode"}</Text>
        </View>
      </CameraView>

      {/* ── Sale Panel ── */}
      <View style={styles.panel}>

        {/* Total bar */}
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Current Transaction</Text>
            {itemCount > 0 && (
              <Text style={styles.itemCountText}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
            )}
          </View>
          <Text style={styles.totalAmount}>₱{total.toFixed(2)}</Text>
        </View>

        {/* Cart list */}
        <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>Scan barcode or select below</Text>
            </View>
          ) : (
            cart.map((item) => {
              const totalStock     = inventory.find((s) => s.id === item.productId)?.totalStock ?? 0;
              const effectiveStock = totalStock - item.quantity;
              const atMax          = effectiveStock <= 0;
              return (
                <View key={item.id} style={styles.cartItem}>

                  {/* Stepper */}
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => updateCartQty(item.id, -1)} hitSlop={8}>
                      <Minus color={COLORS.textPrimary} size={11} />
                    </TouchableOpacity>
                    <Text style={styles.stepQty}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[styles.stepBtn, atMax && styles.stepBtnDisabled]}
                      onPress={() => { if (!atMax) updateCartQty(item.id, 1); }}
                      hitSlop={8}
                      disabled={atMax}
                    >
                      <Plus color={atMax ? COLORS.textSecondary : COLORS.textPrimary} size={11} />
                    </TouchableOpacity>
                  </View>

                  {/* Name · price */}
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName} numberOfLines={1}>
                      {item.name}
                      <Text style={styles.cartItemMeta}>  ₱{item.unitPrice.toFixed(2)}{atMax && <Text style={styles.maxTag}> MAX</Text>}</Text>
                    </Text>
                  </View>

                  {/* Subtotal + remove */}
                  <View style={styles.cartItemRight}>
                    <Text style={styles.cartItemTotal}>₱{(item.quantity * item.unitPrice).toFixed(2)}</Text>
                    <TouchableOpacity onPress={() => removeFromCart(item.id)} hitSlop={10}>
                      <Trash2 color={COLORS.danger} size={13} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.divider} />

        {/* Quick Add — horizontal scroll row */}
        <View style={styles.quickSection}>
          <View style={styles.quickHeader}>
            <Text style={styles.quickTitle}>Quick Add</Text>
            <Text style={styles.quickSubtitle}>Tap to add · swipe for more</Text>
          </View>

          {!isLoadingInventory && inventory.length === 0 ? (
            <View style={styles.emptyQuickAdd}>
              <Text style={styles.emptyQuickAddText}>No items found. Add stock to begin.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRow}
            >
              {inventory.map((item) => {
                const cartQty        = cartQtyFor(item.id);
                const effectiveStock = item.totalStock - cartQty;
                const isLow          = item.totalStock > 0 && item.totalStock < 5;
                const isOut          = effectiveStock <= 0;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.quickChip,
                      isLow && styles.quickChipLow,
                      isOut && styles.quickChipOut,
                      cartQty > 0 && styles.quickChipActive,
                    ]}
                    onPress={() => { if (!isOut) { addItemToCart(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                    disabled={isOut}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickChipName, isOut && styles.quickChipNameOut]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.quickChipPrice}>₱{item.sellingPrice.toFixed(2)}</Text>
                    <Text style={[styles.quickChipStock, isLow && { color: COLORS.error }]}>
                      {isOut ? "Out of Stock" : `${effectiveStock} left`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Checkout Button */}
        <BigButton
          title={isProcessingSale ? "PROCESSING..." : `FINISH SALE · ₱${total.toFixed(2)}`}
          color={COLORS.success}
          onPress={openConfirm}
          style={styles.checkoutBtn}
          icon={<CheckCircle2 color={COLORS.white} size={28} />}
        />
      </View>

      {/* ── Sale Confirmation Modal ── */}
      <Modal animationType="slide" transparent visible={showConfirm} onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderRow}>
              <ShoppingBag color={COLORS.success} size={22} />
              <Text style={[TYPOGRAPHY.h2, { marginLeft: 10, flex: 1 }]}>Confirm Sale</Text>
              <Pressable onPress={() => setShowConfirm(false)} hitSlop={8}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Review items before finishing the sale.
            </Text>

            {/* Order lines */}
            <ScrollView style={styles.confirmList} showsVerticalScrollIndicator={false}>
              {cart.map((item) => (
                <View key={item.id} style={styles.confirmRow}>
                  <Text style={styles.confirmName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.confirmMeta}>{item.quantity} × ₱{item.unitPrice.toFixed(2)}</Text>
                  <Text style={styles.confirmLineTotal}>
                    ₱{(item.quantity * item.unitPrice).toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.confirmDivider} />

            {/* Grand total */}
            <View style={styles.confirmTotalRow}>
              <Text style={styles.confirmTotalLabel}>Total</Text>
              <Text style={styles.confirmTotalValue}>₱{total.toFixed(2)}</Text>
            </View>

            <Text style={styles.confirmNote}>
              Stock will be deducted automatically upon confirmation.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.btnCancel, pressed && { opacity: 0.75 }]}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnConfirm, pressed && { opacity: 0.85 }]}
                onPress={executeSale}
              >
                <Text style={styles.btnConfirmText}>✓ Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Error Modal ── */}
      <Modal animationType="fade" transparent visible={!!showError} onRequestClose={() => setShowError(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: SPACING.lg }]}>
            <View style={styles.modalHandle} />
            <Text style={[TYPOGRAPHY.h2, { color: COLORS.danger, marginBottom: SPACING.sm }]}>
              ❌ Sale Failed
            </Text>
            <Text style={[TYPOGRAPHY.body, { lineHeight: 22, marginBottom: SPACING.lg }]}>
              {showError}
            </Text>
            <Pressable
              style={[styles.btnConfirm, { backgroundColor: COLORS.danger }]}
              onPress={() => setShowError(null)}
            >
              <Text style={styles.btnConfirmText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },

  // Permission
  permissionWrap:    { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: SPACING.lg, gap: SPACING.sm },
  permissionTitle:   { ...TYPOGRAPHY.h2, marginTop: SPACING.sm },
  permissionBody:    { ...TYPOGRAPHY.body, textAlign: "center" },
  permissionBtn:     { marginTop: SPACING.md, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: SPACING.lg },
  permissionBtnText: { ...TYPOGRAPHY.buttonLabel },

  // Scanner
  scannerArea: { height: 200 },
  scanOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", gap: 12 },
  scanFrame:   { width: 110, height: 110, borderRadius: RADIUS.xl, borderWidth: 2, borderColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  scanHint:    { color: COLORS.white, fontSize: 14, fontWeight: "600", opacity: 0.85 },

  // Panel — flex layout so cart expands and quick add stays compact
  panel: { flex: 1, padding: SPACING.md, backgroundColor: COLORS.background },

  // Total bar
  totalRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm },
  totalLabel:    { ...TYPOGRAPHY.body, fontWeight: "700", color: COLORS.textPrimary, fontSize: 16 },
  itemCountText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  totalAmount:   { fontSize: 30, fontWeight: "800", color: COLORS.primary, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },

  // Cart — compact single-line rows
  cartList:      { flex: 1 },
  emptyCart:     { paddingVertical: SPACING.xs, alignItems: "center" },
  emptyCartText: { ...TYPOGRAPHY.caption, fontSize: 13 },
  cartItem:      { flexDirection: "row", alignItems: "center", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.overlay, gap: 6 },
  cartItemInfo:  { flex: 1 },
  cartItemName:  { fontSize: 13, fontWeight: "600", color: COLORS.textPrimary },
  cartItemMeta:  { fontSize: 11, color: COLORS.textSecondary },
  maxTag:        { color: COLORS.warning, fontWeight: "700" },
  cartItemRight: { alignItems: "flex-end", gap: 1 },
  cartItemTotal: { fontSize: 13, color: COLORS.primary, fontWeight: "700" },
  trashBtn:      { alignItems: "center" },

  // Compact stepper
  stepper:         { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn:         { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.overlay, alignItems: "center", justifyContent: "center" },
  stepBtnDisabled: { opacity: 0.35 },
  stepQty:         { fontSize: 16, fontWeight: "700", minWidth: 24, textAlign: "center", color: COLORS.textPrimary },

  // Divider
  divider: { height: 1, backgroundColor: COLORS.overlay, marginVertical: SPACING.sm },

  // Quick Add — horizontal scroll (compact)
  quickSection:        { paddingBottom: 4 },
  quickHeader:         { marginBottom: 5, flexDirection: "row", alignItems: "center", gap: 6 },
  quickTitle:          { ...TYPOGRAPHY.caption, fontSize: 12, fontWeight: "700", color: COLORS.textPrimary },
  quickSubtitle:       { ...TYPOGRAPHY.caption, fontSize: 10, color: COLORS.textSecondary },
  quickRow:            { flexDirection: "row", gap: 6, paddingBottom: 2 },
  quickChip: {
    width: 85,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    padding: 7,
    justifyContent: "space-between",
    ...SHADOW.card,
  },
  quickChipActive:       { borderColor: COLORS.primary, borderWidth: 1.5, backgroundColor: COLORS.primary + '0D' },
  quickChipLow:          { borderColor: COLORS.warning, borderWidth: 1.5 },
  quickChipOut:          { opacity: 0.4 },
  quickChipBadge:        { position: "absolute", top: -5, right: -5, backgroundColor: COLORS.primary, borderRadius: 99, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  quickChipBadgeText:    { color: COLORS.white, fontSize: 9, fontWeight: "800" },
  quickChipName:         { ...TYPOGRAPHY.caption, fontSize: 11, fontWeight: "700", color: COLORS.textPrimary, lineHeight: 14 },
  quickChipNameOut:      { color: COLORS.textSecondary },
  quickChipPrice:        { fontSize: 12, fontWeight: "800", color: COLORS.primary, fontFamily: "Inter_700Bold", marginTop: 3 },
  quickChipStock:        { ...TYPOGRAPHY.caption, fontSize: 9, fontWeight: "600", color: COLORS.textSecondary },
  emptyQuickAdd:         { padding: 12, alignItems: "center", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderStyle: "dashed", borderWidth: 1, borderColor: COLORS.overlay },
  emptyQuickAddText:     { ...TYPOGRAPHY.caption, textAlign: "center" },

  // Checkout
  checkoutBtn: { height: 64, borderRadius: RADIUS.lg },

  // Modals shared
  modalBackdrop:  { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  modalCard:      { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl, maxHeight: "88%" },
  modalHandle:    { width: 40, height: 4, backgroundColor: COLORS.overlay, borderRadius: 999, alignSelf: "center", marginBottom: SPACING.md },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs },
  modalClose:     { fontSize: 18, color: COLORS.textSecondary, fontWeight: "700" },
  modalSubtitle:  { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING.md, lineHeight: 20 },

  // Confirm list
  confirmList:      { maxHeight: 200 },
  confirmRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.overlay },
  confirmName:      { flex: 1, ...TYPOGRAPHY.body, fontWeight: "600", fontSize: 14 },
  confirmMeta:      { ...TYPOGRAPHY.caption, marginHorizontal: SPACING.xs, minWidth: 80, textAlign: "center" },
  confirmLineTotal: { ...TYPOGRAPHY.body, fontWeight: "700", color: COLORS.primary, fontSize: 14 },

  confirmDivider:    { height: 1, backgroundColor: COLORS.overlay, marginVertical: SPACING.sm },
  confirmTotalRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm },
  confirmTotalLabel: { ...TYPOGRAPHY.bodyLarge, fontWeight: "700" },
  confirmTotalValue: { fontSize: 28, fontWeight: "800", color: COLORS.success, fontFamily: "Inter_700Bold" },
  confirmNote:       { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: "center", marginBottom: SPACING.md, lineHeight: 18 },

  // Modal buttons
  modalActions:   { flexDirection: "row", gap: SPACING.sm },
  btnCancel:      { flex: 1, borderWidth: 1, borderColor: COLORS.overlay, borderRadius: RADIUS.sm, paddingVertical: 14, alignItems: "center", backgroundColor: COLORS.surface },
  btnCancelText:  { ...TYPOGRAPHY.body, fontWeight: "700", color: COLORS.textPrimary },
  btnConfirm:     { flex: 1, backgroundColor: COLORS.success, borderRadius: RADIUS.sm, paddingVertical: 14, alignItems: "center" },
  btnConfirmText: { ...TYPOGRAPHY.body, fontWeight: "700", color: COLORS.white },
});
