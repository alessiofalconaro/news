import { Component, ElementRef, effect, inject, signal, viewChildren } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/auth.service';
import { ProfileService } from './core/profile.service';
import { Theme } from './core/theme.service';
import { Updates } from './core/updates.service';
import { I18n } from './i18n/i18n.service';
import { firebaseConfigured } from './core/firebase.config';
import { LangToggle } from './lang-toggle';
import { UntranslatedBanner } from './topics/untranslated-banner';
import { TopicFilterService } from './digest/topic-filter.service';
import { DigestService } from './digest/digest.service';
import { Mark } from './mark';
import { hideSplash } from './splash';

/**
 * Bottom navigation, in order. Line icons drawn on a 24px grid, stroked and
 * never filled, so they follow the text colour and stay crisp at any size: the
 * emoji they replace looked like a children's app and sat at different heights.
 * The newspaper page for Today, a filing box for the archive, a hash for topics,
 * two sliders for settings.
 */
const NAV = [
  {
    path: '/',
    exact: true,
    key: 'today',
    icon: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h10A1.5 1.5 0 0 1 17 5.5V18a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2zM17 9h1.5a1.5 1.5 0 0 1 1.5 1.5V18a2 2 0 0 1-2 2M7.5 8h6M7.5 11.5h6M7.5 15h3.5',
  },
  {
    path: '/archive',
    exact: false,
    key: 'archive',
    icon: 'M3.5 5.5a1.5 1.5 0 0 1 1.5-1.5h14a1.5 1.5 0 0 1 1.5 1.5V9h-17zM5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4',
  },
  {
    path: '/topics',
    exact: false,
    key: 'topics',
    icon: 'M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h15M4 15h15',
  },
  {
    path: '/settings',
    exact: false,
    key: 'settings',
    icon: 'M4 7h8.5M17.5 7H20M4 17h2.5M11.5 17H20M15 9.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM9 19.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z',
  },
] as const;

/** Theme icons, minimal lines: the moon in the light theme (go dark), the sun
 *  in the dark one (go light). */
