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

/** Minutes since midnight in Rome, which is how a round is identified. */
export function romeMinutes(at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
  const [h, m] = parts.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** How close to a scheduled round a request has to be to take its place. */
const REPLACES_WITHIN_MINUTES = 60;

export interface RequestedRound {
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
 * different intentions, and the wake-up time would flatten them into the same
 * thing.
 *
 * Within an hour of a scheduled round, the request takes its place - you asked
 * for essentially the round that was coming, so you get it early and not twice.
 * Further out it is an extra round that leaves the schedule alone.
 */
export function requestedRound(
  digestHours: number[],
  doneHours: number[],
  requestedAt: Date,
  buildingAt: Date = new Date(),
): RequestedRound {
  const asked = romeMinutes(requestedAt);
  const replaces = digestHours
    .filter((hour) => !doneHours.includes(hour))
    .filter((hour) => hour * 60 - asked >= 0 && hour * 60 - asked <= REPLACES_WITHIN_MINUTES);

  if (replaces.length) {
    const hour = Math.min(...replaces);
    return { slot: hour * 60, completesHour: hour };
  }
  return { slot: romeMinutes(buildingAt), completesHour: null };
}

/** A scheduled round, identified the same way so the two can never clash. */
export function scheduledRound(hour: number): RequestedRound {
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
