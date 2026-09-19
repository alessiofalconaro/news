import { Injectable, computed, effect, signal } from '@angular/core';

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
  /**
   * What the reader chose, and what comes back tomorrow.
   *
   * Separate from what is on screen because filtering down to a single topic
   * overrides the layout for as long as that filter lasts: one topic has the
   * whole page to itself, so stacking its stories is plainly better than
   * swiping them one at a time. Overriding the stored choice instead of
   * replacing it means the reader gets their own layout back the moment the
   * filter widens again.
   */
  private readonly preferred = signal<ViewMode>(read());
  private readonly forced = signal(false);

  readonly mode = computed<ViewMode>(() => (this.forced() ? 'list' : this.preferred()));

  constructor() {
    effect(() => {
      const mode = this.preferred();
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Private mode or blocked storage: the choice just lasts this session.
      }
    });
  }

  /** Called by the topic filter: on while exactly one topic is showing. */
  forceList(on: boolean): void {
    this.forced.set(on);
  }

  /**
   * The reader has the last word: pressing the switch while the filter is
   * holding the layout down lifts the hold rather than doing nothing.
   */
  toggle(): void {
    const next: ViewMode = this.mode() === 'list' ? 'cards' : 'list';
    this.forced.set(false);
    this.preferred.set(next);
  }
}

function read(): ViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'cards' ? 'cards' : 'list';
  } catch {
    return 'list';
  }
}
