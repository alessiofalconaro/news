import { Component, computed, inject, input, signal } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import type { Story } from '../core/models';

/**
 * One story.
 *
 * The picture is optional by design - it illustrates the subject rather than
 * the event, and for plenty of stories there is none - so the layout is built
 * around its absence and merely accommodates its presence. A card that only
 * looks right with an image would look broken most mornings.
 */
@Component({
  selector: 'app-story-card',
  template: `
    <article class="card">
      @if (story().imageUrl && !imageFailed()) {
        <div class="shot">
          <img
            [src]="story().imageUrl"
            [alt]="headline()"
            loading="lazy"
            decoding="async"
            (error)="imageFailed.set(true)"
          />
        </div>
      }

      <div class="body">
        <div class="meta">
          <span class="topic">{{ story().topicName }}</span>
          <span class="dot-sep">·</span>
          <span>{{ t().today.sources(story().sourceCount) }}</span>
        </div>

        <h2>{{ headline() }}</h2>
        <p class="summary">{{ summary() }}</p>

        <div class="foot">
          <a class="btn btn-primary read" [href]="story().primaryUrl" target="_blank" rel="noopener">
            {{ t().today.readArticle }}
          </a>
          <span class="when">{{ i18n.time(published()) }}</span>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .card {
        padding: 0;
        overflow: hidden;
      }
      /* Fixed ratio: pictures come from Wikipedia at every shape imaginable and
         a row of cards that each set their own height reads as a broken grid. */
      .shot {
        aspect-ratio: 16 / 9;
        background: var(--surface-2);
      }
      .shot img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .body {
        padding: 16px;
      }
      .meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.76rem;
        color: var(--text-dim);
        margin-bottom: 8px;
      }
      .topic {
        color: var(--brand);
        font-weight: 700;
      }
      h2 {
        font-family: var(--font-display);
        font-size: 1.16rem;
        line-height: 1.3;
        letter-spacing: -0.01em;
        margin-bottom: 8px;
      }
      .summary {
        margin: 0;
        color: var(--text-soft);
        line-height: 1.55;
        font-size: 0.94rem;
      }
      .foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 14px;
      }
      .read {
        min-height: 40px;
        padding: 8px 14px;
        font-size: 0.85rem;
        text-decoration: none;
      }
      .when {
        font-size: 0.76rem;
        color: var(--text-dim);
        white-space: nowrap;
      }
    `,
  ],
})
export class StoryCard {
  readonly i18n = inject(I18n);
  readonly t = this.i18n.t;

  readonly story = input.required<Story>();

  /** A Wikipedia URL can rot; a broken image icon is worse than no image. */
  readonly imageFailed = signal(false);

  readonly headline = computed(() =>
    this.i18n.lang() === 'en' ? this.story().headlineEn : this.story().headlineIt,
  );

  readonly summary = computed(() =>
    this.i18n.lang() === 'en' ? this.story().summaryEn : this.story().summaryIt,
  );

  readonly published = computed(() => new Date(this.story().latestPublishedAt));
}
