/**
 * A topic's name in both languages.
 *
 * The app is read in Italian or in English, and everything in it follows: the
 * headlines, the summaries, the interface. Everything except the topic names,
 * which the owner typed once and which then sat there in the other language
 * like a sign somebody forgot to take down - "Geopolitica mondiale" heading a
 * page otherwise entirely in English.
 *
 * So the names are translated too. Once per name, cached on the topic and
 * redone only when the owner edits it, which is rare: this is a label, not a
 * document, and it would be absurd to spend a model call on it every morning.
 *
 * A name can also be untranslatable - somebody typed "asdfgh", or a private
 * shorthand that means nothing in any language. That is reported rather than
 * papered over: the app keeps the original and says why.
 */

import { z } from 'zod';
import { ask } from './gemini.ts';
import { saveTopicNames } from './firestore.ts';
import { detail, reason, warn } from './log.ts';
import type { Topic, TopicNames } from './types.ts';

const schema = {
  type: 'object',
  properties: {
    meaningful: { type: 'boolean' },
    it: { type: 'string' },
    en: { type: 'string' },
  },
  required: ['meaningful', 'it', 'en'],
};

const shape = z.object({
  meaningful: z.boolean(),
  it: z.string().min(1),
  en: z.string().min(1),
});

async function translate(name: string): Promise<TopicNames> {
  const prompt = `Dai il nome di un topic di un'app di notizie in italiano e in inglese.

NOME SCRITTO DALL'UTENTE: ${name}

REGOLE
- E' un'etichetta di una o poche parole, non una frase: la resa deve essere
  altrettanto breve e suonare naturale a un lettore di quella lingua, non
  tradotta parola per parola.
- Nomi propri, sigle e marchi restano identici: NBA resta NBA in entrambe,
  "Formula 1" resta "Formula 1", "Taylor Swift" resta "Taylor Swift".
- Se il nome e' gia' nella lingua d'arrivo, riportalo identico.
- Niente virgolette, niente punto finale, niente spiegazioni.
- "meaningful" e' false SOLO quando il testo non e' una parola o un'espressione
  di nessuna lingua - "asdfgh", "xyz123", tasti premuti a caso. Un nome strano
  ma leggibile, o in una terza lingua, e' meaningful: traducilo.
- Quando "meaningful" e' false, riporta il testo identico in entrambi i campi.

ESEMPI
- "Geopolitica mondiale" -> it "Geopolitica mondiale", en "World geopolitics"
- "Tech and AI" -> it "Tecnologia e IA", en "Tech and AI"
- "NBA" -> it "NBA", en "NBA"
- "asdfgh" -> meaningful false, it "asdfgh", en "asdfgh"`;

  const result = await ask(`nome "${name}"`, prompt, schema, shape);
  return {
    it: result.it.trim() || name,
    en: result.en.trim() || name,
    meaningful: result.meaningful,
  };
}

/**
 * Fills in a topic's two names, in place, unless they are already there.
 *
 * `nameSource` is the name they were made from: the plain text rather than a
 * hash of it, because the app compares the two to decide whether what it holds
 * still describes what is on screen, and it should be able to do that by
 * looking. When they differ the owner has edited the name since, and the app
 * falls back to showing exactly what they typed.
 *
 * Never fatal. A digest that fails to build because a label could not be
 * translated would be a poor trade.
 */
export async function resolveNames(topic: Topic): Promise<void> {
  const name = topic.name.trim();
  if (!name || topic.nameSource === name) return;

  try {
    const names = await translate(name);
    topic.nameIt = names.it;
    topic.nameEn = names.en;
    topic.nameMeaningful = names.meaningful;
    topic.nameSource = name;
    detail(
      names.meaningful
        ? `nome tradotto: "${names.it}" / "${names.en}"`
        : `nome non traducibile, resta "${name}"`,
    );
    await saveTopicNames(topic.id, names, name);
  } catch (error) {
    warn(`nome non tradotto, resta "${name}": ${reason(error)}`);
  }
}
