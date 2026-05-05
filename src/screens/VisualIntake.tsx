import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Button
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { BigButton } from '../components/BigButton';
import { visionService, ScannedReceiptItem } from '../services/aiService';
import { Camera as CameraIcon, Keyboard } from 'lucide-react-native';

export type VisualIntakeScreenProps = {
  onSwitchToManual?: () => void;
};

export const VisualIntakeScreen: React.FC<VisualIntakeScreenProps> = ({
  onSwitchToManual,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [items, setItems] = useState<ScannedReceiptItem[]>([]);

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={[TYPOGRAPHY.body, { textAlign: 'center', marginTop: 100 }]}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const handleSnap = async () => {
    setIsScanning(true);
    // Simulate camera delay and OCR processing
    setTimeout(async () => {
      const results = await visionService.processReceiptOCR('mock_path');
      setItems(results);
      setIsScanning(false);
    }, 2000);
  };

  const renderItem = ({ item }: { item: ScannedReceiptItem }) => (
    <View style={styles.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={TYPOGRAPHY.bodyLarge}>{item.name}</Text>
        <Text style={TYPOGRAPHY.body}>Qty: {item.quantity}</Text>
      </View>
      <Text style={[TYPOGRAPHY.h2, { color: COLORS.success }]}>₱{item.price}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {items.length === 0 && (
        <CameraView style={styles.camera} facing="back">
          <View style={styles.buttonContainer}>
            {isScanning && <ActivityIndicator size="large" color={COLORS.white} />}
          </View>
        </CameraView>
      )}

      <View style={styles.content}>
        {items.length > 0 ? (
          <>
            <Text style={[TYPOGRAPHY.h2, { marginBottom: SPACING.sm }]}>Found Items:</Text>
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item, index) => index.toString()}
              style={styles.list}
            />
            <BigButton
              title="CONFIRM & ADD ALL"
              color={COLORS.success}
              onPress={() => setItems([])}
            />
          </>
        ) : (
          <>
            <BigButton
              title="SNAP PHOTO"
              onPress={handleSnap}
              style={styles.snapButton}
              icon={<CameraIcon color={COLORS.white} size={32} />}
            />
            {onSwitchToManual ? (
              <BigButton
                title="ADD MANUALLY INSTEAD"
                color={COLORS.secondary}
                onPress={onSwitchToManual}
                style={styles.manualButton}
                icon={<Keyboard color={COLORS.primary} size={28} />}
              />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  camera: {
    flex: 1,
    maxHeight: 400,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  snapButton: {
    marginTop: SPACING.md,
  },
  manualButton: {
    marginTop: SPACING.sm,
    height: 72,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 15,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.overlay,
  },
  list: {
    flex: 1,
    marginBottom: SPACING.md,
  }
});
