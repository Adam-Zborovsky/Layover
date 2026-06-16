import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, typography, spacing, radii, categoryColors, statusColors } from "../ui/theme";

interface CategoryChipProps {
  category: string;
  selected?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
}

export function CategoryChip({ category, selected, onPress, size = "md" }: CategoryChipProps) {
  const color = categoryColors[category] || categoryColors.Other;
  const isSmall = size === "sm";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? color : `${color}14`,
          borderColor: selected ? color : `${color}30`,
        },
        isSmall && styles.chipSm,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? colors.onPrimary : color },
          isSmall && styles.chipTextSm,
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = statusColors[status] || statusColors.FAILED;
  const label =
    status === "NEEDS_REVIEW"
      ? "Needs Review"
      : status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}14`, borderColor: color }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

export function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.8
      ? colors.statusConfirmed
      : confidence >= 0.6
        ? colors.statusProcessing
        : colors.statusReview;
  const pct = Math.round(confidence * 100);

  return (
    <View style={styles.confidence}>
      <View style={[styles.confidenceBar, { backgroundColor: `${color}22` }]}>
        <View
          style={[
            styles.confidenceFill,
            { width: `${pct}%` as any, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.confidenceText, { color }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.md,
    marginRight: spacing.xs,
  },
  chipText: {
    ...typography.labelSm,
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextSm: {
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    ...typography.labelSm,
  },
  confidence: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  confidenceFill: {
    height: 4,
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: "600",
    width: 32,
    textAlign: "right",
  },
});
