import { Alert } from "react-native";
import { ApiError } from "../api/client";

export function formatError(err: unknown): string {
  if (err instanceof ApiError) {
    const lines = [err.message || "Unknown error"];
    if (err.status) lines.push(`Status: ${err.status}`);
    return lines.join("\n");
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function showErrorAlert(title: string, err: unknown, fallbackMessage: string) {
  Alert.alert(title, formatError(err) || fallbackMessage);
}
