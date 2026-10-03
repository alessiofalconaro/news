const NBSP = ' ';

/** A number, a version or a figure: "5.5", "39", "2026", "30%", "€2". */
const NUMBER = /^[^\p{L}]*\p{N}[\p{N}.,:%/'’-]*[^\p{L}]*$/u;

/**
 * Keeps a headline from breaking badly.
 *
 * Wrapped by the browser alone, "Anthropic presenta il nuovo modello Claude
 * Opus 5.5" could leave "5.5" on a line of its own, and an Italian title can end
 * a line on a lone "e" or "a". The CSS asks for balanced lines (text-wrap:
 * balance), which spreads the words evenly, but not every browser honours it
 * and balance alone still allows a single word at the end. So the spaces that
 * must not break become no-break spaces:
 *
 * - between the last two words, so the last line always has at least two;
 * - after a word of one or two letters, which belongs to the word it introduces;
 * - before a number, which belongs to the word it qualifies ("Opus 5.5",
 *   "GPT 6.1", "Tomorrowland 2026").
 *
 * Only short pairs are glued, so a chain can never get wide enough to overflow
 * the card.
 */
export function tidyHeadline(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return words.join(' ');

  let out = words[0]!;
  for (let i = 1; i < words.length; i += 1) {
    const before = words[i - 1]!;
    const word = words[i]!;
    const last = i === words.length - 1;
    const glue =
      (last && before.length + word.length <= 22) ||
      (before.replace(/[^\p{L}]/gu, '').length <= 2 && !NUMBER.test(before)) ||
      (NUMBER.test(word) && before.length + word.length <= 22);
    out += (glue ? NBSP : ' ') + word;
  }
  return out;
}
