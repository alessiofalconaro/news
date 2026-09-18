/**
 * Shapes shared across the pipeline.
 *
 * The stored ones mirror `app/src/app/core/models.ts`; keep the two in step.
 * The rest exist only while a run is in flight.
 */

export type SourceLanguage = 'it' | 'en' | 'both';
export type DigestStatus = 'ok' | 'partial' | 'failed';

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  language: 'it' | 'en';
}

export interface Topic {
  id: string;
  userId: string;
  name: string;
  interests: string;
  searchQuery: string;
  sourceLanguage: SourceLanguage;
  extraFeeds: string[];
  maxStories: number;
  isActive: boolean;
  sortOrder: number;
  /** Query derived from name + interests when the owner left searchQuery empty. */
  autoQuery?: string;
  /** Fingerprint of the topic the query was derived from; stale if it differs. */
  autoQueryFor?: string;
}

/** One entry straight out of a feed, before anything has been decided about it. */
export interface Article {
  /** Short id handed to the model, unique within a topic run: `a1`, `a2`, ... */
  id: string;
  title: string;
  /** Outlet name, as the feed reports it. */
  source: string;
  /** The outlet home page, from the feed. Used for its logo when nothing better. */
  sourceUrl: string;
  /** Google News link: it redirects to the original article. */
  url: string;
  snippet: string;
  publishedAt: Date;
  /** Which feed it came from, for the dry run's own accounting. */
  feed: string;
}

/** A group of articles the model judged to be the same news. */
export interface SelectedStory {
  articleIds: string[];
  /** Why it made the cut; only ever printed, never stored. */
  note: string;
}

/** A selected story once it has been written up. */
export interface WrittenStory {
  rank: number;
  headlineIt: string;
  headlineEn: string;
  summaryIt: string;
  summaryEn: string;
  primaryArticleId: string;
  articles: Article[];
  /** Main subject of the story, looked up for a picture. Empty if none fits. */
  imageSubject: string;
  /** Resolved illustration, or empty: the card copes with either. */
  imageUrl: string;
}

export interface TopicResult {
  topic: Topic;
  stories: WrittenStory[];
  /** Counts the dry run prints so the selection can be judged in context. */
  counts: { fetched: number; afterDedupe: number; afterSeen: number };
}
