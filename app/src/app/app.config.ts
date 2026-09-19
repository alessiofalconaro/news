import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { PreloadAllModules, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // The four pages are loaded on demand, which keeps the first paint small
    // but made the first visit to each one wait for its own file - noticeable
    // on a phone that has just woken up, and invisible afterwards, which is
    // exactly the shape of "slow the first time, and not always". Preloading
    // fetches them quietly once the app is running and idle: the first paint
    // still carries only what it needs, and by the time a section is tapped
    // its code is already in hand.
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
