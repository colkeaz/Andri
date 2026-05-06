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
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { BigButton } from '../components/BigButton';
import { dbService } from '../database/db';
import { Save, Package, ArrowLeft, Scan } from 'lucide-react-native';
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
      Alert.alert('Invalid Item Name', 'Item name must be 2 to 50 characters.');
      return null;
    }

    if (!/^[A-Za-z0-9\s\-&,().]+$/.test(trimmedName)) {
      Alert.alert('Invalid Item Name', 'Item name can only use letters, numbers, and basic symbols.');
      return null;
    }

    if (trimmedCategory.length < 2 || trimmedCategory.length > 30) {
      Alert.alert('Invalid Category', 'Category must be 2 to 30 characters.');
      return null;
    }

    if (!/^[A-Za-z\s-]+$/.test(trimmedCategory)) {
      Alert.alert('Invalid Category', 'Category must contain letters only.');
      return null;
    }

    if (!quantity || !Number.isInteger(qty) || qty <= 0 || qty > 99999) {
      Alert.alert('Invalid Quantity', 'Quantity must be a whole number between 1 and 99,999.');
      return null;
    }

    if (!costPrice || Number.isNaN(cost) || cost <= 0 || cost >= 1000000) {
      Alert.alert('Invalid Cost Price', 'Supplier price must be a valid amount greater than 0.');
      return null;
    }

    if (!sellingPrice || Number.isNaN(sell) || sell <= 0 || sell >= 1000000) {
      Alert.alert('Invalid Selling Price', 'Selling price must be a valid amount greater than 0.');
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

      Alert.alert('Success!', `${validated.trimmedName} has been added to your shop.`);
      setName('');
      setCategory('');
      setQuantity('');
      setCostPrice('');
      setSellingPrice('');
      setBarcode('');
      onComplete();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong while saving.');
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
            <ArrowLeft color={COLORS.primary} size={20} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        ) : null}

        <View style={styles.header}>
          <Package color={COLORS.primary} size={40} />
          <Text style={TYPOGRAPHY.h1}>Add Item Manually</Text>
          <Text style={TYPOGRAPHY.body}>Enter the details of your stock</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Item Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Lucky Me Noodles"
            value={name}
            onChangeText={(value) => setName(value.slice(0, 50))}
            maxLength={50}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0"
                keyboardType="numeric"
                value={quantity}
                onChangeText={(value) => setQuantity(sanitizeInteger(value, 5))}
                maxLength={5}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Snacks"
                value={category}
                onChangeText={(value) => setCategory(value.replace(/[^A-Za-z\s-]/g, '').slice(0, 30))}
                maxLength={30}
              />
            </View>
          </View>

          <Text style={styles.label}>Supplier Price (Cost)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="₱ 0.00"
            keyboardType="numeric"
            value={costPrice}
            onChangeText={(value) => setCostPrice(sanitizeDecimal(value, 7))}
            maxLength={10}
          />

          <Text style={styles.label}>Your Selling Price</Text>
          <TextInput 
            style={styles.input} 
            placeholder="₱ 0.00"
            keyboardType="numeric"
            value={sellingPrice}
            onChangeText={(value) => setSellingPrice(sanitizeDecimal(value, 7))}
            maxLength={10}
          />

          <Text style={styles.label}>Barcode (Optional)</Text>
          <View style={styles.barcodeContainer}>
            <TextInput 
              style={[styles.input, { flex: 1, marginBottom: 0 }]} 
              placeholder="Scan or type barcode"
              value={barcode}
              onChangeText={setBarcode}
            />
            <TouchableOpacity 
              style={styles.scanButton} 
              onPress={startScanning}
            >
              <Scan color={COLORS.white} size={24} />
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
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0,51,102,0.08)',
    marginBottom: SPACING.sm,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: 20,
  },
  form: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  label: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 16,
    marginBottom: 8,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.background,
    height: 60,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.overlay,
  },
  row: {
    flexDirection: 'row',
  },
  saveButton: {
    marginTop: 10,
  },
  barcodeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    height: 60,
    width: 60,
    borderRadius: 12,
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
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scannerHint: {
    color: COLORS.white,
    marginTop: 20,
    ...TYPOGRAPHY.bodyBold,
  },
  cancelScanBtn: {
    position: 'absolute',
    bottom: 50,
    width: '80%',
  }
});
