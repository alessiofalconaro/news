import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18n } from '../i18n/i18n.service';
import { TopicsService } from '../topics/topics.service';
import { topicName } from '../topics/topic-name';
import { DigestService } from '../digest/digest.service';
import { RefreshService } from '../digest/refresh.service';
import {
  DEFAULT_STORIES,
  MAX_ACTIVE_TOPICS,
  MAX_STORIES,
  MIN_STORIES,
  SourceLanguage,
  Topic,
} from '../core/models';

/** What the form edits. Feeds are one-per-line text while typing. */
interface Draft {
  name: string;
  interests: string;
  searchQuery: string;
  sourceLanguage: SourceLanguage;
  feedsText: string;
  maxStories: number;
  isActive: boolean;
}

function emptyDraft(): Draft {
  return {
    name: '',
    interests: '',
    searchQuery: '',
    sourceLanguage: 'it',
    feedsText: '',
    maxStories: DEFAULT_STORIES,
    isActive: true,
  };
}

@Component({
  selector: 'app-topics',
  imports: [FormsModule],
  template: `
    <header class="head">
      <div>
        <h1>{{ t().topics.title }}</h1>
        <p class="count">{{ t().topics.activeCount(topics.activeCount(), maxActive) }}</p>
      </div>
      <button class="btn btn-primary add" (click)="startCreate()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        {{ t().topics.add }}
      </button>
    </header>

    <!-- The order is not decoration: it decides the shape of the digest and
         what the notification says, and nothing on screen said so. Below the
         header rather than inside it: sharing that row with the button left it
         a narrow column of text running four lines down one side. -->
    @if (topics.topics().length > 1) {
      <p class="order-hint">{{ t().topics.orderHint }}</p>
    }

    @if (!topics.ready()) {
      <div class="skeleton-list">
        @for (i of [1, 2, 3]; track i) {
          <div class="card">
            <div class="skeleton line"></div>
            <div class="skeleton line short"></div>
          </div>
        }
      </div>
    } @else if (!topics.topics().length) {
      <div class="empty-state card">
        <h2>{{ t().topics.emptyTitle }}</h2>
        <p>{{ t().topics.emptyBody }}</p>
        <button class="btn btn-primary" (click)="startCreate()">
          {{ t().topics.createFirst }}
        </button>
      </div>
    } @else {
      <ul class="list">
        @for (topic of topics.topics(); track topic.id; let i = $index; let last = $last) {
          <li class="card topic" [class.paused]="!topic.isActive">
            <div class="top">
              <span class="dot" [style.background]="topics.colorOf(topic)"></span>
              <span class="name">{{ shownName(topic) }}</span>
              <span class="badge">{{ topic.maxStories }}</span>
            </div>
            <p class="interests">{{ topic.interests }}</p>
            <div class="meta">
              <span class="badge">{{ languageLabel(topic.sourceLanguage) }}</span>
              @if (!topic.isActive) {
                <span class="badge paused-badge">{{ t().topics.inactive }}</span>
              }
            </div>
            <div class="actions">
              <button class="btn btn-ghost" (click)="startEdit(topic)">
                {{ t().common.edit }}
              </button>
              <button
                class="btn btn-ghost"
                [disabled]="i === 0"
                [attr.aria-label]="t().topics.moveUp"
                (click)="topics.move(topic, -1)"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 12.5l5-5 5 5" /></svg>
              </button>
              <button
                class="btn btn-ghost"
                [disabled]="last"
                [attr.aria-label]="t().topics.moveDown"
                (click)="topics.move(topic, 1)"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7.5l5 5 5-5" /></svg>
              </button>
              <button class="btn btn-ghost" (click)="toggleActive(topic)">
                {{ topic.isActive ? t().topics.inactive : t().topics.active }}
              </button>
              <button class="btn btn-ghost btn-danger" (click)="remove(topic)">
                {{ t().common.delete }}
              </button>
            </div>
          </li>
        }
      </ul>
    }

    @if (limitMessage()) {
      <p class="banner banner-warn limit">{{ limitMessage() }}</p>
    }

    @if (editing()) {
      <div class="sheet-back" (click)="cancel()"></div>
      <section class="sheet" role="dialog" aria-modal="true">
        <h2>{{ editingId() ? t().topics.editTitle : t().topics.newTitle }}</h2>

        <!-- Only the fields scroll. Save and Cancel used to sit at the end of
             them, so on a phone finishing meant scrolling to look for the way
             out - and the way out of a form is not something to go hunting
             for. -->
        <div class="sheet-body">
        <div class="field">
          <label for="name">{{ t().topics.name }}</label>
          <input
            id="name"
            type="text"
            [(ngModel)]="draft.name"
            [placeholder]="t().topics.namePlaceholder"
          />
        </div>

        <div class="field">
          <label for="interests">{{ t().topics.interests }}</label>
          <textarea
            id="interests"
            rows="3"
            [(ngModel)]="draft.interests"
            [placeholder]="t().topics.interestsPlaceholder"
          ></textarea>
          <p class="hint">{{ t().topics.interestsHint }}</p>
        </div>

        <div class="field">
          <label for="query">{{ t().topics.searchQuery }}</label>
          <input id="query" type="text" [(ngModel)]="draft.searchQuery" />
          <p class="hint">{{ t().topics.searchQueryHint }}</p>
        </div>

        <div class="field">
          <label for="lang">{{ t().topics.sourceLanguage }}</label>
          <select id="lang" [(ngModel)]="draft.sourceLanguage">
            <option value="it">{{ t().topics.langIt }}</option>
            <option value="en">{{ t().topics.langEn }}</option>
            <option value="both">{{ t().topics.langBoth }}</option>
          </select>
        </div>

        <div class="field">
          <label for="max">{{ t().topics.maxStories }}: {{ draft.maxStories }}</label>
          <input
            id="max"
            type="range"
            [min]="minStories"
            [max]="maxStories"
            [(ngModel)]="draft.maxStories"
          />
        </div>

        <label class="check">
          <input type="checkbox" [(ngModel)]="draft.isActive" />
          <span>{{ t().topics.active }}</span>
        </label>
        <p class="hint">{{ t().topics.activeHint }}</p>

        <details class="advanced">
          <summary>{{ t().common.advanced }}</summary>
          <div class="field">
            <label for="feeds">{{ t().topics.extraFeeds }}</label>
            <textarea id="feeds" rows="3" [(ngModel)]="draft.feedsText"></textarea>
            <p class="hint">{{ t().topics.extraFeedsHint }}</p>
          </div>
        </details>

        @if (error()) {
          <p class="banner banner-error">{{ error() }}</p>
        }
        </div>

        <div class="sheet-actions">
          <button class="btn" (click)="cancel()">{{ t().common.cancel }}</button>
          <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
            {{ saving() ? t().common.saving : t().common.save }}
          </button>
        </div>
      </section>
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
        margin-bottom: 18px;
      }
      .count {
        margin: 4px 0 0;
        color: var(--text-soft);
        font-size: 0.82rem;
      }
      /* On one line, in both languages. The header is a flex row, and a flex
         item is free to shrink below the width of its own text: "Nuovo topic"
         and "New topic" were both being squeezed onto two lines by the column
         of text beside them. */
      .add {
        flex: none;
        white-space: nowrap;
      }
      .order-hint {
        margin: -4px 0 16px;
        color: var(--text-dim);
        font-size: 0.78rem;
        line-height: 1.45;
      }
      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .topic.paused {
        opacity: 0.62;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .name {
        flex: 1;
        min-width: 0;
        font-family: var(--font-display);
        font-size: 1.05rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .interests {
        margin: 8px 0 0;
        color: var(--text-soft);
        font-size: 0.88rem;
        line-height: 1.5;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 10px;
      }
      .paused-badge {
        color: var(--text-dim);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid var(--border-soft);
      }
      .actions .btn {
        padding: 8px 12px;
        min-height: 38px;
        font-size: 0.82rem;
      }
      .actions .btn svg {
        width: 16px;
        height: 16px;
      }
      .limit {
        margin-top: 14px;
      }
      .skeleton-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .skeleton.line {
        height: 14px;
        margin-bottom: 10px;
      }
      .skeleton.line.short {
        width: 60%;
        margin-bottom: 0;
      }

      .sheet-back {
        position: fixed;
        inset: 0;
        z-index: 80;
        background: var(--backdrop);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        animation: fade-in 0.2s ease both;
      }
      .sheet {
        position: fixed;
        z-index: 81;
        left: 0;
        right: 0;
        bottom: 0;
        /* Three bands: the title, the fields that scroll, the two buttons. */
        display: flex;
        flex-direction: column;
        max-height: 88dvh;
        padding: 20px var(--page-pad) calc(14px + var(--safe-bottom));
        background: var(--sheet-bg);
        backdrop-filter: var(--blur);
        -webkit-backdrop-filter: var(--blur);
        border-top: 1px solid var(--glass-border);
        box-shadow: var(--glass-edge), 0 -20px 60px -20px rgba(0, 0, 0, 0.6);
        border-radius: 28px 28px 0 0;
        animation: rise 0.28s cubic-bezier(0.2, 0, 0, 1) both;
      }
      .sheet h2 {
        margin-bottom: 16px;
      }
      .check {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 14px;
        font-size: 0.9rem;
        color: var(--text);
      }
      /* The "active" tick as an iOS switch: a pill with a knob that slides. */
      .check input {
        appearance: none;
        -webkit-appearance: none;
        position: relative;
        flex: none;
        width: 46px;
        height: 28px;
        margin: 0;
        padding: 0;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--surface-3);
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .check input::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: transform 0.22s cubic-bezier(0.34, 1.3, 0.5, 1);
      }
      .check input:checked {
        background: linear-gradient(135deg, var(--brand), var(--brand-2));
        border-color: transparent;
      }
      .check input:checked::after {
        transform: translateX(18px);
      }
      .check input:focus {
        box-shadow: var(--ring);
      }
      input[type='range'] {
        padding: 0;
        border: 0;
        background: none;
        box-shadow: none;
        accent-color: var(--brand);
      }
      .advanced summary {
        cursor: pointer;
        color: var(--text-soft);
        font-size: 0.85rem;
        font-weight: 600;
        padding: 8px 0;
      }
      .sheet-body {
        flex: 1;
        /* Without this a flex child refuses to shrink past its contents, and
           the panel grows instead of the fields scrolling. */
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .sheet-actions {
        flex: none;
        display: flex;
        gap: 10px;
        margin-top: 0;
        padding-top: 14px;
        border-top: 1px solid var(--border-soft);
      }
      .sheet-actions .btn {
        flex: 1;
      }

      @media (min-width: 900px) {
        .sheet {
          left: 50%;
          bottom: auto;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(520px, 92vw);
          border-radius: var(--radius);
          border: 1px solid var(--glass-border);
          /* the rise would replace the centring transform */
          animation: none;
        }
      }
    `,
  ],
})
export class TopicsPage {
  readonly topics = inject(TopicsService);
  private readonly digests = inject(DigestService);
  private readonly refresh = inject(RefreshService);
  private readonly i18n = inject(I18n);
  readonly t = this.i18n.t;

