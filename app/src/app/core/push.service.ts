import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { AuthService } from './auth.service';
import { VAPID_PUBLIC_KEY, pushConfigured } from './push.config';

/**
 * Push notifications.
 *
 * The subscription is stored in Firestore because the sender is the pipeline,
 * which has no browser: it reads the endpoint and the two keys from there and
 * posts to the push service.
 *
 * On iPhone none of this exists until the app has been added to the home
 * screen, and the permission prompt only appears in response to a tap. Both
 * constraints shape the interface: a button, never an automatic request, and a
 * clear sentence when the browser cannot do it at all.
 */
export type PushState = 'unsupported' | 'notConfigured' | 'off' | 'on' | 'denied';

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly swPush = inject(SwPush);
  private readonly auth = inject(AuthService);

  readonly state = signal<PushState>('off');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.refresh();
  }

  /** Works out where we stand without asking the user for anything. */
  async refresh(): Promise<void> {
    if (!pushConfigured) {
      this.state.set('notConfigured');
      return;
    }
    if (!this.swPush.isEnabled || !('Notification' in window)) {
      this.state.set('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      this.state.set('denied');
      return;
    }
    this.state.set((await this.current()) ? 'on' : 'off');
  }

  async enable(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: VAPID_PUBLIC_KEY,
      });
      await this.store(subscription);
      this.state.set('on');
    } catch (e: unknown) {
      // A refused prompt lands here too, and is not worth an error banner.
      if (Notification.permission === 'denied') this.state.set('denied');
      else this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }

  async disable(): Promise<void> {
    this.busy.set(true);
    try {
      const subscription = await this.current();
      if (subscription) {
        await this.forget(subscription.endpoint);
        await subscription.unsubscribe().catch(() => undefined);
      }
      this.state.set('off');
    } finally {
      this.busy.set(false);
    }
  }

  /** Read from the browser rather than from an observable: one await, no stream. */
  private async current(): Promise<PushSubscription | null> {
    const registration = await navigator.serviceWorker.getRegistration();
    return (await registration?.pushManager.getSubscription()) ?? null;
  }

  private async store(subscription: PushSubscription): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    const raw = subscription.toJSON();
    // The endpoint is the identity of a subscription, and it is far too long
    // for a document id, so it is hashed into one.
    const id = await hash(subscription.endpoint);
    await setDoc(doc(db, 'pushSubscriptions', id), {
      userId: user.uid,
      endpoint: subscription.endpoint,
      p256dh: raw.keys?.['p256dh'] ?? '',
      auth: raw.keys?.['auth'] ?? '',
      createdAt: Date.now(),
    });
  }

  private async forget(endpoint: string): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    const found = await getDocs(
      query(
        collection(db, 'pushSubscriptions'),
        where('userId', '==', user.uid),
        where('endpoint', '==', endpoint),
      ),
    );
    await Promise.all(found.docs.map((d) => deleteDoc(d.ref)));
  }
}

async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
