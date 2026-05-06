import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/tokens';
import { BigButton } from '../components/BigButton';
import { dbService } from '../database/db';
import { Save, Package, ArrowLeft, Scan, ChevronDown } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Modal, TouchableOpacity } from 'react-native';

type ManualAddScreenProps = {
  onComplete: () => void;
  onBack?: () => void;
};

export const ManualAddScreen: React.FC<ManualAddScreenProps> = ({ onComplete, onBack }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);

  const sanitizeInteger = (value: string, maxLength: number) => {
    return value.replace(/\D/g, '').slice(0, maxLength);
  };

  const sanitizeDecimal = (value: string, maxLength: number) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const [whole, ...fractionParts] = cleaned.split('.');
    const fraction = fractionParts.join('');
    const normalizedWhole = whole.slice(0, maxLength);

    if (cleaned.includes('.')) {
      return `${normalizedWhole}.${fraction.slice(0, 2)}`;
    }

    return normalizedWhole;
  };

  const validateForm = () => {
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const qty = Number(quantity);
    const cost = Number(costPrice);
    const sell = Number(sellingPrice);

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      Alert.alert('Invalid Name', 'Product name must be between 2 and 50 characters.');
      return null;
    }

    if (!/^[A-Za-z0-9\s\-\&,().]+$/.test(trimmedName)) {
      Alert.alert('Invalid Name', 'Only letters, numbers, and basic symbols are allowed.');
      return null;
    }

    if (!trimmedCategory) {
      Alert.alert('No Category', 'Please select a category first.');
      return null;
    }

    if (!quantity || !Number.isInteger(qty) || qty <= 0 || qty > 99999) {
      Alert.alert('Invalid Quantity', 'Quantity must be a whole number up to 99,999.');
      return null;
    }

    if (!costPrice || Number.isNaN(cost) || cost <= 0 || cost >= 1000000) {
      Alert.alert('Invalid Cost', 'Cost price must be greater than 0.');
      return null;
    }

    if (!sellingPrice || Number.isNaN(sell) || sell <= 0 || sell >= 1000000) {
      Alert.alert('Invalid Price', 'Selling price must be greater than 0.');
      return null;
    }

    return {
      trimmedName,
      qty,
      cost,
      sell,
      barcode: barcode.trim() || null,
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
        Alert.alert('Permission Required', 'Camera permission is needed to scan barcodes.');
        return;
      }
    }
    setShowScanner(true);
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    const validated = validateForm();
    if (!validated) return;

    try {
      setIsSaving(true);
      const productId = Date.now().toString();
      await dbService.addProduct(productId, validated.trimmedName, validated.barcode);
      await dbService.addBatch(
        `B-${productId}`,
        productId,
        validated.qty,
        validated.cost,
        validated.sell
      );

      Alert.alert('Saved! ✅', `${validated.trimmedName} added to your shop.`);
      setName('');
      setCategory('');
      setQuantity('');
      setCostPrice('');
      setSellingPrice('');
      setBarcode('');
      onComplete();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'There was a problem saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {onBack ? (
          <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]} onPress={onBack}>
            <ArrowLeft color={COLORS.primary} size={22} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        ) : null}

        <View style={styles.header}>
          <Package color={COLORS.secondary} size={44} />
          <Text style={TYPOGRAPHY.h1}>Add Product</Text>
          <Text style={TYPOGRAPHY.body}>Enter the details of your new item</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Product Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Lucky Me Noodles"
            placeholderTextColor={COLORS.textSecondary}
            value={name}
            onChangeText={(value) => setName(value.slice(0, 50))}
            maxLength={50}
          />

          <Text style={styles.label}>Category</Text>
          <View style={{ position: 'relative', zIndex: 10 }}>
            <Pressable 
              style={[styles.input, styles.dropdownTrigger]} 
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Text style={[styles.dropdownText, !category && { color: COLORS.textSecondary }]}>
                {category || "Select Category"}
              </Text>
              <ChevronDown color={COLORS.textSecondary} size={22} />
            </Pressable>

            {showDropdown && (
              <View style={styles.dropdownList}>
                {["Food", "Drinks", "Household", "Others"].map((item) => (
                  <Pressable 
                    key={item} 
                    style={({ pressed }) => [styles.dropdownItem, pressed && { backgroundColor: COLORS.accentSoft }]}
                    onPress={() => {
                      setCategory(item);
                      setShowDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
                value={quantity}
                onChangeText={(value) => setQuantity(sanitizeInteger(value, 5))}
                maxLength={5}
              />
            </View>
          </View>

          <Text style={styles.label}>Cost Price (Supplier)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="₱ 0.00"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
            value={costPrice}
            onChangeText={(value) => setCostPrice(sanitizeDecimal(value, 7))}
            maxLength={10}
          />

          <Text style={styles.label}>Selling Price (Markup)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="₱ 0.00"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
            value={sellingPrice}
            onChangeText={(value) => setSellingPrice(sanitizeDecimal(value, 7))}
            maxLength={10}
          />

          <Text style={styles.label}>Barcode (Optional)</Text>
          <View style={styles.integratedInputContainer}>
            <TextInput 
              style={styles.integratedInput} 
              placeholder="Scan or type barcode"
              placeholderTextColor={COLORS.textSecondary}
              value={barcode}
              onChangeText={setBarcode}
            />
            <TouchableOpacity 
              style={styles.integratedScannerBtn} 
              onPress={startScanning}
              activeOpacity={0.7}
            >
              <Scan color={COLORS.primary} size={24} />
            </TouchableOpacity>
          </View>

          <BigButton 
            title={isSaving ? "SAVING..." : "SAVE TO INVENTORY"} 
            color={COLORS.success}
            onPress={handleSave}
            style={styles.saveButton}
            icon={<Save color={COLORS.white} size={28} />}
          />
        </View>

        {/* Scanner Modal */}
        <Modal visible={showScanner} animationType="slide">
          <View style={styles.scannerContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              onBarcodeScanned={isScanning ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr", "ean13", "ean8", "upc_a"],
              }}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerHint}>Align barcode within the frame</Text>
              <BigButton 
                title="CANCEL" 
                variant="outlined"
                color={COLORS.white}
                onPress={() => setShowScanner(false)}
                style={styles.cancelScanBtn}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentSoft,
    marginBottom: SPACING.sm,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
    fontSize: 17,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: 20,
    gap: 6,
  },
  form: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    shadowColor: '#8B6914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  label: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 17,
    marginBottom: 10,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.background,
    height: 64,
    borderRadius: RADIUS.md,
    paddingHorizontal: 18,
    fontSize: 20,
    marginBottom: 22,
    borderWidth: 1.5,
    borderColor: COLORS.overlay,
    color: COLORS.textPrimary,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  dropdownList: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.overlay,
    shadowColor: '#8B6914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.overlay,
  },
  dropdownItemText: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
  },
  saveButton: {
    marginTop: 12,
    height: 72,
  },
  integratedInputContainer: {
    position: 'relative',
    marginBottom: 22,
    justifyContent: 'center',
  },
  integratedInput: {
    backgroundColor: COLORS.background,
    height: 64,
    borderRadius: RADIUS.md,
    paddingLeft: 18,
    paddingRight: 64,
    fontSize: 20,
    borderWidth: 1.5,
    borderColor: COLORS.overlay,
    color: COLORS.textPrimary,
  },
  integratedScannerBtn: {
    position: 'absolute',
    right: 8,
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: COLORS.white,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scannerHint: {
    color: COLORS.white,
    marginTop: 24,
    ...TYPOGRAPHY.bodyBold,
    fontSize: 18,
  },
  cancelScanBtn: {
    position: 'absolute',
    bottom: 50,
    width: '80%',
  }
});
