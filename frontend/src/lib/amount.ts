// Amounts are kept as digit-only strings in form state and formatted only for display.

export const MAX_AMOUNT = 999_999_999;

// Keeps digits only and drops leading zeros (a single "0" is kept).
export function sanitizeAmountInput(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

export function parseAmount(digits: string): number | null {
  if (!/^\d+$/.test(digits)) return null;
  return Number(digits);
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString("ko-KR");
}
