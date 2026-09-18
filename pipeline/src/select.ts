/**
 * AI call 1: which of today's articles are worth the user's morning, and which
 * of them are the same piece of news.
 *
 * The ordering rules come from PROJECT_SPEC section 6 and are given to the model
 * in their stated order of weight. The one that matters most is the first:
 * several different outlets covering something is the closest thing to an
 * objective signal that it mattered.
 */

import { z } from 'zod';
import { ask } from './gemini.ts';
import type { Article, SelectedStory, Topic } from './types.ts';
import { romeStamp } from './time.ts';

const schema = {
  type: 'object',
  properties: {
    stories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          articleIds: { type: 'array', items: { type: 'string' } },
          note: { type: 'string' },
        },
        required: ['articleIds', 'note'],
      },
    },
  },
  required: ['stories'],
};

const shape = z.object({
  stories: z.array(
    z.object({
      articleIds: z.array(z.string()).min(1),
      note: z.string(),
    }),
  ),
});

function articleLines(articles: Article[]): string {
  return articles
    .map(
      (a) =>
        `${a.id} | ${romeStamp(a.publishedAt)} | ${a.source} | ${a.title}` +
        (a.snippet ? `\n     ${a.snippet.slice(0, 300)}` : ''),
    )
    .join('\n');
}

export async function selectStories(topic: Topic, articles: Article[]): Promise<SelectedStory[]> {
  const prompt = `Sei l'editor di una rassegna stampa personale. Devi scegliere le notizie
del giorno per un lettore che ti ha descritto i propri interessi.

INTERESSI DEL LETTORE (topic "${topic.name}"):
${topic.interests}

ARTICOLI DI OGGI:
${articleLines(articles)}

COSA DEVI FARE
1. Raggruppa gli articoli che raccontano LA STESSA notizia. Un gruppo puo' avere
   un solo articolo.
2. Scarta i gruppi che non corrispondono agli interessi del lettore. Meglio
   restituire poche storie buone che riempire lo spazio.
3. Ordina i gruppi rimasti per rilevanza, usando questi criteri in questo ordine
   di peso:
   a. quante testate DIVERSE ne parlano;
   b. importanza oggettiva della notizia;
   c. aderenza agli interessi scritti sopra;
   d. quanto e' recente.
4. Restituisci al massimo ${topic.maxStories} gruppi, dal piu' rilevante al meno.

REGOLE
- Un gruppo contiene articoli sullo STESSO identico fatto. Due fatti diversi
  stanno in gruppi diversi anche se riguardano lo stesso settore, le stesse
  persone o lo stesso giorno.
- NON unire mai fatti diversi per arrivare al numero massimo. Se le storie che
  meritano sono meno del massimo, restituiscine meno: una lista corta e' un
  risultato giusto, un gruppo che mette insieme cose scollegate e' un errore.
- Usa solo gli id che compaiono nella lista.
- Ogni id sta in un gruppo solo.
- In "note" scrivi in italiano, in una riga, perche' hai tenuto quella storia.
- Se nessun articolo corrisponde agli interessi, restituisci una lista vuota.`;

  const result = await ask(`selezione "${topic.name}"`, prompt, schema, shape);

  // The model occasionally returns an id that was never in the list, or repeats
  // one across groups. Both are cheap to correct here and expensive to debug
  // three steps later, when a story quietly has fewer sources than it claims.
  const known = new Map(articles.map((a) => [a.id, a]));
  const used = new Set<string>();
  const clean: SelectedStory[] = [];

  for (const story of result.stories) {
    const ids = story.articleIds.filter((id) => known.has(id) && !used.has(id));
    if (!ids.length) continue;
    for (const id of ids) used.add(id);
    clean.push({ articleIds: ids, note: story.note });
    if (clean.length === topic.maxStories) break;
  }

  return clean;
}
