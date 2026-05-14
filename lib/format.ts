/**
 * Formats a raw input string into US phone format: (XXX) XXX-XXXX.
 * Strips all non-digit characters and applies the mask progressively,
 * so it works correctly as a controlled input onChange handler.
 */
export function formatUSPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Returns true when the string matches the fully-formed US phone format.
 * Useful for conditional validation outside of Zod schemas.
 */
export function isValidUSPhone(value: string): boolean {
  return /^\(\d{3}\) \d{3}-\d{4}$/.test(value);
}
