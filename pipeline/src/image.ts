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
 *
 * A name is not a subject, though. "Caterpillar" on Wikipedia is the insect
 * before it is the company, and a search will always answer something: the
 * digest has shown a butterfly larva on a story about bulldozers and, once, a
 * swastika on a story that had nothing to do with it. So a picture is only
 * kept after three checks: the page is not a disambiguation page, the file is
 * not a hate symbol, and the model - shown the story and the page it led to -
 * agrees that the page is about what the story is about. No picture is always
 * better than the wrong one.
 */

import { z } from 'zod';
import { ask } from './gemini.ts';
import { detail, reason, warn } from './log.ts';
import type { WrittenStory } from './types.ts';

const AGENT = 'NewsDigest/1.0 (private two-person app)';
const THUMB_WIDTH = 800;

interface WikiPage {
  title?: string;
  description?: string;
  thumbnail?: { source?: string };
  pageprops?: { disambiguation?: string };
}

/** What a lookup found, before anyone has agreed it fits the story. */
interface Candidate {
  url: string;
  title: string;
  description: string;
  file: string;
}

/**
 * Pictures that never belong on a news card, whatever the page says.
 *
 * Matched on the file name, which on Commons spells out what the picture is,
 * word by word: "nazi" must not catch "Istituto_nazionale", nor "isis" a
 * "crisis". Historical articles legitimately lead with these, and an
 * exact-title lookup or a loose search can land on one of them from a
 * perfectly innocent subject.
 */
const BANNED_FILE =
  /\b(swastikas?|svastica|svastiche|hakenkreuz|nazis?|nazista|nazisti|nazism|nazismo|nsdap|third reich|terzo reich|reichsadler|reichskriegsflagge|totenkopf|schutzstaffel|ss runes?|sig runes?|wolfsangel|sonnenrad|black sun|sole nero|ku klux|kkk|confederate battle|isis|isil|islamic state|stato islamico|daesh|al qaeda|lynching|linciaggio|beheading|decapitazione|corpses?|cadaver|cadavere|cadaveri)\b/i;

/** The file name as words: underscores, dashes and punctuation become spaces. */
function banned(file: string): boolean {
  return BANNED_FILE.test(file.replace(/[^\p{L}\p{N}]+/gu, ' '));
}

async function wikipedia(params: Record<string, string>, lang: string): Promise<WikiPage | null> {
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    // Follow "Putin" to "Vladimir Putin" instead of finding the redirect page
    // empty-handed, and say whether what we landed on is a disambiguation page.
    redirects: '1',
    prop: 'pageimages|pageprops|description',
    piprop: 'thumbnail',
    pithumbsize: String(THUMB_WIDTH),
    ppprop: 'disambiguation',
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

/**
 * Whether a search result is the subject and not merely mentions it.
 *
 * Both ways round: the title has to contain most of the subject, and the
 * subject most of the title. One way only, "Germania" found "Germania nazista"
 * and "musica techno" found a film director whose page happened to share a
 * word.
 */
function closeEnough(subject: string, title: string | undefined): boolean {
  if (!title) return false;
  const wanted = words(subject);
  const got = words(title);
  if (!wanted.size || !got.size) return false;
  let shared = 0;
  for (const w of wanted) if (got.has(w)) shared += 1;
  return shared / wanted.size >= 0.6 && shared / got.size >= 0.6;
}

/** The Commons file name, readable: what the picture says it is. */
function fileName(url: string): string {
  const last = url.split('?')[0]!.split('/').pop() ?? '';
  try {
    return decodeURIComponent(last).replace(/^\d+px-/, '');
  } catch {
    return last;
  }
}

function usable(page: WikiPage | null): page is WikiPage & { thumbnail: { source: string } } {
  if (!page?.thumbnail?.source) return false;
  if (page.pageprops && 'disambiguation' in page.pageprops) return false;
  return !banned(fileName(page.thumbnail.source));
}

function candidate(page: WikiPage & { thumbnail: { source: string } }): Candidate {
  return {
    url: page.thumbnail.source,
    title: page.title ?? '',
    description: page.description ?? '',
    file: fileName(page.thumbnail.source),
  };
}

/** Exact title first, then search, in the reader's language then English. */
async function findImage(subject: string): Promise<Candidate | null> {
  for (const lang of ['it', 'en']) {
    try {
      const exact = await wikipedia({ titles: subject }, lang);
      if (usable(exact)) return candidate(exact);

      const found = await wikipedia(
        { generator: 'search', gsrsearch: subject, gsrlimit: '1' },
        lang,
      );
      if (usable(found) && closeEnough(subject, found.title)) return candidate(found);
    } catch (error) {
      warn(`immagine "${subject}" su ${lang}.wikipedia: ${reason(error)}`);
    }
  }
  return null;
}

const checkSchema = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          keep: { type: 'boolean' },
        },
        required: ['index', 'keep'],
      },
    },
  },
  required: ['verdicts'],
};

