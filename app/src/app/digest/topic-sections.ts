import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { TOPIC_COLORS, TopicsService } from '../topics/topics.service';
import { StoryCard } from './story-card';
import { TopicFilterService } from './topic-filter.service';
import { ViewModeService } from './view-mode.service';
import type { Story } from '../core/models';

interface TopicGroup {
  key: string;
  name: string;
  color: string;
  stories: Story[];
}

/** Movement below this is not yet a direction, only a finger settling. */
const AXIS = 8;

/** A short flick counts even when it barely moves: under this many ms, over 40px. */
const FLICK_MS = 250;

/**
 * Stable colour for a topic that is no longer in the user's list.
 *
 * The archive outlives topics: one deleted last month still has its stories,
 * and they should keep the colour they are remembered by rather than collapse
 * into a default grey. Hashing the name is arbitrary but consistent, which is
 * the only property that matters here.
 */
function colorFromName(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return TOPIC_COLORS[Math.abs(hash) % TOPIC_COLORS.length]!;
}

/**
 * A digest's stories, grouped by topic.
 *
 * The strip of chips at the top exists because a digest is read by topic, not
 * front to back: with fifteen stories across four topics, the last topic was
 * three screens down and effectively invisible. The chips put every topic in
 * front of the reader at once, and tapping them narrows the page to the ones
 * chosen.
 */
@Component({
  selector: 'app-topic-sections',
  imports: [StoryCard],
  template: `
    @if (groups().length > 1) {
      <div class="filter-bar">
        <!-- Outside the strip, not at the end of it: as the last chip it was
             only reachable by scrolling the whole row across, which is a lot of
             work for undoing something. Here it never moves. -->
        @if (filter.filtering()) {
          <button class="clear" (click)="filter.clear()" [attr.aria-label]="t().today.filterClear">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" />
            </svg>
          </button>
        }

        <nav class="chip-row">
          @for (group of groups(); track group.key) {
            <button
              class="chip"
              [class.on]="filter.has(group.key)"
              [style.--accent]="group.color"
              [attr.aria-pressed]="filter.has(group.key)"
              (click)="filter.toggle(group.key)"
            >
              <span class="dot" [style.background]="group.color"></span>
              {{ group.name }}
              <span class="count">{{ group.stories.length }}</span>
            </button>
          }
        </nav>
      </div>
    }

    @for (group of visible(); track group.key) {
      <section [style.--accent]="group.color">
        <header class="head">
          <span class="dot"></span>
          <h2>{{ group.name }}</h2>
          <span class="count">{{ t().today.storyCount(group.stories.length) }}</span>
        </header>

        @if (mode() === 'cards') {
          <div
            #viewport
            class="viewport"
            [attr.data-key]="group.key"
            (touchstart)="onStart(group.key, $event)"
            (touchmove)="onMove($event)"
            (touchend)="onEnd($event)"
            (touchcancel)="onEnd($event)"
          >
            <div
              class="rail"
              [class.dragging]="drag()?.key === group.key"
              [style.--i]="indexOf(group.key)"
              [style.--drag]="dragOf(group.key)"
            >
              @for (story of group.stories; track story.id) {
                <div class="slide">
                  <app-story-card [story]="story" [accent]="group.color" />
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="stories">
            @for (story of group.stories; track story.id) {
              <app-story-card [story]="story" [accent]="group.color" />
            }
          </div>
        }
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .filter-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        /* Stays reachable while scrolling a long digest; the top bar is 120px. */
        position: sticky;
        top: calc(56px + var(--safe-top) + var(--topbar-clear, 0px));
        z-index: 20;
        margin-bottom: 6px;
        background: var(--bg);
      }
      .filter-bar .chip-row {
        flex: 1;
        min-width: 0;
        /* Only the far side bleeds now: the near side belongs to the button. */
        margin-left: 0;
        padding-left: 0;
      }
      .filter-bar .chip {
        border-color: var(--border);
      }
      .filter-bar .chip.on {
        /* The topic's own colour rather than the brand orange: four chips lit
           up in the same orange say nothing about which topics they are. */
        background: color-mix(in srgb, var(--accent) 18%, var(--surface-2));
        border-color: var(--accent);
        color: var(--text);
      }
      .filter-bar .count {
        color: var(--text-dim);
        font-weight: 700;
      }
      .filter-bar .chip.on .count {
        color: var(--text-soft);
      }
      .clear {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid color-mix(in srgb, var(--danger) 45%, transparent);
        background: color-mix(in srgb, var(--danger) 12%, transparent);
        color: var(--danger);
      }
      .clear svg {
        width: 14px;
        height: 14px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
      }
      .clear:active {
        background: color-mix(in srgb, var(--danger) 22%, transparent);
      }
      section {
        margin-bottom: 26px;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 2px solid var(--accent);
      }
      .head .dot {
        background: var(--accent);
        width: 0.7em;
        height: 0.7em;
      }
      .head h2 {
        flex: 1;
        min-width: 0;
        font-size: 0.95rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--accent);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .head .count {
        font-size: 0.74rem;
        color: var(--text-dim);
        white-space: nowrap;
      }
      .stories {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      /* One story at a time, swiped sideways.
         The rail is moved by hand rather than by the browser's own scroll
         snapping: snapping decides where to land from momentum, so a slow drag
         released between two cards stayed between two cards. Here the release
         decides - past a quarter of the width, or a flick, you get the next
         card, otherwise the one you started on - and it always lands on a card.
         Measuring is only needed for the height; the travel is pure CSS. */
      .viewport {
        overflow: hidden;
        /* Bleeds through the page padding, so the neighbouring cards show at
           the edges and it is obvious there are more. */
        margin-inline: calc(-1 * var(--page-pad));
        /* The browser keeps vertical scrolling, we take the horizontal. */
        touch-action: pan-y;
        transition: height 0.26s cubic-bezier(0.22, 0.61, 0.36, 1);
      }
      .rail {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        width: 100%;
        padding-inline: var(--page-pad);
        /* 100% here is the viewport's width, so one step is one card plus the
           gap - no pixel measuring, and it survives a rotation by itself. */
        transform: translateX(
          calc(-1 * var(--i, 0) * (100% - 2 * var(--page-pad) + 12px) + var(--drag, 0px))
        );
        transition: transform 0.26s cubic-bezier(0.22, 0.61, 0.36, 1);
      }
      .rail.dragging {
        /* Under the finger there is nothing to animate towards. */
        transition: none;
      }
      /* A drag ends in a click; without this, letting go of a swipe opened
         whatever was under the finger. Put on at the end of the gesture and
         taken off shortly after, by hand rather than through a binding: the
         click follows the release immediately and would not wait for a render. */
      .viewport.no-tap .rail {
        pointer-events: none;
      }
      .slide {
        flex: 0 0 100%;
        /* Room for the card's own edges inside the clipped viewport, and part
           of the measured height so nothing is ever cut off. */
        padding: 2px 0 6px;
      }
    `,
  ],
})
export class TopicSections {
  private readonly topics = inject(TopicsService);
  private readonly viewMode = inject(ViewModeService);
  readonly filter = inject(TopicFilterService);
  readonly mode = this.viewMode.mode;
  private readonly i18n = inject(I18n);
  readonly t = this.i18n.t;

