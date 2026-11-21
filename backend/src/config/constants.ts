/**
 * Application constants per PRD.md, ARCHITECTURE.md, and API.md
 */

// Attendance warning threshold (below this, student gets a warning)
export const ATTENDANCE_WARNING_THRESHOLD = 75;

// Attendance session duration constraints (in minutes)
export const DEFAULT_SESSION_MINUTES = 10;
export const MIN_SESSION_MINUTES = 1;
export const MAX_SESSION_MINUTES = 60;

// Pagination defaults
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Token expiration
export const DEFAULT_JWT_EXPIRES_IN = '7d';

// BCrypt hashing rounds
export const DEFAULT_BCRYPT_ROUNDS = 10;
