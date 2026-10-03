import { Component, effect, input, signal } from '@angular/core';
import { started } from './splash';

const LETTERS = [...'NewsDigest'];

/**
 * The app's mark: the icon tile, drawn in SVG so its lines can move, and
 * "NewsDigest" in the masthead serif. Styles and keyframes are global (styles.scss,
 * "The mark"), shared with the splash written by hand in index.html.
 *
 * In the top bar it plays the discreet sequel of the splash: the tile settles,
 * one signal ring goes out, the three lines of print run out again and the
 * letters slide up into place. On entering the app, and on every tap.
 */
@Component({
  selector: 'app-mark',
  host: { '(click)': 'replay()' },
  template: `
    <span class="mark" [class.play]="play()" [class.large]="large()">
      <span class="mark-tile">
        <span class="wave"></span>
        <svg viewBox="0 0 512 512" aria-hidden="true">
          <rect class="tile-bg" width="512" height="512" rx="114" />
          <rect class="line" x="112" y="150" width="224" height="30" rx="15" />
          <rect class="line" x="112" y="226" width="170" height="30" rx="15" />
          <rect class="line" x="112" y="302" width="116" height="30" rx="15" />
          <rect class="rule" x="368" y="126" width="32" height="260" rx="16" />
        </svg>
      </span>
      <span class="mark-word" aria-hidden="true">
        @for (c of letters; track $index) {
          <span class="ch" [class.digest]="$index >= 4" [style.--i]="$index">{{ c }}</span>
        }
      </span>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        min-width: 0;
        cursor: pointer;
      }
      .mark {
        display: inline-flex;
        align-items: center;
        gap: 0.45em;
        min-width: 0;
        font-size: 1.15rem;
      }
      .mark-tile {
        width: 1.45em;
        height: 1.45em;
      }
      .mark-tile svg {
        filter: drop-shadow(0 4px 10px color-mix(in srgb, var(--brand) 45%, transparent));
      }
      .large {
        font-size: 1.9rem;
        flex-direction: column;
        gap: 0.4em;
      }
      .large .mark-tile {
        width: 2.4em;
        height: 2.4em;
      }

      .play .mark-tile {
        animation: tile-settle 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
      }
      .play .wave {
        animation: wave-soft 0.8s cubic-bezier(0.2, 0.7, 0.3, 1) 0.15s both;
      }
      .play .line {
        animation: print 0.32s cubic-bezier(0.3, 0.7, 0.2, 1) both;
      }
      .play .line:nth-of-type(1) {
        animation-delay: 0.12s;
      }
      .play .line:nth-of-type(2) {
        animation-delay: 0.2s;
      }
      .play .line:nth-of-type(3) {
        animation-delay: 0.28s;
      }
      .play .ch {
        animation: slide-up 0.38s cubic-bezier(0.2, 0.8, 0.3, 1) both;
        animation-delay: calc(0.1s + var(--i) * 28ms);
      }
    `,
  ],
})
export class Mark {
  /** Large variant (sign-in screens): tile above, name below. */
  readonly large = input(false);
  readonly play = signal(false);
  readonly letters = LETTERS;

  constructor() {
    effect(() => {
      // Both marks of the shell (top bar, sidebar) live as long as the app,
      // so this fires once: when the splash leaves.
      if (started()) this.play.set(true);
    });
  }

  /** Off, then on two frames later: removing and re-adding the class is what
   *  restarts a CSS animation. */
  replay(): void {
    this.play.set(false);
    requestAnimationFrame(() => requestAnimationFrame(() => this.play.set(true)));
  }
}
