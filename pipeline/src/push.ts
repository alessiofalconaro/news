/**
 * The notification that says the digest is ready.
 *
 * Sent in the language the account chose, because the pipeline has no browser
 * to ask and the profile is where that choice lives.
 *
 * Subscriptions die quietly: a browser reinstalled, an app deleted, a key
 * rotated. The push service answers 404 or 410 for those, and the only correct
 * response is to delete the row - otherwise the pipeline spends every morning
 * posting to addresses nobody reads.
 */

import webpush from 'web-push';
import { getFirestore } from 'firebase-admin/firestore';
import { detail, reason, warn } from './log.ts';

let configured = false;

export function initPush(publicKey: string, privateKey: string, subject: string): void {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

/**
 * What the notification says.
 *
 * The headline of the lead story, not a status report: an alert that announces
 * a process has finished is the shape of a system talking about itself. What a
 * reader wants at a glance is the news, with the rest of the digest as the
 * quiet second line.
 */
function text(
  language: 'it' | 'en',
  lead: string,
  stories: number,
  topics: number,
): { title: string; body: string } {
  const others = stories - 1;
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

  if (language === 'en') {
    const from = `${topics} ${plural(topics, 'topic', 'topics')}`;
    return {
      title: lead,
      body: others ? `and ${others} more ${plural(others, 'story', 'stories')} from ${from}` : `from ${from}`,
    };
  }

  const da = `${topics} topic`;
  return {
    title: lead,
    body: others ? `e altre ${others} ${plural(others, 'storia', 'storie')} da ${da}` : `da ${da}`,
  };
}

export interface NotifyInput {
  userId: string;
  language: 'it' | 'en';
  stories: number;
  topics: number;
  /** Headline of the lead story, already in the right language. */
  lead: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  if (!configured) {
    detail('notifiche non configurate: salto');
    return;
  }

  const db = getFirestore();
  const subscriptions = await db
    .collection('pushSubscriptions')
    .where('userId', '==', input.userId)
    .get();

  if (subscriptions.empty) {
    detail('nessun dispositivo iscritto alle notifiche');
    return;
  }

  const { title, body } = text(input.language, input.lead, input.stories, input.topics);
  // The shape Angular's service worker expects; `onActionClick` is what makes
  // the tap open today's digest rather than just dismissing the notification.
  const payload = JSON.stringify({
    notification: {
      title,
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url: '/' } } },
    },
  });

  let sent = 0;
  let dropped = 0;

  for (const doc of subscriptions.docs) {
    const data = doc.data();
    try {
      await webpush.sendNotification(
        {
          endpoint: String(data['endpoint'] ?? ''),
          keys: { p256dh: String(data['p256dh'] ?? ''), auth: String(data['auth'] ?? '') },
        },
        payload,
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await doc.ref.delete();
        dropped += 1;
      } else {
        warn(`notifica non inviata: ${reason(error)}`);
      }
    }
  }

  detail(`notifiche inviate: ${sent}${dropped ? `, iscrizioni scadute rimosse: ${dropped}` : ''}`);
}
