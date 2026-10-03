import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { I18n } from './i18n/i18n.service';

/** Long enough to read twice, short enough not to become furniture. */
const SHOWN_FOR_MS = 7000;

/**
 * A notice that goes away by itself.
 *
 * "Some topics could not be processed" is worth reading once, the moment the
 * page opens; left there it is a band of yellow above every reading of the
 * day. So it leaves after a few seconds, and the x takes it away sooner for
 * anyone who has read it. New text - another digest, another error - brings it
 * back.
 */
@Component({
  selector: 'app-notice',
  template: `
    @if (shown()) {
      <div class="banner" [class.banner-warn]="tone() === 'warn'" [class.banner-error]="tone() === 'error'"
        [class.leaving]="leaving()" role="status">
        <p>{{ text() }}</p>
        <button class="x" (click)="dismiss()" [attr.aria-label]="t().common.close">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" /></svg>
        </button>
        <!-- how long is left, drawn as a thin line running out -->
        <span class="timer" [style.animation-duration.ms]="duration"></span>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .banner {
        position: relative;
        overflow: hidden;
        align-items: flex-start;
        animation: notice-in 0.32s cubic-bezier(0.2, 0.8, 0.3, 1) both;
      }
      .banner.leaving {
        animation: notice-out 0.26s ease both;
      }
      p {
        flex: 1;
        margin: 0;
        padding-top: 2px;
      }
      .x {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        margin: -4px -6px -4px 0;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: color-mix(in srgb, currentColor 12%, transparent);
        color: inherit;
      }
      .x svg {
        width: 13px;
        height: 13px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
      }
      .timer {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 2px;
        background: currentColor;
        opacity: 0.35;
        transform-origin: left center;
        animation: notice-timer linear both;
      }
      @keyframes notice-in {
        from {
          opacity: 0;
          transform: translateY(-6px) scale(0.98);
        }
      }
      @keyframes notice-out {
        to {
          opacity: 0;
          transform: translateY(-6px) scale(0.98);
        }
      }
      @keyframes notice-timer {
        to {
          transform: scaleX(0);
        }
      }
    `,
  ],
})
export class Notice {
  readonly t = inject(I18n).t;

  readonly text = input.required<string>();
  readonly tone = input<'warn' | 'error'>('warn');

  readonly shown = signal(false);
  readonly leaving = signal(false);
  readonly duration = SHOWN_FOR_MS;

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    effect(() => {
      const text = this.text();
      untracked(() => {
        this.clear();
        this.leaving.set(false);
        this.shown.set(!!text);
        if (text) this.timers.push(setTimeout(() => this.dismiss(), SHOWN_FOR_MS));
      });
    });
    inject(DestroyRef).onDestroy(() => this.clear());
  }

  dismiss(): void {
    this.clear();
    this.leaving.set(true);
    this.timers.push(setTimeout(() => this.shown.set(false), 260));
  }

  private clear(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
