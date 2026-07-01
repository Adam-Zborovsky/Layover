export const RECEIPT_CATEGORIES = [
  "Food",
  "CarService",
  "Lodging",
  "Airfare",
  "Parking",
  "Tolls",
  "Supplies",
  "Other",
] as const;

export type ReceiptCategory = (typeof RECEIPT_CATEGORIES)[number];

export const RECEIPT_STATUSES = [
  "PROCESSING",
  "NEEDS_REVIEW",
  "CONFIRMED",
  "FAILED",
] as const;

export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export interface Receipt {
  id: string;
  createdAt: string;
  capturedAt: string;
  imagePath: string;
  thumbnailPath: string;
  merchant: string;
  locationCity: string;
  locationAddress: string;
  purchaseDate: string;
  currency: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  category: ReceiptCategory;
  paymentMethod: string;
  notes: string;
  tripId: string | null;
  aiRaw: unknown;
  aiConfidence: number;
  aiModel: string;
  status: ReceiptStatus;
  processingError: string;
  userEdited: boolean;
  fileName: string;
  lineItems?: LineItem[];
  trip?: Trip | null;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
}

export interface LineItem {
  id: string;
  receiptId: string;
  description: string;
  amount: number;
}

export interface Setting {
  key: string;
  value: string;
}

export interface ReceiptListItem {
  id: string;
  capturedAt: string;
  thumbnailPath: string;
  merchant: string;
  total: number;
  currency: string;
  category: ReceiptCategory;
  status: ReceiptStatus;
  tripId: string | null;
  fileName: string;
}

export interface ReceiptCreateRequest {
  imageBase64: string;
  mimeType: string;
  tripId?: string;
}

export interface ReceiptUpdateRequest {
  merchant?: string;
  locationCity?: string;
  locationAddress?: string;
  purchaseDate?: string;
  currency?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  category?: ReceiptCategory;
  paymentMethod?: string;
  notes?: string;
  tripId?: string | null;
}

export interface TripCreateRequest {
  name: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface TripUpdateRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface ExportRequest {
  receiptIds: string[];
  formats: ("zip" | "pdf" | "csv")[];
}

export interface ExportResult {
  id: string;
  status: "pending" | "complete" | "failed";
  files: { format: string; path: string; url: string }[];
  createdAt: string;
}

export interface GeminiExtractionResult {
  merchant: string;
  locationCity: string;
  locationAddress: string;
  purchaseDate: string;
  currency: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  paymentMethod: string;
  suggestedCategory: ReceiptCategory;
  lineItems: { description: string; amount: number }[];
  confidence: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
