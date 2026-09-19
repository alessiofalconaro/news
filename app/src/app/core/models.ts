/**
 * Firestore data model.
 *
 * PROJECT_SPEC section 7 describes this schema in Supabase terms (snake_case
 * tables, RLS). On Firestore the equivalent is camelCase collections plus
 * `firestore.rules`; the mapping is written down in the README.
 *
 * One deliberate difference: `Story` also carries `userId`, which the SQL schema
 * did not need. Firestore has no joins, so without it every read of a story
 * would have to fetch its digest just to prove ownership.
 */

export type Lang = 'it' | 'en';
export type SourceLanguage = 'it' | 'en' | 'both';
export type DigestStatus = 'ok' | 'partial' | 'failed';

export const MAX_ACTIVE_TOPICS = 10;
export const MIN_STORIES = 3;
export const MAX_STORIES = 10;
export const DEFAULT_STORIES = 5;

/**
 * The hours a digest can be asked for. Outside this range the workflow is not
 * awake, so offering the choice would be a promise the app cannot keep.
 */
export const MIN_DIGEST_HOUR = 6;
export const MAX_DIGEST_HOUR = 22;
export const DEFAULT_DIGEST_HOUR = 10;
/** Two is plenty: more would mostly produce empty rounds. */
export const MAX_DIGEST_SLOTS = 2;

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  language: Lang;
  /**
   * Hours in Europe/Rome at which this account wants a digest, one or two.
   *
   * Two because a morning round and an evening round are different readings,
   * not the same one repeated: the evening one only carries what came out
   * since. The schedule is per account, so two people sharing the app read
   * their news at their own times.
   */
  digestHours: number[];
  /**
   * IANA zone of the device, refreshed at every sign-in.
   *
   * The schedule follows the reader rather than a fixed country: ten in the
   * morning means ten wherever they are, which is what someone following news
   * from everywhere actually wants.
   */
  timeZone: string;
  createdAt: number;
}

/** A topic's name in both languages, and whether it was translatable at all. */
export interface TopicNames {
  it: string;
  en: string;
  meaningful: boolean;
}

export interface Topic {
  id: string;
  userId: string;
  name: string;
  /** Free text that drives the AI selection. */
  interests: string;
  /** Empty means: use `name` as the query. */
  searchQuery: string;
  sourceLanguage: SourceLanguage;
  /**
   * The name in each language, written by the pipeline, and the name they were
   * made from. When `nameSource` no longer matches `name` the owner has edited
   * it since and the app shows exactly what they typed, until the next round.
   */
  nameIt?: string;
  nameEn?: string;
  /** False when the name is not a word in any language, so it was left alone. */
  nameMeaningful?: boolean;
  nameSource?: string;
  extraFeeds: string[];
  maxStories: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Digest {
  id: string;
  userId: string;
  /** Local date in Europe/Rome, as `YYYY-MM-DD`. */
  digestDate: string;
  status: DigestStatus;
  /** Names of the topics that failed, shown by the partial-digest banner. */
  failedTopics: string[];
  /** Which of the account's slots have already been built today. */
  doneHours: number[];
  createdAt: number;
}

export interface StorySource {
  name: string;
  url: string;
  /**
   * The language this outlet filed it in. Absent on stories built before the
   * pipeline started recording it, and null for a feed a topic added by hand,
   * which could be in anything.
   */
  lang?: 'it' | 'en' | null;
}

export interface Story {
  id: string;
  digestId: string;
  userId: string;
  /** Null once the topic is deleted; `topicName` keeps the archive readable. */
  topicId: string | null;
  topicName: string;
  /** The same name in each language; absent on stories built before this. */
  topicNameIt?: string;
  topicNameEn?: string;
  rank: number;
  /** The slot that produced this story, so a rerun replaces only its own. */
  slot: number;
  headlineIt: string;
  headlineEn: string;
  summaryIt: string;
  summaryEn: string;
  /** The outlet the AI judged most complete. */
  primaryUrl: string;
  /**
   * The reader's own pick, one per language: the source they would rather open
   * in Italian is not the one they would rather open in English. The only
   * fields on a story the browser is allowed to write.
   */
  chosenUrlIt?: string;
  chosenUrlEn?: string;
  /**
   * Picture of what the story is about, not a photo of the event: the article
   * page is unreachable behind Google News redirects, so this comes from the
   * subject the model named. Empty is normal and the card handles it.
   */
  imageUrl: string;
  sources: StorySource[];
  sourceCount: number;
  latestPublishedAt: number;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: number;
}
