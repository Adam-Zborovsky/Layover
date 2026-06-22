import { z } from "zod";

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Must be ISO date");

export const receiptCategorySchema = z.enum([
  "Food",
  "CarService",
  "Lodging",
  "Airfare",
  "Parking",
  "Tolls",
  "Supplies",
  "Other",
]);

export const receiptStatusSchema = z.enum([
  "PROCESSING",
  "NEEDS_REVIEW",
  "CONFIRMED",
  "FAILED",
]);

export const receiptCreateSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1),
  tripId: z.string().uuid().optional(),
});

export const receiptUpdateSchema = z.object({
  merchant: z.string().min(1).optional(),
  locationCity: z.string().optional(),
  locationAddress: z.string().optional(),
  purchaseDate: isoDateString.optional(),
  currency: z.string().length(3).optional(),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  tip: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  category: receiptCategorySchema.optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  tripId: z.string().uuid().nullable().optional(),
});

export const tripCreateSchema = z.object({
  name: z.string().min(1).max(200),
  startDate: isoDateString,
  endDate: isoDateString,
  notes: z.string().optional(),
});

export const tripUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  notes: z.string().optional(),
});

export const exportRequestSchema = z.object({
  receiptIds: z.array(z.string().uuid()).min(1),
  formats: z.array(z.enum(["zip", "pdf", "csv"])).min(1),
});

export const receiptListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  category: receiptCategorySchema.optional(),
  status: receiptStatusSchema.optional(),
  tripId: z.string().uuid().optional(),
  search: z.string().optional(),
  needsReview: z.coerce.boolean().optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  sortBy: z
    .enum(["capturedAt", "purchaseDate", "total", "merchant", "createdAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const geminiExtractionSchema = z.object({
  merchant: z.string(),
  locationCity: z.string(),
  locationAddress: z.string(),
  purchaseDate: isoDateString,
  currency: z.string().length(3),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  tip: z.number().min(0),
  total: z.number().min(0),
  paymentMethod: z.string(),
  suggestedCategory: receiptCategorySchema,
  lineItems: z.array(
    z.object({
      description: z.string(),
      amount: z.number().min(0),
    })
  ),
  confidence: z.number().min(0).max(1),
});

export const settingsSchema = z.object({
  namingTemplate: z.string().default("YYYY-MM-DD_Merchant_Category_$Total"),
  defaultCurrency: z.string().length(3).default("USD"),
  escalationThreshold: z.coerce.number().min(0).max(1).default(0.6),
  categories: z.array(z.string()).optional(),
  defaultTripId: z.string().optional(),
});
