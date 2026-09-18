/**
 * Cleaning: drop what the digest has effectively already shown.
 *
 * Two separate jobs. Within a run, the same piece of news arrives repeatedly -
 * once per locale, once per syndicating outlet - and the model should not spend
 * its attention rediscovering that. Across runs, an article used for a topic in
 * the last week should not come back.
 */

import { SEEN_ARTICLE_DAYS } from './config.ts';
import type { Article } from './types.ts';

/** Case, accents and punctuation carry no signal for "is this the same story". */
function normalise(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words worth comparing: the short ones are grammar, not subject matter. */
function contentWords(title: string): Set<string> {
  return new Set(
    normalise(title)
      .split(' ')
      .filter((w) => w.length > 3),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

/**
 * Same URL, or a headline that is the same sentence in different words.
 *
 * The threshold is deliberately high. Merging two genuinely different stories
 * loses one of them for good, while letting a near-duplicate through only costs
 * the model a moment - it groups them in the selection step anyway.
 */
const NEAR_DUPLICATE = 0.85;

export function dropDuplicates(articles: Article[]): Article[] {
  const kept: { article: Article; words: Set<string> }[] = [];
  const seenUrls = new Set<string>();

  for (const article of articles) {
    if (seenUrls.has(article.url)) continue;
    const words = contentWords(article.title);
    const duplicate = kept.some(
      (k) =>
        normalise(k.article.title) === normalise(article.title) ||
        overlap(k.words, words) >= NEAR_DUPLICATE,
    );
    if (duplicate) continue;
    seenUrls.add(article.url);
    kept.push({ article, words });
  }

  return kept.map((k) => k.article);
}

/** Stable id for the pair (topic, article), and the document id in Firestore. */
export async function seenKey(topicId: string, url: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${topicId}:${url}`),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export { SEEN_ARTICLE_DAYS };
