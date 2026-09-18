import { Component, computed, inject } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { AuthService } from '../core/auth.service';
import { Theme } from '../core/theme.service';
import { ProfileService } from '../core/profile.service';
import { DEFAULT_DIGEST_HOUR, MAX_DIGEST_HOUR, MIN_DIGEST_HOUR } from '../core/models';
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

    <section class="card row">
      <div class="label">
        <h2>{{ t().settings.digestTime }}</h2>
        <p class="muted">{{ t().settings.digestTimeHint }}</p>
      </div>
      <select [value]="hour()" (change)="pickHour($event)" [attr.aria-label]="t().settings.digestTime">
        @for (h of hours; track h) {
          <option [value]="h">{{ label(h) }}</option>
        }
      </select>
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
      .row select {
        width: auto;
        flex: none;
      }
    `,
  ],
})
export class SettingsPage {
  readonly auth = inject(AuthService);
  readonly theme = inject(Theme);
  private readonly i18n = inject(I18n);
  private readonly profiles = inject(ProfileService);
  readonly t = this.i18n.t;

  readonly hours = Array.from(
    { length: MAX_DIGEST_HOUR - MIN_DIGEST_HOUR + 1 },
    (_, i) => MIN_DIGEST_HOUR + i,
  );

  readonly hour = computed(() => this.profiles.profile()?.digestHour ?? DEFAULT_DIGEST_HOUR);

  /** "07:00" in both languages: en-GB keeps the 24h clock, as elsewhere. */
  label(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  pickHour(event: Event): void {
    const hour = Number((event.target as HTMLSelectElement).value);
    void this.profiles.setDigestHour(hour);
  }
}
