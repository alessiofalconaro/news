import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'theme';

/**
 * Dark by default, light as a class on `<body>`, choice kept in `localStorage`.
 * Same mechanics as both reference apps; `prefers-color-scheme` is deliberately
 * ignored, the choice is always the user's.
 */
@Injectable({ providedIn: 'root' })
export class Theme {
  readonly light = signal(read());

  constructor() {
    this.apply();
  }

  toggle(): void {
    this.light.update((v) => !v);
    try {
      localStorage.setItem(STORAGE_KEY, this.light() ? 'light' : 'dark');
    } catch {
      // Private mode: the theme just resets next time.
    }
    this.apply();
  }

  private apply(): void {
    document.body.classList.toggle('theme-light', this.light());
  }
}

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light';
  } catch {
    return false;
  }
}
