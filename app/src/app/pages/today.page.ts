import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../i18n/i18n.service';
import { DigestService } from '../digest/digest.service';
import { RefreshService } from '../digest/refresh.service';
import { ProfileService } from '../core/profile.service';
import { TopicsService } from '../topics/topics.service';
import { TopicSections } from '../digest/topic-sections';
import { ViewToggle } from '../digest/view-toggle';
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
  imports: [TopicSections, ViewToggle, RouterLink],
  template: `
    <header class="head">
      <div>
        <h1>{{ t().today.title }}</h1>
        <p class="date">{{ i18n.fullDate(now) }}</p>
      </div>

      <!-- The layout switch lives here rather than in settings: it is something
           you change while reading, looking at the result, not something you go
           and configure beforehand. -->
      <app-view-toggle />
    </header>

    @if (digests.error() || storiesError()) {
      <div class="empty-state card">
        <h2>{{ t().today.errorTitle }}</h2>
        <p class="code">{{ digests.error() ?? storiesError() }}</p>
      </div>
    } @else if (!digests.ready()) {
      <div class="empty-state card"><p>{{ t().common.loading }}</p></div>
    } @else if (!digest()) {
      <!-- Three different situations that all look like "no news". Somebody
           just let in would otherwise meet an empty screen with no way of
           telling a new account from a broken one. -->
      @if (!topics.topics().length) {
        <div class="empty-state card">
          <h2>{{ t().today.noTopicsTitle }}</h2>
          <p>{{ t().today.noTopicsBody }}</p>
          <a class="btn btn-primary" routerLink="/topics">{{ t().topics.createFirst }}</a>
        </div>
      } @else if (refresh.pending()) {
        <div class="empty-state card">
          <h2>{{ t().today.comingTitle }}</h2>
          <p>{{ t().today.comingBody }}</p>
        </div>
      } @else {
        <div class="empty-state card">
          <h2>{{ t().today.notReadyTitle }}</h2>
          <p>{{ t().today.notReadyBody(hoursLabel()) }}</p>
        </div>
      }
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
          <p>{{ t().today.notReadyBody(hoursLabel()) }}</p>
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
  readonly refresh = inject(RefreshService);
  readonly topics = inject(TopicsService);
  private readonly profile = inject(ProfileService);

  readonly now = new Date();

  /** The reader's own rounds, written out: "10:00 e 19:00". */
  readonly hoursLabel = computed(() => {
    const hours = this.profile.profile()?.digestHours ?? [];
    const times = hours.map((h) => `${String(h).padStart(2, '0')}:00`);
    return times.length ? times.join(this.i18n.lang() === 'en' ? ' and ' : ' e ') : '';
  });

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
