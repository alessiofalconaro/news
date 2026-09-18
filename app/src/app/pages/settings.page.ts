import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { AuthService } from '../core/auth.service';
import { Theme } from '../core/theme.service';
import { ProfileService } from '../core/profile.service';
import { RefreshService } from '../digest/refresh.service';
import { PushService } from '../core/push.service';
import { ViewModeService } from '../digest/view-mode.service';
import { nextRound, wouldReplace } from '../digest/schedule';
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
      <h2>{{ t().settings.layout }}</h2>
      <p class="muted">{{ t().settings.layoutHint }}</p>

      <div class="choices">
        <button
          class="choice"
          [class.on]="viewMode.mode() === 'list'"
          (click)="viewMode.set('list')"
        >
          <strong>{{ t().settings.layoutList }}</strong>
          <small>{{ t().settings.layoutListHint }}</small>
        </button>
        <button
          class="choice"
          [class.on]="viewMode.mode() === 'cards'"
          (click)="viewMode.set('cards')"
        >
          <strong>{{ t().settings.layoutCards }}</strong>
          <small>{{ t().settings.layoutCardsHint }}</small>
        </button>
      </div>
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

      <!-- Said before the button is pressed, not discovered afterwards: whether
           this replaces the round that was coming or adds one to it. -->
      <p class="effect">{{ effect() }}</p>

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
      <p class="muted">{{ t().settings.notificationsHint }}</p>

      @switch (push.state()) {
        @case ('on') {
          <p class="on">✓ {{ t().settings.notificationsOn }}</p>
          <div class="buttons">
            <button class="btn" [disabled]="push.busy()" (click)="testNotification()">
              {{ t().settings.notificationsTest }}
            </button>
            <button class="btn btn-ghost" [disabled]="push.busy()" (click)="push.disable()">
              {{ t().settings.notificationsDisable }}
            </button>
          </div>
        }
        @case ('off') {
          <button class="btn btn-primary" [disabled]="push.busy()" (click)="push.enable()">
            {{ t().settings.notificationsEnable }}
          </button>
        }
        @case ('denied') {
          <p class="muted">{{ t().settings.notificationsDenied }}</p>
        }
        @case ('unsupported') {
          <p class="muted">{{ t().settings.notificationsUnsupported }}</p>
        }
        @case ('notConfigured') {
          <p class="muted">{{ t().settings.notificationsNotConfigured }}</p>
        }
      }

      @if (push.error()) {
        <p class="banner banner-error">{{ push.error() }}</p>
      }
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
      .choices {
        display: flex;
        gap: 10px;
      }
      .choice {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface-2);
        color: var(--text);
        text-align: left;
      }
      .choice.on {
        border-color: var(--brand);
        background: color-mix(in srgb, var(--brand) 12%, var(--surface-2));
      }
      .choice strong {
        font-size: 0.9rem;
      }
      .choice small {
        color: var(--text-soft);
        font-size: 0.76rem;
        line-height: 1.35;
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
      .effect {
        margin: 0 0 12px;
        color: var(--text-soft);
        font-size: 0.86rem;
        line-height: 1.45;
      }
      .on {
        margin: 0 0 12px;
        color: var(--success);
        font-size: 0.88rem;
        font-weight: 600;
      }
      .buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
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
export class SettingsPage implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly theme = inject(Theme);
  private readonly i18n = inject(I18n);
  private readonly profiles = inject(ProfileService);
  readonly refresh = inject(RefreshService);
  readonly push = inject(PushService);
  readonly viewMode = inject(ViewModeService);
  readonly t = this.i18n.t;

  readonly hours = Array.from(
    { length: MAX_DIGEST_HOUR - MIN_DIGEST_HOUR + 1 },
    (_, i) => MIN_DIGEST_HOUR + i,
  );

  private readonly slots = computed(() => this.profiles.profile()?.digestHours ?? [DEFAULT_DIGEST_HOUR]);

  readonly first = computed(() => this.slots()[0] ?? DEFAULT_DIGEST_HOUR);
  readonly second = computed(() => this.slots()[1] ?? null);

  /**
   * Re-read every half minute, so the sentence below the button stays true as
   * the clock moves towards a scheduled round while the page sits open.
   */
  private readonly now = signal(new Date());
  private readonly clock = setInterval(() => this.now.set(new Date()), 30_000);

  readonly effect = computed(() => {
    const rounds = this.slots();
    const at = this.now();
    const replaced = wouldReplace(rounds, at);
    if (replaced !== null) return this.t().settings.refreshReplaces(this.label(replaced));
    const next = nextRound(rounds, at);
    return next === null
      ? this.t().settings.refreshExtraOnly
      : this.t().settings.refreshExtraWithNext(this.label(next));
  });

  testNotification(): void {
    void this.push.showTest(
      this.t().settings.notificationsTestTitle,
      this.t().settings.notificationsTestBody,
    );
  }

  ngOnDestroy(): void {
    clearInterval(this.clock);
  }

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
