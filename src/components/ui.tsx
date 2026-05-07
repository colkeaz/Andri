import { Image } from "expo-image";
import React from "react";
import {
  ActivityIndicator,
  ImageSourcePropType,
  Pressable,
  PressableProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LucideIcon,
  PackageOpen,
} from "lucide-react-native";
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

const appIcon = require("../../assets/images/AndriIcon.png") as ImageSourcePropType;

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function AppScreen({ children, scroll = true, style, contentStyle }: ScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView style={[styles.screen, style]}>
        <View style={[styles.fixedContent, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, style]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <View style={[styles.logoWrap, compact && styles.logoWrapCompact]}>
        <Image source={appIcon} style={styles.logo} contentFit="cover" />
      </View>
      {!compact ? (
        <View>
          <Text style={styles.brandName}>Stocker</Text>
          <Text style={styles.brandSub}>Smart inventory</Text>
        </View>
      ) : null}
    </View>
  );
}

export function AppHeader({
  title,
  subtitle,
  eyebrow,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {icon ?? <BrandMark compact />}
        {right}
      </View>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  count,
  right,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ? (
        right
      ) : typeof count === "number" ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function MetricTile({
  label,
  value,
  caption,
  tone = "neutral",
  icon,
  style,
}: {
  label: string;
  value: string | number;
  caption?: string;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const toneColor = getToneColor(tone);
  return (
    <View style={[styles.metric, style]}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        {icon ? <View style={[styles.softIcon, { backgroundColor: toneColor.soft }]}>{icon}</View> : null}
      </View>
      <Text style={[styles.metricValue, { color: toneColor.strong }]}>{value}</Text>
      {caption ? <Text style={styles.metricCaption}>{caption}</Text> : null}
    </View>
  );
}

export function ActionTile({
  title,
  subtitle,
  icon: Icon,
  tone = "primary",
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "neutral";
  onPress: PressableProps["onPress"];
}) {
  const toneColor = getToneColor(tone);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        { borderColor: toneColor.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: toneColor.soft }]}>
        <Icon color={toneColor.strong} size={22} strokeWidth={2.2} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.actionSubtitle}>{subtitle}</Text> : null}
      </View>
      <ArrowRight color={COLORS.textTertiary} size={18} />
    </Pressable>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
}) {
  const toneColor = getToneColor(tone);
  return (
    <View style={[styles.pill, { backgroundColor: toneColor.soft, borderColor: toneColor.border }]}>
      {icon}
      <Text style={[styles.pillText, { color: toneColor.strong }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: PressableProps["onPress"];
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>{icon ?? <PackageOpen color={COLORS.primary} size={30} />}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]} onPress={onAction}>
          <Text style={styles.emptyButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={COLORS.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function PremiumCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function NoticeBanner({
  title,
  message,
  tone = "primary",
  icon,
  action,
}: {
  title: string;
  message: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const toneColor = getToneColor(tone);
  return (
    <View style={[styles.notice, { borderColor: toneColor.border, backgroundColor: toneColor.soft }]}>
      <View style={styles.noticeIcon}>{icon ?? <AlertCircle color={toneColor.strong} size={22} />}</View>
      <View style={styles.noticeText}>
        <Text style={[styles.noticeTitle, { color: toneColor.strong }]}>{title}</Text>
        <Text style={styles.noticeMessage}>{message}</Text>
      </View>
      {action}
    </View>
  );
}

export function SuccessMark() {
  return <CheckCircle2 color={COLORS.success} size={22} />;
}

function getToneColor(tone: "neutral" | "primary" | "success" | "warning" | "danger") {
  switch (tone) {
    case "primary":
      return { strong: COLORS.primary, soft: COLORS.primarySoft, border: "#BBD5FF" };
    case "success":
      return { strong: COLORS.success, soft: COLORS.successSoft, border: "#BDE8CB" };
    case "warning":
      return { strong: COLORS.warning, soft: COLORS.warningSoft, border: "#F2D49B" };
    case "danger":
      return { strong: COLORS.danger, soft: COLORS.dangerSoft, border: "#F4B7B7" };
    default:
      return { strong: COLORS.textPrimary, soft: COLORS.surfaceMuted, border: COLORS.overlay };
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: LAYOUT.screenPadding,
    paddingBottom: LAYOUT.bottomTabInset,
  },
  fixedContent: {
    flex: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    backgroundColor: COLORS.secondarySoft,
    borderWidth: 1,
    borderColor: COLORS.overlay,
  },
  logoWrapCompact: {
    width: 40,
    height: 40,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  brandName: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 17,
  },
  brandSub: {
    ...TYPOGRAPHY.caption,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  headerTop: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  eyebrow: {
    ...TYPOGRAPHY.eyebrow,
    marginBottom: 4,
  },
  title: {
    ...TYPOGRAPHY.h1,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    marginTop: 6,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    padding: SPACING.md,
    ...SHADOW.soft,
  },
  metric: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    padding: SPACING.md,
    minHeight: 112,
    ...SHADOW.soft,
  },
  metricTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  softIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    ...TYPOGRAPHY.number,
  },
  metricCaption: {
    ...TYPOGRAPHY.caption,
    marginTop: 4,
  },
  actionTile: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    ...SHADOW.soft,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
  },
  actionSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  pill: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  empty: {
    alignItems: "center",
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    textAlign: "center",
  },
  emptyMessage: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: SPACING.xs,
    minHeight: 46,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: {
    ...TYPOGRAPHY.buttonLabel,
    fontSize: 14,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING["2xl"],
    gap: SPACING.sm,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  noticeIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeText: {
    flex: 1,
  },
  noticeTitle: {
    ...TYPOGRAPHY.bodyBold,
  },
  noticeMessage: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
});