const MOON = 'M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z';
const SUN =
  'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LangToggle, UntranslatedBanner, Mark],
  template: `
    @if (!configured) {
      <div class="screen">
        <h1>NewsDigest</h1>
        <p>
          Firebase non è ancora configurato: apri
          <code>app/src/app/core/firebase.config.ts</code> e incolla i valori del progetto. Le
          istruzioni passo per passo sono nel README.
        </p>
      </div>
    } @else if (!auth.ready() || auth.access() === 'checking') {
      <!-- Nothing: the splash in index.html (outside Angular) is still covering
           the screen while sign-in is checked, and goes when it is settled. -->
    } @else if (!auth.user()) {
      <div class="screen login">
        <h1 class="login-mark"><app-mark [large]="true" /></h1>
        <p>{{ t().auth.signInSubtitle }}</p>
        <button class="btn btn-primary" (click)="auth.signIn()">
          {{ t().auth.signInWithGoogle }}
        </button>
        @if (auth.error()) {
          <p class="banner banner-error">{{ auth.error() }}</p>
        }
        <app-lang-toggle class="login-lang" />
      </div>
    } @else if (auth.access() === 'denied') {
      <div class="screen login">
        <span class="denied" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M6 6l12 12" /></svg>
        </span>
        <h1>{{ t().auth.notAllowedTitle }}</h1>
        <p>{{ t().auth.notAllowedBody }}</p>
        <p class="muted small">{{ t().auth.signedInAs(auth.user()?.email ?? '') }}</p>
        <button class="btn" (click)="auth.signOut()">{{ t().auth.signOut }}</button>
      </div>
    } @else {
      <div class="layout">
        <header class="topbar">
          <app-lang-toggle />
          <!-- Logo + name: plays a short sequel of the splash on entering the
               app and again on every tap, which also goes back to Today. -->
          <button class="tb-title" (click)="goHome()" [attr.aria-label]="t().app.name">
            <app-mark />
          </button>
          <button class="icon-btn tb-theme" (click)="theme.toggle()" [attr.aria-label]="t().settings.theme">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="theme.light() ? moon : sun" /></svg>
          </button>
        </header>

        <aside class="sidebar">
          <button class="brand" (click)="goHome()" [attr.aria-label]="t().app.name">
            <app-mark />
          </button>
          <nav class="side-nav">
            @for (item of nav; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="on"
                [routerLinkActiveOptions]="{ exact: item.exact }"
              >
                <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
                {{ label(item.key) }}
              </a>
            }
          </nav>
          <div class="side-foot">
            <app-lang-toggle />
            <button class="btn btn-ghost" (click)="theme.toggle()">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="theme.light() ? moon : sun" /></svg>
              {{ theme.light() ? t().settings.themeDark : t().settings.themeLight }}
            </button>
            <button class="btn btn-ghost" (click)="auth.signOut()">{{ t().auth.signOut }}</button>
          </div>
        </aside>

        <main class="main">
          <!-- In the shell rather than on a page: it answers a question raised
               by the language toggle in the bar above, wherever the reader
               happens to be standing when they press it. -->
          <app-untranslated-banner />
          <router-outlet />
        </main>

        <!-- Bottom navigation: frosted pill with a sliding indicator you can also
             drag between entries. Ported from budget-tracker, minus the FAB:
             NewsDigest has no global create action. -->
        <div class="dock" [class.away]="keyboard()">
          <nav
            class="pill"
            (touchstart)="dragStart($event)"
            (touchmove)="dragMove($event)"
            (touchend)="dragEnd()"
            (touchcancel)="dragCancel()"
          >
            <span
              class="ind"
              [style.width.px]="indWidth()"
              [style.opacity]="indWidth() ? 1 : 0"
              [style.transform]="'translateX(' + indLeft() + 'px)'"
            ></span>
            @for (item of nav; track item.path; let i = $index) {
              <button #entry class="entry" [class.on]="highlighted() === i" (click)="click(i)">
                <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon" /></svg
                ><small>{{ label(item.key) }}</small>
              </button>
            }
          </nav>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .screen {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        padding: 24px;
        text-align: center;
      }
      .screen.muted,
      .screen .muted {
        color: var(--text-soft);
      }
      .screen p {
        margin: 0;
        max-width: 38ch;
        color: var(--text-soft);
        line-height: 1.5;
      }
      .screen .small {
        font-size: 0.82rem;
      }
      .screen code {
        color: var(--text);
        font-size: 0.85em;
      }
      .login-mark {
        margin-bottom: 6px;
        font-size: 1rem;
      }
      .denied {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        box-shadow: var(--glass-shadow);
        color: var(--danger);
      }
      .denied svg {
        width: 30px;
        height: 30px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.6;
        stroke-linecap: round;
      }
      .login .btn {
        width: 100%;
        max-width: 300px;
      }
      .login-lang {
        margin-top: 8px;
      }

      /* Simple scroll model: the document scrolls, the dock is fixed. See DESIGN.md A8. */
      .layout {
        display: flex;
        min-height: 100dvh;
        /* no background of its own: the halos behind the glass live on body */
      }

      .sidebar {
        display: none;
      }
      .topbar {
        display: grid;
        /* Equal side columns, so the title sits on the middle of the screen and
           not on the middle of what is left over. With the language toggle
           wider than the theme button, giving the title the flexible column
           pushed it visibly to the right. */
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 70;
        padding: calc(6px + var(--safe-top) + var(--topbar-clear, 0px)) 14px 6px;
        /* Opaque and unblurred. The frosted glass was a lighter colour than
           both the status bar above it and the page below, so it read as a
           band laid across the top of the screen rather than as part of it. */
        background: var(--topbar-bg);
      }
      /* No hard line under the bar: its colour fades into the page. The bar
         itself stays opaque (see above); only this tail fades. */
      .topbar::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        height: 16px;
        background: linear-gradient(
          var(--topbar-bg),
          color-mix(in srgb, var(--topbar-bg) 55%, transparent) 40%,
          transparent
        );
        pointer-events: none;
      }
      .tb-title {
        min-width: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: 0;
        color: var(--text);
        padding: 4px 2px;
        min-height: 44px;
      }
      .tb-theme {
        justify-self: end;
      }

      .main {
        flex: 1;
        min-width: 0;
        overflow-x: hidden;
        /* the bar (56px) plus its fade (16px): at rest the page starts below
           the fade, and only passes under it when scrolled */
        padding: calc(74px + var(--safe-top) + var(--topbar-clear, 0px)) var(--page-pad)
          calc(96px + var(--safe-bottom));
      }

      .dock {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 40;
        transition: transform 0.28s ease;
      }
      /* Keyboard open: the dock slides off screen and comes back on close. */
      .dock.away {
        transform: translateY(160%);
        pointer-events: none;
      }
      .pill {
        position: relative;
        display: flex;
        align-items: stretch;
        width: 100%;
        padding: 8px 10px calc(8px + var(--safe-bottom));
        border-radius: 26px 26px 0 0;
        background: color-mix(in srgb, var(--surface) 70%, transparent);
        backdrop-filter: var(--blur);
        -webkit-backdrop-filter: var(--blur);
        border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
        box-shadow:
          inset 0 1px 0 color-mix(in srgb, #fff 10%, transparent),
          0 -10px 30px -6px rgba(0, 0, 0, 0.35);
        touch-action: none;
      }
      .ind {
        position: absolute;
        left: 0;
        top: 8px;
        bottom: calc(8px + var(--safe-bottom));
        border-radius: 18px;
        background: linear-gradient(
          180deg,
          color-mix(in srgb, var(--brand) 26%, transparent),
          color-mix(in srgb, var(--brand) 13%, transparent)
        );
        box-shadow:
          inset 0 0 0 1px color-mix(in srgb, var(--brand) 34%, transparent),
          inset 0 1px 0 color-mix(in srgb, #fff 22%, transparent),
          0 6px 18px -4px color-mix(in srgb, var(--brand) 30%, transparent);
        /* transform only: composited, so the blur underneath is not repainted. */
        transition: transform 0.3s cubic-bezier(0.34, 1.15, 0.5, 1);
        will-change: transform;
        pointer-events: none;
        z-index: 0;
      }
      .entry {
        position: relative;
        z-index: 1;
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        padding: 9px 0;
        min-height: 44px;
        background: none;
        border: 0;
        color: var(--text-dim);
        transition: color 0.2s ease;
      }
      .entry .ic {
        width: 23px;
        height: 23px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.6;
        stroke-linecap: round;
        stroke-linejoin: round;
        transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.5, 1);
      }
      .entry.on .ic {
        color: var(--brand);
        stroke-width: 1.8;
        transform: translateY(-1px) scale(1.06);
      }
      .entry small {
        font-size: 0.62rem;
        font-weight: 700;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .entry.on {
        color: var(--text);
      }

      @media (min-width: 900px) {
        .topbar,
        .dock {
          display: none;
        }
        .sidebar {
          display: flex;
          width: 240px;
          flex: none;
          flex-direction: column;
          gap: 8px;
          border-right: 1px solid var(--glass-border);
          background: var(--glass-bg);
          padding: 20px 16px;
          position: sticky;
          top: 0;
          height: 100dvh;
        }
        .brand {
          align-self: flex-start;
          background: none;
          border: 0;
          margin-bottom: 18px;
          padding: 4px 8px;
          font-size: 1.12rem;
          color: var(--text);
        }
        .side-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .side-nav a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 12px;
          border-radius: var(--radius-pill);
          border: 1px solid transparent;
          color: var(--text-soft);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .side-nav a .ic {
          width: 20px;
          height: 20px;
          flex: none;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .side-nav a:hover {
          background: var(--surface-2);
          color: var(--text);
        }
        .side-nav a.on {
          background: var(--glass-bg);
          border-color: var(--glass-border);
          box-shadow: var(--glass-shadow);
          color: var(--text);
        }
        .side-nav a.on .ic {
          color: var(--brand);
        }
        .side-foot {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }
        .side-foot .btn {
          width: 100%;
          justify-content: flex-start;
        }
        .main {
          padding: 28px var(--page-pad) 56px;
        }
      }
    `,
  ],
})
export class App {
  readonly auth = inject(AuthService);
  readonly theme = inject(Theme);
  private readonly filter = inject(TopicFilterService);
  private readonly i18n = inject(I18n);
  private readonly router = inject(Router);
  private readonly updates = inject(Updates);
  // Instantiated so the profile starts syncing as soon as access is granted.
  private readonly profile = inject(ProfileService);

