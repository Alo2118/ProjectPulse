/**
 * Validation Utilities - Shared Zod preprocessors
 * @module utils/validation
 *
 * IMPORTANT: Frontend often sends `null` for empty optional fields.
 * Zod's `.optional()` only accepts `undefined`, not `null`.
 * Use these preprocessors or `.nullish()` for any optional field that might receive `null`.
 */

/**
 * Preprocess string fields to handle null and empty strings
 * Converts null and empty strings to undefined for Zod .optional() compatibility
 *
 * Usage: z.preprocess(stringPreprocess, z.string().optional())
 */
export const stringPreprocess = (v: unknown): string | undefined => {
  if (v === '' || v === null || v === undefined) return undefined
  if (typeof v === 'string') return v
  return undefined
}

/**
 * Preprocess date strings to accept both YYYY-MM-DD and ISO datetime formats
 * Converts date-only strings to ISO datetime with midnight UTC
 * Also handles null and empty strings
 *
 * Usage: z.preprocess(datePreprocess, z.string().datetime().optional())
 */
export const datePreprocess = (v: unknown): string | undefined => {
  if (v === '' || v === null || v === undefined) return undefined
  if (typeof v === 'string') {
    // If it's just a date (YYYY-MM-DD), convert to ISO datetime
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return `${v}T00:00:00.000Z`
    }
    return v
  }
  return undefined
}

/**
 * Preprocess numeric strings to numbers
 * Handles empty strings, null, undefined, and string numbers
 */
export const numberPreprocess = (v: unknown): number | undefined => {
  if (v === '' || v === null || v === undefined) return undefined
  if (typeof v === 'string') {
    const parsed = parseFloat(v)
    return isNaN(parsed) ? undefined : parsed
  }
  if (typeof v === 'number') return v
  return undefined
}
