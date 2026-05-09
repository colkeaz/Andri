import React from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AlertCircle, Edit3, Package, Trash2 } from "lucide-react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../theme/tokens";
import { PremiumCard, StatusPill } from "./ui";

export type InventoryItem = {
  id: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  min_stock: number;
  sellingPrice: number;
  costPrice: number;
};

interface InventoryCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  money: (value: number) => string;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
  item,
  onEdit,
  onDelete,
  money,
}) => {
  const isLow = item.quantity <= item.min_stock;
  const pct = Math.min(1, item.quantity / Math.max(1, item.min_stock * 2));

  return (
    <PremiumCard style={[styles.productCard, isLow && styles.productCardLow]}>
      <Pressable style={styles.productMain} onPress={() => onEdit(item)}>
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
        <TouchableOpacity style={styles.iconButton} onPress={() => onEdit(item)} hitSlop={8}>
          <Edit3 color={COLORS.primary} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => onDelete(item)} hitSlop={8}>
          <Trash2 color={COLORS.danger} size={18} />
        </TouchableOpacity>
      </View>
    </PremiumCard>
  );
};

const styles = StyleSheet.create({
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
});
