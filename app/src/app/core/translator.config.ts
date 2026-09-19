/**
 * Where the topic-name translator lives.
 *
 * Public, like the Firebase values next door, and for the same reason: it is an
 * address, not a credential. The service behind it refuses any origin but this
 * app's, demands a Firebase ID token it verifies itself, and then asks
 * Firestore - as the caller - whether that address is on the allow list. The
 * Gemini key stays on Cloudflare and is never sent anywhere near a browser.
 *
 * Deployed from `translator/`; README step 17 has the whole procedure. If it
 * is ever taken down, put the placeholder back and the app simply does
 * without: names are then translated by the pipeline at the next round,
 * exactly as they were before this existed.
 */
export const TRANSLATOR_URL = 'https://newsdigest-translator.alessiofalconaro.workers.dev';

/** False until the URL above is filled in, so nothing tries to call nowhere. */
export const translatorConfigured = !TRANSLATOR_URL.startsWith('REPLACE_ME');
