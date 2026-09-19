import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { DigestService } from '../digest/digest.service';
import { TopicSections } from '../digest/topic-sections';
import { ViewToggle } from '../digest/view-toggle';
import type { Digest, Story } from '../core/models';

/**
 * `YYYY-MM-DD` here, which is what the pipeline wrote: the digest date is in
 * the reader's own zone, and the profile carries that same zone.
 */
function today(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date());
}

/** A stored `YYYY-MM-DD` back to a Date, without the timezone slipping a day. */
function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/**
 * Past digests: a list of days, one open at a time.
 *
 * Today is left out - it has its own screen - and the list is what the pipeline
 * kept, which is ninety days.
 */
@Component({
  selector: 'app-archive',
  imports: [TopicSections, ViewToggle],
  template: `
    <header class="head">
      <h1>{{ t().archive.title }}</h1>
      <!-- The same switch as on Today, on the same setting: a day opened here
           shows its stories exactly the way that one does. -->
      <app-view-toggle />
    </header>

    @if (!digests.ready()) {
      <div class="empty-state card"><p>{{ t().common.loading }}</p></div>
    } @else if (!past().length) {
      <div class="empty-state card">
        <h2>{{ t().archive.emptyTitle }}</h2>
        <p>{{ t().archive.emptyBody }}</p>
      </div>
    } @else {
      <div class="days">
        @for (digest of past(); track digest.id) {
          <div class="day">
            <button class="row" (click)="toggle(digest)" [attr.aria-expanded]="isOpen(digest)">
              <span class="label">{{ i18n.fullDate(dateOf(digest)) }}</span>
              <span class="chev" [class.open]="isOpen(digest)">›</span>
            </button>

            @if (isOpen(digest)) {
              @if (!storiesReady()) {
                <p class="loading">{{ t().common.loading }}</p>
              } @else if (!stories().length) {
                <p class="loading">{{ t().today.noStories }}</p>
              } @else {
                <div class="stories">
                  <app-topic-sections [stories]="stories()" />
                </div>
              }
            }
          </div>
        }
      </div>
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
        margin-bottom: 20px;
      }
      .days {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        min-height: 52px;
        padding: 12px 16px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        color: var(--text);
        text-align: left;
        font-size: 0.95rem;
        font-weight: 600;
      }
      .row:active {
        background: var(--surface-2);
      }
      .label {
        /* Dates read better sentence-cased than however the locale gives them. */
        text-transform: capitalize;
      }
      .chev {
        color: var(--text-dim);
        font-size: 1.3rem;
        line-height: 1;
        transition: transform 0.2s ease;
      }
      .chev.open {
        transform: rotate(90deg);
      }
      .stories {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 10px;
        padding-left: 10px;
        border-left: 2px solid var(--border-soft);
      }
      .loading {
        margin: 10px 0 0 12px;
        color: var(--text-soft);
        font-size: 0.88rem;
      }
    `,
  ],
})
export class ArchivePage implements OnDestroy {
  readonly i18n = inject(I18n);
  readonly t = this.i18n.t;
  readonly digests = inject(DigestService);

  readonly past = computed(() => this.digests.digests().filter((d) => d.digestDate !== today()));

  readonly openId = signal<string | null>(null);
  readonly stories = signal<Story[]>([]);
  readonly storiesReady = signal(false);

  private stop: (() => void) | null = null;

  constructor() {
    effect(() => {
      const id = this.openId();
      this.stop?.();
      this.stop = null;
      this.stories.set([]);
      this.storiesReady.set(false);
      if (!id) return;

      const digest = this.digests.digests().find((d) => d.id === id);
      if (!digest) return;
      this.stop = this.digests.subscribeStories(
        digest.userId,
        id,
        (stories) => {
          this.stories.set(stories);
          this.storiesReady.set(true);
        },
        () => this.storiesReady.set(true),
      );
    });
  }

  dateOf(digest: Digest): Date {
    return parseDate(digest.digestDate);
  }

  isOpen(digest: Digest): boolean {
    return this.openId() === digest.id;
  }

  toggle(digest: Digest): void {
    this.openId.set(this.isOpen(digest) ? null : digest.id);
  }

  ngOnDestroy(): void {
    this.stop?.();
  }
}
