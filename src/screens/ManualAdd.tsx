import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Package,
  PhilippinePeso,
  Save,
  Scan,
  Tag,
} from "lucide-react-native";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BigButton } from "../components/BigButton";
import {
  AppHeader,
  NoticeBanner,
  PremiumCard,
  StatusPill,
} from "../components/ui";
import { dbService } from "../database/db";
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

type ManualAddScreenProps = {
  onComplete: () => void;
  onBack?: () => void;
};

const categories = ["Food", "Drinks", "Household", "Others"];

export const ManualAddScreen: React.FC<ManualAddScreenProps> = ({ onComplete, onBack }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const barcodeY = useRef(0);

  const margin = useMemo(() => {
    const cost = Number(costPrice);
    const sell = Number(sellingPrice);
    if (!cost || !sell || Number.isNaN(cost) || Number.isNaN(sell)) return null;
    return ((sell - cost) / sell) * 100;
  }, [costPrice, sellingPrice]);

  const sanitizeInteger = (value: string, maxLength: number) => value.replace(/\D/g, "").slice(0, maxLength);

  const sanitizeDecimal = (value: string, maxLength: number) => {
    const cleaned = value.replace(/[^\d.]/g, "");
    const [whole, ...fractionParts] = cleaned.split(".");
    const fraction = fractionParts.join("");
    const normalizedWhole = whole.slice(0, maxLength);
    return cleaned.includes(".") ? `${normalizedWhole}.${fraction.slice(0, 2)}` : normalizedWhole;
  };

  const validateForm = () => {
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const qty = Number(quantity);
    const cost = Number(costPrice);
    const sell = Number(sellingPrice);

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      Alert.alert("Invalid Name", "Product name must be between 2 and 50 characters.");
      return null;
    }
    if (!/^[A-Za-z0-9\s\-\&,().]+$/.test(trimmedName)) {
      Alert.alert("Invalid Name", "Only letters, numbers, and basic symbols are allowed.");
      return null;
    }
    if (!trimmedCategory) {
      Alert.alert("No Category", "Please select a category first.");
      return null;
    }
    if (!quantity || !Number.isInteger(qty) || qty <= 0 || qty > 99999) {
      Alert.alert("Invalid Quantity", "Quantity must be a whole number up to 99,999.");
      return null;
    }
    if (!costPrice || Number.isNaN(cost) || cost <= 0 || cost >= 1000000) {
      Alert.alert("Invalid Cost", "Cost price must be greater than 0.");
      return null;
    }
    if (!sellingPrice || Number.isNaN(sell) || sell <= 0 || sell >= 1000000) {
      Alert.alert("Invalid Price", "Selling price must be greater than 0.");
      return null;
    }

    return {
      trimmedName,
      qty,
      cost,
      sell,
      barcode: barcode.trim() || null,
      category: trimmedCategory,
    };
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (isScanning) return;
    setIsScanning(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBarcode(data);
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

  const scrollToBarcode = () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, barcodeY.current - 24), animated: true });
  };

  const handleSave = async () => {
    if (isSaving) return;
    const validated = validateForm();
    if (!validated) return;

    try {
      setIsSaving(true);
      const productId = Date.now().toString();
      await dbService.addProduct(productId, validated.trimmedName, validated.barcode, validated.category);
      await dbService.addBatch(`B-${productId}`, productId, validated.qty, validated.cost, validated.sell);

      Alert.alert("Saved", `${validated.trimmedName} added to your shop.`);
      setName("");
      setCategory("");
      setQuantity("");
      setCostPrice("");
      setSellingPrice("");
      setBarcode("");
      onComplete();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "There was a problem saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppHeader
          eyebrow="Add Stock"
          title="Add Product"
          subtitle="Manual entry is ready even when camera access is off."
          icon={onBack ? (
            <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={onBack}>
              <ArrowLeft color={COLORS.primary} size={22} />
            </Pressable>
          ) : <View style={styles.headerIcon}><Package color={COLORS.primary} size={22} /></View>}
          right={<StatusPill label="Manual" tone="primary" />}
        />

        <View style={styles.modeStrip}>
          <View style={styles.modeItemActive}>
            <Package color={COLORS.primary} size={18} />
            <Text style={styles.modeItemTextActive}>Manual</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.modeItem, pressed && styles.pressed]} onPress={scrollToBarcode}>
            <Scan color={COLORS.textSecondary} size={18} />
            <Text style={styles.modeItemText}>Barcode optional</Text>
          </Pressable>
        </View>

        <PremiumCard style={styles.form}>
          <Field label="Product Name" icon={<Tag color={COLORS.primary} size={16} />}>
            <TextInput style={styles.input} placeholder="e.g. Lucky Me Noodles" placeholderTextColor={COLORS.textSecondary} value={name} onChangeText={(value) => setName(value.slice(0, 50))} maxLength={50} />
          </Field>

          <Field label="Category">
            <View style={styles.dropdownWrap}>
              <Pressable style={styles.inputButton} onPress={() => setShowDropdown(!showDropdown)}>
                <Text style={[styles.inputButtonText, !category && styles.placeholder]}>{category || "Select category"}</Text>
                <ChevronDown color={COLORS.textSecondary} size={20} />
              </Pressable>
              {showDropdown ? (
                <View style={styles.dropdownList}>
                  {categories.map((item) => (
                    <Pressable
                      key={item}
                      style={({ pressed }) => [styles.dropdownItem, pressed && { backgroundColor: COLORS.primarySoft }]}
                      onPress={() => {
                        setCategory(item);
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </Field>

          <Field label="Quantity">
            <TextInput style={styles.input} placeholder="0" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" value={quantity} onChangeText={(value) => setQuantity(sanitizeInteger(value, 5))} maxLength={5} />
          </Field>

          <View style={styles.row}>
            <Field label="Cost Price" style={styles.rowField} icon={<PhilippinePeso color={COLORS.warning} size={16} />}>
              <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" value={costPrice} onChangeText={(value) => setCostPrice(sanitizeDecimal(value, 7))} maxLength={10} />
            </Field>
            <Field label="Sell Price" style={styles.rowField} icon={<PhilippinePeso color={COLORS.success} size={16} />}>
              <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" value={sellingPrice} onChangeText={(value) => setSellingPrice(sanitizeDecimal(value, 7))} maxLength={10} />
            </Field>
          </View>

          {margin !== null ? (
            <NoticeBanner
              title={margin >= 12 ? "Healthy margin" : "Low margin"}
              message={`Estimated profit margin: ${margin.toFixed(1)}%`}
              tone={margin >= 12 ? "success" : "warning"}
              icon={<CheckCircle2 color={margin >= 12 ? COLORS.success : COLORS.warning} size={20} />}
            />
          ) : null}

          <View onLayout={(event) => { barcodeY.current = event.nativeEvent.layout.y; }}>
          <Field label="Barcode">
            <View style={styles.integratedInputContainer}>
              <TextInput style={styles.integratedInput} placeholder="Scan or type barcode" placeholderTextColor={COLORS.textSecondary} value={barcode} onChangeText={setBarcode} />
              <TouchableOpacity style={styles.integratedScannerBtn} onPress={startScanning} activeOpacity={0.78}>
                <Scan color={COLORS.primary} size={22} />
              </TouchableOpacity>
            </View>
          </Field>
          </View>

          <BigButton
            title={isSaving ? "Saving..." : "Save to Inventory"}
            color={COLORS.success}
            onPress={handleSave}
            style={styles.saveButton}
            icon={<Save color={COLORS.white} size={22} />}
            disabled={isSaving}
          />
        </PremiumCard>

        <Modal visible={showScanner} animationType="slide">
          <View style={styles.scannerContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              onBarcodeScanned={isScanning ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a"] }}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerHint}>Align barcode within the frame</Text>
              <BigButton title="Cancel" variant="outlined" color={COLORS.white} onPress={() => setShowScanner(false)} style={styles.cancelScanBtn} />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode; icon?: React.ReactNode; style?: any }> = ({
  label,
  children,
  icon,
  style,
}) => (
  <View style={[styles.field, style]}>
    <View style={styles.labelRow}>
      {icon}
      <Text style={styles.label}>{label}</Text>
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: LAYOUT.bottomTabInset,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  modeStrip: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modeItemActive: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: "#BBD5FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  modeItem: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  modeItemTextActive: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  modeItemText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
  form: {
    gap: SPACING.sm,
  },
  field: {
    marginBottom: SPACING.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
  },
  label: {
    ...TYPOGRAPHY.caption,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: COLORS.background,
    minHeight: 54,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    color: COLORS.textPrimary,
  },
  inputButton: {
    backgroundColor: COLORS.background,
    minHeight: 54,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputButtonText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
  },
  placeholder: {
    color: COLORS.textSecondary,
    fontFamily: "Inter_400Regular",
    fontWeight: "400",
  },
  dropdownWrap: {
    position: "relative",
  },
  dropdownList: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    overflow: "hidden",
    ...SHADOW.card,
  },
  dropdownItem: {
    paddingVertical: 15,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.overlay,
  },
  dropdownItemText: {
    ...TYPOGRAPHY.bodyBold,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  rowField: {
    flex: 1,
  },
  integratedInputContainer: {
    position: "relative",
    justifyContent: "center",
  },
  integratedInput: {
    backgroundColor: COLORS.background,
    minHeight: 54,
    borderRadius: RADIUS.md,
    paddingLeft: SPACING.md,
    paddingRight: 62,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    color: COLORS.textPrimary,
  },
  integratedScannerBtn: {
    position: "absolute",
    right: 7,
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    marginTop: SPACING.sm,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  scannerOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.58)",
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
    width: "80%",
  },
  pressed: {
    opacity: 0.75,
  },
});
