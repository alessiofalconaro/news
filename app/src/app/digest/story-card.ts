import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { DigestService } from './digest.service';
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
          <button class="sources" (click)="openSheet()">
            {{ t().today.sources(story().sourceCount) }}
          </button>
          · {{ i18n.time(published()) }}
        </span>
      </div>
    </article>

    <!-- A real dialog, opened with showModal(), because the card now lives on
         a rail that is moved with a transform: a transformed ancestor becomes
         the containing block for anything positioned fixed inside it, so the
         old panel was laid out against the rail and clipped by its window.
         The top layer is outside all of that. -->
    <dialog #sheet class="sheet" (click)="onBackdrop($event)">
      <div class="panel">
        <header class="sheet-head">
          <h2>{{ t().today.sourcesTitle }}</h2>
          <button class="x" (click)="closeSheet()" [attr.aria-label]="t().common.close">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
        </header>

        <p class="explain">{{ t().today.sourcesBody }}</p>

        <ul class="list">
          @for (source of sourceList(); track source.url) {
            <li>
              <a [href]="source.url" target="_blank" rel="noopener">
                <span class="name">{{ source.name }}</span>
                <span class="go" aria-hidden="true">›</span>
              </a>

              @if (source.url === story().primaryUrl) {
                <span class="badge">{{ t().today.sourcesPrimary }}</span>
              } @else {
                <button class="pick" [disabled]="saving()" (click)="makePrimary(source.url)">
                  {{ t().today.sourcesUse }}
                </button>
              }
            </li>
          }
        </ul>

        @if (pickFailed()) {
          <p class="err">{{ t().today.sourcesUseError }}</p>
        }
      </div>
    </dialog>
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

      .sheet {
        /* A sheet from the bottom on a phone: the dialog's own centring is
           turned off here and restored on a wide screen further down. */
        margin: 0;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        max-width: 100%;
        max-height: 88dvh;
        padding: 0;
        border: 0;
        border-top: 1px solid var(--border);
        border-radius: 20px 20px 0 0;
        background: var(--surface);
        color: var(--text);
        overflow: hidden;
      }
      .sheet::backdrop {
        /* Written out rather than through a token: what a backdrop inherits
           from is not something every engine agrees on. */
        background: rgba(0, 0, 0, 0.55);
      }
      .panel {
        max-height: 88dvh;
        overflow-y: auto;
        padding: 18px var(--page-pad) calc(18px + var(--safe-bottom));
      }
      .sheet-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }
      .sheet h2 {
        margin: 0;
      }
      .x {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        margin: -6px -6px 0 0;
        border-radius: 50%;
        border: 1px solid var(--border);
        background: var(--surface-2);
        color: var(--text-soft);
      }
      .x svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
      }
      .explain {
        margin: 0 0 16px;
        color: var(--text-soft);
        font-size: 0.86rem;
        line-height: 1.5;
      }
      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .list li {
        display: flex;
        align-items: stretch;
        gap: 8px;
      }
      .list a {
        flex: 1;
        min-width: 0;
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
        white-space: nowrap;
      }
      .list .go {
        flex: none;
        color: var(--text-dim);
      }
      /* Which one "Read the article" opens, and how to move it. Side by side
         with the link rather than inside it: opening a source and adopting it
         are two different intentions and must not share one tap target. */
      .badge,
      .pick {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 12px;
        border-radius: var(--radius-sm);
        font-size: 0.74rem;
        font-weight: 700;
        text-align: center;
        white-space: nowrap;
      }
      .badge {
        border: 1px solid var(--accent, var(--brand));
        color: var(--accent, var(--brand));
        background: color-mix(in srgb, var(--accent, var(--brand)) 12%, transparent);
      }
      .pick {
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text-soft);
      }
      .pick:disabled {
        opacity: 0.5;
      }
      .err {
        margin: 12px 0 0;
        color: var(--danger);
        font-size: 0.82rem;
      }

      @media (min-width: 900px) {
        .sheet {
          inset: 0;
          margin: auto;
          width: min(520px, 92vw);
          height: max-content;
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

  private readonly digests = inject(DigestService);

  private readonly sheet = viewChild<ElementRef<HTMLDialogElement>>('sheet');

  readonly saving = signal(false);
  readonly pickFailed = signal(false);

  openSheet(): void {
    this.pickFailed.set(false);
    this.sheet()?.nativeElement.showModal();
  }

  closeSheet(): void {
    this.sheet()?.nativeElement.close();
  }

  /**
   * Tapping outside closes it. A click on the backdrop is reported against the
   * dialog itself, so anything landing on the panel inside is somebody else's.
   */
  onBackdrop(event: MouseEvent): void {
    if (event.target === this.sheet()?.nativeElement) this.closeSheet();
  }

  /**
   * Moves "Read the article" onto another of the story's outlets.
   *
   * The AI picks the one it judged most complete, which is a guess about a
   * reader it has never met: someone who cannot open one paper, or simply
   * prefers another, should be able to say so. Written to the story itself, so
   * the choice is there on every device and stays with the archived digest.
   */
  async makePrimary(url: string): Promise<void> {
    this.saving.set(true);
    this.pickFailed.set(false);
    try {
      await this.digests.setPrimaryUrl(this.story().id, url);
    } catch {
      this.pickFailed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

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
