import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

/** How often to ask, while the app is on screen. A check is one small request. */
const CHECK_EVERY_MS = 30_000;

/**
 * Checks for a new version at startup, on a timer while the app is in the
 * foreground, and every time it comes back to the foreground, then reloads
 * itself once one is ready. Without this an installed iOS PWA never updates.
 *
 * The timer is what catches a deploy while the app just sits there open: the
 * startup check has already been and gone, and an app nobody backgrounds never
 * fires visibilitychange, so those two alone can leave it on the old version
 * indefinitely.
 */
@Injectable({ providedIn: 'root' })
export class Updates {
  private readonly sw = inject(SwUpdate);
  private timer?: ReturnType<typeof setInterval>;

  start(): void {
    if (!this.sw.isEnabled) return;
    const check = () => this.sw.checkForUpdate().catch(() => {});

    check();
    this.poll(check);

    // Polling stops while the app is hidden: no point spending requests on an
    // app nobody is looking at, and coming back runs a check straight away.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        check();
        this.poll(check);
      } else {
        clearInterval(this.timer);
        this.timer = undefined;
      }
    });

    this.sw.versionUpdates.subscribe(async (event) => {
      if (event.type !== 'VERSION_READY') return;
      // Activate before reloading, otherwise iOS can reload into the old version.
      await this.sw.activateUpdate().catch(() => {});
      location.reload();
    });
  }

  private poll(check: () => void): void {
    clearInterval(this.timer);
    this.timer = setInterval(check, CHECK_EVERY_MS);
  }
}
