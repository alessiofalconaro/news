/**
 * Writing the day's work down.
 *
 * One digest per account per day, even when the account asked for two rounds:
 * the evening round adds to the morning's rather than replacing it, so "Oggi"
 * stays one page that fills up during the day. What keeps the two rounds from
 * repeating each other is `seenArticles`, which already excludes anything a
 * story used in the last week.
 *
 * The digest id is built from the account and the date rather than generated,
 * which makes a repeated run an overwrite instead of a duplicate. Each story
 * remembers which slot produced it, so rerunning one round replaces only its
 * own stories and leaves the other round alone.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { seenKey } from './dedupe.ts';
import { detail } from './log.ts';
import type { DigestStatus, TopicResult } from './types.ts';

/** Deterministic, so a rerun of the same day replaces rather than duplicates. */
export function digestId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

export interface SaveInput {
  userId: string;
  date: string;
  /** The hour this round belongs to. */
  slot: number;
  results: TopicResult[];
  failedTopics: string[];
}

export interface DigestState {
  exists: boolean;
  doneHours: number[];
}

/** What has already been built today, so the caller knows which slot is due. */
export async function digestState(userId: string, date: string): Promise<DigestState> {
  const doc = await getFirestore().collection('digests').doc(digestId(userId, date)).get();
  if (!doc.exists) return { exists: false, doneHours: [] };
  const done = doc.data()?.['doneHours'];
  return { exists: true, doneHours: Array.isArray(done) ? (done as number[]) : [] };
}

export async function saveDigest(input: SaveInput): Promise<{ id: string; stories: number }> {
  const db = getFirestore();
  const id = digestId(input.userId, input.date);
  const now = Date.now();

  const existing = await db.collection('digests').doc(id).get();
  const previousFailed: string[] = (existing.data()?.['failedTopics'] as string[]) ?? [];
  const previousDone: number[] = (existing.data()?.['doneHours'] as number[]) ?? [];

  // Only this slot's stories are replaced; the other round's survive.
  const mine = await db
    .collection('stories')
    .where('digestId', '==', id)
    .where('slot', '==', input.slot)
    .get();

  const others = await db.collection('stories').where('digestId', '==', id).get();
  const keptRanks = others.docs
    .filter((doc) => doc.data()['slot'] !== input.slot)
    .map((doc) => Number(doc.data()['rank'] ?? 0));
  let rank = keptRanks.length ? Math.max(...keptRanks) : 0;

  const failedTopics = [...new Set([...previousFailed, ...input.failedTopics])];
  const doneHours = [...new Set([...previousDone, input.slot])].sort((a, b) => a - b);

  const produced = input.results.reduce((n, r) => n + r.stories.length, 0);
  const status: DigestStatus = failedTopics.length
    ? produced || others.size > mine.size
      ? 'partial'
      : 'failed'
    : 'ok';

  const batch = db.batch();

  batch.set(
    db.collection('digests').doc(id),
    {
      userId: input.userId,
      digestDate: input.date,
      status,
      failedTopics,
      doneHours,
      createdAt: existing.data()?.['createdAt'] ?? now,
      updatedAt: now,
    },
    { merge: true },
  );

  for (const doc of mine.docs) batch.delete(doc.ref);

  let count = 0;
  for (const result of input.results) {
    for (const story of result.stories) {
      rank += 1;
      count += 1;
      const primary = story.articles.find((a) => a.id === story.primaryArticleId) ?? story.articles[0]!;

      batch.set(db.collection('stories').doc(`${id}_${input.slot}_${rank}`), {
        digestId: id,
        userId: input.userId,
        topicId: result.topic.id,
        // Copied, so the archive stays readable after the topic is deleted.
        topicName: result.topic.name,
        rank,
        slot: input.slot,
        headlineIt: story.headlineIt,
        headlineEn: story.headlineEn,
        summaryIt: story.summaryIt,
        summaryEn: story.summaryEn,
        primaryUrl: primary.url,
        imageUrl: story.imageUrl,
        sources: story.articles.map((a) => ({ name: a.source, url: a.url })),
        sourceCount: new Set(story.articles.map((a) => a.source)).size,
        latestPublishedAt: Math.max(...story.articles.map((a) => a.publishedAt.getTime())),
      });

      // Only the articles a story actually used are marked, which is what keeps
      // `seenArticles` small enough to read back without a composite index.
      for (const article of story.articles) {
        const key = await seenKey(result.topic.id, article.url);
        batch.set(db.collection('seenArticles').doc(key), {
          topicId: result.topic.id,
          urlHash: key,
          firstSeenAt: now,
        });
      }
    }
  }

  await batch.commit();
  detail(`salvato digest ${id}, tornata delle ${input.slot}:00: ${count} storie, stato ${status}`);
  return { id, stories: count };
}
