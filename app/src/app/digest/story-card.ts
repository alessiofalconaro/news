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
          <button class="sources" (click)="sheet.set(true)">
            {{ t().today.sources(story().sourceCount) }}
          </button>
          · {{ i18n.time(published()) }}
        </span>
      </div>
    </article>

    @if (sheet()) {
      <div class="sheet-back" (click)="sheet.set(false)"></div>
      <section class="sheet" role="dialog" aria-modal="true">
        <h2>{{ t().today.sourcesTitle }}</h2>
        <p class="explain">{{ t().today.sourcesBody }}</p>

        <ul class="list">
          @for (source of sourceList(); track source.url) {
            <li>
              <a [href]="source.url" target="_blank" rel="noopener">
                <span class="name">{{ source.name }}</span>
                @if (source.url === story().primaryUrl) {
                  <span class="badge">{{ t().today.sourcesPrimary }}</span>
                }
              </a>
            </li>
          }
        </ul>

        <button class="btn close" (click)="sheet.set(false)">{{ t().common.close }}</button>
      </section>
    }
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
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.74rem;
        color: var(--text-dim);
        white-space: nowrap;
      }
      /* Underlined so it reads as something you can open, and given a real
         touch target without making the footer taller. */
      .sources {
        background: none;
        border: 0;
        padding: 8px 0;
        margin: -8px 0;
        font: inherit;
        color: var(--text-soft);
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      .sheet-back {
        position: fixed;
        inset: 0;
        z-index: 80;
        background: rgba(0, 0, 0, 0.55);
      }
      .sheet {
        position: fixed;
        z-index: 81;
        left: 0;
        right: 0;
        bottom: 0;
        max-height: 88dvh;
        overflow-y: auto;
        padding: 20px var(--page-pad) calc(20px + var(--safe-bottom));
        background: var(--surface);
        border-top: 1px solid var(--border);
        border-radius: 20px 20px 0 0;
      }
      .sheet h2 {
        margin-bottom: 8px;
      }
      .explain {
        margin: 0 0 16px;
        color: var(--text-soft);
        font-size: 0.86rem;
        line-height: 1.5;
      }
      .list {
        list-style: none;
        margin: 0 0 18px;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .list a {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 48px;
        padding: 10px 14px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface-2);
        color: var(--text);
        text-decoration: none;
        font-size: 0.9rem;
      }
      .list .name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .close {
        width: 100%;
      }

      @media (min-width: 900px) {
        .sheet {
          left: 50%;
          bottom: auto;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(520px, 92vw);
          border-radius: var(--radius);
          border: 1px solid var(--border);
        }
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

  /** The sources sheet, opened from the count in the footer. */
  readonly sheet = signal(false);

  /** A Wikipedia URL can rot; a broken image icon is worse than no image. */
  readonly imageFailed = signal(false);

  readonly headline = computed(() =>
    this.i18n.lang() === 'en' ? this.story().headlineEn : this.story().headlineIt,
  );

  readonly summary = computed(() =>
    this.i18n.lang() === 'en' ? this.story().summaryEn : this.story().summaryIt,
  );

  readonly published = computed(() => new Date(this.story().latestPublishedAt));

  /**
   * One link per outlet, so the list matches the count beside it.
   *
   * The count is of distinct outlets, but the same outlet sometimes files the
   * story twice - a running piece updated, a recap - and listing both under a
   * label that says four would read as an error. Where an outlet is the one
   * the AI picked, that is the link kept.
   */
  readonly sourceList = computed(() => {
    const byName = new Map<string, { name: string; url: string }>();
    for (const source of this.story().sources) {
      const kept = byName.get(source.name);
      if (!kept || source.url === this.story().primaryUrl) byName.set(source.name, source);
    }
    return [...byName.values()];
  });
}
