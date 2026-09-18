import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { DigestService } from '../digest/digest.service';
import { StoryCard } from '../digest/story-card';
import type { Story } from '../core/models';

/** `YYYY-MM-DD` in Rome, the shape the pipeline writes as `digestDate`. */
function romeToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
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
  imports: [StoryCard],
  template: `
    <h1>{{ t().today.title }}</h1>
    <p class="date">{{ i18n.fullDate(now) }}</p>

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
        <div class="stories">
          @for (story of stories(); track story.id) {
            <app-story-card [story]="story" />
          }
        </div>
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
      .stories {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
    `,
  ],
})
export class TodayPage implements OnDestroy {
  readonly i18n = inject(I18n);
  readonly t = this.i18n.t;
  readonly digests = inject(DigestService);

  readonly now = new Date();
  readonly digest = computed(() => this.digests.forDate(romeToday()));

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
