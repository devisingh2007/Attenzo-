import { randomInt } from 'crypto';

export const SESSION_CODE_LENGTH = 6;

/**
 * Generates a cryptographically random 6-digit zero-padded session code string (000000 - 999999).
 */
export function generateSessionCode(): string {
  const num = randomInt(0, 1000000);
  return num.toString().padStart(SESSION_CODE_LENGTH, '0');
}

/**
 * Validates whether a given string matches the 6-digit numeric session code format.
 */
export function isValidSessionCode(code: string): boolean {
  if (typeof code !== 'string') {
    return false;
  }
  return /^\d{6}$/.test(code);
}
