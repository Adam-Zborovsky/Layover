import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { CategoryChip, StatusBadge } from "./Badges";
import { getReceiptThumbnailUrl } from "../api/client";
import { colors, typography, spacing, radii } from "../ui/theme";

interface ReceiptCardProps {
  id: string;
  merchant: string;
  total: number;
  currency: string;
  category: string;
  status: string;
  capturedAt: string;
  thumbnailPath: string;
  onPress: (id: string) => void;
}

const CATEGORY_ACCENT_COLORS: Record<string, string> = {
  Food: colors.categoryFood,
  CarService: colors.categoryCarService,
  Lodging: colors.categoryLodging,
  Airfare: colors.categoryAirfare,
  Parking: colors.categoryParking,
  Tolls: colors.categoryTolls,
  Supplies: colors.categorySupplies,
  Other: colors.categoryOther,
};

export function ReceiptCard({
  id,
  merchant,
  total,
  currency,
  category,
  status,
  capturedAt,
  thumbnailPath,
  onPress,
}: ReceiptCardProps) {
  const [thumbUrl, setThumbUrl] = React.useState<string>("");

  React.useEffect(() => {
    getReceiptThumbnailUrl(id).then(setThumbUrl).catch(() => {});
  }, [id]);

  const date = capturedAt
    ? new Date(capturedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  const accentColor = CATEGORY_ACCENT_COLORS[category] || colors.categoryOther;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(id)}
      activeOpacity={0.7}
    >
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      {thumbUrl ? (
        <Image source={{ uri: thumbUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbPlaceholderText}>REC</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.merchant} numberOfLines={1}>
            {merchant || "Processing..."}
          </Text>
          <Text style={styles.amount}>
            {currency} {total.toFixed(2)}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.cardMeta}>
            <CategoryChip category={category} size="sm" />
            {date ? <Text style={styles.date}>{date}</Text> : null}
          </View>
          <StatusBadge status={status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
    marginVertical: 6,
    overflow: "hidden",
    shadowColor: colors.shadowStrong,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  accentBar: {
    width: 3,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: radii.md,
    margin: spacing.md,
    backgroundColor: colors.borderLight,
  },
  thumbPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.borderLight,
  },
  thumbPlaceholderText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  cardBody: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  merchant: {
    ...typography.headlineMd,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  amount: {
    ...typography.amount,
    color: colors.textPrimary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  date: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
