/**
 * Renders public/favicon.svg into the PNG sizes the manifest and iOS need.
 * Run with: npm run icons
 *
 * The maskable icon gets a 20% safe margin, because Android crops it to
 * whatever shape the launcher uses.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'public', 'favicon.svg');
const outDir = join(root, 'public', 'icons');
const BACKGROUND = '#e4713c';

const svg = await readFile(source);
await mkdir(outDir, { recursive: true });

for (const size of [180, 192, 512]) {
  const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
  await writeFile(join(outDir, `icon-${size}.png`), png);
  console.log(`icon-${size}.png`);
}

// Maskable: the artwork shrinks to 60% and sits on a full-bleed background, so
// nothing important falls outside the launcher's mask.
const inner = Math.round(512 * 0.6);
const artwork = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();
const maskable = await sharp({
  create: { width: 512, height: 512, channels: 4, background: BACKGROUND },
})
  .composite([{ input: artwork, gravity: 'centre' }])
  .png()
  .toBuffer();
await writeFile(join(outDir, 'icon-512-maskable.png'), maskable);
console.log('icon-512-maskable.png');
