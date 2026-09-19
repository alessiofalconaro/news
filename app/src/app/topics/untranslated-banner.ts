import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { TopicsService } from './topics.service';
import { untranslatable } from './topic-name';

/** Long enough to read twice, short enough not to become furniture. */
const SHOWN_FOR_MS = 9000;

/**
 * Says why some topic names did not change with the language.
 *
 * Switching to English translates everything - headlines, summaries, the
 * interface, the topic names - except the names the AI could not make sense of,
 * because somebody typed "asdfgh" or a private shorthand. Those stay as they
 * are, and without a word of explanation that looks like a translation that
 * silently failed.
 *
 * Only on the switch itself, and only for as long as that thought lasts: it
 * answers a question the reader is asking at that exact moment, and a notice
 * still sitting there tomorrow would just be noise. It can also be dismissed by
 * anyone who has read it and would rather have the space back.
 */
@Component({
  selector: 'app-untranslated-banner',
  template: `
    @if (names().length) {
      <div class="note" role="status">
        <p>{{ t().topics.notTranslated(names().join(', ')) }}</p>
        <button (click)="dismiss()" [attr.aria-label]="t().common.close">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6 6l8 8M14 6l-8 8" />
          </svg>
        </button>
      </div>
    }
  `,
  styles: [
    `
      .note {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 14px;
        padding: 11px 13px;
        border: 1px solid color-mix(in srgb, var(--warn) 40%, transparent);
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--warn) 10%, transparent);
      }
      .note p {
        flex: 1;
        margin: 0;
        color: var(--text-soft);
        font-size: 0.82rem;
        line-height: 1.45;
      }
      .note button {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        margin: -3px -3px 0 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: var(--text-dim);
      }
      .note svg {
        width: 12px;
        height: 12px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
      }
    `,
  ],
})
export class UntranslatedBanner implements OnDestroy {
  private readonly i18n = inject(I18n);
  private readonly topics = inject(TopicsService);
  readonly t = this.i18n.t;

  readonly names = signal<string[]>([]);

  private shownFor: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const lang = this.i18n.lang();
      const stuck = untranslatable(this.topics.topics());

      // The language the page loaded in is not a switch, and neither is the
      // same language arriving twice: both would show a notice nobody asked a
      // question to deserve.
      const first = this.shownFor === null;
      const changed = !first && this.shownFor !== lang;
      this.shownFor = lang;
      if (!changed || !stuck.length) return;

      this.names.set(stuck.map((topic) => topic.name));
      this.restartTimer();
    });
  }

  dismiss(): void {
    this.clearTimer();
    this.names.set([]);
  }

  private restartTimer(): void {
    this.clearTimer();
    this.timer = setTimeout(() => this.names.set([]), SHOWN_FOR_MS);
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
