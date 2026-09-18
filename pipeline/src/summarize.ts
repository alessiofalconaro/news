/**
 * AI call 2: write each selected story up, in both languages, from the material
 * that was actually supplied.
 *
 * All the stories of a topic go in one call. The free tier is metered per
 * minute, and a per-story call would multiply the run by the number of stories
 * for no gain - the model sees each group separately in the prompt anyway.
 */

import { z } from 'zod';
import { ask } from './gemini.ts';
import type { Article, SelectedStory, WrittenStory } from './types.ts';

const schema = {
  type: 'object',
  properties: {
    stories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          headlineIt: { type: 'string' },
          headlineEn: { type: 'string' },
          summaryIt: { type: 'string' },
          summaryEn: { type: 'string' },
          primaryArticleId: { type: 'string' },
          imageSubject: { type: 'string' },
        },
        required: [
          'index',
          'headlineIt',
          'headlineEn',
          'summaryIt',
          'summaryEn',
          'primaryArticleId',
          'imageSubject',
        ],
      },
    },
  },
  required: ['stories'],
};

const shape = z.object({
  stories: z.array(
    z.object({
      index: z.number().int(),
      headlineIt: z.string().min(1),
      headlineEn: z.string().min(1),
      summaryIt: z.string().min(1),
      summaryEn: z.string().min(1),
      primaryArticleId: z.string(),
      imageSubject: z.string(),
    }),
  ),
});

function groupBlock(articles: Article[], index: number): string {
  const lines = articles
    .map(
      (a) =>
        `  ${a.id} | ${a.source} | ${a.title}` +
        (a.snippet ? `\n       ${a.snippet.slice(0, 400)}` : ''),
    )
    .join('\n');
  return `STORIA ${index}\n${lines}`;
}

export async function writeStories(
  topicName: string,
  selected: SelectedStory[],
  byId: Map<string, Article>,
): Promise<WrittenStory[]> {
  const groups = selected.map((story) => ({
    story,
    articles: story.articleIds.map((id) => byId.get(id)!).filter(Boolean),
  }));

  const prompt = `Scrivi le voci di una rassegna stampa, in italiano e in inglese.

${groups.map((g, i) => groupBlock(g.articles, i + 1)).join('\n\n')}

Per OGNI storia restituisci:
- "index": il numero della storia qui sopra;
- "headlineIt" e "headlineEn": un titolo breve, non piu' di una riga;
- "summaryIt" e "summaryEn": 2-3 frasi che dicono cosa e' successo;
- "primaryArticleId": l'id dell'articolo della fonte piu' autorevole o completa
  del gruppo;
- "imageSubject": il soggetto principale della storia, scritto come si
  intitolerebbe la sua voce di enciclopedia. Una persona, una squadra, un'azienda,
  un'organizzazione, un luogo: "Cleveland Cavaliers", "Vladimir Putin",
  "Stretto di Hormuz". Serve a cercare un'immagine, quindi dev'essere una cosa
  raffigurabile e nota, non un concetto astratto ne' una frase. Se la storia non
  ha un soggetto del genere, lascialo vuoto.

REGOLE, da rispettare tutte:
- Usa SOLO le informazioni contenute nei testi qui sopra. Non aggiungere fatti,
  cifre, nomi o contesto che non compaiano. Se non sai una cosa, non scriverla.
- Tono neutro, da agenzia di stampa. Niente giudizi, niente enfasi, niente
  domande retoriche.
- L'italiano dev'essere italiano vero, non la traduzione parola per parola
  dell'inglese. Lo stesso vale per l'inglese.
- Se il materiale e' scarso, scrivi un riassunto piu' corto. Meglio due frasi
  esatte che tre di cui una inventata.
- Non citare "l'articolo" o "la fonte": racconta la notizia.`;

  const result = await ask(`riassunti "${topicName}"`, prompt, schema, shape);
  const written = new Map(result.stories.map((s) => [s.index, s]));

  return groups
    .map((group, i) => {
      const text = written.get(i + 1);
      if (!text || !group.articles.length) return null;
      const primary =
        group.articles.find((a) => a.id === text.primaryArticleId) ?? group.articles[0]!;
      return {
        rank: i + 1,
        headlineIt: text.headlineIt,
        headlineEn: text.headlineEn,
        summaryIt: text.summaryIt,
        summaryEn: text.summaryEn,
        primaryArticleId: primary.id,
        articles: group.articles,
        imageSubject: text.imageSubject,
        imageUrl: '',
      } satisfies WrittenStory;
    })
    .filter((s): s is WrittenStory => s !== null);
}
