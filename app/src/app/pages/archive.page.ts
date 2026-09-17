import { Component, inject } from '@angular/core';
import { I18n } from '../i18n/i18n.service';

/** Placeholder until Phase 3. */
@Component({
  selector: 'app-archive',
  template: `
    <h1>{{ t().archive.title }}</h1>

    <div class="empty-state card">
      <h2>{{ t().archive.emptyTitle }}</h2>
      <p>{{ t().archive.emptyBody }}</p>
      <p class="soon">{{ t().archive.comingSoon }}</p>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 720px;
        margin: 0 auto;
      }
      h1 {
        margin-bottom: 20px;
      }
      .soon {
        margin: 0;
        color: var(--text-dim);
        font-size: 0.8rem;
      }
    `,
  ],
})
export class ArchivePage {
  private readonly i18n = inject(I18n);
  readonly t = this.i18n.t;
}
