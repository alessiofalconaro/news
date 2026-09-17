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

  signOut(): Promise<void> {
    this.access.set('unknown');
    return signOut(auth);
  }

  private async checkAccess(user: User | null): Promise<void> {
    const email = user?.email?.trim().toLowerCase();
    if (!email) {
      this.access.set('unknown');
      return;
    }
    this.access.set('checking');
    try {
      const snapshot = await getDoc(doc(db, 'allowedEmails', email));
      this.access.set(snapshot.exists() ? 'allowed' : 'denied');
    } catch {
      // The rules let a signed-in account read only its own entry, so a failure
      // here means "not on the list" just as much as a missing document does.
      this.access.set('denied');
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
