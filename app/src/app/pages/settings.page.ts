import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { AuthService } from '../core/auth.service';
import { Theme } from '../core/theme.service';
import { ProfileService } from '../core/profile.service';
import { RefreshService } from '../digest/refresh.service';
import { PushService } from '../core/push.service';
import { nextRound, nextWakeUp, wouldReplace } from '../digest/schedule';
import { DEFAULT_DIGEST_HOUR, MAX_DIGEST_HOUR, MIN_DIGEST_HOUR } from '../core/models';
import { LangToggle } from '../lang-toggle';
import { Notice } from '../notice';

@Component({
  selector: 'app-settings',
  imports: [LangToggle, Notice],
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
        @if (theme.light()) {
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></svg>
          {{ t().settings.themeLight }}
        } @else {
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" /></svg>
          {{ t().settings.themeDark }}
        }
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
          <select (change)="pick(0, $event)">
            @for (h of hours; track h) {
              <option [value]="h" [selected]="h === first()">{{ label(h) }}</option>
            }
          </select>
        </label>

        <label class="slot">
          <span>{{ t().settings.digestSecond }}</span>
          <select (change)="pick(1, $event)">
            <option value="" [selected]="second() === null">{{ t().settings.digestNone }}</option>
            @for (h of hours; track h) {
              <option [value]="h" [selected]="h === second()">{{ label(h) }}</option>
            }
          </select>
        </label>

        <label class="slot">
          <span>{{ t().settings.digestThird }}</span>
          <select (change)="pick(2, $event)">
            <option value="" [selected]="third() === null">{{ t().settings.digestNone }}</option>
            @for (h of hours; track h) {
              <option [value]="h" [selected]="h === third()">{{ label(h) }}</option>
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
        <p class="pending">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" /></svg>
          {{ t().settings.refreshPending }}
        </p>
        <button class="btn" (click)="refresh.cancel()">{{ t().settings.refreshCancel }}</button>
      } @else {
        <button class="btn btn-primary" (click)="refresh.request()">
          {{ t().settings.refresh }}
        </button>
      }

      @if (refresh.error()) {
        <app-notice class="notice" tone="error" [text]="t().settings.refreshError" />
      }
    </section>

    <section class="card">
      <h2>{{ t().settings.notifications }}</h2>
      <p class="muted">{{ t().settings.notificationsHint }}</p>

      @switch (push.state()) {
        @case ('on') {
          <p class="on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            {{ t().settings.notificationsOn }}
          </p>
          <div class="buttons">
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
        <app-notice class="notice" tone="error" [text]="push.error() ?? ''" />
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
      .notice {
        margin-top: 12px;
      }
      .pending svg,
      .on svg {
        width: 16px;
        height: 16px;
        flex: none;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .pending,
      .on {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pending svg {
        animation: spin 1.6s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class SettingsPage implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly theme = inject(Theme);
  readonly i18n = inject(I18n);
  private readonly profiles = inject(ProfileService);
  readonly refresh = inject(RefreshService);
  readonly push = inject(PushService);
  readonly t = this.i18n.t;

  readonly hours = Array.from(
    { length: MAX_DIGEST_HOUR - MIN_DIGEST_HOUR + 1 },
    (_, i) => MIN_DIGEST_HOUR + i,
  );

  private readonly slots = computed(() => this.profiles.profile()?.digestHours ?? [DEFAULT_DIGEST_HOUR]);

  readonly first = computed(() => this.slots()[0] ?? DEFAULT_DIGEST_HOUR);
  readonly second = computed(() => this.slots()[1] ?? null);
  readonly third = computed(() => this.slots()[2] ?? null);

  /**
   * Re-read every half minute, so the sentence below the button stays true as
   * the clock moves towards a scheduled round while the page sits open.
   */
  private readonly now = signal(new Date());
  private readonly clock = setInterval(() => this.now.set(new Date()), 30_000);

  readonly effect = computed(() => {
    const rounds = this.slots();
    const at = this.now();
    const t = this.t().settings;

    const replaced = wouldReplace(rounds, at);
    const next = nextRound(rounds, at);
    const what =
      replaced !== null
        ? t.refreshReplaces(this.label(replaced))
        : next === null
          ? t.refreshExtraOnly
          : t.refreshExtraWithNext(this.label(next));

    // The wake-ups run around the clock now, so this is always minutes away;
    // saying which minute is still better than leaving it to be discovered.
    return what + t.refreshWhen(this.i18n.time(nextWakeUp(at)));
  });

  ngOnDestroy(): void {
    clearInterval(this.clock);
  }

  /** "07:00" in both languages: en-GB keeps the 24h clock, as elsewhere. */
  label(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  /**
   * One picker for all three boxes.
   *
   * Empty means "not this one", and the empties are dropped rather than kept
   * as holes: turning the second round off while a third is set moves the
   * third up into its place, which is what the list then shows. The first box
   * has no empty option - a schedule with no rounds at all is not a setting,
   * it is the app switched off.
   */
  pick(index: number, event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const chosen: (number | null)[] = [this.first(), this.second(), this.third()];
    chosen[index] = raw === '' ? null : Number(raw);
    void this.profiles.setDigestHours(chosen.filter((h): h is number => h !== null));
  }
}
