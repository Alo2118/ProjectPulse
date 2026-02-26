/**
 * Safely converts Prisma Decimal, string, or number to a plain number.
 * Returns 0 for null, undefined, or NaN values.
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  return isNaN(num) ? 0 : num
}
