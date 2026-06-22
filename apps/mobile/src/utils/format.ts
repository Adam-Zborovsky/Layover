const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  ILS: "\u20AA",
  JPY: "\u00A5",
  CAD: "$",
  AUD: "$",
};

export function currencySymbol(code?: string): string {
  if (!code) return "$";
  return CURRENCY_SYMBOLS[code.toUpperCase()] || code;
}

export function formatCurrency(amount: number, code?: string): string {
  const sym = currencySymbol(code);
  return `${sym}${amount.toFixed(2)}`;
}

export function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}