  readonly configured = firebaseConfigured;
  readonly nav = NAV;
  readonly moon = MOON;
  readonly sun = SUN;
  private readonly digests = inject(DigestService);
  readonly t = this.i18n.t;

  readonly active = signal(0);
  readonly preview = signal<number | null>(null);
  readonly indLeft = signal(0);
  readonly indWidth = signal(0);
  readonly keyboard = signal(false);

  private readonly entries = viewChildren<ElementRef<HTMLElement>>('entry');
  private dragging = false;
  private touched = false;
  private startX = 0;
  private startY = 0;
  private cancelled = false;

  constructor() {
    this.updates.start();

    // The splash stays until there is something to show: sign-in settled and,
    // for someone let in, the list of digests arrived - so Today opens full
    // rather than saying "loading" for a moment. The digests get a few seconds
    // at most; sign-in gets as long as it takes, because until it answers the
    // splash is the only thing there is to show.
    const patience = signal(false);
    setTimeout(() => patience.set(true), 8000);
    effect(() => {
      if (!this.configured) return hideSplash();
      if (!this.auth.ready() || this.auth.access() === 'checking') return;
      if (this.auth.user() && this.auth.access() === 'allowed') {
        if (!this.digests.ready() && !this.digests.error() && !patience()) return;
      }
      hideSplash();
    });

    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      window.scrollTo({ top: 0 });
      this.syncActive();
    });

    // Reposition the indicator when the dock first appears (after sign-in the
    // entries do not exist yet) and on every change of the active entry.
    effect(() => {
      const entries = this.entries();
      const index = this.active();
      // Labels change with the language, so widths change too.
      this.i18n.lang();
      if (entries.length && !this.dragging) requestAnimationFrame(() => this.placeIndicator(index));
    });

    window.addEventListener('resize', () => this.placeIndicator());

    // The dock slides away for the keyboard, and a shrunken viewport used to be
    // the whole test. That is not enough: coming back from another app, iOS
    // reports a short viewport for a moment, so the dock hid itself and stayed
    // hidden until something moved. A keyboard is only open if something is
    // being typed into, so the focused element has to agree.
    const keyboardOpen = (): boolean => {
      const viewport = window.visualViewport;
      if (!viewport) return false;
      const shrunk = viewport.height < window.innerHeight - 120;
      return shrunk && isEditable(document.activeElement);
    };
    const recheck = () => {
      this.keyboard.set(keyboardOpen());
      requestAnimationFrame(() => this.placeIndicator());
    };

    window.visualViewport?.addEventListener('resize', recheck);
    // Focus moving in or out of a field is the other half of the same question.
    document.addEventListener('focusin', recheck);
    document.addEventListener('focusout', recheck);
    // And coming back to the app settles whatever the last resize left behind.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') recheck();
    });
    window.addEventListener('pageshow', recheck);
  }

  label(key: (typeof NAV)[number]['key']): string {
    return this.t().nav[key];
  }

  /** The entry under the finger while dragging, the active one otherwise. */
  highlighted(): number {
    return this.preview() ?? this.active();
  }

  goHome(): void {
    this.go(0);
  }

  private syncActive(): void {
    const url = this.router.url.split('?')[0];
    const index = NAV.findIndex((item) =>
      item.exact ? url === item.path : url.startsWith(item.path),
    );
    this.active.set(index);
  }

  /** Measures the real DOM so the indicator fits whatever the labels turned out to be. */
  private placeIndicator(index = this.highlighted()): void {
    if (index < 0) {
      this.indWidth.set(0);
      return;
    }
    const element = this.entries()[index]?.nativeElement;
    if (!element || !element.offsetParent) return;
    this.indLeft.set(element.offsetLeft + 3);
    this.indWidth.set(element.offsetWidth - 6);
  }

  private indexUnderX(x: number): number {
    let best = 0;
    let closest = Infinity;
    this.entries().forEach((ref, i) => {
      const box = ref.nativeElement.getBoundingClientRect();
      const distance = Math.abs(x - (box.left + box.width / 2));
      if (distance < closest) {
        closest = distance;
        best = i;
      }
    });
    return best;
  }

  dragStart(event: TouchEvent): void {
    this.dragging = true;
    this.cancelled = false;
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
    const index = this.indexUnderX(this.startX);
    this.preview.set(index);
    this.placeIndicator(index);
  }

  dragMove(event: TouchEvent): void {
    if (!this.dragging) return;
    const touch = event.touches[0];
    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;
    // Mostly vertical gesture (swipe up to leave the app, or a scroll): not a
    // section change, so put the indicator back where it was.
    if (this.cancelled || (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 14)) {
      this.cancelled = true;
      if (this.preview() !== this.active()) {
        this.preview.set(this.active());
        this.placeIndicator();
      }
      return;
    }
    event.preventDefault();
    const index = this.indexUnderX(touch.clientX);
    if (index !== this.preview()) {
      this.preview.set(index);
      this.placeIndicator(index);
    }
  }

  dragEnd(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.suppressSyntheticClick();
    if (this.cancelled) {
      this.cancelled = false;
      this.preview.set(null);
      this.placeIndicator();
      return;
    }
    this.go(this.preview() ?? this.active());
  }

  /** The system took the touch over (iOS swipe-up): no navigation. */
  dragCancel(): void {
    this.dragging = false;
    this.cancelled = false;
    this.suppressSyntheticClick();
    this.preview.set(null);
    this.placeIndicator();
  }

  /** Mouse click: a touch has already navigated, so ignore the synthetic one. */
  click(index: number): void {
    if (this.touched) return;
    this.go(index);
  }

  private suppressSyntheticClick(): void {
    this.touched = true;
    setTimeout(() => (this.touched = false), 500);
  }

  private go(index: number): void {
    this.preview.set(null);
    const changing = this.active() !== index;
    this.active.set(index); // optimistic: the indicator stays under the finger
    queueMicrotask(() => this.placeIndicator(index));

    if (changing) {
      void this.router.navigate([NAV[index].path]);
      return;
    }

    // Pressing the section you are already in means "take me back to the top
    // of it". On Today that includes the chips: a filter is a narrowing of the
    // page, and asking for the page again asks for all of it. Coming back from
    // another section is not that - it is just arriving - so the filter you
    // left set is still there when you return, which is what you meant by
    // setting it.
    if (index === 0) this.filter.clear();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/** Whether something is being typed into: the only reason a keyboard is up. */
function isEditable(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}
