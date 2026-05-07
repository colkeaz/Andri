import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import {
  Camera as CameraIcon,
  Keyboard,
  PhilippinePeso,
  ScanLine,
  Tag,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BigButton } from "../components/BigButton";
import { AppHeader, NoticeBanner, PremiumCard, StatusPill } from "../components/ui";
import { dbService } from "../database/db";
import { OCRChip, processImageForText } from "../services/ocrService";
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

export type VisualIntakeScreenProps = {
  onSwitchToManual?: () => void;
};

export const VisualIntakeScreen: React.FC<VisualIntakeScreenProps> = ({
  onSwitchToManual,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedChips, setDetectedChips] = useState<OCRChip[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [selectedCost, setSelectedCost] = useState("");
  const [fullText, setFullText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ width: 1, height: 1 });
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionWrap}>
        <ScanLine color={COLORS.textSecondary} size={64} />
        <Text style={styles.permissionTitle}>Camera scanner is optional</Text>
        <Text style={styles.permissionBody}>
          Grant access to scan product labels, or continue with manual add.
        </Text>
        <BigButton title="Grant Camera Access" onPress={requestPermission} />
        {onSwitchToManual ? (
          <BigButton title="Add Manually Instead" variant="outlined" onPress={onSwitchToManual} />
        ) : null}
      </View>
    );
  }

  const handleSnap = async () => {
    if (!cameraRef.current || isScanning) return;
    setIsScanning(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });
      const imageUri = photo?.uri;
      if (!imageUri) {
        throw new Error("Unable to capture image.");
      }

      setImageSize({
        width: Number(photo?.width ?? 1),
        height: Number(photo?.height ?? 1),
      });
      const result = await processImageForText(imageUri, {
        width: Number(photo?.width ?? 1),
        height: Number(photo?.height ?? 1),
      });
      setDetectedChips(result.chips);
      setFullText(result.fullText);

      if (result.chips.length > 0) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process photo.";
      Alert.alert("Scan Failed", message);
    } finally {
      setIsScanning(false);
    }
  };

  const onCameraLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCameraLayout({ width, height });
  };

  const scaleChipToPreview = (chip: OCRChip) => {
    const sourceWidth = Math.max(1, imageSize.width);
    const sourceHeight = Math.max(1, imageSize.height);
    const previewWidth = Math.max(1, cameraLayout.width);
    const previewHeight = Math.max(1, cameraLayout.height);

    // Camera preview typically uses "cover"; this maps source image coordinates
    // to displayed coordinates for both 4:3 and 16:9 viewports.
    const scale = Math.max(
      previewWidth / sourceWidth,
      previewHeight / sourceHeight,
    );
    const renderedWidth = sourceWidth * scale;
    const renderedHeight = sourceHeight * scale;
    const cropX = (renderedWidth - previewWidth) / 2;
    const cropY = (renderedHeight - previewHeight) / 2;

    return {
      left: Math.max(0, chip.x * scale - cropX),
      top: Math.max(0, chip.y * scale - cropY),
      width: Math.max(90, Math.min(chip.width * scale, previewWidth - 16)),
    };
  };

  const injectChipValue = async (chip: OCRChip) => {
    if (chip.type === "name") {
      setSelectedName(chip.text);
    } else {
      setSelectedCost(chip.text);
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveInjectedItem = async () => {
    const trimmedName = selectedName.trim();
    const cost = Number(selectedCost);
    if (!trimmedName || Number.isNaN(cost) || cost <= 0) {
      Alert.alert(
        "Missing details",
        "Please select a name and cost price first.",
      );
      return;
    }
    if (isSaving) return;

    setIsSaving(true);
    try {
      const productId = Date.now().toString();
      const selling = Number((cost * 1.12).toFixed(2));
      await dbService.addProduct(productId, trimmedName);
      await dbService.addBatch(`B-${productId}`, productId, 1, cost, selling);
      Alert.alert(
        "Added to Inventory",
        `${trimmedName} saved with cost ₱${cost.toFixed(2)}.`,
      );
      setSelectedName("");
      setSelectedCost("");
      setDetectedChips([]);
      setFullText("");
    } catch {
      Alert.alert("Save Failed", "There was a problem saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrap} onLayout={onCameraLayout}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
        />
          <View style={styles.buttonContainer}>
            {isScanning && (
              <ActivityIndicator size="large" color={COLORS.white} />
            )}
          </View>
          {detectedChips.map((chip) => {
            const scaled = scaleChipToPreview(chip);
            return (
              <Pressable
                key={chip.id}
                onPress={() => injectChipValue(chip)}
                style={[
                  styles.chipOverlay,
                  {
                    left: scaled.left,
                    top: scaled.top,
                    minWidth: scaled.width,
                  },
                  chip.type === "price" ? styles.priceChip : styles.nameChip,
                ]}
              >
                <Text style={styles.chipText} numberOfLines={1}>
                  {chip.type === "price" ? `₱${chip.text}` : chip.text}
                </Text>
              </Pressable>
            );
          })}
      </View>

      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <AppHeader
            eyebrow="Camera Intake"
            title="Scan Product"
            subtitle="Capture a label, then tap detected text to fill the item."
            icon={<View style={styles.headerIcon}><ScanLine color={COLORS.primary} size={22} /></View>}
            right={<StatusPill label="OCR" tone="primary" />}
          />

          <BigButton
            title={isScanning ? "Scanning..." : "Take Photo"}
            onPress={handleSnap}
            style={styles.snapButton}
            icon={<CameraIcon color={COLORS.white} size={32} />}
          />

          <PremiumCard style={styles.injectCard}>
            <Text style={styles.injectTitle}>Tap to Auto-fill</Text>
            <Text style={styles.injectHint}>
              Tap the highlighted text above to fill the Name or Cost fields.
            </Text>

            <View style={styles.fieldRow}>
              <Tag color={COLORS.primary} size={18} />
              <TextInput
                style={styles.fieldInput}
                value={selectedName}
                onChangeText={setSelectedName}
                placeholder="Product name"
              />
            </View>

            <View style={styles.fieldRow}>
              <PhilippinePeso color={COLORS.success} size={18} />
              <TextInput
                style={styles.fieldInput}
                value={selectedCost}
                onChangeText={setSelectedCost}
                keyboardType="decimal-pad"
                placeholder="Cost price"
              />
            </View>

            <BigButton
              title={isSaving ? "Saving..." : "Save Product"}
              color={COLORS.success}
              onPress={saveInjectedItem}
              style={styles.saveButton}
            />
          </PremiumCard>

          {fullText ? (
            <PremiumCard style={styles.textDumpCard}>
              <Text style={styles.textDumpTitle}>Detected Text</Text>
              <Text style={styles.textDumpValue}>{fullText}</Text>
            </PremiumCard>
          ) : (
            <NoticeBanner
              title="Ready to scan"
              message="Good lighting and a flat label produce better OCR results."
              tone="primary"
              icon={<ScanLine color={COLORS.primary} size={20} />}
            />
          )}

          {onSwitchToManual ? (
            <BigButton
              title="Switch to Manual"
              variant="outlined"
              color={COLORS.primary}
              onPress={onSwitchToManual}
              style={styles.manualButton}
              icon={<Keyboard color={COLORS.primary} size={28} />}
            />
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Permission screen ──────────────────────────────────────────
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
    lineHeight: 22,
  },
  permissionBtn: {
    marginTop:         SPACING.md,
    backgroundColor:   COLORS.primary,
    borderRadius:      RADIUS.md,
    paddingVertical:   14,
    paddingHorizontal: SPACING.lg,
    ...SHADOW.card,
  },
  permissionBtnText: {
    ...TYPOGRAPHY.buttonLabel,
  },
  manualFallbackBtn: {
    marginTop: SPACING.xs,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  manualFallbackText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },

  // ── Camera ────────────────────────────────────────────────────
  cameraWrap: {
    height:   320,
    overflow: "hidden",
  },
  buttonContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent:  "center",
    alignItems:      "center",
  },

  // ── OCR Chips ────────────────────────────────────────────────
  chipOverlay: {
    position:         "absolute",
    borderRadius:     999,
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderWidth:       1,
  },
  nameChip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor:     COLORS.textPrimary,
  },
  priceChip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor:     COLORS.success,
  },
  chipText: {
    color:      COLORS.textPrimary,
    fontSize:   12,
    fontWeight: "700",
  },

  // ── Content panel ─────────────────────────────────────────────
  content: {
    flex:    1,
    padding: SPACING.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  snapButton: {
    marginTop: 0,
  },
  injectCard: {
    marginTop:       SPACING.sm,
  },
  injectTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 18,
  },
  injectHint: {
    ...TYPOGRAPHY.body,
    fontSize:     14,
    marginTop:    4,
    marginBottom: SPACING.sm,
    lineHeight:   20,
  },
  fieldRow: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               8,
    marginBottom:      10,
    backgroundColor:   COLORS.background,
    borderRadius:      RADIUS.sm,
    borderWidth:       1,
    borderColor:       COLORS.overlay,
    paddingHorizontal: 12,
  },
  fieldInput: {
    flex:      1,
    height:    48,
    fontSize:  16,
    color:     COLORS.textPrimary,
  },
  saveButton: {
    marginTop: SPACING.sm,
    height:    58,
  },
  textDumpCard: {
    marginTop:       SPACING.sm,
  },
  textDumpTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize:     15,
    marginBottom: 6,
  },
  textDumpValue: {
    ...TYPOGRAPHY.body,
    fontSize:   14,
    lineHeight: 20,
  },
  manualButton: {
    marginTop: SPACING.sm,
    height:    56,
    marginBottom: LAYOUT.bottomTabInset,
  },
});
