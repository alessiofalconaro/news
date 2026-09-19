import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { DigestService } from '../digest/digest.service';
import { TopicSections } from '../digest/topic-sections';
import { ViewModeService } from '../digest/view-mode.service';
import type { Story } from '../core/models';

/**
 * `YYYY-MM-DD` here, which is what the pipeline wrote: the digest date is in
 * the reader's own zone, and the profile carries that same zone.
 */
function today(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date());
}

/**
 * Today's digest.
 *
 * Three states worth distinguishing, and they mean different things to the
 * reader: the digest has not been produced yet (it is early, come back), it was
 * produced but some topics failed (here is what there is, and what is missing),
 * or it was produced and genuinely had nothing worth reporting.
 */
@Component({
  selector: 'app-today',
  imports: [TopicSections],
  template: `
    <header class="head">
      <div>
        <h1>{{ t().today.title }}</h1>
        <p class="date">{{ i18n.fullDate(now) }}</p>
      </div>

      <!-- The layout switch lives here rather than in settings: it is something
           you change while reading, looking at the result, not something you go
           and configure beforehand. -->
      <!-- Drawn rather than typed. As characters these two sat at different
           heights inside the button, because a glyph's position in its own em
           box is the font's business and no amount of centring reaches it.
           Each icon shows the layout you would get, not the one you are in.
           Neither may be three plain bars: that is a menu button everywhere
           else on a phone, and this one opens nothing. -->
      <button class="view-toggle" (click)="viewMode.toggle()" [attr.aria-label]="layoutLabel()">
        @if (viewMode.mode() === 'list') {
          <!-- One card at a time, with the next ones waiting at the sides. -->
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <rect x="6.5" y="4" width="7" height="12" rx="1.5" />
            <path d="M3.5 7.5v5M16.5 7.5v5" />
          </svg>
        } @else {
          <!-- Rows, each with its picture: the list as it actually looks. -->
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 6h9M3 14h9" />
            <rect x="14" y="4" width="3.5" height="3.5" rx="1" />
            <rect x="14" y="12.5" width="3.5" height="3.5" rx="1" />
          </svg>
        }
      </button>
    </header>

    @if (digests.error() || storiesError()) {
      <div class="empty-state card">
        <h2>{{ t().today.errorTitle }}</h2>
        <p class="code">{{ digests.error() ?? storiesError() }}</p>
      </div>
    } @else if (!digests.ready()) {
      <div class="empty-state card"><p>{{ t().common.loading }}</p></div>
    } @else if (!digest()) {
      <div class="empty-state card">
        <h2>{{ t().today.notReadyTitle }}</h2>
        <p>{{ t().today.notReadyBody }}</p>
      </div>
    } @else {
      @if (digest()!.status === 'partial' && digest()!.failedTopics.length) {
        <p class="banner banner-warn">
          {{ t().today.partial(digest()!.failedTopics.join(', ')) }}
        </p>
      }

      @if (!storiesReady()) {
        <div class="empty-state card"><p>{{ t().common.loading }}</p></div>
      } @else if (!stories().length) {
        <div class="empty-state card">
          <h2>{{ t().today.noStories }}</h2>
          <p>{{ t().today.notReadyBody }}</p>
        </div>
      } @else {
        <app-topic-sections [stories]="stories()" />
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 720px;
        margin: 0 auto;
      }
      .head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .view-toggle {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text-soft);
      }
      .view-toggle svg {
        width: 20px;
        height: 20px;
        /* The box is the icon: stroked, never filled, so it stays crisp and
           follows the button colour. */
        fill: none;
        stroke: currentColor;
        stroke-width: 1.6;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .view-toggle:active {
        background: var(--surface-2);
      }
      .date {
        margin: 4px 0 20px;
        color: var(--text-soft);
        font-size: 0.88rem;
      }
      .banner {
        margin-bottom: 16px;
      }
      .code {
        font-family: ui-monospace, monospace;
        font-size: 0.8rem;
        color: var(--text-dim);
      }
    `,
  ],
})
export class TodayPage implements OnDestroy {
  readonly i18n = inject(I18n);
  readonly t = this.i18n.t;
  readonly digests = inject(DigestService);
  readonly viewMode = inject(ViewModeService);

  readonly now = new Date();

  readonly layoutLabel = computed(() =>
    this.viewMode.mode() === 'list' ? this.t().today.layoutToCards : this.t().today.layoutToList,
  );
  readonly digest = computed(() => this.digests.forDate(today()));

  readonly stories = signal<Story[]>([]);
  readonly storiesReady = signal(false);
  readonly storiesError = signal<string | null>(null);

  private stop: (() => void) | null = null;

  constructor() {
    // Re-subscribes when today's digest first appears, so a page left open
    // while the pipeline runs fills in by itself.
    effect(() => {
      const digest = this.digest();
      this.stop?.();
      this.stop = null;

      this.storiesError.set(null);
      if (!digest) {
        this.stories.set([]);
        this.storiesReady.set(false);
        return;
      }

      this.stop = this.digests.subscribeStories(
        digest.userId,
        digest.id,
        (stories) => {
          this.stories.set(stories);
          this.storiesReady.set(true);
        },
        (code) => {
          this.storiesError.set(code);
          this.storiesReady.set(true);
        },
      );
    });
  }

  ngOnDestroy(): void {
    this.stop?.();
  }
}
