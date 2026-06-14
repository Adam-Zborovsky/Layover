import { getBaseUrl, getAuthToken } from "./auth";

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = await getBaseUrl();
  const token = await getAuthToken();

  let url = `${baseUrl}${path}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (options.body && typeof options.body === "object") {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return response.text() as Promise<T>;
}

export async function uploadReceipt(
  imageBase64: string,
  mimeType: string,
  tripId?: string
) {
  return apiRequest("/receipts", {
    method: "POST",
    body: { imageBase64, mimeType, tripId },
  });
}

export async function fetchReceipts(params: Record<string, string | number | boolean | undefined> = {}) {
  return apiRequest("/receipts", { params });
}

export async function fetchReceipt(id: string) {
  return apiRequest(`/receipts/${id}`);
}

export async function updateReceipt(id: string, data: Record<string, unknown>) {
  return apiRequest(`/receipts/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function reprocessReceipt(id: string, model?: string) {
  return apiRequest(`/receipts/${id}/reprocess`, {
    method: "POST",
    params: model ? { model } : undefined,
  });
}

export async function deleteReceipt(id: string) {
  return apiRequest(`/receipts/${id}`, { method: "DELETE" });
}

export async function getReceiptImageUrl(id: string): Promise<string> {
  const baseUrl = await getBaseUrl();
  const token = await getAuthToken();
  return `${baseUrl}/receipts/${id}/image?token=${encodeURIComponent(token)}`;
}

export async function getReceiptThumbnailUrl(id: string): Promise<string> {
  const baseUrl = await getBaseUrl();
  const token = await getAuthToken();
  return `${baseUrl}/receipts/${id}/thumbnail?token=${encodeURIComponent(token)}`;
}

export async function fetchTrips() {
  return apiRequest("/trips");
}

export async function fetchTrip(id: string) {
  return apiRequest(`/trips/${id}`);
}

export async function createTrip(data: { name: string; startDate: string; endDate: string; notes?: string }) {
  return apiRequest("/trips", { method: "POST", body: data });
}

export async function updateTrip(id: string, data: Record<string, unknown>) {
  return apiRequest(`/trips/${id}`, { method: "PATCH", body: data });
}

export async function deleteTrip(id: string) {
  return apiRequest(`/trips/${id}`, { method: "DELETE" });
}

export async function exportReceipts(receiptIds: string[], formats: ("zip" | "pdf" | "csv")[]) {
  return apiRequest("/export", {
    method: "POST",
    body: { receiptIds, formats },
  });
}

export async function getExportUrl(path: string): Promise<string> {
  const baseUrl = await getBaseUrl();
  const token = await getAuthToken();
  return `${baseUrl}/export/${encodeURIComponent(path)}?token=${encodeURIComponent(token)}`;
}

export async function fetchExportLog() {
  return apiRequest("/export/log");
}

export async function fetchSettings() {
  return apiRequest("/settings");
}

export async function updateSettings(settings: Record<string, unknown>) {
  return apiRequest("/settings", { method: "PUT", body: settings });
}

export async function checkHealth(): Promise<boolean> {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