  readonly stories = input.required<Story[]>();

  private readonly viewports = viewChildren<ElementRef<HTMLElement>>('viewport');

  /** Which card each topic is showing, by topic key. */
  private readonly at = signal<Record<string, number>>({});

  /** The drag in progress, if any: only one finger, so only one at a time. */
  protected readonly drag = signal<{ key: string; px: number } | null>(null);

  constructor() {
    // The card on screen decides the height of its row, so it is measured
    // again whenever the card changes, the stories change, or the layout does.
    afterRenderEffect(() => {
      this.visible();
      this.at();
      for (const ref of this.viewports()) this.fit(ref.nativeElement);
    });
  }

  // --- Grouping -----------------------------------------------------------

  /**
   * Groups in the order the pipeline produced them, which is the order the user
   * arranged the topics in. Stories arrive sorted by rank, and rank runs
   * topic by topic, so first appearance is already the right order.
   */
  readonly groups = computed<TopicGroup[]>(() => {
    const byKey = new Map<string, TopicGroup>();

    for (const story of this.stories()) {
      const key = story.topicId ?? `name:${story.topicName}`;
      let group = byKey.get(key);
      if (!group) {
        group = {
          key,
          name: story.topicName,
          color: this.colorFor(story),
          stories: [],
        };
        byKey.set(key, group);
      }
      group.stories.push(story);
    }

    // Inside a topic: newest round first, and within a round the order the AI
    // ranked them in. Ranking by importance beats ranking by the clock, since
    // a round's stories are all from the same few hours anyway; ordering them
    // by time only scattered the good ones among the minor ones.
    for (const group of byKey.values()) {
      group.stories.sort((a, b) => (b.slot ?? 0) - (a.slot ?? 0) || a.rank - b.rank);
    }

    // Sections follow the order the reader arranged the topics in, on the
    // Topics page. Before this they came out in whatever order the stories
    // happened to be in, so the topic someone had put first could appear third.
    return [...byKey.values()].sort((a, b) => this.position(a) - this.position(b));
  });

  /**
   * The groups actually on the page.
   *
   * A selection that matches nothing here shows everything rather than an
   * empty page: the filter is remembered across days, and a topic you followed
   * last week may simply have no stories in the digest you are reading.
   */
  readonly visible = computed<TopicGroup[]>(() => {
    const chosen = this.filter.selected();
    if (!chosen.size) return this.groups();
    const kept = this.groups().filter((group) => chosen.has(group.key));
    return kept.length ? kept : this.groups();
  });

