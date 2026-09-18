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
 * Which of an account's slots is due now, or null if none is.
 *
 * The workflow wakes up every hour and asks this for each account, so two
 * people can read their news at their own times, and one person can ask for
 * both a morning and an evening round.
 *
 * A slot stays due for two hours after its hour, and that is what makes a
 * failed or delayed run recoverable: the next wake-up finds it still unbuilt
 * and tries again, instead of the digest silently not existing that day. Slots
 * already built today are passed in and skipped; the latest due one wins, so a
 * long catch-up never rebuilds the morning round at dinner time.
 */
export function dueSlot(
  digestHours: number[],
  doneHours: number[],
  at: Date = new Date(),
): number | null {
  const hour = romeHour(at);
  const due = digestHours
    .filter((slot) => !doneHours.includes(slot))
    .filter((slot) => hour >= slot && hour <= slot + 2);
  return due.length ? Math.max(...due) : null;
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
