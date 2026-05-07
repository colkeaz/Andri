import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  PackageOpen,
  Plus,
  ScanLine,
  ShoppingBag,
  Trash2,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { BigButton } from "../components/BigButton";
import {
  AppHeader,
  AppScreen,
  EmptyState,
  LoadingState,
  NoticeBanner,
  PremiumCard,
  SectionHeader,
  StatusPill,
} from "../components/ui";
import { executeSaleTransaction } from "../database/transactions";
import { getAggregatedInventory } from "../logic/inventoryHelper";
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

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

function money(value: number) {
  return `PHP ${value.toFixed(2)}`;
}

export const POSScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [scanned, setScanned] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      let active = true;
      const load = async () => {
        setIsLoadingInventory(true);
        try {
          const rows = await getAggregatedInventory();
          if (active) setInventory(rows);
        } finally {
          if (active) setIsLoadingInventory(false);
        }
      };
      load();
      return () => {
        active = false;
        setIsFocused(false);
      };
    }, []),
  );

  const total = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const canUseCamera = !!permission?.granted;

  const addItemToCart = (stockItem: StockItem) => {
    if (stockItem.totalStock <= 0) {
      setShowError(`${stockItem.name} is out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === stockItem.id);
      if (existing) {
        if (existing.quantity >= stockItem.totalStock) {
          setShowError(`Only ${stockItem.totalStock} ${stockItem.name} left in stock.`);
          return prev;
        }
        return prev.map((i) => i.productId === stockItem.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [
        ...prev,
        {
          id: `${stockItem.id}-${Date.now()}`,
          productId: stockItem.id,
          name: stockItem.name,
          quantity: 1,
          unitPrice: stockItem.sellingPrice,
        },
      ];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          if (delta > 0) {
            const stock = inventory.find((i) => i.id === item.productId)?.totalStock ?? 0;
            if (item.quantity >= stock) {
              setShowError(`Only ${stock} ${item.name} left in stock.`);
              return item;
            }
          }
          return { ...item, quantity: item.quantity + delta };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));
  const cartQtyFor = (productId: string) => cart.find((i) => i.productId === productId)?.quantity ?? 0;

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(50);
    const matched = inventory.find((i) => i.barcode === data);
    if (matched) {
      addItemToCart(matched);
    } else {
      setShowError("No product matches this barcode.");
    }
    setTimeout(() => setScanned(false), 1600);
  };

  const openConfirm = () => {
    if (cart.length === 0) return;
    setShowConfirm(true);
  };

  const executeSale = async () => {
    setShowConfirm(false);
    setIsProcessingSale(true);
    try {
      await executeSaleTransaction(cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCart([]);
      setInventory(await getAggregatedInventory());
    } catch (error) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => setShowError(error instanceof Error ? error.message : "Could not complete this sale."), 100);
    } finally {
      setIsProcessingSale(false);
    }
  };

  return (
    <AppScreen scroll={false}>
      {canUseCamera && isFocused ? (
        <View style={styles.scannerArea}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["aztec", "ean13", "ean8", "qr", "pdf417", "upc_e", "datamatrix", "code39", "code93", "itf14", "codabar", "code128", "upc_a"] }}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame}>
              {scanned ? <CheckCircle2 color={COLORS.success} size={42} /> : <ScanLine color={COLORS.white} size={42} />}
            </View>
            <Text style={styles.scanHint}>{scanned ? "Scanned" : "Point at barcode"}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.inner}>
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            eyebrow="Mobile POS"
            title="Sell Items"
            subtitle="Quick add products, review the cart, then finish the sale."
            icon={<View style={styles.headerIcon}><ShoppingBag color={COLORS.primary} size={22} /></View>}
            right={<StatusPill label={`${itemCount} items`} tone={itemCount > 0 ? "success" : "neutral"} />}
          />

          {!canUseCamera ? (
            <NoticeBanner
              title="Quick Add is ready"
              message="Enable camera only when you want barcode scanning."
              tone="primary"
              icon={<ScanLine color={COLORS.primary} size={22} />}
              action={
                <Pressable style={styles.enableCameraBtn} onPress={requestPermission}>
                  <Text style={styles.enableCameraText}>Enable</Text>
                </Pressable>
              }
            />
          ) : null}

          <PremiumCard style={styles.totalCard}>
            <View>
              <Text style={styles.totalLabel}>Current Sale</Text>
              <Text style={styles.totalMeta}>{itemCount} item{itemCount === 1 ? "" : "s"} in cart</Text>
            </View>
            <Text style={styles.totalAmount}>{money(total)}</Text>
          </PremiumCard>

          <SectionHeader title="Cart" subtitle="Tap plus or minus to adjust quantities" />
          <View style={styles.cartList}>
            {cart.length === 0 ? (
              <EmptyState
                title="Cart is empty"
                message="Scan a barcode or tap a product below to start a sale."
                icon={<ShoppingBag color={COLORS.primary} size={30} />}
              />
            ) : (
              cart.map((item) => {
                const totalStock = inventory.find((s) => s.id === item.productId)?.totalStock ?? 0;
                const atMax = item.quantity >= totalStock;
                return (
                  <PremiumCard key={item.id} style={styles.cartItem}>
                    <View style={styles.cartInfo}>
                      <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.cartItemMeta}>{money(item.unitPrice)} each {atMax ? "· max stock" : ""}</Text>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => updateCartQty(item.id, -1)} hitSlop={8}>
                        <Minus color={COLORS.textPrimary} size={14} />
                      </TouchableOpacity>
                      <Text style={styles.stepQty}>{item.quantity}</Text>
                      <TouchableOpacity style={[styles.stepBtn, atMax && styles.stepBtnDisabled]} onPress={() => updateCartQty(item.id, 1)} hitSlop={8} disabled={atMax}>
                        <Plus color={atMax ? COLORS.textTertiary : COLORS.textPrimary} size={14} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.cartRight}>
                      <Text style={styles.cartItemTotal}>{money(item.quantity * item.unitPrice)}</Text>
                      <TouchableOpacity onPress={() => removeFromCart(item.id)} hitSlop={10}>
                        <Trash2 color={COLORS.danger} size={16} />
                      </TouchableOpacity>
                    </View>
                  </PremiumCard>
                );
              })
            )}
          </View>

          <SectionHeader title="Quick Add" subtitle={isLoadingInventory ? "Loading products..." : "Tap product tiles to add"} />
          {isLoadingInventory ? (
            <LoadingState label="Loading products..." />
          ) : inventory.length === 0 ? (
            <EmptyState title="No products yet" message="Add stock first, then products will appear here." icon={<PackageOpen color={COLORS.primary} size={30} />} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
              {inventory.map((item) => {
                const cartQty = cartQtyFor(item.id);
                const effectiveStock = item.totalStock - cartQty;
                const isLow = item.totalStock > 0 && item.totalStock <= item.minStockLevel;
                const isOut = effectiveStock <= 0;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.quickChip, cartQty > 0 && styles.quickChipActive, isLow && styles.quickChipLow, isOut && styles.quickChipOut]}
                    onPress={() => {
                      if (!isOut) {
                        addItemToCart(item);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    disabled={isOut}
                    activeOpacity={0.76}
                  >
                    <Text style={styles.quickChipName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.quickChipPrice}>{money(item.sellingPrice)}</Text>
                    <Text style={[styles.quickChipStock, isLow && { color: COLORS.warning }]}>
                      {isOut ? "Out" : `${effectiveStock} left`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </ScrollView>

        <View style={styles.checkoutWrap}>
          <BigButton
            title={isProcessingSale ? "Processing..." : `Finish Sale · ${money(total)}`}
            color={COLORS.success}
            onPress={openConfirm}
            icon={<CheckCircle2 color={COLORS.white} size={22} />}
            disabled={cart.length === 0 || isProcessingSale}
          />
        </View>
      </View>

      <Modal animationType="slide" transparent visible={showConfirm} onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Confirm Sale</Text>
            <Text style={styles.modalSubtitle}>Stock will be deducted after confirmation.</Text>

            <ScrollView style={styles.confirmList} showsVerticalScrollIndicator={false}>
              {cart.map((item) => (
                <View key={item.id} style={styles.confirmRow}>
                  <Text style={styles.confirmName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.confirmMeta}>{item.quantity} x {money(item.unitPrice)}</Text>
                  <Text style={styles.confirmTotal}>{money(item.quantity * item.unitPrice)}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.confirmTotalRow}>
              <Text style={styles.confirmTotalLabel}>Total</Text>
              <Text style={styles.confirmTotalValue}>{money(total)}</Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={({ pressed }) => [styles.btnCancel, pressed && styles.pressed]} onPress={() => setShowConfirm(false)}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={({ pressed }) => [
                  styles.btnConfirm, 
                  (pressed || isProcessingSale) && styles.pressed,
                  isProcessingSale && styles.btnDisabled
                ]} 
                onPress={executeSale}
                disabled={isProcessingSale}
              >
                <Text style={styles.btnConfirmText}>{isProcessingSale ? "Processing..." : "Confirm"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={!!showError} onRequestClose={() => setShowError(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.errorCard]}>
            <AlertCircle color={COLORS.danger} size={34} />
            <Text style={[styles.modalTitle, { color: COLORS.danger }]}>Sale Failed</Text>
            <Text style={styles.modalSubtitle}>{showError}</Text>
            <BigButton title="Close" color={COLORS.danger} onPress={() => setShowError(null)} />
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  scannerArea: {
    height: 260,
    backgroundColor: COLORS.black,
  },
  scanOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  scanFrame: {
    width: 250,
    height: 132,
    borderRadius: RADIUS.xl,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.86)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  scanHint: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  inner: {
    flex: 1,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    padding: SPACING.md,
    paddingBottom: LAYOUT.bottomTabInset + 112,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  enableCameraBtn: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  enableCameraText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 12,
  },
  totalCard: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  totalLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  totalMeta: {
    ...TYPOGRAPHY.caption,
    marginTop: 4,
  },
  totalAmount: {
    ...TYPOGRAPHY.number,
    color: COLORS.primary,
    fontSize: 26,
  },
  cartList: {
    minHeight: 120,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cartInfo: {
    flex: 1,
  },
  cartItemName: {
    ...TYPOGRAPHY.bodyBold,
  },
  cartItemMeta: {
    ...TYPOGRAPHY.caption,
    marginTop: 3,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepQty: {
    minWidth: 22,
    textAlign: "center",
    ...TYPOGRAPHY.bodyBold,
  },
  cartRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  cartItemTotal: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  quickRow: {
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  quickChip: {
    width: 128,
    minHeight: 112,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    padding: SPACING.md,
    justifyContent: "space-between",
    ...SHADOW.soft,
  },
  quickChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  quickChipLow: {
    borderColor: "#F2D49B",
  },
  quickChipOut: {
    opacity: 0.45,
  },
  quickChipName: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    lineHeight: 18,
  },
  quickChipPrice: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  quickChipStock: {
    ...TYPOGRAPHY.caption,
    marginTop: 4,
    fontWeight: "700",
  },
  checkoutWrap: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    bottom: LAYOUT.bottomTabInset - 16,
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    ...SHADOW.card,
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
    maxHeight: "86%",
    ...SHADOW.modal,
  },
  errorCard: {
    alignItems: "center",
    gap: SPACING.sm,
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
  },
  modalSubtitle: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  confirmList: {
    maxHeight: 220,
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.overlay,
  },
  confirmName: {
    flex: 1,
    ...TYPOGRAPHY.bodyBold,
  },
  confirmMeta: {
    ...TYPOGRAPHY.caption,
  },
  confirmTotal: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  confirmTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: SPACING.lg,
  },
  confirmTotalLabel: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 18,
  },
  confirmTotalValue: {
    ...TYPOGRAPHY.number,
    color: COLORS.success,
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  btnCancel: {
    flex: 1,
    minHeight: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    ...TYPOGRAPHY.bodyBold,
  },
  btnConfirm: {
    flex: 1,
    minHeight: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
  },
  btnConfirmText: {
    ...TYPOGRAPHY.buttonLabel,
  },
  pressed: {
    opacity: 0.78,
  },
  btnDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.textTertiary,
  },
});