  readonly maxActive = MAX_ACTIVE_TOPICS;
  readonly minStories = MIN_STORIES;
  readonly maxStories = MAX_STORIES;

  readonly editing = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  /** Mutated in place by ngModel; every edit fires an event, which schedules CD. */
  draft: Draft = emptyDraft();

  readonly limitMessage = computed(() =>
    this.topics.canActivateMore() ? null : this.t().topics.limitReached(MAX_ACTIVE_TOPICS),
  );

  languageLabel(language: SourceLanguage): string {
    const labels = this.t().topics;
    return language === 'it' ? labels.langIt : language === 'en' ? labels.langEn : labels.langBoth;
  }

  startCreate(): void {
    this.draft = emptyDraft();
    // A new topic cannot start active once the limit is reached.
    this.draft.isActive = this.topics.canActivateMore();
    this.editingId.set(null);
    this.error.set(null);
    this.editing.set(true);
  }

  startEdit(topic: Topic): void {
    this.draft = {
      name: topic.name,
      interests: topic.interests,
      searchQuery: topic.searchQuery,
      sourceLanguage: topic.sourceLanguage,
      feedsText: topic.extraFeeds.join('\n'),
      maxStories: topic.maxStories,
      isActive: topic.isActive,
    };
    this.editingId.set(topic.id);
    this.error.set(null);
    this.editing.set(true);
  }