const checkShape = z.object({
  verdicts: z.array(z.object({ index: z.number().int(), keep: z.boolean() })),
});

/**
 * The model, shown each story beside the page its picture came from, says
 * which pictures belong. One call for the whole topic.
 *
 * A failed call keeps none of them: on a bad day the cards go without
 * pictures, which they are built for, rather than with unchecked ones.
 */
async function confirm(
  topicName: string,
  pairs: { story: WrittenStory; found: Candidate }[],
): Promise<Set<number>> {
  const blocks = pairs
    .map(
      ({ story, found }, i) =>
        `STORIA ${i + 1}
  titolo: ${story.headlineIt}
  riassunto: ${story.summaryIt}
  pagina Wikipedia trovata: "${found.title}"${found.description ? ` - ${found.description}` : ''}
  file dell'immagine: ${found.file}`,
    )
    .join('\n\n');

  const prompt = `Per ogni notizia qui sotto e' stata cercata un'immagine su Wikipedia,
partendo dal soggetto della notizia. Devi dire se l'immagine va bene da mettere
accanto alla notizia.

${blocks}

Per OGNI storia restituisci "index" e "keep".

"keep" e' true SOLO se tutte e due queste cose sono vere:
- la pagina trovata parla proprio della persona, squadra, azienda,
  organizzazione o luogo di cui parla la notizia, e non di un'altra cosa con
  lo stesso nome (per esempio l'insetto al posto dell'azienda, o un film al
  posto di una citta');
- l'immagine e' adatta a un lettore qualsiasi: niente simboli d'odio o di
  regimi (svastiche, bandiere naziste, simboli di gruppi terroristici), niente
  violenza, cadaveri o immagini scioccanti, a meno che la notizia parli
  esattamente di quel simbolo.

Nel dubbio, false: una notizia senza immagine va benissimo, una con
l'immagine sbagliata no.`;

  try {
    const result = await ask(`immagini "${topicName}"`, prompt, checkSchema, checkShape);
    return new Set(result.verdicts.filter((v) => v.keep).map((v) => v.index - 1));
  } catch (error) {
    warn(`controllo immagini "${topicName}" non riuscito, nessuna immagine: ${reason(error)}`);
    return new Set();
  }
}

/**
 * Fills in `imageUrl` for each story. Runs after the writing step, so it only
 * ever looks up the handful of stories that made it into the digest.
 */
export async function attachImages(topicName: string, stories: WrittenStory[]): Promise<void> {
  const pairs: { story: WrittenStory; found: Candidate }[] = [];
  for (const story of stories) {
    story.imageUrl = '';
    const subject = story.imageSubject.trim();
    if (!subject) continue;
    const found = await findImage(subject);
    if (found) pairs.push({ story, found });
  }

  const kept = pairs.length ? await confirm(topicName, pairs) : new Set<number>();
  pairs.forEach(({ story, found }, i) => {
    if (kept.has(i)) story.imageUrl = found.url;
    else detail(`immagine scartata: "${story.imageSubject}" -> ${found.title} (${found.file})`);
  });

  detail(`immagini: ${kept.size}/${stories.length} (trovate ${pairs.length}, confermate ${kept.size})`);
}
