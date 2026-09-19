/**
 * Housekeeping, from PROJECT_SPEC section 7: `seenArticles` older than fourteen
 * days, digests and stories older than ninety.
 *
 * Runs after a successful save rather than on its own schedule, so there is one
 * job to go wrong instead of two, and so the free tier is never paying for an
 * extra wake-up. Failures here are reported and swallowed: a digest that was
 * written correctly must not be reported as failed because a tidy-up did not
 * finish.
 */

import { getFirestore, type Query } from 'firebase-admin/firestore';
import { FALLBACK_ZONE, daysAgo, localDate } from './time.ts';
import { detail, reason, warn } from './log.ts';

const SEEN_KEEP_DAYS = 14;
const DIGEST_KEEP_DAYS = 90;

/** Firestore caps a batch at 500 writes, so deletion goes round in pages. */
async function deleteAll(query: Query, label: string): Promise<number> {
  const db = getFirestore();
  let removed = 0;
  for (;;) {
    const page = await query.limit(400).get();
    if (page.empty) break;
    const batch = db.batch();
    for (const doc of page.docs) batch.delete(doc.ref);
    await batch.commit();
    removed += page.size;
    if (page.size < 400) break;
  }
  if (removed) detail(`ripuliti ${removed} ${label}`);
  return removed;
}

export async function cleanup(): Promise<void> {
  const db = getFirestore();
  try {
    await deleteAll(
      db.collection('seenArticles').where('firstSeenAt', '<', daysAgo(SEEN_KEEP_DAYS).getTime()),
      'articoli visti',
    );

    // Digests are keyed by their local date, so the cutoff is a date string too.
    // A housekeeping cutoff: one zone is enough, a few hours either way at
    // ninety days makes no difference to anyone.
    const cutoff = localDate(FALLBACK_ZONE, daysAgo(DIGEST_KEEP_DAYS));
    const old = await db.collection('digests').where('digestDate', '<', cutoff).get();
    for (const doc of old.docs) {
      await deleteAll(db.collection('stories').where('digestId', '==', doc.id), 'storie vecchie');
      await doc.ref.delete();
    }
    if (old.size) detail(`ripuliti ${old.size} digest oltre i ${DIGEST_KEEP_DAYS} giorni`);
  } catch (error) {
    warn(`pulizia non completata: ${reason(error)}`);
  }
}
