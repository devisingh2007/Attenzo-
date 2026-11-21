import { randomInt } from 'crypto';

export const JOIN_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 6;

/**
 * Generates a cryptographically random 6-character class join code.
 * Uses only unambiguous characters: A-Z (excluding O, I) and 2-9 (excluding 0, 1).
 */
export function generateJoinCode(length = JOIN_CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const index = randomInt(0, JOIN_CODE_CHARSET.length);
    code += JOIN_CODE_CHARSET[index];
  }
  return code;
}

/**
 * Validates whether a given string matches the join code format.
 */
export function isValidJoinCode(code: string): boolean {
  if (typeof code !== 'string' || code.length !== JOIN_CODE_LENGTH) {
    return false;
  }
  const regex = new RegExp(`^[${JOIN_CODE_CHARSET}]{${JOIN_CODE_LENGTH}}$`);
  return regex.test(code.toUpperCase());
}
