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

/** Minutes since midnight here. */
export function localMinutesNow(at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
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
  const asked = localMinutesNow(at);
  const close = digestHours.filter(
    (hour) => hour * 60 - asked >= 0 && hour * 60 - asked <= REPLACES_WITHIN_MINUTES,
  );
  return close.length ? Math.min(...close) : null;
}

/** The next scheduled round after now, for the "the schedule still stands" line. */
export function nextRound(digestHours: number[], at: Date = new Date()): number | null {
  const asked = localMinutesNow(at);
  const later = digestHours.filter((hour) => hour * 60 > asked);
  return later.length ? Math.min(...later) : null;
}


/**
 * When a request made now would actually be picked up.
 *
 * The workflow wakes on the hour and the half hour, around the clock, so this
 * is never more than thirty minutes away. It used to sleep at night, which
 * made a request at five to midnight arrive at six in the morning - a gap that
 * stopped making sense once the schedule started following the reader, since
 * somebody else's morning is always somebody's night.
 */
export function nextWakeUp(at: Date = new Date()): Date {
  const next = new Date(at);
  next.setUTCSeconds(0, 0);
  // Always forward: asking at exactly 10:00 means that wake-up has already
  // begun without this request.
  next.setUTCMinutes(next.getUTCMinutes() >= 30 ? 60 : 30);
  return next;
}
