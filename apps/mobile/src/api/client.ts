import { getNetworkStateAsync } from "expo-network";
import { Paths, File } from "expo-file-system";
import { getBaseUrl, getAuthToken } from "./auth";

export class ApiError extends Error {
  status: number;
  message: string;
  isAuthError: boolean;
  isNetworkError: boolean;

  constructor(status: number, message: string, isAuthError: boolean, isNetworkError: boolean) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.message = message;
    this.isAuthError = isAuthError;
    this.isNetworkError = isNetworkError;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

const REQUEST_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 1000;

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof DOMException && err.name === "AbortError");
}

async function performRequest(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = await getBaseUrl();
  const token = await getAuthToken();

  if (!token) {
    throw new ApiError(401, "Not configured — set your server URL and token in Settings", true, false);
  }

  const networkState = await getNetworkStateAsync();
  // isInternetReachable is null on Android (documented unreliable) — only block
  // on an explicit false to avoid queuing every upload when actually online.
  if (networkState.isConnected === false || networkState.isInternetReachable === false) {
    throw new ApiError(0, "No network connection", false, true);
  }

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

  const fetchOptions: RequestInit = {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  };

  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";

  let response: Response;
  try {
    response = await performRequest(url, fetchOptions);
  } catch (err) {
    if (isGet && isNetworkError(err)) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      try {
        response = await performRequest(url, fetchOptions);
      } catch (retryErr) {
        if (isNetworkError(retryErr)) {
          throw new ApiError(0, "Network request failed", false, true);
        }
        throw retryErr;
      }
    } else if (isNetworkError(err)) {
      throw new ApiError(0, "Network request failed", false, true);
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    const isAuth = response.status === 401 || response.status === 403;
    throw new ApiError(response.status, errorBody, isAuth, false);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  // A 200 that isn't JSON means we hit something other than the API (e.g. a
  // proxy/landing page). Returning the raw text here would let callers treat a
  // string like "Receipt Tracker API" as their typed payload and crash on
  // `.map`/`.filter`. Surface it as an error instead.
  const body = await response.text();
  throw new ApiError(
    response.status,
    `Expected JSON from ${path} but got "${contentType ?? "unknown"}": ${body.slice(0, 200)}`,
    false,
    false
  );
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

// React Native's <Image source={{ uri, headers }}> does not reliably send the
// Authorization header on Android (especially under the New Architecture), so
// auth-protected images come back 401 and render blank. Download the image to a
// local cache file (with the Bearer header) via expo-file-system — the same
// mechanism ExportScreen uses successfully — and hand <Image> the resulting
// file:// URI, which needs no header support to render.
async function downloadImageToCache(path: string, cacheName: string): Promise<string> {
  const baseUrl = await getBaseUrl();
  const token = await getAuthToken();

  const dest = new File(Paths.cache, cacheName);
  const file = await File.downloadFileAsync(`${baseUrl}${path}`, dest, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    idempotent: true, // overwrite a stale cached copy instead of throwing
  });
  return file.uri;
}

export function fetchReceiptImage(id: string): Promise<string> {
  return downloadImageToCache(`/receipts/${id}/image`, `receipt_${id}.jpg`);
}

export function fetchReceiptThumbnail(id: string): Promise<string> {
  return downloadImageToCache(`/receipts/${id}/thumbnail`, `receipt_${id}_thumb.jpg`);
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

export async function deleteTrip(id: string, deleteReceipts?: boolean) {
  return apiRequest(`/trips/${id}`, {
    method: "DELETE",
    params: deleteReceipts ? { deleteReceipts: "true" } : undefined,
  });
}

export async function exportReceipts(receiptIds: string[], formats: ("zip" | "pdf" | "csv")[]) {
  return apiRequest("/export", {
    method: "POST",
    body: { receiptIds, formats },
  });
}

export async function getExportUrl(path: string): Promise<string> {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/export/${encodeURIComponent(path)}`;
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
    const healthUrl = `${baseUrl.replace(/\/api$/, "")}/health`;
    const response = await fetch(healthUrl);
    return response.ok;
  } catch {
    return false;
  }
}
