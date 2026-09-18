/**
 * Firestore, through the Admin SDK.
 *
 * The Admin SDK bypasses `firestore.rules` entirely, which is why the service
 * account key is the one secret in this project that genuinely must not leak:
 * it is full access to the database, not a scoped token.
 *
 * Phase 2 only reads. The writing side arrives with phase 3.
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin/app';
import { SEEN_ARTICLE_DAYS } from './config.ts';
import { seenKey } from './dedupe.ts';
import { daysAgo } from './time.ts';
import type { Article, Profile, Topic } from './types.ts';

let db: Firestore | null = null;

export function initFirestore(serviceAccount: Record<string, unknown>): void {
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount as ServiceAccount) });
  }
  db = getFirestore();
}

function database(): Firestore {
  if (!db) throw new Error('initFirestore was never called');
  return db;
}

/** Finds the account by address. Emails are stored lower case; match that. */
export async function findProfileByEmail(email: string): Promise<Profile | null> {
  const snapshot = await database()
    .collection('profiles')
    .where('email', '==', email.trim().toLowerCase())
    .limit(1)
    .get();
  const doc = snapshot.docs[0];
  if (!doc) return null;
  const data = doc.data();
  return {
    id: doc.id,
    email: String(data['email'] ?? ''),
    displayName: String(data['displayName'] ?? ''),
    language: data['language'] === 'en' ? 'en' : 'it',
  };
}

/** Every account that has a profile, for the scheduled run over all users. */
export async function allProfiles(): Promise<Profile[]> {
  const snapshot = await database().collection('profiles').get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      email: String(data['email'] ?? ''),
      displayName: String(data['displayName'] ?? ''),
      language: data['language'] === 'en' ? 'en' : 'it',
    } satisfies Profile;
  });
}

/**
 * The account's active topics, in the order it arranged them.
 *
 * Sorted here rather than in the query: ordering by `sortOrder` alongside the
 * two equality filters would need a composite index, for a list that is at most
 * ten rows long.
 */
export async function activeTopics(userId: string): Promise<Topic[]> {
  const snapshot = await database()
    .collection('topics')
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .get();

  return snapshot.docs
    .map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        userId: String(d['userId'] ?? ''),
        name: String(d['name'] ?? ''),
        interests: String(d['interests'] ?? ''),
        searchQuery: String(d['searchQuery'] ?? ''),
        sourceLanguage: d['sourceLanguage'] === 'en' || d['sourceLanguage'] === 'both' ? d['sourceLanguage'] : 'it',
        extraFeeds: Array.isArray(d['extraFeeds']) ? (d['extraFeeds'] as string[]) : [],
        maxStories: Number(d['maxStories'] ?? 5),
        isActive: d['isActive'] !== false,
        sortOrder: Number(d['sortOrder'] ?? 0),
        autoQuery: typeof d['autoQuery'] === 'string' ? d['autoQuery'] : undefined,
        autoQueryFor: typeof d['autoQueryFor'] === 'string' ? d['autoQueryFor'] : undefined,
      } satisfies Topic;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Removes the articles this topic already used in the last week.
 *
 * Firestore has no "where document id in this large set", so the lookup runs
 * the other way round: read the topic's marks and subtract them.
 *
 * Only `topicId` is filtered in the query and the cutoff is applied here, to
 * avoid a composite index. That is affordable because `seenArticles` records
 * the articles a digest actually used, not everything that was fetched: about
 * ten a day for a topic, and the cleanup drops them at fourteen days.
 */
export async function dropRecentlySeen(topicId: string, articles: Article[]): Promise<Article[]> {
  const snapshot = await database()
    .collection('seenArticles')
    .where('topicId', '==', topicId)
    .get();

  if (snapshot.empty) return articles;
  const cutoff = daysAgo(SEEN_ARTICLE_DAYS).getTime();
  const seen = new Set(
    snapshot.docs.filter((doc) => Number(doc.data()['firstSeenAt'] ?? 0) >= cutoff).map((doc) => doc.id),
  );
  if (!seen.size) return articles;

  const keys = await Promise.all(articles.map((a) => seenKey(topicId, a.url)));
  return articles.filter((_, i) => !seen.has(keys[i]!));
}

/**
 * Caches a derived search query on the topic. Written by the pipeline through
 * the Admin SDK; the browser never touches these two fields, and firestore.rules
 * does not need to know about them because it forbids everything it has not been
 * told about anyway.
 */
export async function saveAutoQuery(topicId: string, query: string, mark: string): Promise<void> {
  await database().collection('topics').doc(topicId).set({ autoQuery: query, autoQueryFor: mark }, { merge: true });
}
