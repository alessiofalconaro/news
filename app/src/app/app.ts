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

/** Bottom navigation, in order. Icons are plain emoji, as in both reference apps. */
const NAV = [
  { path: '/', exact: true, icon: '📰', key: 'today' },
  { path: '/archive', exact: false, icon: '🗂️', key: 'archive' },
  { path: '/topics', exact: false, icon: '🏷️', key: 'topics' },
  { path: '/settings', exact: false, icon: '⚙️', key: 'settings' },
] as const;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LangToggle],
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
      <!-- The same mark the page was already showing before Angular took over,
           so the handover is invisible. It used to read "Avvio" and then
           "Controllo dell'accesso": a program narrating its own steps, and two
           of them, which made a short wait feel like a long one. -->
      <div class="boot">
        <img src="icons/icon-192.png" alt="" width="76" height="76" />
        <span>{{ t().app.name }}</span>
      </div>
    } @else if (!auth.user()) {
      <div class="screen login">
        <div class="mark">📰</div>
        <h1>{{ t().app.name }}</h1>
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
        <div class="mark">🚫</div>
        <h1>{{ t().auth.notAllowedTitle }}</h1>
        <p>{{ t().auth.notAllowedBody }}</p>
        <p class="muted small">{{ t().auth.signedInAs(auth.user()?.email ?? '') }}</p>
        <button class="btn" (click)="auth.signOut()">{{ t().auth.signOut }}</button>
      </div>
    } @else {
      <div class="layout">
        <header class="topbar">
          <app-lang-toggle />
          <button class="tb-title" (click)="goHome()">{{ t().app.name }}</button>
          <button class="tb-theme" (click)="theme.toggle()" [attr.aria-label]="t().settings.theme">
            {{ theme.light() ? '🌙' : '☀️' }}
          </button>
        </header>

        <aside class="sidebar">
          <div class="brand">
            📰 <span>{{ t().app.name }}</span>
          </div>
          <nav class="side-nav">
            @for (item of nav; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="on"
                [routerLinkActiveOptions]="{ exact: item.exact }"
              >
                <span class="ic">{{ item.icon }}</span> {{ label(item.key) }}
              </a>
            }
          </nav>
          <div class="side-foot">
            <app-lang-toggle />
            <button class="btn btn-ghost" (click)="theme.toggle()">
              {{ theme.light() ? '🌙 ' + t().settings.themeDark : '☀️ ' + t().settings.themeLight }}
            </button>
            <button class="btn btn-ghost" (click)="auth.signOut()">{{ t().auth.signOut }}</button>
          </div>
        </aside>

        <main class="main">
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
                <span class="ic">{{ item.icon }}</span
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
      .login .mark {
        font-size: 2.6rem;
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
        background: var(--bg);
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
        border-bottom: 1px solid var(--border-soft);
      }
      .tb-title {
        min-width: 0;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.05rem;
        text-align: center;
        background: none;
        border: 0;
        color: var(--text);
        padding: 4px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tb-theme {
        justify-self: end;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: transparent;
        border: 0;
        color: var(--text-soft);
        font-size: 1.2rem;
      }
      .tb-theme:active {
        background: var(--surface-2);
      }

      .main {
        flex: 1;
        min-width: 0;
        overflow-x: hidden;
        padding: calc(66px + var(--safe-top) + var(--topbar-clear, 0px)) var(--page-pad)
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
        background: color-mix(in srgb, var(--surface) 72%, transparent);
        backdrop-filter: blur(26px) saturate(1.8);
        -webkit-backdrop-filter: blur(26px) saturate(1.8);
        border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
        box-shadow: 0 -6px 26px rgba(0, 0, 0, 0.35);
        touch-action: none;
      }
      .ind {
        position: absolute;
        left: 0;
        top: 8px;
        bottom: calc(8px + var(--safe-bottom));
        border-radius: 18px;
        background: color-mix(in srgb, var(--brand) 24%, transparent);
        box-shadow:
          inset 0 0 0 1px color-mix(in srgb, var(--brand) 38%, transparent),
          0 4px 16px color-mix(in srgb, var(--brand) 26%, transparent);
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
        font-size: 1.2rem;
        transition: color 0.2s ease;
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
          border-right: 1px solid var(--border);
          padding: 20px 16px;
          position: sticky;
          top: 0;
          height: 100dvh;
        }
        .brand {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 16px;
          padding: 0 8px;
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
          border-radius: 12px;
          color: var(--text-soft);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .side-nav a .ic {
          font-size: 1.1rem;
        }
        .side-nav a:hover {
          background: var(--surface-2);
          color: var(--text);
        }
        .side-nav a.on {
          background: var(--surface-2);
          color: var(--text);
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
  private readonly i18n = inject(I18n);
  private readonly router = inject(Router);
  private readonly updates = inject(Updates);
  // Instantiated so the profile starts syncing as soon as access is granted.
  private readonly profile = inject(ProfileService);

  readonly configured = firebaseConfigured;
  readonly nav = NAV;
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
    if (changing) void this.router.navigate([NAV[index].path]);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/** Whether something is being typed into: the only reason a keyboard is up. */
function isEditable(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}
