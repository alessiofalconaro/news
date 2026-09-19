import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../core/firebase';
import { AuthService } from '../core/auth.service';
import { TopicTranslator } from './topic-translator.service';
import { MAX_ACTIVE_TOPICS, Topic } from '../core/models';

/**
 * One stable colour per topic, used for the dot next to its name. With at most
 * ten topics and ten colours, position in the ordered list is enough to keep
 * them distinct: no hashing and no collision handling needed.
 */
export const TOPIC_COLORS = [
  '#e4713c',
  '#6f9fe8',
  '#4cb782',
  '#b98cf2',
  '#e3b23c',
  '#4fb8c4',
  '#ef7ba1',
  '#8fa65a',
  '#d2694f',
  '#7d8ca8',
];

export type TopicDraft = Omit<Topic, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'sortOrder'>;

@Injectable({ providedIn: 'root' })
export class TopicsService {
  private readonly auth = inject(AuthService);
  private readonly translator = inject(TopicTranslator);

  readonly topics = signal<Topic[]>([]);
  readonly ready = signal(false);

  readonly activeCount = computed(() => this.topics().filter((t) => t.isActive).length);
  readonly canActivateMore = computed(() => this.activeCount() < MAX_ACTIVE_TOPICS);

  private stopListening: (() => void) | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      const allowed = this.auth.access() === 'allowed';

      this.stopListening?.();
      this.stopListening = null;

      if (!user || !allowed) {
        this.topics.set([]);
        this.ready.set(false);
        return;
      }
      untracked(() => this.listen(user.uid));
    });
  }

  colorOf(topic: Topic): string {
    const index = this.topics().findIndex((t) => t.id === topic.id);
    return TOPIC_COLORS[(index < 0 ? 0 : index) % TOPIC_COLORS.length];
  }

  async create(draft: TopicDraft): Promise<void> {
    const uid = this.requireUid();
    const now = Date.now();
    const last = this.topics().at(-1);
    const created = await addDoc(collection(db, 'topics'), {
      ...draft,
      userId: uid,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      createdAt: now,
      updatedAt: now,
    });
    void this.nameInBothLanguages(created.id, draft.name);
  }

  async update(id: string, draft: TopicDraft): Promise<void> {
    const before = this.topics().find((t) => t.id === id);
    await updateDoc(doc(db, 'topics', id), { ...draft, updatedAt: Date.now() });
    if (before?.nameSource !== draft.name.trim()) {
      void this.nameInBothLanguages(id, draft.name);
    }
  }

  /**
   * Fills in the topic's two names, without the owner waiting for it.
   *
   * Deliberately not awaited by the caller. The topic is saved and on screen
   * the moment the write lands; the name arrives a second later and the list
   * updates itself, because it is a live subscription. Making the save wait for
   * a model call would trade a visible delay for a cosmetic detail.
   *
   * If it fails, or the service is not set up at all, nothing is said and
   * nothing is broken: the pipeline translates the same name at the next round,
   * and until then the app shows what was typed.
   */
  private async nameInBothLanguages(id: string, name: string): Promise<void> {
    const names = await this.translator.translate(name);
    if (!names) return;
    await updateDoc(doc(db, 'topics', id), {
      nameIt: names.it,
      nameEn: names.en,
      nameMeaningful: names.meaningful,
      nameSource: name.trim(),
    }).catch(() => {
      // Same story: the pipeline will do it.
    });
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, 'topics', id));
  }

  async setActive(topic: Topic, isActive: boolean): Promise<void> {
    await updateDoc(doc(db, 'topics', topic.id), { isActive, updatedAt: Date.now() });
  }

  /**
   * Moves a topic one position up or down. Both affected rows are rewritten in a
   * single batch, so the list can never be left with two identical positions.
   */
  async move(topic: Topic, direction: -1 | 1): Promise<void> {
    const list = this.topics();
    const from = list.findIndex((t) => t.id === topic.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= list.length) return;

    const other = list[to];
    const batch = writeBatch(db);
    batch.update(doc(db, 'topics', topic.id), { sortOrder: other.sortOrder });
    batch.update(doc(db, 'topics', other.id), { sortOrder: topic.sortOrder });
    await batch.commit();
  }

  private listen(uid: string): void {
    const q = query(collection(db, 'topics'), where('userId', '==', uid), orderBy('sortOrder'));
    this.stopListening = onSnapshot(
      q,
      (snapshot) => {
        this.topics.set(
          snapshot.docs.map((d) => ({ ...(d.data() as Omit<Topic, 'id'>), id: d.id })),
        );
        this.ready.set(true);
      },
      () => this.ready.set(true),
    );
  }

  private requireUid(): string {
    const uid = this.auth.user()?.uid;
    if (!uid) throw new Error('No signed-in user');
    return uid;
  }
}
