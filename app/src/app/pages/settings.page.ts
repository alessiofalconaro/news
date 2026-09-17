import { Component, inject } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { AuthService } from '../core/auth.service';
import { Theme } from '../core/theme.service';
import { LangToggle } from '../lang-toggle';

@Component({
  selector: 'app-settings',
  imports: [LangToggle],
  template: `
    <h1>{{ t().settings.title }}</h1>

    <section class="card row">
      <div class="label">
        <h2>{{ t().settings.language }}</h2>
      </div>
      <app-lang-toggle />
    </section>

    <section class="card row">
      <div class="label">
        <h2>{{ t().settings.theme }}</h2>
      </div>
      <button class="btn" (click)="theme.toggle()">
        {{ theme.light() ? '☀️ ' + t().settings.themeLight : '🌙 ' + t().settings.themeDark }}
      </button>
    </section>

    <section class="card">
      <h2>{{ t().settings.notifications }}</h2>
      <p class="muted">{{ t().settings.notificationsComingSoon }}</p>
    </section>

    <section class="card">
      <h2>{{ t().settings.account }}</h2>
      <p class="muted">{{ auth.user()?.email }}</p>
      <button class="btn btn-danger" (click)="auth.signOut()">{{ t().auth.signOut }}</button>
    </section>
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
      section {
        margin-bottom: 12px;
      }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }
      .label {
        min-width: 0;
      }
      .muted {
        margin: 6px 0 14px;
        color: var(--text-soft);
        font-size: 0.88rem;
        overflow-wrap: anywhere;
      }
      .row .muted {
        margin: 0;
      }
    `,
  ],
})
export class SettingsPage {
  readonly auth = inject(AuthService);
  readonly theme = inject(Theme);
  private readonly i18n = inject(I18n);
  readonly t = this.i18n.t;
}
