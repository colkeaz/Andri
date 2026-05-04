import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Vibration,
  Button
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { BigButton } from '../components/BigButton';
import { Barcode, ScanLine } from 'lucide-react-native';

export const POSScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cart, setCart] = useState<any[]>([]);
  const [scanned, setScanned] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={[TYPOGRAPHY.body, { textAlign: 'center', marginTop: 100 }]}>
          Permission needed for scanner
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(50);
    
    // In a real app, look up the barcode in the DB
    addItemToCart(`Item ${data.slice(-4)}`, 25);
    
    // Reset scanner after 2 seconds
    setTimeout(() => setScanned(false), 2000);
  };

  const addItemToCart = (name: string, price: number) => {
    setCart([...cart, { id: Date.now().toString(), name, price }]);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.scannerArea}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a'],
        }}
      >
        <View style={styles.overlay}>
          <ScanLine color={scanned ? COLORS.success : COLORS.white} size={150} style={{ opacity: 0.6 }} />
        </View>
      </CameraView>

      <View style={styles.content}>
        <View style={styles.cartHeader}>
          <Text style={TYPOGRAPHY.h2}>Current Sale</Text>
          <Text style={[TYPOGRAPHY.h1, { color: COLORS.primary }]}>₱{total}</Text>
        </View>

        <ScrollView style={styles.cartList}>
          {cart.map(item => (
            <View key={item.id} style={styles.cartItem}>
              <Text style={TYPOGRAPHY.bodyLarge}>{item.name}</Text>
              <Text style={TYPOGRAPHY.bodyLarge}>₱{item.price}</Text>
            </View>
          ))}
          {cart.length === 0 && (
            <Text style={[TYPOGRAPHY.body, { textAlign: 'center', marginTop: 20 }]}>
              Scan barcode or tap below
            </Text>
          )}
        </ScrollView>

        <Text style={[TYPOGRAPHY.body, { marginBottom: SPACING.sm }]}>Quick Items:</Text>
        <View style={styles.quickGrid}>
          {['Bread', 'Egg', 'Soda', 'Water'].map(label => (
            <TouchableOpacity 
              key={label}
              style={styles.quickItem}
              onPress={() => addItemToCart(label, 15)}
            >
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <BigButton 
          title="COMPLETE SALE" 
          color={COLORS.success} 
          onPress={() => {
            Vibration.vibrate([0, 50, 100, 50]);
            setCart([]);
            alert('Sale Recorded!');
          }}
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cartList: {
    maxHeight: 150,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  quickItem: {
    width: '48%',
    height: 50,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.overlay,
  },
  quickLabel: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 16,
  },
  checkoutButton: {
    marginTop: 'auto',
  }
});
