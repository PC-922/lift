export function isDecimalInput(value: string): boolean {
  return value === '' || value === '-' || /^-?\d*(?:[.,]\d*)?$/.test(value);
}

export function isIntegerInput(value: string): boolean {
  return value === '' || value === '-' || /^-?\d+$/.test(value);
}

export function parseDecimalInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '' || normalized === '-') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseIntegerInput(value: string): number | null {
  const normalized = value.trim();
  if (normalized === '' || normalized === '-') return null;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : null;
}
