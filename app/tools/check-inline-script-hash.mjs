/**
 * Keeps the CSP and the page's inline script in agreement.
 *
 * `index.html` carries one inline script - the theme, set before the first
 * paint - and the Content-Security-Policy in `firebase.json` names it by the
 * hash of its contents. Change one character of that script and the browser
 * refuses to run it, silently: nothing breaks, the light theme just flashes
 * dark on every launch, and there is nothing in the page to suggest why.
 *
 * So the build checks. Every inline script in the built page must be named in
 * the policy, and when one is not, this says which line to paste where.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const page = resolve(here, '../dist/newsdigest/browser/index.html');
const config = resolve(here, '../../firebase.json');

const html = readFileSync(page, 'utf8');
const policy = readFileSync(config, 'utf8');

// Anything with a `src` is fetched, not inline, and `self` already covers it.
const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)];

const missing = [];
for (const [, body] of inline) {
  const hash = `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`;
  if (!policy.includes(hash)) missing.push({ hash, body });
}

if (missing.length) {
  console.error("\nLa CSP non autorizza uno script inline di index.html.\n");
  for (const { hash, body } of missing) {
    console.error(`  script: ${body.trim().split('\n')[0].slice(0, 70)}...`);
    console.error(`  da aggiungere a script-src in firebase.json:  '${hash}'\n`);
  }
  process.exit(1);
}

console.log(
  inline.length
    ? `CSP: ${inline.length} script inline, tutti autorizzati`
    : 'CSP: nessuno script inline da autorizzare',
);
