/**
 * Stamps the built service worker with the build time.
 *
 * Why this exists: a browser only installs a new service worker when the script
 * differs byte for byte from the one it has. `ngsw-worker.js` ships with
 * Angular and is identical across builds, so an installed worker can outlive
 * any number of deploys - and it carries the Content-Security-Policy it was
 * served with, frozen at install time. Change the CSP and already-installed
 * apps keep enforcing the old one indefinitely, which reads as "the app is
 * broken and clearing the cache does not help": exactly what happened here
 * twice, once with the Google sign-in script and once with the story pictures.
 *
 * A comment with the build time makes every deploy produce a different worker,
 * so it installs, and whatever the headers say now takes effect.
 *
 * Safe to append: `ngsw.json` does not carry a hash for the worker itself, only
 * for the application files it manages.
 */

import { appendFileSync, existsSync } from 'node:fs';

const worker = new URL('../dist/newsdigest/browser/ngsw-worker.js', import.meta.url);

if (!existsSync(worker)) {
  console.error('ngsw-worker.js non trovato: la build del service worker e\' abilitata?');
  process.exit(1);
}

appendFileSync(worker, `\n// build ${new Date().toISOString()}\n`);
console.log('service worker marcato con la data della build');
