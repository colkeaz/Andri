import { useLocalSearchParams, useRouter } from "expo-router";
import { Camera, ClipboardEdit, Receipt } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import {
  ActionTile,
  AppHeader,
  AppScreen,
  NoticeBanner,
  StatusPill,
} from "../../src/components/ui";

import { ManualAddScreen } from "../../src/screens/ManualAdd";
import { ReceiptProcessor } from "../../src/screens/ReceiptProcessor";
import { VisualIntakeScreen } from "../../src/screens/VisualIntake";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../../src/theme/tokens";

const appIcon = require("../../assets/images/AndriIcon.png");

type IntakeView = "chooser" | "camera" | "manual" | "receipt";

export default function Page() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; source?: string }>();
  const [view, setView] = useState<IntakeView>("chooser");
  const [showManualBack, setShowManualBack] = useState(false);

  useEffect(() => {
    if (params.mode === "camera") {
      setView("camera");
      setShowManualBack(false);
    } else if (params.mode === "manual") {
      setView("manual");
      setShowManualBack(params.source === "camera");
    } else if (params.mode === "receipt") {
      setView("receipt");
      setShowManualBack(false);
    } else {
      setView("chooser");
      setShowManualBack(false);
    }
  }, [params.mode, params.source]);

  if (view === "manual") {
    return (
      <ManualAddScreen
        onComplete={() => router.replace("/inventory")}
        onBack={
          showManualBack
            ? () => setView("camera")
            : params.source === "dashboard"
            ? () => router.replace("/")
            : () => router.replace("/addstock")
        }
      />
    );
  }

  if (view === "receipt") {
    return (
      <ReceiptProcessor
        onBack={() => {
          if (params.source === "dashboard") {
            router.replace("/");
          } else {
            router.replace("/addstock");
          }
        }}
      />
    );
  }

  if (view === "camera") {
    return (
      <VisualIntakeScreen
        onSwitchToManual={() => {
          setShowManualBack(true);
          setView("manual");
        }}
      />
    );
  }

  return (
    <AppScreen>
      <AppHeader
        title="Choose Entry Type"
        subtitle="Add products manually or scan a receipt. Both paths save to the same inventory."
        icon={
          <View style={styles.headerIcon}>
            <Image
              source={appIcon}
              style={{ width: 40, height: 40 }}
              contentFit="contain"
            />
          </View>
        }
        right={<StatusPill label="Stock Intake" tone="primary" />}
      />

      <View style={styles.optionStack}>
        <ActionTile
          title="Manual Add"
          subtitle="Type product name, category, quantity, prices, and optional barcode."
          icon={ClipboardEdit}
          tone="primary"
          onPress={() => router.replace("/addstock?mode=manual")}
        />

        <ActionTile
          title="Scan Receipt"
          subtitle="Use OCR to detect receipt items, then review before saving."
          icon={Receipt}
          tone="warning"
          onPress={() => router.replace("/addstock?mode=receipt")}
        />
      </View>

      <NoticeBanner
        title="Camera label scan"
        message="For product-label OCR, open camera mode from a direct scan flow."
        tone="neutral"
        icon={<Camera color={COLORS.textSecondary} size={20} />}
      />

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Recommended flow</Text>
        <Text style={styles.tipBody}>
          Use Manual Add for one product. Use Scan Receipt when restocking multiple items from a supplier receipt.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  optionStack: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },

  tipCard: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    padding: SPACING.md,
  },

  tipTitle: {
    ...TYPOGRAPHY.bodyBold,
  },

  tipBody: {
    ...TYPOGRAPHY.body,
    marginTop: 6,
    lineHeight: 22,
  },
});