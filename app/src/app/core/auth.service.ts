import { Injectable, inject, signal } from '@angular/core';
import {
  User,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { I18n } from '../i18n/i18n.service';

/**
 * `unknown` before anyone is signed in, `checking` while the allowed-emails
 * lookup is in flight, then the verdict.
 */
export type Access = 'unknown' | 'checking' | 'allowed' | 'denied';

/**
 * Google sign-in plus the allow list (PROJECT_SPEC 4).
 *
 * The check runs twice on purpose: here, so the UI can say "not allowed"
 * instead of showing an empty app, and again in `firestore.rules`, which is the
 * one that actually stops anyone. A check that only lives in the browser is
 * decoration.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly i18n = inject(I18n);

  readonly user = signal<User | null>(null);
  /** True once Firebase has told us whether anyone is signed in. */
  readonly ready = signal(false);
  readonly access = signal<Access>('unknown');
  readonly error = signal<string | null>(null);

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.user.set(user);
      this.ready.set(true);
      void this.checkAccess(user);
    });

    // Completes a sign-in that went through the redirect fallback.
    getRedirectResult(auth).catch((e: unknown) => {
      const code = errorCode(e);
      if (code) this.error.set(this.message(code));
    });
  }

  async signIn(): Promise<void> {
    this.error.set(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: unknown) {
      const code = errorCode(e);
      // The user simply closed the popup: nothing to report.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      // Popup blocked, which several mobile browsers do: fall back to a redirect.
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          // fall through to the generic message below
        }
      }
      this.error.set(this.message(code));
    }
  }

  /**
   * A fresh ID token for the signed-in account, or null when nobody is.
   *
   * Used to prove who is calling the translator service. Firebase refreshes it
   * on its own when it is close to expiring, so this is cheap to ask for.
   */
  async idToken(): Promise<string | null> {
    const user = this.user();
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }

  signOut(): Promise<void> {
    this.access.set('unknown');
    return signOut(auth);
  }

  /**
   * The allow list, with the previous answer used to get out of the way.
   *
   * The lookup is a network round trip, and putting every launch behind it made
   * the app open on a waiting screen even for someone who has been using it for
   * weeks. So an address that was allowed last time is let through immediately
   * and verified behind its back; if the answer has changed, the screen changes
   * with it a moment later. Nothing is risked by being optimistic here - this
   * check only decides what the app shows. What actually stops anyone is
   * `firestore.rules`, which is asked again on every single read.
   */
  private async checkAccess(user: User | null): Promise<void> {
    const email = user?.email?.trim().toLowerCase();
    if (!email) {
      this.access.set('unknown');
      return;
    }

    const known = remembered() === email;
    this.access.set(known ? 'allowed' : 'checking');

    try {
      const allowed = (await getDoc(doc(db, 'allowedEmails', email))).exists();
      this.access.set(allowed ? 'allowed' : 'denied');
      remember(allowed ? email : null);
    } catch {
      // The rules let a signed-in account read only its own entry, so a refusal
      // means "not on the list" just as much as a missing document does. But an
      // aeroplane looks exactly the same from here, and locking someone out of
      // an app whose stories are already on the device would be absurd: if they
      // got in last time, they stay in.
      if (!known) this.access.set('denied');
    }
  }

  /** Readable message, with the technical code kept for remote debugging. */
  private message(code: string): string {
    const t = this.i18n.t().auth;
    const base =
      code === 'auth/unauthorized-domain'
        ? t.errorUnauthorizedDomain
        : code === 'auth/network-request-failed'
          ? t.errorNetwork
          : t.errorGeneric;
    return code ? `${base} (${code})` : base;
  }
}

function errorCode(e: unknown): string {
  return (e as { code?: string })?.code ?? '';
}

/**
 * The last address the allow list said yes to, on this device.
 *
 * An address and nothing else: it grants nothing on its own, and a copy of it
 * in someone else's hands is a copy of an address they would have to be signed
 * in as to use.
 */
const ALLOWED_KEY = 'newsdigest-allowed';

function remembered(): string | null {
  try {
    return localStorage.getItem(ALLOWED_KEY);
  } catch {
    return null;
  }
}

function remember(email: string | null): void {
  try {
    if (email) localStorage.setItem(ALLOWED_KEY, email);
    else localStorage.removeItem(ALLOWED_KEY);
  } catch {
    // Blocked storage: every launch checks afresh, which is what it did before.
  }
}
