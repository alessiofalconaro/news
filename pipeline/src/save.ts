/**
 * Writing the day's work down.
 *
 * Two properties matter here. One digest per account per day, so a second run
 * cannot produce a second copy: the digest id is built from the account and the
 * date rather than generated, which makes a repeat run an overwrite instead of
 * a duplicate. And the stories of a run land in one batch, so the app never
 * catches a digest half full.
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
  results: TopicResult[];
  failedTopics: string[];
}

export async function saveDigest(input: SaveInput): Promise<{ id: string; stories: number }> {
  const db = getFirestore();
  const id = digestId(input.userId, input.date);
  const now = Date.now();

  const status: DigestStatus = input.failedTopics.length
    ? input.results.some((r) => r.stories.length)
      ? 'partial'
      : 'failed'
    : 'ok';

  const batch = db.batch();

  batch.set(db.collection('digests').doc(id), {
    userId: input.userId,
    digestDate: input.date,
    status,
    failedTopics: input.failedTopics,
    createdAt: now,
  });

  // Stories of a previous run of the same day: removed, or a shorter rerun
  // would leave yesterday's leftovers hanging off today's digest.
  const previous = await db.collection('stories').where('digestId', '==', id).get();
  for (const doc of previous.docs) batch.delete(doc.ref);

  let rank = 0;
  let count = 0;

  for (const result of input.results) {
    for (const story of result.stories) {
      rank += 1;
      count += 1;
      const primary = story.articles.find((a) => a.id === story.primaryArticleId) ?? story.articles[0]!;
      const sources = story.articles.map((a) => ({ name: a.source, url: a.url }));

      batch.set(db.collection('stories').doc(`${id}_${rank}`), {
        digestId: id,
        userId: input.userId,
        topicId: result.topic.id,
        // Copied, so the archive stays readable after the topic is deleted.
        topicName: result.topic.name,
        rank,
        headlineIt: story.headlineIt,
        headlineEn: story.headlineEn,
        summaryIt: story.summaryIt,
        summaryEn: story.summaryEn,
        primaryUrl: primary.url,
        imageUrl: story.imageUrl,
        sources,
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
  detail(`salvato digest ${id}: ${count} storie, stato ${status}`);
  return { id, stories: count };
}

/** True when today's digest is already there and complete: the run can stop. */
export async function digestAlreadyDone(userId: string, date: string): Promise<boolean> {
  const doc = await getFirestore().collection('digests').doc(digestId(userId, date)).get();
  return doc.exists && doc.data()?.['status'] === 'ok';
}
