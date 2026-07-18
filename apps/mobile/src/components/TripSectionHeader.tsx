import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, radii } from "../ui/theme";
import { formatCurrency } from "../utils/format";

interface TripSectionHeaderProps {
  title: string;
  dateRange: string | null;
  receiptCount: number;
  totalAmount: number;
  currency: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function TripSectionHeader({
  title,
  dateRange,
  receiptCount,
  totalAmount,
  currency,
  collapsed,
  onToggle,
}: TripSectionHeaderProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityLabel={`${title}, ${receiptCount} receipt${receiptCount !== 1 ? "s" : ""}, ${collapsed ? "collapsed" : "expanded"}`}
      accessibilityRole="button"
    >
      <Ionicons
        name={collapsed ? "chevron-forward" : "chevron-down"}
        size={16}
        color={colors.textSecondary}
        style={styles.chevron}
      />
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {dateRange ? <Text style={styles.dateRange}>{dateRange}</Text> : null}
      </View>
      <View style={styles.metaCol}>
        <Text style={styles.total}>{formatCurrency(totalAmount, currency)}</Text>
        <Text style={styles.count}>
          {receiptCount} receipt{receiptCount !== 1 ? "s" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chevron: {
    marginRight: spacing.sm,
  },
  textCol: {
    flex: 1,
  },
  title: {
    ...typography.labelMd,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  dateRange: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: 1,
  },
  metaCol: {
    alignItems: "flex-end",
  },
  total: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: "700",
  },
  count: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: 1,
  },
});
