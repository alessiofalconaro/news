import { Injectable, effect, signal } from '@angular/core';

/**
 * How the stories of a topic are laid out.
 *
 * `list` stacks them and you scroll down. `cards` shows one at a time and you
 * swipe sideways, which keeps every topic within a thumb's reach: with four
 * topics the last one is two screens away instead of ten.
 *
 * Kept per device rather than in the profile, like the theme: it is about the
 * screen in your hand, not about who you are.
 */
export type ViewMode = 'list' | 'cards';

const STORAGE_KEY = 'newsdigest-view-mode';

@Injectable({ providedIn: 'root' })
export class ViewModeService {
  readonly mode = signal<ViewMode>(read());

  constructor() {
    effect(() => {
      const mode = this.mode();
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Private mode or blocked storage: the choice just lasts this session.
      }
    });
  }

  set(mode: ViewMode): void {
    this.mode.set(mode);
  }
}

function read(): ViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'cards' ? 'cards' : 'list';
  } catch {
    return 'list';
  }
}
