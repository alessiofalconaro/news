import { Injectable, computed, inject, signal } from '@angular/core';
import { ViewModeService } from './view-mode.service';

/**
 * Which topics the reader is currently looking at.
 *
 * Empty means all of them, which is the ordinary case: the filter is something
 * you reach for when you want one subject and not the others, and it should
 * cost nothing when you do not. More than one topic can be on at a time - the
 * chips are a selection, not a radio button.
 *
 * Shared rather than kept inside the digest view, because it also decides the
 * layout (a single topic reads better stacked) and the layout switch lives on
 * the page header, outside that view. It deliberately survives moving between
 * today and the archive: a filter you set is a filter you meant.
 */
@Injectable({ providedIn: 'root' })
export class TopicFilterService {
  private readonly viewMode = inject(ViewModeService);

  private readonly chosen = signal<ReadonlySet<string>>(new Set());

  readonly selected = this.chosen.asReadonly();
  readonly count = computed(() => this.chosen().size);
  readonly filtering = computed(() => this.chosen().size > 0);

  has(key: string): boolean {
    return this.chosen().has(key);
  }

  toggle(key: string): void {
    const next = new Set(this.chosen());
    if (!next.delete(key)) next.add(key);
    this.apply(next);
  }

  clear(): void {
    if (this.chosen().size) this.apply(new Set());
  }

  private apply(next: ReadonlySet<string>): void {
    this.chosen.set(next);
    this.viewMode.forceList(next.size === 1);
  }
}
