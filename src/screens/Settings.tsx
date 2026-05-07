import {
  Bell,
  Database,
  Info,
  LifeBuoy,
  ShieldCheck,
  SlidersHorizontal,
  Store,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AppHeader,
  AppScreen,
  BrandMark,
  PremiumCard,
  SectionHeader,
  StatusPill,
} from "../components/ui";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../theme/tokens";

export const SettingsScreen: React.FC = () => {
  return (
    <AppScreen>
      <AppHeader
        eyebrow="Settings"
        title="Store Setup"
        subtitle="Production-safe app details and local inventory status."
        icon={<View style={styles.headerIcon}><SlidersHorizontal color={COLORS.primary} size={22} /></View>}
        right={<StatusPill label="Local" tone="success" />}
      />

      <PremiumCard style={styles.heroCard}>
        <BrandMark />
        <View style={styles.heroDivider} />
        <View style={styles.detailRow}>
          <Info color={COLORS.textSecondary} size={18} />
          <Text style={styles.detailText}>
            Smart inventory system for small shops, built by FourPoint Team.
          </Text>
        </View>
      </PremiumCard>

      <SectionHeader title="Store" subtitle="Current local workspace" />
      <PremiumCard style={styles.listCard}>
        <SettingRow icon={<Store color={COLORS.primary} size={20} />} title="Store profile" value="Nanay's Store" />
        <SettingRow icon={<Database color={COLORS.success} size={20} />} title="Data source" value="Local SQLite" />
        <SettingRow icon={<ShieldCheck color={COLORS.primary} size={20} />} title="Offline mode" value="Available" />
      </PremiumCard>

      <SectionHeader title="App" subtitle="Build and support details" />
      <PremiumCard style={styles.listCard}>
        <SettingRow icon={<Bell color={COLORS.warning} size={20} />} title="Alerts" value="Profit Guard, low stock, dead stock" />
        <SettingRow icon={<LifeBuoy color={COLORS.primary} size={20} />} title="Support" value="FourPoint Team" />
        <SettingRow icon={<Info color={COLORS.textSecondary} size={20} />} title="Version" value="1.0.0" />
      </PremiumCard>
    </AppScreen>
  );
};

const SettingRow = ({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) => (
  <View style={styles.settingRow}>
    <View style={styles.settingIcon}>{icon}</View>
    <View style={styles.settingText}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    gap: SPACING.md,
  },
  heroDivider: {
    height: 1,
    backgroundColor: COLORS.overlay,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  detailText: {
    ...TYPOGRAPHY.body,
    flex: 1,
    lineHeight: 22,
  },
  listCard: {
    paddingVertical: 4,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.overlay,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    ...TYPOGRAPHY.bodyBold,
  },
  settingValue: {
    ...TYPOGRAPHY.caption,
    marginTop: 3,
  },
});
