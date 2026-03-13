/**
 * Pagination Helpers - Standardized pagination metadata builder
 * Eliminates duplicated pagination object construction across services
 * @module utils/paginate
 */

// ============================================================
// TYPES
// ============================================================

/**
 * Standardized pagination metadata included in all paginated list responses
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  pages: number
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Builds a standardized pagination metadata object from raw values.
 * @example buildPagination(1, 20, 135) // { page: 1, limit: 20, total: 135, pages: 7 }
 */
export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  }
}
