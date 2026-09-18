import { Component, computed, inject, input, signal } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import type { Story } from '../core/models';

/**
 * One story: text on the left, thumbnail on the right.
 *
 * Sideways rather than a picture on top, so a topic's stories read as a list
 * you can scan down instead of a column of posters you have to scroll through.
 * The thumbnail is a fixed square: pictures come from Wikipedia at every shape
 * imaginable, and letting each set its own height turns the list into a ragged
 * staircase.
 *
 * The picture is optional by design - plenty of stories have no subject worth
 * illustrating - so the layout is built around its absence and merely
 * accommodates its presence.
 */
@Component({
  selector: 'app-story-card',
  template: `
    <article class="card" [style.--accent]="accent()">
      <div class="inner">
        <div class="text">
          <h2>{{ headline() }}</h2>
          <p class="summary">{{ summary() }}</p>
        </div>

        @if (story().imageUrl && !imageFailed()) {
          <div class="shot">
            <img
              [src]="story().imageUrl"
              alt=""
              loading="lazy"
              decoding="async"
              (error)="imageFailed.set(true)"
            />
          </div>
        }
      </div>

      <div class="foot">
        <a class="read" [href]="story().primaryUrl" target="_blank" rel="noopener">
          {{ t().today.readArticle }} ›
        </a>
        <span class="meta">
          {{ t().today.sources(story().sourceCount) }} · {{ i18n.time(published()) }}
        </span>
      </div>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .card {
        padding: 14px;
        /* The topic's colour, carried in from the section that owns the story. */
        border-left: 3px solid var(--accent, var(--border));
      }
      .inner {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      .text {
        min-width: 0;
        flex: 1;
      }
      h2 {
        font-family: var(--font-display);
        font-size: 1.05rem;
        line-height: 1.32;
        letter-spacing: -0.01em;
        margin-bottom: 6px;
      }
      .summary {
        margin: 0;
        color: var(--text-soft);
        line-height: 1.5;
        font-size: 0.88rem;
      }
      .shot {
        flex: none;
        width: 84px;
        height: 84px;
        border-radius: var(--radius-sm);
        overflow: hidden;
        background: var(--surface-2);
      }
      .shot img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 12px;
      }
      .read {
        color: var(--accent, var(--brand));
        font-size: 0.84rem;
        font-weight: 700;
        text-decoration: none;
        /* Comfortably tappable without a button's worth of chrome. */
        padding: 6px 0;
        min-height: 32px;
        display: inline-flex;
        align-items: center;
      }
      .meta {
        font-size: 0.74rem;
        color: var(--text-dim);
        white-space: nowrap;
      }

      @media (min-width: 600px) {
        .shot {
          width: 104px;
          height: 104px;
        }
        h2 {
          font-size: 1.12rem;
        }
      }
    `,
  ],
})
export class StoryCard {
  readonly i18n = inject(I18n);
  readonly t = this.i18n.t;

  readonly story = input.required<Story>();
  readonly accent = input<string>('');

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