  cancel(): void {
    this.editing.set(false);
    this.error.set(null);
  }

  async toggleActive(topic: Topic): Promise<void> {
    if (!topic.isActive && !this.topics.canActivateMore()) return;
    await this.topics.setActive(topic, !topic.isActive);
  }

  /**
   * The name as the page shows it: translated where there is a translation,
   * and exactly what was typed otherwise. The form still edits `topic.name`,
   * because that is the one the owner owns.
   */
  shownName(topic: Topic): string {
    return topicName(topic, this.i18n.lang());
  }

  async remove(topic: Topic): Promise<void> {
    if (!confirm(this.t().topics.deleteConfirm(this.shownName(topic)))) return;
    await this.topics.remove(topic.id);
  }

  async save(): Promise<void> {
    const labels = this.t().topics;
    const name = this.draft.name.trim();
    const interests = this.draft.interests.trim();

    if (!name) return this.error.set(labels.nameRequired);
    if (!interests) return this.error.set(labels.interestsRequired);

    const feeds = this.draft.feedsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (feeds.some((feed) => !/^https?:\/\//i.test(feed))) {
      return this.error.set(labels.invalidFeed);
    }

    // The rules cannot count documents, so the cap is enforced here and again by
    // the pipeline, which only reads the first MAX_ACTIVE_TOPICS active rows.
    const wasActive = this.editingId()
      ? (this.topics.topics().find((x) => x.id === this.editingId())?.isActive ?? false)
      : false;
    if (this.draft.isActive && !wasActive && !this.topics.canActivateMore()) {
      return this.error.set(labels.limitReached(MAX_ACTIVE_TOPICS));
    }

    const payload = {
      name,
      interests,
      searchQuery: this.draft.searchQuery.trim(),
      sourceLanguage: this.draft.sourceLanguage,
      extraFeeds: feeds,
      maxStories: clamp(Number(this.draft.maxStories), MIN_STORIES, MAX_STORIES),
      isActive: this.draft.isActive,
    };

    // Asked before the write, because afterwards it is no longer true.
    const isFirstEver =
      !this.editingId() &&
      !this.topics.topics().length &&
      this.digests.ready() &&
      !this.digests.digests().length;

    this.saving.set(true);
    this.error.set(null);
    try {
      const id = this.editingId();
      if (id) await this.topics.update(id, payload);
      else await this.topics.create(payload);
      this.editing.set(false);

      // Somebody who has just been let in would otherwise open Today, find
      // nothing, and have no way of telling an empty app from a broken one -
      // the first digest would not arrive until their chosen hour, possibly
      // tomorrow. So their first topic asks for a digest straight away, and
      // Today says it is coming.
      if (isFirstEver && payload.isActive && !this.refresh.pending()) {
        await this.refresh.request();
      }
    } catch {
      this.error.set(labels.saveError);
    } finally {
      this.saving.set(false);
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return DEFAULT_STORIES;
  return Math.min(max, Math.max(min, Math.round(value)));
}
