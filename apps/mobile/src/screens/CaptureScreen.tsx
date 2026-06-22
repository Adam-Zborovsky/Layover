import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { getNetworkStateAsync } from "expo-network";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { uploadReceipt, fetchSettings, fetchTrip, ApiError } from "../api/client";
import { addToQueue, getQueueCount } from "../services/offlineQueue";
import { colors, typography, spacing, radii } from "../ui/theme";

type FlashMode = "off" | "on";

export function CaptureScreen({ navigation, route }: { navigation: any; route: any }) {
  const tripId: string | undefined = route.params?.tripId;
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [defaultTripId, setDefaultTripId] = useState<string | null>(null);
  const [defaultTripName, setDefaultTripName] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    checkConnection();
    loadDefaultTrip();
  }, []);

  async function checkConnection() {
    const state = await getNetworkStateAsync();
    setIsOffline(!(state.isConnected && state.isInternetReachable));
    const count = await getQueueCount();
    setQueueLength(count);
  }

  async function loadDefaultTrip() {
    try {
      const settings = (await fetchSettings()) as Record<string, string>;
      const dtId = settings.defaultTripId || null;
      setDefaultTripId(dtId);
      if (dtId) {
        const trip = (await fetchTrip(dtId)) as { name: string };
        setDefaultTripName(trip.name);
      }
    } catch {}
  }

  const effectiveTripId = tripId || defaultTripId || undefined;

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={48} color={colors.textPrimary} style={{ marginBottom: spacing.lg }} />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          Layover needs camera permission to scan your receipts and track expenses.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.permissionButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePhoto() {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8, shutterSound: false });
      if (photo?.base64) {
        setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);
      }
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].base64) {
      const mime = result.assets[0].mimeType || "image/jpeg";
      setCapturedImage(`data:${mime};base64,${result.assets[0].base64}`);
    }
  }

  async function submitReceipt() {
    if (!capturedImage) return;
    setUploading(true);

    const parts = capturedImage.split(",");
    const base64 = parts[1] || parts[0];
    const mimeMatch = capturedImage.match(/^data:(image\/[a-z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    try {
      await uploadReceipt(base64, mimeType, effectiveTripId);
      navigation.goBack();
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        Alert.alert("Authentication Failed", "Check your server URL and token in Settings.");
        setUploading(false);
        return;
      }
      if (err instanceof ApiError && !err.isNetworkError) {
        Alert.alert("Upload Failed", err.message || "Server rejected the upload. Please try again.");
        setUploading(false);
        return;
      }
      const result = await addToQueue({
        id: Date.now().toString(),
        imageBase64: base64,
        mimeType,
        tripId: effectiveTripId,
      });
      if (!result.queued) {
        Alert.alert("Upload Failed", result.warning || "Image is too large to queue. Try a smaller image.");
        setUploading(false);
        return;
      }
      Alert.alert(
        "Queued",
        result.warning ?? "Receipt saved offline. It will upload when you're back online.",
      );
      navigation.goBack();
    } finally {
      setUploading(false);
    }
  }

  function retake() {
    setCapturedImage(null);
  }

  if (capturedImage) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: capturedImage }} style={styles.preview} />
        <View style={[styles.previewActions, { paddingBottom: 40 + insets.bottom }]}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={retake}
            activeOpacity={0.7}
          >
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
            onPress={submitReceipt}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {uploading ? "Uploading..." : "Submit"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" flash={flashMode}>
        <View style={[styles.cameraOverlay, { paddingBottom: 40 + insets.bottom }]}>
          {isOffline && (
            <View style={styles.offlinePill}>
              <Text style={styles.offlinePillText}>Offline — queued{queueLength > 0 ? ` (${queueLength})` : ""}</Text>
            </View>
          )}
          {defaultTripName && !tripId && (
            <View style={[styles.offlinePill, { backgroundColor: colors.statusConfirmed, top: isOffline ? 52 : 16 }]}>
              <Text style={styles.offlinePillText}>Trip: {defaultTripName}</Text>
            </View>
          )}
          <View style={styles.captureRow}>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={pickFromGallery}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={28} color={colors.onPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              activeOpacity={0.7}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.flashButton}
              onPress={() => setFlashMode((m) => (m === "off" ? "on" : "off"))}
              activeOpacity={0.7}
            >
              <Ionicons
                name={flashMode === "on" ? "flash-outline" : "flash-off-outline"}
                size={24}
                color={colors.onPrimary}
              />
              <Text style={styles.flashLabel}>{flashMode === "on" ? "On" : "Off"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 40,
  },
  captureRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    borderWidth: 4,
    borderColor: colors.onPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.onPrimary,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryButtonText: {
    fontSize: 28,
    color: colors.onPrimary,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.textPrimary,
  },
  preview: {
    flex: 1,
    resizeMode: "contain",
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
    paddingBottom: 40,
    gap: spacing.md,
  },
  retakeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.tertiary,
    alignItems: "center",
  },
  retakeButtonText: {
    ...typography.labelMd,
    color: colors.tertiary,
  },
  submitButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    ...typography.headlineLg,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  permissionText: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  permissionButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  permissionButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "600",
  },
  offlinePill: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    backgroundColor: colors.statusProcessing,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    zIndex: 10,
  },
  offlinePillText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontSize: 12,
  },
  flashButton: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    justifyContent: "center",
    alignItems: "center",
  },
  flashButtonText: {
    fontSize: 24,
    color: colors.onPrimary,
  },
  flashLabel: {
    ...typography.labelSm,
    color: colors.onPrimary,
    marginTop: 2,
  },
});
