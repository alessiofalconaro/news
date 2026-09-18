/**
 * Collection: Google News RSS for the topic's keywords, plus whatever extra
 * feeds the topic carries, filtered down to the last day.
 *
 * Google News links are kept exactly as they arrive. They are redirects rather
 * than the article's own address, and rewriting them to look prettier only
 * breaks them - the redirect is what survives paywalls and syndication.
 */

import { XMLParser } from 'fast-xml-parser';
import { ARTICLE_MAX_AGE_HOURS } from './config.ts';
import { hoursAgo } from './time.ts';
import { detail, reason, warn } from './log.ts';
import type { Article, Topic } from './types.ts';

const GOOGLE_NEWS_FEEDS = {
  it: 'https://news.google.com/rss/search?q=<q>&hl=it&gl=IT&ceid=IT:it',
  en: 'https://news.google.com/rss/search?q=<q>&hl=en-US&gl=US&ceid=US:en',
} as const;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Titles carry &amp; and friends; snippets carry markup we strip below.
  processEntities: true,
});

/** Feed URLs for a topic: one or both Google News locales, then the extras. */
export function feedUrlsFor(topic: Topic, searchQuery: string): string[] {
  const query = encodeURIComponent(searchQuery.trim());
  const locales =
    topic.sourceLanguage === 'both' ? (['it', 'en'] as const) : ([topic.sourceLanguage] as const);
  const google = locales.map((l) => GOOGLE_NEWS_FEEDS[l].replace('<q>', query));
  return [...google, ...topic.extraFeeds.filter((f) => f.trim())];
}

/** Strips the markup Google News puts in `description` and collapses spaces. */
function plainText(html: unknown): string {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Google News titles read "Headline - Outlet". The outlet is also its own
 * element, so the suffix is redundant and would skew the near-duplicate check.
 */
function splitTitle(title: string, source: string): string {
  if (!source) return title;
  const suffix = ` - ${source}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

function itemsOf(parsed: unknown): unknown[] {
  const channel = (parsed as { rss?: { channel?: { item?: unknown } } })?.rss?.channel;
  const item = channel?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

/**
 * Google News fills `description` with the headline and the outlet over again,
 * so for most entries the snippet carries nothing the title does not. Sending it
 * anyway would roughly double a prompt that already lists a hundred articles.
 * Real feeds, the ones a topic adds by hand, do carry a genuine summary - those
 * survive this.
 */
function usefulSnippet(snippet: string, title: string, source: string): string {
  if (!snippet) return '';
  const bare = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const stripped = bare(snippet);
  const known = bare(title + source);
  if (!stripped || stripped === known || known.includes(stripped)) return '';
  // Longer than the title by a real margin is the sign of an actual summary.
  return stripped.length > known.length * 1.3 ? snippet : '';
}

function readItem(raw: unknown, feed: string): Article | null {
  const it = raw as Record<string, unknown>;
  const url = String(it['link'] ?? '').trim();
  const rawTitle = plainText(it['title']);
  if (!url || !rawTitle) return null;

  const published = new Date(String(it['pubDate'] ?? ''));
  if (Number.isNaN(published.getTime())) return null;

  // <source url="...">Outlet</source> on Google News; absent on most others.
  const sourceNode = it['source'] as { '#text'?: unknown; '@_url'?: unknown } | string | undefined;
  const source =
    typeof sourceNode === 'string'
      ? sourceNode
      : plainText(sourceNode?.['#text']) || hostOf(url) || 'sconosciuta';

  const sourceUrl = typeof sourceNode === 'object' ? String(sourceNode?.['@_url'] ?? '') : '';

  return {
    id: '',
    title: splitTitle(rawTitle, source),
    source,
    sourceUrl,
    url,
    snippet: usefulSnippet(plainText(it['description']), rawTitle, source),
    publishedAt: published,
    feed,
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function fetchFeed(url: string): Promise<Article[]> {
  const response = await fetch(url, {
    headers: {
      // Google News answers an unknown agent with an empty channel.
      'user-agent': 'Mozilla/5.0 (compatible; NewsDigest/1.0; +https://github.com)',
      accept: 'application/rss+xml, application/xml, text/xml',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const parsed = parser.parse(await response.text()) as unknown;
  return itemsOf(parsed)
    .map((item) => readItem(item, url))
    .filter((a): a is Article => a !== null);
}

/**
 * Every feed for the topic, fresh entries only, each given a short id.
 *
 * A feed that fails is reported and skipped: one dead extra feed must not cost
 * the topic its Google News results.
 */
export async function collectArticles(topic: Topic, searchQuery: string): Promise<Article[]> {
  const cutoff = hoursAgo(ARTICLE_MAX_AGE_HOURS);
  const collected: Article[] = [];

  for (const url of feedUrlsFor(topic, searchQuery)) {
    try {
      const articles = await fetchFeed(url);
      const fresh = articles.filter((a) => a.publishedAt >= cutoff);
      detail(`${fresh.length}/${articles.length} freschi da ${hostOf(url) || url}`);
      collected.push(...fresh);
    } catch (error) {
      warn(`feed saltato, ${hostOf(url) || url}: ${reason(error)}`);
    }
  }

  collected.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  return collected.map((a, i) => ({ ...a, id: `a${i + 1}` }));
}
