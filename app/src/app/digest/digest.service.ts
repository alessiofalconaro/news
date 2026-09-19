import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../core/firebase';
import { AuthService } from '../core/auth.service';
import type { Digest, Story } from '../core/models';

/** How far back the archive goes; the pipeline deletes beyond ninety days. */
const ARCHIVE_LIMIT = 90;

/**
 * Reads the digests and their stories.
 *
 * Both are written by the pipeline and read-only here, so this is a listener
 * and nothing else. The list of digests stays subscribed because the archive
 * needs it anyway and it is at most ninety short rows; the stories of one day
 * are fetched on demand, since opening an old digest is the rare case.
 */
@Injectable({ providedIn: 'root' })
export class DigestService {
  private readonly auth = inject(AuthService);

  readonly digests = signal<Digest[]>([]);
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);

  private stopListening: Unsubscribe | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      const allowed = this.auth.access() === 'allowed';

      this.stopListening?.();
      this.stopListening = null;

      if (!user || !allowed) {
        this.digests.set([]);
        this.ready.set(false);
        return;
      }
      untracked(() => this.listen(user.uid));
    });
  }

  private listen(uid: string): void {
    const q = query(
      collection(db, 'digests'),
      where('userId', '==', uid),
      orderBy('digestDate', 'desc'),
      limit(ARCHIVE_LIMIT),
    );
    this.stopListening = onSnapshot(
      q,
      (snapshot) => {
        this.digests.set(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Digest),
        );
        this.error.set(null);
        this.ready.set(true);
      },
      (e: unknown) => {
        this.error.set((e as { code?: string })?.code ?? 'error');
        this.ready.set(true);
      },
    );
  }

  /** The digest for a given local date, if it has been produced. */
  forDate(date: string): Digest | null {
    return this.digests().find((d) => d.digestDate === date) ?? null;
  }

  /**
   * Subscribes to the stories of one digest, in the order the pipeline ranked
   * them, and hands each batch to the caller.
   *
   * A callback rather than a returned signal: the caller already owns signals
   * for this, and creating new ones per subscription would mean creating them
   * inside an effect, which Angular does not allow.
   *
   * The filter on `userId` is not redundant with `digestId`, even though a
   * digest id already contains the account. Rules are not filters: a list query
   * is refused unless its own constraints prove every row it could return is
   * allowed, and the rule for stories is written in terms of `userId`.
   */
  subscribeStories(
    userId: string,
    digestId: string,
    onStories: (stories: Story[]) => void,
    onError: (code: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      query(
        collection(db, 'stories'),
        where('userId', '==', userId),
        where('digestId', '==', digestId),
        orderBy('rank'),
      ),
      (snapshot) => onStories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Story)),
      (e: unknown) => onError((e as { code?: string })?.code ?? 'error'),
    );
  }

  /**
   * Points a story's "read the article" link at another of its own sources.
   *
   * The one exception to stories being read-only here: the pipeline decides
   * everything about a story except which outlet you would rather read it in,
   * and that is not something it can know. The rules let the owner change this
   * single field and nothing else.
   */
  async setPrimaryUrl(storyId: string, url: string): Promise<void> {
    await updateDoc(doc(db, 'stories', storyId), { primaryUrl: url });
  }
}
