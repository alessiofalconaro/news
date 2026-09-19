import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { TRANSLATOR_URL, translatorConfigured } from '../core/translator.config';
import type { TopicNames } from '../core/models';

/** A name is a label. Anything longer is not one, and is left alone. */
const MAX_NAME = 80;

/**
 * Asks the translator service for a topic's name in both languages.
 *
 * Every call here is a convenience, never a requirement. The pipeline
 * translates the same names on its own schedule, so if this service is not set
 * up, is unreachable, or simply says no, the only consequence is that the name
 * keeps the language it was typed in until the next round - which is precisely
 * what happened before this existed. That is why nothing here throws and the
 * failures are not reported to the reader: there is nothing for them to do
 * about it, and the thing fixes itself.
 */
@Injectable({ providedIn: 'root' })
export class TopicTranslator {
  private readonly auth = inject(AuthService);

  async translate(name: string): Promise<TopicNames | null> {
    const trimmed = name.trim();
    if (!translatorConfigured || !trimmed || trimmed.length > MAX_NAME) return null;

    const token = await this.auth.idToken();
    if (!token) return null;

    try {
      const response = await fetch(TRANSLATOR_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) return null;

      const data = (await response.json()) as Partial<TopicNames>;
      if (typeof data.it !== 'string' || typeof data.en !== 'string') return null;
      if (!data.it.trim() || !data.en.trim()) return null;

      return {
        it: data.it.trim(),
        en: data.en.trim(),
        meaningful: data.meaningful !== false,
      };
    } catch {
      return null;
    }
  }
}
