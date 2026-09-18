/**
 * What a dry run prints.
 *
 * This output has one job: let someone read a morning's digest in a terminal
 * and say whether the selection was any good. So it shows the reasoning and the
 * sources next to each story, which the app itself never will.
 */

import { appendFileSync, writeFileSync } from 'node:fs';
import { romeStamp } from './time.ts';
import type { TopicResult } from './types.ts';

/**
 * A dry run also writes its output next to the script, because a terminal
 * scrollback is a bad place to read a morning's news from and an even worse one
 * to compare against yesterday's.
 */
const FILE = new URL('../ultimo-digest.txt', import.meta.url);

export function startFile(): string {
  writeFileSync(FILE, '');
  return FILE.pathname.replace(/^\//, '');
}

function out(line: string): void {
  console.log(line);
  appendFileSync(FILE, `${line}\n`);
}

function rule(char = '-'): string {
  return char.repeat(60);
}

export function renderTopic(result: TopicResult): void {
  const { topic, stories, counts } = result;
  out(`\n${rule('=')}`);
  out(`TOPIC: ${topic.name}`);
  out(
    `articoli: ${counts.fetched} raccolti -> ${counts.afterDedupe} senza duplicati -> ` +
      `${counts.afterSeen} mai usati`,
  );
  out(`storie richieste: max ${topic.maxStories}, ottenute ${stories.length}`);
  out(rule('='));

  if (!stories.length) {
    out("\nNessuna storia. Se si ripete, il problema e' quasi sempre uno di questi:");
    out('  - la query trova poco: prova a cambiare "Parole da cercare" nel topic;');
    out('  - "Cosa mi interessa" e\' troppo stretto e l\'AI scarta tutto;');
    out("  - e' passata poca notizia nelle ultime 24 ore.");
    return;
  }

  for (const story of stories) {
    const primary = story.articles.find((a) => a.id === story.primaryArticleId);
    out(`\n${story.rank}. ${story.headlineIt}`);
    out(`   ${story.summaryIt}`);
    out(`\n   EN: ${story.headlineEn}`);
    out(`       ${story.summaryEn}`);
    const outlets = [...new Set(story.articles.map((a) => a.source))];
    out(`\n   fonti (${outlets.length}): ${outlets.join(', ')}`);
    if (primary) {
      out(`   principale: ${primary.source}, ${romeStamp(primary.publishedAt)}`);
      out(`   ${primary.url}`);
    }
    out(`   ${rule()}`);
  }
}

export function renderSummary(results: TopicResult[], failed: string[]): void {
  const stories = results.reduce((n, r) => n + r.stories.length, 0);
  out(`\n${rule('=')}`);
  out(`TOTALE: ${stories} storie da ${results.length} topic`);
  if (failed.length) out(`topic falliti: ${failed.join(', ')}`);
  out(rule('='));
}
