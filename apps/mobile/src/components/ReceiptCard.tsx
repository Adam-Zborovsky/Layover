import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  type ImageSourcePropType,
} from "react-native";
import { CategoryChip, StatusBadge } from "./Badges";
import { getReceiptThumbnailUrl } from "../api/client";
import { getAuthToken } from "../api/auth";
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
  const [thumbSource, setThumbSource] = React.useState<ImageSourcePropType | null>(null);

  React.useEffect(() => {
    async function loadThumb() {
      const [url, token] = await Promise.all([
        getReceiptThumbnailUrl(id),
        getAuthToken(),
      ]);
      setThumbSource({
        uri: url,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    }
    loadThumb().catch(() => {});
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
      accessibilityLabel={`${merchant || "Unknown"}, ${currency} ${(typeof total === 'number' ? total : 0).toFixed(2)}, ${category}, ${status}`}
      accessibilityRole="button"
    >
      <View
        style={[styles.accentBar, { backgroundColor: accentColor }]}
        importantForAccessibility="no"
      />
      {thumbSource ? (
        <Image source={thumbSource} style={styles.thumb} />
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
            {currency} {(typeof total === 'number' ? total : 0).toFixed(2)}
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
      <Text style={styles.chevron} importantForAccessibility="no">›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
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
  chevron: {
    fontSize: 22,
    color: colors.textTertiary,
    marginRight: spacing.md,
    alignSelf: "center",
    fontWeight: "300",
  },
});
