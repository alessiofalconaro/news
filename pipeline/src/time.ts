/**
 * Everything the digest calls "today" is Italian local time, which drifts from
 * UTC by one or two hours depending on the season. Intl does that arithmetic
 * properly, including the two days a year when the clocks move, so nothing here
 * hardcodes an offset.
 */

const ZONE = 'Europe/Rome';

const dateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const hourPart = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  hour: '2-digit',
  hour12: false,
});

/** `YYYY-MM-DD` in Rome, the shape the `digestDate` field uses. */
export function romeDate(at: Date = new Date()): string {
  return dateParts.format(at);
}

/** Hour of day in Rome, 0-23. */
export function romeHour(at: Date = new Date()): number {
  return Number(hourPart.format(at));
}

/**
 * The window the daily job is allowed to run in. Two cron entries fire, one on
 * either side of the summer time change, and the second is only a fallback -
 * this is what stops it producing a second digest hours later.
 */
export function withinDigestWindow(at: Date = new Date()): boolean {
  const hour = romeHour(at);
  return hour >= 10 && hour < 12;
}

export function hoursAgo(hours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - hours * 3_600_000);
}

export function daysAgo(days: number, from: Date = new Date()): Date {
  return hoursAgo(days * 24, from);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Readable date and time in Rome, for the dry run's own output. */
export function romeStamp(at: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: ZONE,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(at);
}
