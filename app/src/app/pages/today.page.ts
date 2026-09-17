import { Component, inject } from '@angular/core';
import { I18n } from '../i18n/i18n.service';

/** Placeholder until Phase 3 builds the real digest view. */
@Component({
  selector: 'app-today',
  template: `
    <h1>{{ t().today.title }}</h1>
    <p class="date">{{ i18n.fullDate(today) }}</p>

    <div class="empty-state card">
      <h2>{{ t().today.notReadyTitle }}</h2>
      <p>{{ t().today.notReadyBody }}</p>
      <p class="soon">{{ t().today.comingSoon }}</p>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 720px;
        margin: 0 auto;
      }
      .date {
        margin: 4px 0 20px;
        color: var(--text-soft);
        font-size: 0.88rem;
      }
      .soon {
        margin: 0;
        color: var(--text-dim);
        font-size: 0.8rem;
      }
    `,
  ],
})
export class TodayPage {
  readonly i18n = inject(I18n);
  readonly t = this.i18n.t;
  readonly today = new Date();
}
