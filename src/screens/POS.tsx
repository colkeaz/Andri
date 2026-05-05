import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { AlertTriangle, Barcode, ScanLine } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Button,
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
import { COLORS, SPACING, TYPOGRAPHY } from "../theme/tokens";

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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [scanned, setScanned] = useState(false);
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

  const total = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text
          style={[TYPOGRAPHY.body, { textAlign: "center", marginTop: 100 }]}
        >
          Permission needed for scanner
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const handleBarCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(50);

    const matchedProduct = inventory.find((item) => item.barcode === data);
    if (matchedProduct) {
      addItemToCart(matchedProduct);
    } else {
      Alert.alert("Not Found", "This barcode is not linked to a product yet.");
    }

    // Reset scanner after 2 seconds
    setTimeout(() => setScanned(false), 2000);
  };

  const addItemToCart = (stockItem: StockItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.productId === stockItem.id);
      if (existing) {
        return prevCart.map((item) =>
          item.productId === stockItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...prevCart,
        {
          id: `${stockItem.id}-${Date.now()}`,
          productId: stockItem.id,
          name: stockItem.name,
          quantity: 1,
          unitPrice: stockItem.sellingPrice > 0 ? stockItem.sellingPrice : 15,
        },
      ];
    });
  };

  const completeSale = async () => {
    if (cart.length === 0 || isProcessingSale) {
      return;
    }

    setIsProcessingSale(true);
    try {
      await executeSaleTransaction(
        cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCart([]);
      const refreshedInventory = await getAggregatedInventory();
      setInventory(refreshedInventory);
      Alert.alert("Sale Recorded", "Inventory and sales have been updated.");
    } catch (error) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const message =
        error instanceof Error
          ? error.message
          : "Could not complete this sale.";
      Alert.alert("Sale Failed", message);
    } finally {
      setIsProcessingSale(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.scannerArea}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "upc_a"],
        }}
      >
        <View style={styles.overlay}>
          <ScanLine
            color={scanned ? COLORS.success : COLORS.white}
            size={150}
            style={{ opacity: 0.6 }}
          />
        </View>
      </CameraView>

      <View style={styles.content}>
        <View style={styles.cartHeader}>
          <Text style={TYPOGRAPHY.h2}>Current Sale</Text>
          <Text style={[TYPOGRAPHY.h1, { color: COLORS.primary }]}>
            ₱{total}
          </Text>
        </View>

        <ScrollView style={styles.cartList}>
          {cart.map((item) => (
            <View key={item.id} style={styles.cartItem}>
              <Text style={TYPOGRAPHY.bodyLarge}>
                {item.name} x{item.quantity}
              </Text>
              <Text style={TYPOGRAPHY.bodyLarge}>
                ₱{item.unitPrice * item.quantity}
              </Text>
            </View>
          ))}
          {cart.length === 0 && (
            <Text
              style={[TYPOGRAPHY.body, { textAlign: "center", marginTop: 20 }]}
            >
              Scan barcode or tap below
            </Text>
          )}
        </ScrollView>

        <Text style={[TYPOGRAPHY.body, { marginBottom: SPACING.sm }]}>
          Quick Items:
        </Text>
        <View style={styles.quickGrid}>
          {inventory.slice(0, 6).map((item) => {
            const isLowStock = item.totalStock < 5;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.quickItem, isLowStock && styles.quickItemLow]}
                onPress={() => addItemToCart(item)}
              >
                <Text style={styles.quickLabel}>{item.name}</Text>
                <Text style={styles.quickSubLabel}>
                  Stock: {item.totalStock}
                </Text>
                {isLowStock ? (
                  <View style={styles.warningBadge}>
                    <AlertTriangle color={COLORS.white} size={12} />
                    <Text style={styles.warningText}>Stock Warning</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
          {!isLoadingInventory && inventory.length === 0 ? (
            <Text style={[TYPOGRAPHY.body, { width: "100%" }]}>
              Add inventory first to enable quick add.
            </Text>
          ) : null}
        </View>

        <BigButton
          title={isProcessingSale ? "PROCESSING..." : "COMPLETE SALE"}
          color={COLORS.success}
          onPress={completeSale}
          style={styles.checkoutButton}
          icon={<Barcode color={COLORS.white} size={32} />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scannerArea: {
    height: 250,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  cartList: {
    maxHeight: 150,
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  quickItem: {
    width: "48%",
    minHeight: 72,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  quickItemLow: {
    borderColor: COLORS.danger,
    borderWidth: 1.5,
  },
  quickLabel: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 15,
    textAlign: "center",
  },
  quickSubLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    backgroundColor: COLORS.danger,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  warningText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  checkoutButton: {
    marginTop: "auto",
  },
});
