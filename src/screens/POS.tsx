import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { AlertTriangle, CheckCircle2, ScanLine, Trash2 } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { BigButton } from "../components/BigButton";
import { executeSaleTransaction } from "../database/transactions";
import { getAggregatedInventory } from "../logic/inventoryHelper";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

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

export const POSScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [scanned, setScanned]   = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  React.useEffect(() => {
    const loadInventory = async () => {
      setIsLoadingInventory(true);
      const rows = await getAggregatedInventory();
      setInventory(rows);
      setIsLoadingInventory(false);
    };
    loadInventory();
  }, []);

  const total = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.permissionWrap}>
        <ScanLine color={COLORS.textSecondary} size={64} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionBody}>
          Allow camera access to scan barcodes at checkout.
        </Text>
        <Pressable style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Access</Text>
        </Pressable>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(50);

    const matched = inventory.find((item) => item.barcode === data);
    if (matched) {
      addItemToCart(matched);
    } else {
      Alert.alert("Not Found", "This barcode is not linked to a product yet.");
    }

    setTimeout(() => setScanned(false), 2000);
  };

  const addItemToCart = (stockItem: StockItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === stockItem.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === stockItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
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

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const completeSale = async () => {
    if (cart.length === 0 || isProcessingSale) return;
    setIsProcessingSale(true);
    try {
      await executeSaleTransaction(
        cart.map((item) => ({
          productId: item.productId,
          quantity:  item.quantity,
          unitPrice: item.unitPrice,
        })),
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCart([]);
      const refreshed = await getAggregatedInventory();
      setInventory(refreshed);
      Alert.alert("✅ Sale Recorded", "Inventory and sales log have been updated.");
    } catch (error) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert("Sale Failed", error instanceof Error ? error.message : "Could not complete this sale.");
    } finally {
      setIsProcessingSale(false);
    }
  };

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
              : <ScanLine color={COLORS.white} size={48} style={{ opacity: 0.9 }} />
            }
          </View>
          <Text style={styles.scanHint}>
            {scanned ? "Item added!" : "Point at a barcode"}
          </Text>
        </View>
      </CameraView>

      {/* ── Sale Panel ── */}
      <View style={styles.panel}>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Current Sale</Text>
          <Text style={styles.totalAmount}>₱{total.toFixed(2)}</Text>
        </View>

        {/* Cart list */}
        <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>
                Scan a barcode or tap a quick item below
              </Text>
            </View>
          ) : (
            cart.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemMeta}>
                    {item.quantity} × ₱{item.unitPrice}
                  </Text>
                </View>
                <Text style={styles.cartItemTotal}>
                  ₱{(item.quantity * item.unitPrice).toFixed(2)}
                </Text>
                <TouchableOpacity
                  onPress={() => removeFromCart(item.id)}
                  hitSlop={8}
                  style={{ marginLeft: SPACING.xs }}
                >
                  <Trash2 color={COLORS.danger} size={16} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Quick items */}
        <Text style={styles.quickTitle}>Quick Add</Text>
        <View style={styles.quickGrid}>
          {inventory.slice(0, 6).map((item) => {
            const isLow = item.totalStock < 5;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.quickItem, isLow && styles.quickItemLow]}
                onPress={() => addItemToCart(item)}
                activeOpacity={0.75}
              >
                <Text style={styles.quickLabel} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.quickStock}>Qty: {item.totalStock}</Text>
                {isLow && (
                  <View style={styles.lowBadge}>
                    <AlertTriangle color={COLORS.white} size={10} />
                    <Text style={styles.lowBadgeText}>Low</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {!isLoadingInventory && inventory.length === 0 && (
            <Text style={[TYPOGRAPHY.body, { paddingVertical: SPACING.sm }]}>
              Add items in the Stock tab first.
            </Text>
          )}
        </View>

        {/* Checkout */}
        <BigButton
          title={isProcessingSale ? "Processing..." : "Complete Sale"}
          color={COLORS.success}
          onPress={completeSale}
          style={styles.checkoutBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: COLORS.background,
  },

  // Permission screen
  permissionWrap: {
    flex:            1,
    backgroundColor: COLORS.background,
    alignItems:      "center",
    justifyContent:  "center",
    padding:         SPACING.lg,
    gap:             SPACING.sm,
  },
  permissionTitle: {
    ...TYPOGRAPHY.h2,
    marginTop: SPACING.sm,
  },
  permissionBody: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
  },
  permissionBtn: {
    marginTop:       SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
  },
  permissionBtnText: {
    ...TYPOGRAPHY.buttonLabel,
  },

  // Scanner
  scannerArea: {
    height: 220,
  },
  scanOverlay: {
    flex:           1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems:     "center",
    justifyContent: "center",
    gap:            12,
  },
  scanFrame: {
    width:        120,
    height:       120,
    borderRadius: RADIUS.xl,
    borderWidth:  2,
    borderColor:  "rgba(255,255,255,0.6)",
    alignItems:   "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  scanHint: {
    color:      COLORS.white,
    fontSize:   14,
    fontWeight: "600",
    opacity:    0.85,
  },

  // Panel
  panel: {
    flex:    1,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },

  // Total
  totalRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   SPACING.sm,
  },
  totalLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: "700",
    color:      COLORS.textPrimary,
    fontSize:   16,
  },
  totalAmount: {
    fontSize:      36,
    fontWeight:    "800",
    color:         COLORS.primary,
    fontFamily:    "Inter_700Bold",
    letterSpacing: -0.5,
  },

  // Cart
  cartList: {
    maxHeight: 130,
  },
  emptyCart: {
    paddingVertical: SPACING.sm,
    alignItems:      "center",
  },
  emptyCartText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
  },
  cartItem: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.overlay,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    ...TYPOGRAPHY.body,
    color:      COLORS.textPrimary,
    fontWeight: "600",
    fontSize:   15,
  },
  cartItemMeta: {
    ...TYPOGRAPHY.caption,
  },
  cartItemTotal: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 15,
    color:    COLORS.primary,
  },

  // Divider
  divider: {
    height:          1,
    backgroundColor: COLORS.overlay,
    marginVertical:  SPACING.sm,
  },

  // Quick grid
  quickTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight:    "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom:  SPACING.xs,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           SPACING.xs,
    marginBottom:  SPACING.sm,
  },
  quickItem: {
    width:           "48%",
    minHeight:       64,
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.md,
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    alignItems:      "center",
    justifyContent:  "center",
    padding:         SPACING.xs,
    ...SHADOW.card,
  },
  quickItemLow: {
    borderColor: COLORS.danger,
    borderWidth: 1.5,
  },
  quickLabel: {
    ...TYPOGRAPHY.body,
    color:     COLORS.textPrimary,
    fontWeight: "600",
    fontSize:   14,
    textAlign:  "center",
  },
  quickStock: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  lowBadge: {
    flexDirection:   "row",
    alignItems:      "center",
    marginTop:       4,
    backgroundColor: COLORS.danger,
    borderRadius:    999,
    paddingVertical: 2,
    paddingHorizontal: 6,
    gap:             3,
  },
  lowBadgeText: {
    color:      COLORS.white,
    fontSize:   10,
    fontWeight: "700",
  },

  // Checkout
  checkoutBtn: {
    height: 58,
  },
});
