import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

/**
 * Checks for a new version at startup and every time the app comes back to the
 * foreground, then reloads itself once one is ready. Without this an installed
 * iOS PWA never updates.
 */
@Injectable({ providedIn: 'root' })
export class Updates {
  private readonly sw = inject(SwUpdate);

  start(): void {
    if (!this.sw.isEnabled) return;
    const check = () => this.sw.checkForUpdate().catch(() => {});
    check();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    this.sw.versionUpdates.subscribe(async (event) => {
      if (event.type !== 'VERSION_READY') return;
      // Activate before reloading, otherwise iOS can reload into the old version.
      await this.sw.activateUpdate().catch(() => {});
      location.reload();
    });
  }
}
