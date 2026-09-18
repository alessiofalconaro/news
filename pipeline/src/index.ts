/**
 * Entry point for the digest.
 *
 *   npm run digest -- --dry-run --user mario@example.com   prints, saves nothing
 *   npm run digest -- --user mario@example.com             one account, for real
 *   npm run digest                                         every account
 *   npm run digest -- --force                              builds now, regardless
 *
 * The daily job runs the plain form. Each account carries the hours it wants a
 * digest at, one or two, so the workflow wakes up every hour and this builds
 * only for whoever has a round due then. A round stays due for two hours, which
 * is what makes a failed run recoverable: the next wake-up finds it unbuilt and
 * tries again. --force ignores both the clock and what has already been built,
 * which is what the manual button on GitHub is for.
 */

import { loadConfig } from './config.ts';
import { describeModel, initGemini } from './gemini.ts';
import {
  activeTopics,
  allProfiles,
  clearRequest,
  dropRecentlySeen,
  findProfileByEmail,
  initFirestore,
  pendingRequest,
} from './firestore.ts';
import { collectArticles } from './feeds.ts';
import { resolveQuery } from './query.ts';
import { dropDuplicates } from './dedupe.ts';
import { selectStories } from './select.ts';
import { writeStories } from './summarize.ts';
import { attachImages } from './image.ts';
import { digestState, saveDigest } from './save.ts';
import { cleanup } from './cleanup.ts';
import { renderSummary, renderTopic, startFile } from './render.ts';
import { detail, fail, heading, reason, step, warn } from './log.ts';
import { dueSlot, onDemandSlot, romeDate, romeHour } from './time.ts';
import type { Profile, TopicResult } from './types.ts';

interface Options {
  dryRun: boolean;
  force: boolean;
  user: string | null;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { dryRun: false, force: false, user: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--user') options.user = argv[++i] ?? null;
    else if (arg?.startsWith('--user=')) options.user = arg.slice('--user='.length);
    else if (arg) throw new Error(`Opzione sconosciuta: ${arg}`);
  }
  return options;
}

/** One topic, start to finish. Throws only if the topic itself cannot be done. */
async function runTopic(topic: TopicResult['topic']): Promise<TopicResult> {
  step(`topic "${topic.name}"`);

  const searchQuery = await resolveQuery(topic);
  const fetched = await collectArticles(topic, searchQuery);
  const deduped = dropDuplicates(fetched);
  const unseen = await dropRecentlySeen(topic.id, deduped);
  detail(`${fetched.length} raccolti, ${deduped.length} senza duplicati, ${unseen.length} mai usati`);

  const counts = { fetched: fetched.length, afterDedupe: deduped.length, afterSeen: unseen.length };
  if (!unseen.length) return { topic, stories: [], counts };

  const selected = await selectStories(topic, unseen);
  detail(`l'AI ha scelto ${selected.length} storie`);
  if (!selected.length) return { topic, stories: [], counts };

  const byId = new Map(unseen.map((a) => [a.id, a]));
  const stories = await writeStories(topic.name, selected, byId);
  await attachImages(stories);
  detail(`${stories.length} storie scritte`);

  return { topic, stories, counts };
}

/** Everything for one account. Returns how many stories it produced. */
async function runProfile(profile: Profile, options: Options, date: string): Promise<number> {
  const when = profile.digestHours.map((h) => `${h}:00`).join(' e ');
  step(`account ${profile.email}, lingua ${profile.language}, digest alle ${when}`);

  // The workflow wakes hourly for everyone; each account is served at its own
  // hours, and each round only once a day.
  //
  // Two things override that. --force, for a manual run from GitHub, and a
  // request left in the app by whoever wants their news now - which is the
  // only route available to someone who has no access to the repository.
  let slot = romeHour();
  let onDemand = false;

  if (!options.dryRun && !options.force) {
    onDemand = await pendingRequest(profile.id);
    const state = await digestState(profile.id, date);

    if (onDemand) {
      // Counts as the round that was about to happen, when one is close, so
      // asking just before it brings it forward instead of doubling it.
      slot = onDemandSlot(profile.digestHours, state.doneHours);
      const brought = slot !== romeHour();
      step(
        brought
          ? `richiesto dall'app: anticipo la tornata delle ${slot}:00`
          : "richiesto dall'app: costruisco adesso",
      );
    } else {
      const due = dueSlot(profile.digestHours, state.doneHours);
      if (due === null) {
        step(`non e' la sua ora: a Roma sono le ${romeHour()}:00`);
        return 0;
      }
      slot = due;
    }
  }

  // Cleared up front, and not at the end: a run that fails partway must not
  // leave the request standing, or every later wake-up would rebuild forever.
  if (onDemand) await clearRequest(profile.id);

  const topics = await activeTopics(profile.id);
  if (!topics.length) {
    warn('nessun topic attivo: salto');
    return 0;
  }
  step(`${topics.length} topic attivi`);

  const results: TopicResult[] = [];
  const failed: string[] = [];

  for (const topic of topics) {
    try {
      results.push(await runTopic(topic));
    } catch (error) {
      // PROJECT_SPEC section 6: one topic failing must never cost the others.
      warn(`topic "${topic.name}" fallito: ${reason(error)}`);
      failed.push(topic.name);
    }
  }

  for (const result of results) renderTopic(result);
  renderSummary(results, failed);

  if (options.dryRun) return results.reduce((n, r) => n + r.stories.length, 0);

  const saved = await saveDigest({ userId: profile.id, date, slot, results, failedTopics: failed });
  return saved.stories;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  initFirestore(config.serviceAccount);
  initGemini(config.geminiApiKey);

  const date = romeDate();
  const file = startFile();
  heading(`NewsDigest - ${options.dryRun ? 'prova a vuoto' : 'digest'} - ${date}`);
  describeModel();

  let profiles: Profile[];
  if (options.user) {
    const profile = await findProfileByEmail(options.user);
    if (!profile) {
      throw new Error(
        `Nessun profilo per ${options.user}. Accedi all'app con quell'indirizzo almeno una ` +
          'volta: il profilo viene creato al primo accesso.',
      );
    }
    profiles = [profile];
  } else {
    profiles = await allProfiles();
    step(`${profiles.length} account`);
  }

  let total = 0;
  for (const profile of profiles) {
    try {
      total += await runProfile(profile, options, date);
    } catch (error) {
      // One account failing must not cost the other one its digest.
      fail(`account ${profile.email}: ${reason(error)}`);
    }
  }

  if (!options.dryRun && total) await cleanup();
  step(`${total} storie in tutto. Testo completo in: ${file}`);
}

main().catch((error: unknown) => {
  fail(reason(error));
  process.exitCode = 1;
});
