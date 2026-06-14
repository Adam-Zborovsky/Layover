import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#FF6B35",
  CarService: "#1E90FF",
  Lodging: "#8B5CF6",
  Airfare: "#06B6D4",
  Parking: "#F59E0B",
  Tolls: "#10B981",
  Supplies: "#EC4899",
  Other: "#6B7280",
};

interface Props {
  category: string;
  selected?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
}

export function CategoryChip({ category, selected, onPress, size = "md" }: Props) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
  const isSmall = size === "sm";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? color : `${color}18`, borderColor: color },
        isSmall && styles.chipSm,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? "#FFFFFF" : color },
          isSmall && styles.chipTextSm,
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PROCESSING: "#F59E0B",
  NEEDS_REVIEW: "#EF4444",
  CONFIRMED: "#10B981",
  FAILED: "#6B7280",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.FAILED;
  const label =
    status === "NEEDS_REVIEW"
      ? "Needs Review"
      : status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}18`, borderColor: color }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

export function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.8 ? "#10B981" : confidence >= 0.6 ? "#F59E0B" : "#EF4444";
  const pct = Math.round(confidence * 100);

  return (
    <View style={styles.confidence}>
      <View style={[styles.confidenceBar, { backgroundColor: `${color}22` }]}>
        <View
          style={[
            styles.confidenceFill,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.confidenceText, { color }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 4,
  },
  chipSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextSm: {
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    fontSize: 12,
    fontWeight: "600",
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
