/**
 * Convert a Date to a local date string (YYYY-MM-DD format)
 * Adjusts for timezone offset to ensure the displayed date matches user's local date
 */
export function toLocalDateString(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
}
