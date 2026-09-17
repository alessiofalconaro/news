import { Injectable, computed, signal } from '@angular/core';
import { it } from './it';
import { en } from './en';

export type Lang = 'it' | 'en';

const STORAGE_KEY = 'lang';
const DICTIONARIES = { it, en };

/**
 * Language of the whole app: labels, dates and the version of each story that
 * gets shown. Switching is instant because every template reads `t()`, a
 * computed signal, so Angular re-renders without a reload (PROJECT_SPEC 8.1).
 *
 * The profile is the long-term home of this setting; `localStorage` only keeps
 * the last choice so the first frame after a reload is already right, before
 * Firestore has answered.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>(initialLang());

  /** The active dictionary. Templates read `i18n.t().nav.today`. */
  readonly t = computed(() => DICTIONARIES[this.lang()]);

  /** BCP 47 tag for `Intl`. */
  readonly locale = computed(() => (this.lang() === 'it' ? 'it-IT' : 'en-GB'));

  constructor() {
    this.applyDocumentLang(this.lang());
  }

  set(lang: Lang): void {
    if (lang === this.lang()) return;
    this.lang.set(lang);
    this.applyDocumentLang(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private mode or blocked storage: the profile still carries the choice.
    }
  }

  toggle(): void {
    this.set(this.lang() === 'it' ? 'en' : 'it');
  }

  /** "17 settembre" / "17 September" */
  dayAndMonth(date: Date): string {
    return new Intl.DateTimeFormat(this.locale(), { day: 'numeric', month: 'long' }).format(date);
  }

  /** "mercoledì 17 settembre 2026" / "Wednesday 17 September 2026" */
  fullDate(date: Date): string {
    return new Intl.DateTimeFormat(this.locale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  /** "08:12" in both languages; en-GB keeps the 24h clock. */
  time(date: Date): string {
    return new Intl.DateTimeFormat(this.locale(), {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private applyDocumentLang(lang: Lang): void {
    document.documentElement.lang = lang;
  }
}

/**
 * First run: the browser language if it is one we speak, Italian otherwise
 * (PROJECT_SPEC 8.1). After that, whatever was chosen last.
 */
function initialLang(): Lang {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  if (stored === 'it' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'it';
}
