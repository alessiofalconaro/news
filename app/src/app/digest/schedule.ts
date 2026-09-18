/**
 * What pressing "refresh now" would do, worked out in the browser so the app
 * can say it before the button is pressed rather than leaving the reader to
 * discover it afterwards.
 *
 * This mirrors `requestedRound` in the pipeline, and the two have to agree:
 * this one only predicts, the other one decides. The rule is in one sentence -
 * a request made within an hour of a scheduled round takes its place, anything
 * earlier is an extra round - which is short enough to be worth restating here
 * rather than shipping the pipeline's code to the browser.
 */

/** How close to a scheduled round a request has to be to take its place. */
const REPLACES_WITHIN_MINUTES = 60;

/** Minutes since midnight in Rome, whatever the device's own timezone is. */
export function romeMinutesNow(at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
  const [h, m] = parts.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * The scheduled hour a request made now would replace, or null if it would be
 * an extra round on top of the schedule.
 */
export function wouldReplace(digestHours: number[], at: Date = new Date()): number | null {
  const asked = romeMinutesNow(at);
  const close = digestHours.filter(
    (hour) => hour * 60 - asked >= 0 && hour * 60 - asked <= REPLACES_WITHIN_MINUTES,
  );
  return close.length ? Math.min(...close) : null;
}

/** The next scheduled round after now, for the "the schedule still stands" line. */
export function nextRound(digestHours: number[], at: Date = new Date()): number | null {
  const asked = romeMinutesNow(at);
  const later = digestHours.filter((hour) => hour * 60 > asked);
  return later.length ? Math.min(...later) : null;
}
