/**
 * Environment. Read once, validated once, so a missing secret fails on the
 * first line with a sentence that says what to do rather than somewhere deep
 * in a Firestore call with a stack trace.
 */

/** The most recent Flash-Lite on the free tier (PROJECT_SPEC section 3). */
export const GEMINI_MODEL = 'gemini-3.5-flash-lite';

/** Free tier is rate limited per minute; PROJECT_SPEC section 6 asks for this. */
export const PAUSE_BETWEEN_AI_CALLS_MS = 6_000;

export const MAX_AI_ATTEMPTS = 3;

/** Articles older than this never reach the model. */
export const ARTICLE_MAX_AGE_HOURS = 24;

/** An article already used for a topic stays out of its digest for this long. */
export const SEEN_ARTICLE_DAYS = 7;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Manca ${name}. Il file dei segreti e' uno solo e sta nella cartella ` +
        'principale del progetto, non qui dentro: copia .env.example in .env e ' +
        'compilalo. Il README, punto 11, spiega da dove si prende ogni valore.',
    );
  }
  return value;
}

export interface Config {
  /** Absent until the VAPID keys are set: the digest still works without them. */
  push: { publicKey: string; privateKey: string; subject: string } | null;
  geminiApiKey: string;
  /** Service account JSON for the Admin SDK, as a single-line string. */
  serviceAccount: Record<string, unknown>;
}

export function loadConfig(): Config {
  const raw = required('FIREBASE_SERVICE_ACCOUNT');
  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT non e' JSON valido. Dev'essere tutto il file " +
        'scaricato, su una riga sola, tra apici singoli dentro il .env.',
    );
  }
  const publicKey = process.env['VAPID_PUBLIC_KEY']?.trim();
  const privateKey = process.env['VAPID_PRIVATE_KEY']?.trim();
  const subject = process.env['VAPID_SUBJECT']?.trim();
  const push = publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;

  return { geminiApiKey: required('GEMINI_API_KEY'), serviceAccount, push };
}
