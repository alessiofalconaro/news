/**
 * A picture for each story.
 *
 * Not the photo that ran with the article: Google News hands out redirect links
 * whose real address is encoded in a blob only Google's own front end can
 * unpack, so the publisher's page - and its picture - is out of reach. What is
 * reachable is the story's subject. The model already names it while writing the
 * summary, at no extra cost, and Wikipedia has a picture of most subjects that
 * make the news: a team badge, a head of state, a strait, a company's building.
 *
 * So the promise the interface makes is "a picture of what this is about", not
 * "a photo of what happened". Where even that fails the card shows none, which
 * the layout is built to survive.
 */

import { detail, reason, warn } from './log.ts';
import type { WrittenStory } from './types.ts';

const AGENT = 'NewsDigest/1.0 (private two-person app)';
const THUMB_WIDTH = 800;

interface WikiPage {
  title?: string;
  thumbnail?: { source?: string };
}

async function wikipedia(params: Record<string, string>, lang: string): Promise<WikiPage | null> {
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: String(THUMB_WIDTH),
    ...params,
  });
  const response = await fetch(`https://${lang}.wikipedia.org/w/api.php?${query}`, {
    headers: { 'user-agent': AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { query?: { pages?: Record<string, WikiPage> } };
  const pages = Object.values(data.query?.pages ?? {});
  return pages[0] ?? null;
}

/**
 * How much of the subject the matched article title actually contains.
 *
 * A fuzzy search will answer anything. Asked for "musica techno" it offered a
 * portrait of a film director, which would have looked like a caption error on
 * the card. Requiring the words back is a cheap way to refuse that.
 */
function closeEnough(subject: string, title: string | undefined): boolean {
  if (!title) return false;
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );
  const wanted = words(subject);
  const got = words(title);
  if (!wanted.size) return false;
  let shared = 0;
  for (const w of wanted) if (got.has(w)) shared += 1;
  return shared / wanted.size >= 0.6;
}

/** Exact title first, then search, in the reader's language then English. */
async function findImage(subject: string): Promise<string> {
  for (const lang of ['it', 'en']) {
    try {
      const exact = await wikipedia({ titles: subject }, lang);
      if (exact?.thumbnail?.source) return exact.thumbnail.source;

      const found = await wikipedia(
        { generator: 'search', gsrsearch: subject, gsrlimit: '1' },
        lang,
      );
      if (found?.thumbnail?.source && closeEnough(subject, found.title)) {
        return found.thumbnail.source;
      }
    } catch (error) {
      warn(`immagine "${subject}" su ${lang}.wikipedia: ${reason(error)}`);
    }
  }
  return '';
}

/**
 * Fills in `imageUrl` for each story. Runs after the writing step, so it only
 * ever looks up the handful of stories that made it into the digest.
 */
export async function attachImages(stories: WrittenStory[]): Promise<void> {
  let found = 0;
  for (const story of stories) {
    if (!story.imageSubject.trim()) continue;
    story.imageUrl = await findImage(story.imageSubject.trim());
    if (story.imageUrl) found += 1;
  }
  detail(`immagini trovate: ${found}/${stories.length}`);
}
