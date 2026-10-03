import { signal } from '@angular/core';

/** How long the splash animation runs (see .boot in styles.scss): the splash
 *  never leaves before it has played, even when the app is ready sooner. */
const SPLASH_MIN_MS = 1700;

/** On once the splash goes: starts the mark's animation in the top bar (before
 *  that the splash covers it, and it would play in the dark). */
export const started = signal(false);

/**
 * The splash (#boot in index.html) is one element that Angular never redraws:
 * it is taken away once, when its animation is over (SPLASH_MIN_MS from the
 * start of the page), with a fade.
 */
export function hideSplash(): void {
  const boot = document.getElementById('boot');
  if (!boot) {
    started.set(true);
    return;
  }
  if (boot.classList.contains('out')) return;
  const wait = Math.max(0, SPLASH_MIN_MS - performance.now());
  setTimeout(() => {
    boot.classList.add('out');
    started.set(true);
    setTimeout(() => boot.remove(), 380);
  }, wait);
}