  /**
   * Where a topic sits in the reader's own list. Ones that no longer exist -
   * the archive outlives them - go last rather than jumping to the front.
   */
  private position(group: TopicGroup): number {
    const index = this.topics.topics().findIndex((t) => t.id === group.key);
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
  }

  /** The live topic's colour where it still exists, so the app agrees with itself. */
  private colorFor(story: Story): string {
    const index = this.topics.topics().findIndex((t) => t.id === story.topicId);
    return index >= 0 ? TOPIC_COLORS[index % TOPIC_COLORS.length]! : colorFromName(story.topicName);
  }

  // --- The rail -----------------------------------------------------------

  protected indexOf(key: string): number {
    return this.at()[key] ?? 0;
  }

  protected dragOf(key: string): string {
    const drag = this.drag();
    return drag?.key === key ? `${drag.px}px` : '0px';
  }

  private start = { key: '', x: 0, y: 0, at: 0, width: 1, axis: 'undecided' as Axis };
  private element: HTMLElement | null = null;
  private release: ReturnType<typeof setTimeout> | null = null;

  onStart(key: string, event: TouchEvent): void {
    const touch = event.touches[0];
    if (!touch || event.touches.length !== 1) return;
    this.element = event.currentTarget as HTMLElement;
    this.start = {
      key,
      x: touch.clientX,
      y: touch.clientY,
      at: Date.now(),
      width: this.element.offsetWidth || 1,
      axis: 'undecided',
    };
    this.drag.set(null);
  }

  onMove(event: TouchEvent): void {
    const touch = event.touches[0];
    if (!touch || this.start.axis === 'down') return;

    const dx = touch.clientX - this.start.x;
    const dy = touch.clientY - this.start.y;

    if (this.start.axis === 'undecided') {
      if (Math.abs(dx) < AXIS && Math.abs(dy) < AXIS) return;
      // More sideways than not is a swipe; anything else is the page scrolling
      // and we keep out of its way for the rest of this touch.
      this.start.axis = Math.abs(dx) > Math.abs(dy) ? 'across' : 'down';
      if (this.start.axis === 'down') return;
      // Make room now for a taller card coming in, or it arrives clipped.
      if (this.element) this.fit(this.element, true);
    }

    // Resistance at the two ends: the rail gives a little and pulls back, which
    // says "there is nothing here" more clearly than refusing to move.
    const index = this.indexOf(this.start.key);
    const last = this.countOf(this.start.key) - 1;
    const stuck = (dx > 0 && index === 0) || (dx < 0 && index >= last);
    this.drag.set({ key: this.start.key, px: Math.round(stuck ? dx * 0.25 : dx) });
  }

  onEnd(event: TouchEvent): void {
    const axis = this.start.axis;
    this.start.axis = 'undecided';
    this.drag.set(null);

    if (axis !== 'across') {
      this.element = null;
      return;
    }

    const touch = event.changedTouches[0];
    const dx = touch ? touch.clientX - this.start.x : 0;
    const elapsed = Date.now() - this.start.at;

    // Past a quarter of the width you have committed to the next card; so has
    // a quick flick, which is how the gesture is usually made in a hurry.
    const far = Math.abs(dx) > Math.min(this.start.width * 0.25, 120);
    const flick = elapsed < FLICK_MS && Math.abs(dx) > 40;
    const step = (far || flick) && dx !== 0 ? (dx < 0 ? 1 : -1) : 0;

    const last = this.countOf(this.start.key) - 1;
    const landing = Math.max(0, Math.min(last, this.indexOf(this.start.key) + step));
    this.at.update((all) => ({ ...all, [this.start.key]: landing }));

    // Whether or not the card changed, the row goes back to hugging it.
    const el = this.element;
    this.element = null;
    if (!el) return;
    this.fit(el);

    el.classList.add('no-tap');
    if (this.release) clearTimeout(this.release);
    this.release = setTimeout(() => el.classList.remove('no-tap'), 350);
  }

  private countOf(key: string): number {
    return this.groups().find((group) => group.key === key)?.stories.length ?? 0;
  }

  /**
   * Sizes a rail's window to the card it is showing.
   *
   * Side by side the cards are all as tall as the tallest, so a short story
   * left a band of empty space above the next topic - space belonging to a card
   * three swipes away. There is no CSS for "be as tall as the child currently
   * showing", so it is measured. `spread` keeps room for the neighbours while
   * one of them is on its way in.
   */
  private fit(el: HTMLElement, spread = false): void {
    const slides = el.querySelectorAll<HTMLElement>('.slide');
    if (!slides.length) return;

    const index = Math.min(this.indexOf(el.dataset['key'] ?? ''), slides.length - 1);
    let height = slides[index]!.offsetHeight;
    if (spread) {
      for (const near of [slides[index - 1], slides[index + 1]]) {
        if (near) height = Math.max(height, near.offsetHeight);
      }
    }
    el.style.height = `${height}px`;
  }
}

type Axis = 'undecided' | 'across' | 'down';
