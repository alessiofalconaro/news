import { Component, inject } from '@angular/core';
import { I18n } from './i18n/i18n.service';

/**
 * Two-state segmented control. A dropdown would cost two taps for something the
 * user flips several times a day, so both languages are always on screen.
 */
@Component({
  selector: 'app-lang-toggle',
  template: `
    <div class="wrap" role="group" [attr.aria-label]="i18n.t().settings.language">
      <button
        class="opt"
        [class.on]="i18n.lang() === 'it'"
        [attr.aria-pressed]="i18n.lang() === 'it'"
        (click)="i18n.set('it')"
      >
        IT
      </button>
      <button
        class="opt"
        [class.on]="i18n.lang() === 'en'"
        [attr.aria-pressed]="i18n.lang() === 'en'"
        (click)="i18n.set('en')"
      >
        EN
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      .wrap {
        display: inline-flex;
        padding: 3px;
        border-radius: var(--radius-pill);
        background: var(--surface-2);
        border: 1px solid var(--border);
      }
      .opt {
        min-width: 38px;
        /* 38px is under the 44px target, so the row that holds this control
           keeps a 44px-tall hit area around it (see .topbar padding). */
        padding: 6px 2px;
        border: 0;
        border-radius: var(--radius-pill);
        background: none;
        color: var(--text-dim);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        transition:
          background 0.18s ease,
          color 0.18s ease;
      }
      .opt.on {
        background: var(--brand);
        color: var(--brand-ink);
      }
    `,
  ],
})
export class LangToggle {
  readonly i18n = inject(I18n);
}
