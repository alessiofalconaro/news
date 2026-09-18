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

/**
 * Hours, in UTC, when the workflow is awake. Mirrors the cron in
 * `.github/workflows/daily-digest.yml`, which fires on the hour and the half
 * hour between them.
 */
const AWAKE_FROM_UTC = 4;
const AWAKE_TO_UTC = 21;

/**
 * When a request made now would actually be picked up.
 *
 * Worth saying out loud, because the gap is not obvious: the workflow sleeps
 * overnight, so pressing the button at five to midnight means the news arrives
 * at six in the morning, not at midnight. A button that silently means "in
 * seven hours" is a button that looks broken.
 */
export function nextWakeUp(at: Date = new Date()): Date {
  const next = new Date(at);
  next.setUTCSeconds(0, 0);
  // Round up to the next half hour, always forward: asking at exactly 10:00
  // means the 10:00 wake-up has already begun without this request.
  next.setUTCMinutes(next.getUTCMinutes() >= 30 ? 60 : 30);

  // Then walk forward until it lands in the hours the workflow is awake.
  for (let step = 0; step < 48; step += 1) {
    const hour = next.getUTCHours();
    if (hour >= AWAKE_FROM_UTC && hour <= AWAKE_TO_UTC) return next;
    next.setUTCMinutes(next.getUTCMinutes() + 30);
  }
  return next;
}
