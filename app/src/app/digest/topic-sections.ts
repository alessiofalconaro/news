import { Component, computed, inject, input } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { TOPIC_COLORS, TopicsService } from '../topics/topics.service';
import { StoryCard } from './story-card';
import type { Story } from '../core/models';

interface TopicGroup {
  key: string;
  name: string;
  color: string;
  stories: Story[];
}

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
 * The strip of topic chips at the top exists because a digest is read by topic,
 * not front to back: with fifteen stories across four topics, the last topic
 * was three screens down and effectively invisible. The chips put every topic
 * in front of the reader at once and jump straight to one.
 */
@Component({
  selector: 'app-topic-sections',
  imports: [StoryCard],
  template: `
    @if (groups().length > 1) {
      <nav class="chip-row jump">
        @for (group of groups(); track group.key) {
          <button class="chip" (click)="jumpTo(group.key)">
            <span class="dot" [style.background]="group.color"></span>
            {{ group.name }}
            <span class="count">{{ group.stories.length }}</span>
          </button>
        }
      </nav>
    }

    @for (group of groups(); track group.key) {
      <section [id]="anchor(group.key)" [style.--accent]="group.color">
        <header class="head">
          <span class="dot"></span>
          <h2>{{ group.name }}</h2>
          <span class="count">{{ t().today.storyCount(group.stories.length) }}</span>
        </header>

        <div class="stories">
          @for (story of group.stories; track story.id) {
            <app-story-card [story]="story" [accent]="group.color" />
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .jump {
        /* Stays reachable while scrolling a long digest; the top bar is 120px. */
        position: sticky;
        top: calc(56px + var(--safe-top) + var(--topbar-clear, 0px));
        z-index: 20;
        margin-bottom: 6px;
        background: var(--bg);
      }
      .jump .chip {
        border-color: var(--border);
      }
      .jump .count {
        color: var(--text-dim);
        font-weight: 700;
      }
      section {
        margin-bottom: 26px;
        scroll-margin-top: calc(120px + var(--safe-top) + var(--topbar-clear, 0px));
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
    `,
  ],
})
export class TopicSections {
  private readonly topics = inject(TopicsService);
  private readonly i18n = inject(I18n);
  readonly t = this.i18n.t;

  readonly stories = input.required<Story[]>();

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

    return [...byKey.values()];
  });

  /** The live topic's colour where it still exists, so the app agrees with itself. */
  private colorFor(story: Story): string {
    const index = this.topics.topics().findIndex((t) => t.id === story.topicId);
    return index >= 0 ? TOPIC_COLORS[index % TOPIC_COLORS.length]! : colorFromName(story.topicName);
  }

  anchor(key: string): string {
    return `topic-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }

  jumpTo(key: string): void {
    document.getElementById(this.anchor(key))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
