import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

// iOS Safari only fires :active styles on elements that have a touch listener.
// Added from JS rather than an inline handler so it survives a strict CSP.
document.body.addEventListener('touchstart', () => {}, { passive: true });
