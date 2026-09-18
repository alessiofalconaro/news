import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18n } from '../i18n/i18n.service';
import { TopicsService } from '../topics/topics.service';
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
      <button class="btn btn-primary" (click)="startCreate()">＋ {{ t().topics.add }}</button>
    </header>

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
              <span class="name">{{ topic.name }}</span>
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
                ↑
              </button>
              <button
                class="btn btn-ghost"
                [disabled]="last"
                [attr.aria-label]="t().topics.moveDown"
                (click)="topics.move(topic, 1)"
              >
                ↓
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
        padding: 8px 10px;
        font-size: 0.82rem;
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
      .advanced summary {
        cursor: pointer;
        color: var(--text-soft);
        font-size: 0.85rem;
        font-weight: 600;
        padding: 8px 0;
      }
      .sheet-actions {
        display: flex;
        gap: 10px;
        margin-top: 18px;
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
          border: 1px solid var(--border);
        }
      }
    `,
  ],
})
export class TopicsPage {
  readonly topics = inject(TopicsService);
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

  async remove(topic: Topic): Promise<void> {
    if (!confirm(this.t().topics.deleteConfirm(topic.name))) return;
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

    this.saving.set(true);
    this.error.set(null);
    try {
      const id = this.editingId();
      if (id) await this.topics.update(id, payload);
      else await this.topics.create(payload);
      this.editing.set(false);
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
