/**
 * Dates and hours, in each account's own time zone.
 *
 * Every account carries the zone of the device it was last opened on, so the
 * digest follows its reader: whoever asks for ten in the morning gets ten in
 * the morning in Rome, and ten in the morning in Tokyo a week later without
 * changing anything. Nothing here hardcodes a zone or an offset - Intl does the
 * arithmetic, including the two days a year when the clocks move.
 */

/** Used when an account has no zone recorded, and for housekeeping cutoffs. */
export const FALLBACK_ZONE = 'Europe/Rome';

/** Cached: building a formatter is expensive and these run in every loop. */
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const clockFormatters = new Map<string, Intl.DateTimeFormat>();

function dateIn(zone: string): Intl.DateTimeFormat {
  let formatter = dateFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateFormatters.set(zone, formatter);
  }
  return formatter;
}

function clockIn(zone: string): Intl.DateTimeFormat {
  let formatter = clockFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    clockFormatters.set(zone, formatter);
  }
  return formatter;
}

/** A zone Intl will accept, so a mistyped profile cannot bring the run down. */
export function safeZone(zone: unknown): string {
  if (typeof zone !== 'string' || !zone) return FALLBACK_ZONE;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
    return zone;
  } catch {
    return FALLBACK_ZONE;
  }
}

/** `YYYY-MM-DD` where the reader is, the shape `digestDate` uses. */
export function localDate(zone: string, at: Date = new Date()): string {
  return dateIn(zone).format(at);
}

/** Hour of day where the reader is, 0-23. */
export function localHour(zone: string, at: Date = new Date()): number {
  return Number(clockIn(zone).format(at).slice(0, 2));
}

/** Minutes since midnight where the reader is: how a round is identified. */
export function localMinutes(zone: string, at: Date = new Date()): number {
  const [h, m] = clockIn(zone).format(at).split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Which of an account's rounds is due now, or null if none is.
 *
 * A round stays due for two hours after its hour, and that is what makes a
 * failed or delayed run recoverable: the next wake-up finds it still unbuilt
 * and tries again, instead of the digest silently not existing that day. Rounds
 * already built today are passed in and skipped; the latest due one wins, so a
 * long catch-up never rebuilds the morning round at dinner time.
 */
export function dueSlot(
  zone: string,
  digestHours: number[],
  doneHours: number[],
  at: Date = new Date(),
): number | null {
  const hour = localHour(zone, at);
  const due = digestHours
    .filter((slot) => !doneHours.includes(slot))
    .filter((slot) => hour >= slot && hour <= slot + 2);
  return due.length ? Math.max(...due) : null;
}

/** How close to a scheduled round a request has to be to take its place. */
const REPLACES_WITHIN_MINUTES = 60;

export interface Round {
  /** Identifies the round: minutes since midnight, so two never collide. */
  slot: number;
  /** The scheduled hour this round settles, or null when it is an extra. */
  completesHour: number | null;
}

/**
 * What an on-demand request turns into.
 *
 * Measured from the moment the button was pressed, not from when the pipeline
 * happens to wake up: asking at ten to nine and asking at ten past nine are
 * different intentions, and the wake-up time would flatten them into one.
 *
 * Within an hour of a scheduled round, the request takes its place - you asked
 * for essentially the round that was coming, so you get it early and not twice.
 * Further out it is an extra round that leaves the schedule alone.
 */
export function requestedRound(
  zone: string,
  digestHours: number[],
  doneHours: number[],
  requestedAt: Date,
  buildingAt: Date = new Date(),
): Round {
  const asked = localMinutes(zone, requestedAt);
  const replaces = digestHours
    .filter((hour) => !doneHours.includes(hour))
    .filter((hour) => hour * 60 - asked >= 0 && hour * 60 - asked <= REPLACES_WITHIN_MINUTES);

  if (replaces.length) {
    const hour = Math.min(...replaces);
    return { slot: hour * 60, completesHour: hour };
  }
  return { slot: localMinutes(zone, buildingAt), completesHour: null };
}

/** A scheduled round, identified the same way so the two can never clash. */
export function scheduledRound(hour: number): Round {
  return { slot: hour * 60, completesHour: hour };
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

/** Readable date and time, for the dry run's own output. */
export function stamp(zone: string, at: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: zone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(at);
}
