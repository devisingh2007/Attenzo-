/**
 * Calculates attendance percentage: (presentCount / totalSessions) * 100.
 * Rounded to 1 decimal place.
 * Returns null when totalSessions <= 0.
 */
export function calculatePercentage(presentCount: number, totalSessions: number): number | null {
  if (totalSessions <= 0) {
    return null;
  }

  if (presentCount <= 0) {
    return 0;
  }

  if (presentCount >= totalSessions) {
    return 100;
  }

  const raw = (presentCount / totalSessions) * 100;
  return Math.round(raw * 10) / 10;
}
