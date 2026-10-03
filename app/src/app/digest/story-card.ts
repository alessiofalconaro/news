import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { DigestService } from './digest.service';
import type { Story, StorySource } from '../core/models';
import { tidyHeadline } from './tidy-headline';

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
        <a class="read" [href]="readUrl()" target="_blank" rel="noopener">
          {{ t().today.readArticle }}
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 5l5 5-5 5" /></svg>
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
      <!-- Opening a modal moves focus to its first focusable child, which was
           the close button: it arrived ringed in the browser's focus blue, as
           if it had been pressed. Focus lands on the panel instead, which
           shows nothing, and the ring comes back the moment anyone tabs. -->
      <div class="panel" tabindex="-1" autofocus>
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
                @if (langTag(source)) {
                  <span class="tag">{{ langTag(source) }}</span>
                }
                <svg class="go" viewBox="0 0 20 20" aria-hidden="true"><path d="M8 5l5 5-5 5" /></svg>
              </a>

              <!-- A star rather than a word: the row already carries the
                   outlet's name and a second piece of text beside it read as
                   part of the link. Filled is the one that opens. -->
              @if (source.url === readUrl()) {
                <span class="star on" [title]="t().today.sourcesPrimary">
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.8l2.24 4.54 5.01.73-3.62 3.53.85 4.99L10 14.24l-4.48 2.35.85-4.99L2.75 8.07l5.01-.73z" />
                  </svg>
                  <span class="sr">{{ t().today.sourcesPrimary }}</span>
                </span>
              } @else {
                <button
                  class="star"
                  [disabled]="saving()"
                  [title]="t().today.sourcesUse"
                  [attr.aria-label]="t().today.sourcesUse"
                  (click)="makeDefault(source.url)"
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.8l2.24 4.54 5.01.73-3.62 3.53.85 4.99L10 14.24l-4.48 2.35.85-4.99L2.75 8.07l5.01-.73z" />
                  </svg>
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
        position: relative;
        padding: 16px 16px 14px 18px;
      }
      /* The topic's colour, carried in from the section that owns the story:
         a short lit bar inside the left edge, rather than a border that the
         round corners would bend. */
      .card::before {
        content: '';
        position: absolute;
        left: 0;
        top: 18px;
        bottom: 18px;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: var(--accent, var(--brand));
        box-shadow: 0 0 12px color-mix(in srgb, var(--accent, var(--brand)) 60%, transparent);
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
        line-height: 1.3;
        letter-spacing: -0.012em;
        margin-bottom: 6px;
        /* Lines of even length, so a title never ends on a lone word, letter
           or number. tidyHeadline() does the same with no-break spaces for the
           browsers that ignore this. */
        text-wrap: balance;
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
        border-radius: 16px;
        overflow: hidden;
        background: var(--surface-2);
        box-shadow:
          inset 0 0 0 1px var(--border),
          0 10px 22px -12px rgba(0, 0, 0, 0.6);
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
      /* A small pill tinted with the topic's colour. */
      .read {
        color: var(--accent, var(--brand));
        font-size: 0.8rem;
        font-weight: 700;
        text-decoration: none;
        padding: 6px 10px 6px 13px;
        margin-left: -2px;
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--accent, var(--brand)) 13%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent, var(--brand)) 26%, transparent);
      }
      .read svg {
        width: 14px;
        height: 14px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
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

      /* A panel floating clear of every edge, rather than a sheet stuck to the
         bottom: anchored down there the only way out was tapping the strip of
         backdrop above it, and on a tall phone that is a long reach. */
      .sheet {
        inset: 0;
        margin: auto;
        width: min(430px, calc(100vw - 36px));
        max-width: calc(100vw - 36px);
        max-height: min(70dvh, calc(100dvh - 120px));
        padding: 0;
        border: 1px solid var(--glass-border);
        border-radius: var(--radius);
        background: var(--sheet-bg);
        backdrop-filter: var(--blur);
        -webkit-backdrop-filter: var(--blur);
        color: var(--text);
        overflow: hidden;
        box-shadow: var(--glass-edge), var(--shadow);
      }
      /* Only while open: setting display on a dialog unconditionally would
         beat the rule that keeps a closed one hidden, and the panel would sit
         on the page for ever. */
      .sheet[open] {
        display: flex;
        flex-direction: column;
      }
      .sheet::backdrop {
        /* Written out rather than through a token: what a backdrop inherits
           from is not something every engine agrees on. */
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }
      .panel {
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 16px;
      }
      .panel:focus {
        outline: none;
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
        border-radius: 999px;
        background: var(--surface-2);
        color: var(--text);
        text-decoration: none;
        font-size: 0.9rem;
      }
      .list .name {
        /* Takes the slack, so the language tag and the chevron stay together
           on the right instead of being spread across the row. */
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .list .go {
        flex: none;
        width: 15px;
        height: 15px;
        fill: none;
        stroke: var(--text-dim);
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .list .tag {
        flex: none;
        padding: 1px 5px;
        border-radius: 4px;
        background: var(--surface-3);
        color: var(--text-dim);
        font-size: 0.64rem;
        font-weight: 800;
        letter-spacing: 0.04em;
      }
      /* Which one "Read the article" opens, and how to move it. Side by side
         with the link rather than inside it: opening a source and adopting it
         are two different intentions and must not share one tap target. */
      .star {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--surface-2);
        color: var(--text-dim);
        padding: 0;
      }
      .star svg {
        width: 17px;
        height: 17px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.5;
        stroke-linejoin: round;
      }
      .star.on {
        border-color: var(--accent, var(--brand));
        background: color-mix(in srgb, var(--accent, var(--brand)) 12%, transparent);
        color: var(--accent, var(--brand));
      }
      .star.on svg {
        fill: currentColor;
      }
      .star:disabled {
        opacity: 0.5;
      }
      .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
      .err {
        margin: 12px 0 0;
        color: var(--danger);
        font-size: 0.82rem;
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
   * Which source "Read the article" opens, in the language being read.
   *
   * The reader's own pick first. Failing that the AI's, but only while it is
   * in the right language: reading in English, the most complete account is no
   * use if it is in Italian. Stories built before the pipeline recorded each
   * source's language carry none, and those fall back to the AI's pick rather
   * than guessing.
   */
  readonly readUrl = computed(() => {
    const story = this.story();
    const lang = this.i18n.lang();

    const chosen = lang === 'en' ? story.chosenUrlEn : story.chosenUrlIt;
    if (chosen) return chosen;

    const primary = story.sources.find((s) => s.url === story.primaryUrl);
    if (!primary?.lang || primary.lang === lang) return story.primaryUrl;

    // Sources arrive in the order the AI ranked them, so the first match is
    // the best one that is readable here.
    return story.sources.find((s) => s.lang === lang)?.url ?? story.primaryUrl;
  });

  langTag(source: { lang?: 'it' | 'en' | null }): string {
    return source.lang ? source.lang.toUpperCase() : '';
  }

  /**
   * Moves "Read the article" onto another of the story's outlets.
   *
   * The AI picks the one it judged most complete, which is a guess about a
   * reader it has never met: someone who cannot open one paper, or simply
   * prefers another, should be able to say so. Recorded against the language
   * in use, and on the story itself, so the choice is there on every device
   * and stays with the archived digest.
   */
  async makeDefault(url: string): Promise<void> {
    this.saving.set(true);
    this.pickFailed.set(false);
    try {
      await this.digests.setChosenUrl(this.story().id, this.i18n.lang(), url);
    } catch {
      this.pickFailed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  /** A Wikipedia URL can rot; a broken image icon is worse than no image. */
  readonly imageFailed = signal(false);

  readonly headline = computed(() =>
    tidyHeadline(this.i18n.lang() === 'en' ? this.story().headlineEn : this.story().headlineIt),
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
    const open = this.readUrl();
    const byName = new Map<string, StorySource>();
    for (const source of this.story().sources) {
      const kept = byName.get(source.name);
      if (!kept || source.url === open) byName.set(source.name, source);
    }
    return [...byName.values()];
  });
}
