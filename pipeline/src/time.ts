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
 * Whether it is this account's turn.
 *
 * The workflow wakes up every hour and asks this for each account, so two
 * people can read their news at different times. The window runs from the
 * chosen hour to two hours later, which is what makes a failed or delayed run
 * recoverable: the next hourly wake-up picks it up instead of the digest
 * silently not existing that day.
 */
export function isDigestTime(digestHour: number, at: Date = new Date()): boolean {
  const hour = romeHour(at);
  return hour >= digestHour && hour <= digestHour + 2;
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
