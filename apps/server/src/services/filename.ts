import type { ReceiptCategory } from "@recipts/shared";

interface NamingContext {
  capturedAt: Date;
  purchaseDate?: string;
  merchant: string;
  category: ReceiptCategory | string;
  total: number;
  currency: string;
}

const SAFE_CHAR_RE = /[^a-zA-Z0-9\-_]/g;
const VALID_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function deriveFileName(ctx: NamingContext, template?: string): string {
  const tpl = template || "YYYY-MM-DD_Merchant_Category_$Total";

  // The receipt date (as extracted by AI) is what the filename should reflect —
  // not the upload timestamp, since receipts are often uploaded a day or more late.
  let dateStr: string;
  if (ctx.purchaseDate && VALID_DATE_RE.test(ctx.purchaseDate)) {
    dateStr = ctx.purchaseDate.slice(0, 10);
  } else {
    const d = new Date(ctx.capturedAt);
    dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  const safeMerchant = ctx.merchant.replace(SAFE_CHAR_RE, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "Unknown";
  const safeCategory = String(ctx.category).replace(SAFE_CHAR_RE, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "Other";
  const amountStr = `$${ctx.total.toFixed(2)}`.replace(".", ".");

  return tpl
    .replace(/YYYY-MM-DD/g, dateStr)
    .replace(/Merchant/g, safeMerchant)
    .replace(/Category/g, safeCategory)
    .replace(/\$Total/g, amountStr)
    .replace(/\s+/g, "_");
}

export function resolveCollision(baseName: string, existingNames: string[], ext: string): string {
  let candidate = `${baseName}${ext}`;
  if (!existingNames.includes(candidate)) return candidate;

  let counter = 2;
  while (existingNames.includes(`${baseName}-${counter}${ext}`)) {
    counter++;
  }
  return `${baseName}-${counter}${ext}`;
}
