import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  type ImageSourcePropType,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchReceipt,
  updateReceipt,
  reprocessReceipt,
  deleteReceipt,
  fetchReceiptImage,
  fetchTrips,
} from "../api/client";
import { ConfidenceIndicator, StatusBadge, CategoryChip } from "../components/Badges";
import { RECEIPT_CATEGORIES, type Receipt } from "@recipts/shared";
import { colors, typography, spacing, radii, categoryColors } from "../ui/theme";
import { formatDateInput } from "../utils/format";

export function ReceiptDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [imageSource, setImageSource] = useState<ImageSourcePropType | null>(null);
  const [imageError, setImageError] = useState(false);
  const [trips, setTrips] = useState<{ id: string; name: string }[]>([]);
  const [edited, setEdited] = useState<Record<string, any>>({});
  const [lineItemsExpanded, setLineItemsExpanded] = useState(false);

  useEffect(() => {
    loadReceipt();
    loadTrips();
  }, [id]);

  async function loadReceipt() {
    try {
      setError(null);
      const data = (await fetchReceipt(id)) as Receipt;
      setReceipt(data);
      setEdited({});
    } catch (err: any) {
      setError(err.message || "Failed to load receipt");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadImage() {
      try {
        const dataUri = await fetchReceiptImage(id);
        setImageSource({ uri: dataUri });
        setImageError(false);
      } catch {
        setImageError(true);
      }
    }
    loadImage();
  }, [id]);

  async function loadTrips() {
    try {
      const data = (await fetchTrips()) as { id: string; name: string }[];
      setTrips(data);
    } catch {}
  }

  function updateField(field: string, value: any) {
    setEdited((prev) => ({ ...prev, [field]: value }));
  }

  async function saveChanges() {
    if (!receipt) return;
    setIsSaving(true);
    try {
      await updateReceipt(id, edited);
      setEditing(false);
      loadReceipt();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReprocess() {
    Alert.alert("Re-run AI", "Choose model:", [
      {
        text: "Flash (Default)",
        onPress: async () => {
          await reprocessReceipt(id);
          loadReceipt();
        },
      },
      {
        text: "Pro (Better accuracy)",
        onPress: async () => {
          await reprocessReceipt(id, "pro");
          loadReceipt();
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleDelete() {
    Alert.alert("Delete Receipt", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteReceipt(id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.lg }} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            loadReceipt();
          }}
          activeOpacity={0.7}
          accessibilityLabel="Retry loading receipt"
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Receipt not found</Text>
      </View>
    );
  }

  const display = { ...receipt, ...edited };
  const confidence = receipt.aiConfidence || 0;
  const confidenceColor =
    confidence >= 0.8
      ? colors.statusConfirmed
      : confidence >= 0.6
        ? colors.statusProcessing
        : colors.statusReview;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl + insets.bottom }]}>
      {imageSource && !imageError ? (
        <View style={styles.imageWrapper}>
          <ScrollView
            style={styles.zoomContainer}
            contentContainerStyle={styles.zoomContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            bouncesZoom={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={imageSource}
              style={styles.image}
              resizeMode="contain"
              onError={() => setImageError(true)}
            />
          </ScrollView>
          <View style={styles.imageOverlay}>
            <View style={styles.confidencePill}>
              <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
              <Text style={styles.confidenceText}>
                {receipt.aiModel || "Gemini Flash"} | {Math.round(confidence * 100)}% Confidence
              </Text>
            </View>
          </View>
        </View>
      ) : imageError ? (
        <View style={styles.imageErrorBox}>
          <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
          <Text style={styles.imageErrorText}>Image unavailable</Text>
        </View>
      ) : null}

      <View style={styles.statusRow}>
        <StatusBadge status={receipt.status} />
      </View>

      <View style={styles.card}>
        <View style={[styles.field, styles.confidenceBorder]}>
          <Text style={styles.fieldLabel}>Merchant</Text>
          <TextInput
            style={styles.underlineInput}
            value={display.merchant}
            onChangeText={(v) => updateField("merchant", v)}
            editable={editing}
            placeholder="Merchant name"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Merchant name"
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.confidenceBorder, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput
              style={styles.underlineInput}
              value={display.locationCity}
              onChangeText={(v) => updateField("locationCity", v)}
              editable={editing}
              placeholder="City"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Location city"
            />
          </View>
          <View style={[styles.field, styles.confidenceBorder, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.underlineInput}
              value={display.purchaseDate}
              onChangeText={(v) => updateField("purchaseDate", formatDateInput(v))}
              editable={editing}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={10}
              selectTextOnFocus
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.amountRow}>
          <View style={[styles.field, styles.confidenceBorder, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Subtotal</Text>
            <TextInput
              style={[styles.underlineInput, { color: colors.primary }]}
              value={display.subtotal?.toString()}
              onChangeText={(v) => updateField("subtotal", parseFloat(v) || 0)}
              editable={editing}
              keyboardType="decimal-pad"
              placeholder="$0.00"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={[styles.field, styles.confidenceBorder, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Tax</Text>
            <TextInput
              style={[styles.underlineInput, { color: colors.primary }]}
              value={display.tax?.toString()}
              onChangeText={(v) => updateField("tax", parseFloat(v) || 0)}
              editable={editing}
              keyboardType="decimal-pad"
              placeholder="$0.00"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={[styles.field, styles.confidenceBorder, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Tip</Text>
            <TextInput
              style={[styles.underlineInput, { color: colors.primary }]}
              value={display.tip?.toString()}
              onChangeText={(v) => updateField("tip", parseFloat(v) || 0)}
              editable={editing}
              keyboardType="decimal-pad"
              placeholder="$0.00"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={[styles.field, styles.confidenceBorder, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Total</Text>
            <TextInput
              style={[styles.underlineInput, { color: colors.primary }]}
              value={display.total?.toString()}
              onChangeText={(v) => updateField("total", parseFloat(v) || 0)}
              editable={editing}
              keyboardType="decimal-pad"
              placeholder="$0.00"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <View style={styles.totalValueRow}>
            <Text style={styles.totalCurrency}>{display.currency || "USD"}</Text>
            <Text style={styles.totalValue}>${(display.total || 0).toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Category</Text>
      {editing ? (
        <View style={styles.chipRow}>
          {RECEIPT_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              category={cat}
              selected={display.category === cat}
              onPress={() => updateField("category", cat)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.chipRow}>
          <CategoryChip category={display.category} />
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment Method</Text>
          {editing ? (
            <TextInput
              style={styles.underlineInput}
              value={display.paymentMethod || ""}
              onChangeText={(v) => updateField("paymentMethod", v)}
              editable={editing}
              placeholder="Payment method"
              placeholderTextColor={colors.textTertiary}
            />
          ) : (
            <Text style={styles.infoValue}>{display.paymentMethod || "\u2014"}</Text>
          )}
        </View>
        <View style={styles.divider} />
        {editing ? (
          <View>
            <Text style={styles.infoLabel}>Trip Assignment</Text>
            <View style={[styles.chipRow, { paddingHorizontal: 0, marginBottom: 0 }]}>
              {trips.map((t) => (
                <CategoryChip
                  key={t.id}
                  category={t.name}
                  selected={display.tripId === t.id}
                  onPress={() => updateField("tripId", t.id)}
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trip Assignment</Text>
            <Text style={[styles.infoValue, !display.tripId && { color: colors.primary }]}>
              {trips.find((t) => t.id === display.tripId)?.name || "No trip"}
            </Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Notes</Text>
          <TextInput
            style={[styles.underlineInput, { marginTop: spacing.xs }]}
            value={display.notes}
            onChangeText={(v) => updateField("notes", v)}
            editable={editing}
            placeholder="Add notes..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        </View>
      </View>

      {receipt.lineItems && receipt.lineItems.length > 0 && (
        <TouchableOpacity
          style={styles.card}
          onPress={() => setLineItemsExpanded(!lineItemsExpanded)}
        >
          <View style={styles.lineItemHeader}>
            <Text style={styles.infoLabel}>
              Line Items ({receipt.lineItems.length})
            </Text>
            <Ionicons
              name={lineItemsExpanded ? "chevron-up" : "chevron-down"}
              size={12}
              color={colors.textTertiary}
            />
          </View>
          {lineItemsExpanded &&
            receipt.lineItems.map((item: any, idx: number) => (
              <View key={idx} style={styles.lineItemRow}>
                <Text style={styles.lineItemDesc}>{item.description}</Text>
                <Text style={styles.lineItemAmount}>
                  ${(item.amount || 0).toFixed(2)}
                </Text>
              </View>
            ))}
        </TouchableOpacity>
      )}

      <View style={styles.fileNameRow}>
        <Text style={styles.fieldLabel}>File:</Text>
        <Text style={styles.fileName}>{receipt.fileName}</Text>
      </View>

      <View style={styles.actions}>
        {editing ? (
          <>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={saveChanges}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditing(false);
                setEdited({});
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reprocessButton}
              onPress={handleReprocess}
              activeOpacity={0.7}
            >
              <Text style={styles.reprocessButtonText}>Re-run AI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  notFound: {
    ...typography.bodyMd,
    color: colors.textSecondary,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.headlineLg,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.bodyMd,
    color: colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  retryButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "700",
  },
  imageWrapper: {
    position: "relative",
  },
  imageErrorBox: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.borderLight,
    gap: spacing.sm,
  },
  imageErrorText: {
    ...typography.bodySm,
    color: colors.textTertiary,
  },
  zoomContainer: {
    width: "100%",
    height: 340,
    backgroundColor: colors.borderLight,
  },
  zoomContent: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: 340,
    backgroundColor: colors.borderLight,
  },
  imageOverlay: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
  },
  confidencePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    gap: 6,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceText: {
    ...typography.labelSm,
    color: colors.textPrimary,
  },
  statusRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  field: {
    marginBottom: spacing.md,
  },
  confidenceBorder: {
    borderLeftWidth: 3,
    borderLeftColor: colors.tertiary,
    paddingLeft: spacing.md,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  underlineInput: {
    ...typography.headlineMd,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  fieldRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  amountRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  amountValue: {
    ...typography.bodyLg,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  totalRow: {
    alignItems: "flex-end",
  },
  totalLabel: {
    ...typography.headlineMd,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  totalValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  totalCurrency: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: "700",
  },
  totalValue: {
    ...typography.amountLg,
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginLeft: spacing.lg + spacing.xs,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoRow: {
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    ...typography.bodyMd,
    color: colors.textPrimary,
  },
  lineItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expandIcon: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  lineItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.md,
  },
  lineItemDesc: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  lineItemAmount: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  fileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  fileName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
  actions: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center",
  },
  editButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "700",
  },
  reprocessButton: {
    borderWidth: 2,
    borderColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center",
  },
  reprocessButtonText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: colors.errorDim,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center",
  },
  deleteButtonText: {
    ...typography.labelMd,
    color: colors.error,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: colors.borderLight,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center",
  },
  cancelButtonText: {
    ...typography.labelMd,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
