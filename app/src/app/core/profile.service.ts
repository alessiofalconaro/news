import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AuthService } from './auth.service';
import { I18n } from '../i18n/i18n.service';
import { DEFAULT_DIGEST_HOUR, Lang, Profile } from './models';

/**
 * The user's own document: identity plus the language the whole app runs in.
 *
 * The language lives here rather than only in `localStorage` because the daily
 * push notification is sent by the pipeline, which has no access to a browser
 * (PROJECT_SPEC 8.1).
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18n);

  readonly profile = signal<Profile | null>(null);
  readonly ready = signal(false);

  /** Set once the stored language has been applied, so we stop overriding the user. */
  private languageApplied = false;
  private stopListening: (() => void) | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      const allowed = this.auth.access() === 'allowed';

      this.stopListening?.();
      this.stopListening = null;

      if (!user || !allowed) {
        this.profile.set(null);
        this.ready.set(false);
        this.languageApplied = false;
        return;
      }
      untracked(() => this.listen(user.uid, user.email ?? '', user.displayName ?? ''));
    });

    // Any later change of language, from the header toggle or from Settings,
    // is written back to the profile.
    effect(() => {
      const lang = this.i18n.lang();
      const profile = untracked(() => this.profile());
      if (!profile || !this.languageApplied || profile.language === lang) return;
      void updateDoc(doc(db, 'profiles', profile.id), { language: lang }).catch(() => {
        // Offline: the write is queued by the persistent cache.
      });
    });
  }

  /** The hour this account wants its digest, in Italian local time. */
  async setDigestHour(hour: number): Promise<void> {
    const profile = this.profile();
    if (!profile) return;
    await updateDoc(doc(db, 'profiles', profile.id), { digestHour: hour });
  }

  private listen(uid: string, email: string, displayName: string): void {
    this.stopListening = onSnapshot(
      doc(db, 'profiles', uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          void this.create(uid, email, displayName);
          return;
        }
        const data = snapshot.data() as Omit<Profile, 'id'>;
        this.profile.set({ ...data, id: uid });
        this.ready.set(true);

        // First load after sign-in: the stored language wins over the guess we
        // made from the browser. After that the user's toggle wins.
        if (!this.languageApplied) {
          this.languageApplied = true;
          this.i18n.set(data.language);
        }
      },
      () => this.ready.set(true),
    );
  }

  private async create(uid: string, email: string, displayName: string): Promise<void> {
    const language: Lang = this.i18n.lang();
    await setDoc(doc(db, 'profiles', uid), {
      email: email.toLowerCase(),
      displayName,
      language,
      digestHour: DEFAULT_DIGEST_HOUR,
      createdAt: Date.now(),
    }).catch(() => {
      // Rules rejected it, which means the account is not on the allow list.
    });
  }
}
