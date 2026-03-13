/**
 * Centralized configuration constants for ProjectPulse backend.
 * All magic numbers and repeated literal values live here.
 * Import from this file instead of redefining locally.
 *
 * @module constants/config
 */

// ============================================================
// AUTHENTICATION
// ============================================================

/** bcrypt salt rounds. Matches NIST guidance for interactive logins. */
export const BCRYPT_ROUNDS = 12

/** Minimum accepted password length for user accounts. */
export const PASSWORD_MIN_LENGTH = 8

/** Expiry for JWT access tokens (short-lived). */
export const JWT_ACCESS_EXPIRY = '8h'

/** Expiry for JWT refresh tokens (long-lived). */
export const JWT_REFRESH_EXPIRY = '7d'

/** Refresh token TTL in milliseconds (7 days). Used when writing the DB record. */
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

// ============================================================
// INVITATIONS
// ============================================================

/** Project invitation expiry in milliseconds (7 days). */
export const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

// ============================================================
// AUTOMATION
// ============================================================

/** Cooldown records older than this are removed by the cleanup job (7 days). */
export const STALE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

/** How often the automation scheduler runs its checks (15 minutes). */
export const SCHEDULER_INTERVAL_MS = 15 * 60 * 1000

// ============================================================
// PAGINATION
// ============================================================

/** Default number of records returned when no limit is specified. */
export const DEFAULT_PAGE_SIZE = 20

/** Maximum number of records that can be requested in a single page. */
export const MAX_PAGE_SIZE = 100

// ============================================================
// BULK OPERATIONS
// ============================================================

/** Maximum number of entities that can be processed in a single bulk request. */
export const MAX_BULK_OPERATIONS = 100

// ============================================================
// FILE UPLOADS
// ============================================================

/** Maximum allowed file upload size in megabytes. */
export const FILE_UPLOAD_MAX_SIZE_MB = 10

// ============================================================
// RATE LIMITING
// ============================================================

/** Sliding window duration for the API rate limiter in milliseconds (15 minutes). */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
