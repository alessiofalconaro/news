import { Component, computed, inject } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { AuthService } from '../core/auth.service';
import { Theme } from '../core/theme.service';
import { ProfileService } from '../core/profile.service';
import { RefreshService } from '../digest/refresh.service';
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

    <section class="card">
      <h2>{{ t().settings.digestTime }}</h2>
      <p class="muted">{{ t().settings.digestTimeHint }}</p>

      <!-- The chosen option is marked on the option itself, not with [value] on
           the select: the options are built by a loop, so at the moment Angular
           would set the select's value none of them exist yet and the browser
           quietly drops it, leaving the box showing the first hour. -->
      <div class="slots">
        <label class="slot">
          <span>{{ t().settings.digestFirst }}</span>
          <select (change)="pickFirst($event)">
            @for (h of hours; track h) {
              <option [value]="h" [selected]="h === first()">{{ label(h) }}</option>
            }
          </select>
        </label>

        <label class="slot">
          <span>{{ t().settings.digestSecond }}</span>
          <select (change)="pickSecond($event)">
            <option value="" [selected]="second() === null">{{ t().settings.digestNone }}</option>
            @for (h of hours; track h) {
              <option [value]="h" [selected]="h === second()">{{ label(h) }}</option>
            }
          </select>
        </label>
      </div>
    </section>

    <section class="card">
      <h2>{{ t().settings.refresh }}</h2>
      <p class="muted">{{ t().settings.refreshHint }}</p>

      @if (refresh.pending()) {
        <p class="pending">⏳ {{ t().settings.refreshPending }}</p>
        <button class="btn" (click)="refresh.cancel()">{{ t().settings.refreshCancel }}</button>
      } @else {
        <button class="btn btn-primary" (click)="refresh.request()">
          {{ t().settings.refresh }}
        </button>
      }

      @if (refresh.error()) {
        <p class="banner banner-error">{{ t().settings.refreshError }}</p>
      }
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
      .slots {
        display: flex;
        gap: 12px;
      }
      .slot {
        flex: 1;
        min-width: 0;
        margin: 0;
      }
      .slot span {
        display: block;
        margin-bottom: 6px;
      }
      .pending {
        margin: 0 0 12px;
        color: var(--warn);
        font-size: 0.88rem;
      }
      .banner {
        margin-top: 12px;
      }
    `,
  ],
})
export class SettingsPage {
  readonly auth = inject(AuthService);
  readonly theme = inject(Theme);
  private readonly i18n = inject(I18n);
  private readonly profiles = inject(ProfileService);
  readonly refresh = inject(RefreshService);
  readonly t = this.i18n.t;

  readonly hours = Array.from(
    { length: MAX_DIGEST_HOUR - MIN_DIGEST_HOUR + 1 },
    (_, i) => MIN_DIGEST_HOUR + i,
  );

  private readonly slots = computed(() => this.profiles.profile()?.digestHours ?? [DEFAULT_DIGEST_HOUR]);

  readonly first = computed(() => this.slots()[0] ?? DEFAULT_DIGEST_HOUR);
  readonly second = computed(() => this.slots()[1] ?? null);

  /** "07:00" in both languages: en-GB keeps the 24h clock, as elsewhere. */
  label(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  pickFirst(event: Event): void {
    const hour = Number((event.target as HTMLSelectElement).value);
    const second = this.second();
    void this.profiles.setDigestHours(second === null ? [hour] : [hour, second]);
  }

  pickSecond(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    // Empty means "only one round a day", which is the common case.
    void this.profiles.setDigestHours(raw === '' ? [this.first()] : [this.first(), Number(raw)]);
  }
}
