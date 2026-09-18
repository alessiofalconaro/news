import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { deleteDoc, doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../core/firebase';
import { AuthService } from '../core/auth.service';

/**
 * "Give me the news now."
 *
 * The digest is built on GitHub, not in the browser, and starting a job there
 * needs a key that cannot live in a page anyone can download. So the app does
 * not start anything: it leaves a request in the database, and the pipeline -
 * which wakes up every hour anyway - honours it at its next wake-up, ahead of
 * schedule.
 *
 * That makes it "within the hour" rather than instant, and it is the only route
 * that works for someone who has no access to the repository.
 */
@Injectable({ providedIn: 'root' })
export class RefreshService {
  private readonly auth = inject(AuthService);

  /** True while a request is waiting to be picked up. */
  readonly pending = signal(false);
  readonly error = signal(false);

  private stopListening: Unsubscribe | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      const allowed = this.auth.access() === 'allowed';

      this.stopListening?.();
      this.stopListening = null;

      if (!user || !allowed) {
        this.pending.set(false);
        return;
      }
      untracked(() => this.listen(user.uid));
    });
  }

  private listen(uid: string): void {
    // Live, so the button goes back to normal by itself the moment the pipeline
    // takes the request, without the reader having to reopen anything.
    this.stopListening = onSnapshot(
      doc(db, 'digestRequests', uid),
      (snapshot) => this.pending.set(snapshot.exists()),
      () => this.pending.set(false),
    );
  }

  async request(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    this.error.set(false);
    try {
      await setDoc(doc(db, 'digestRequests', user.uid), {
        userId: user.uid,
        requestedAt: Date.now(),
      });
    } catch {
      this.error.set(true);
    }
  }

  async cancel(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    await deleteDoc(doc(db, 'digestRequests', user.uid)).catch(() => this.error.set(true));
  }
}
