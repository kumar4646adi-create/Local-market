/**
 * Asia/Kolkata (IST: UTC+5:30) Timezone Utilities
 */

export const ASIA_KOLKATA_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current ISO 8601 timestamp with +05:30 offset in Asia/Kolkata timezone.
 * Example: 2026-10-05T14:30:00+05:30
 */
export function getAsiaKolkataISOString(date: Date = new Date()): string {
  // Format parts according to Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ASIA_KOLKATA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  // en-CA format produces YYYY, MM, DD, hour, minute, second
  const yyyy = map.year;
  const mm = map.month;
  const dd = map.day;
  const hh = map.hour;
  const min = map.minute;
  const ss = map.second;

  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+05:30`;
}

/**
 * Returns YYYY-MM-DD in Asia/Kolkata timezone.
 * Example: 2026-10-05
 */
export function getAsiaKolkataDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ASIA_KOLKATA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns readable format with IST indicator.
 * Example: "05 Oct 2026, 02:45 PM IST"
 */
export function formatAsiaKolkataDateTime(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return (
    new Intl.DateTimeFormat('en-IN', {
      timeZone: ASIA_KOLKATA_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d) + ' IST'
  );
}
