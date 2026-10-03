import { Component, computed, inject } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { ViewModeService } from './view-mode.service';

/**
 * The switch between the two layouts.
 *
 * Its own component because it belongs beside the stories, and the stories
 * appear on two screens: on Today and again on each day opened in the archive.
 * It reads and writes one shared setting, so wherever you press it the other
 * screen already agrees.
 *
 * Drawn rather than typed. As characters the two icons sat at different heights
 * inside the button, because a glyph's position in its own em box is the font's
 * business and no amount of centring reaches it. Each icon shows the layout you
 * would get, not the one you are in. Neither may be three plain bars: that is a
 * menu button everywhere else on a phone, and this one opens nothing.
 */
@Component({
  selector: 'app-view-toggle',
  template: `
    <button class="icon-btn view-toggle" (click)="viewMode.toggle()" [attr.aria-label]="label()">
      @if (viewMode.mode() === 'list') {
        <!-- One card at a time, with the next ones waiting at the sides. -->
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="6.5" y="4" width="7" height="12" rx="1.5" />
          <path d="M3.5 7.5v5M16.5 7.5v5" />
        </svg>
      } @else {
        <!-- Rows, each with its picture: the list as it actually looks. -->
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 6h9M3 14h9" />
          <rect x="14" y="4" width="3.5" height="3.5" rx="1" />
          <rect x="14" y="12.5" width="3.5" height="3.5" rx="1" />
        </svg>
      }
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: none;
      }
      /* the round glass button of styles.scss (.icon-btn) */
      .view-toggle {
        width: 42px;
        height: 42px;
      }
      .view-toggle svg {
        width: 20px;
        height: 20px;
        /* The box is the icon: stroked, never filled, so it stays crisp and
           follows the button colour. */
        fill: none;
        stroke: currentColor;
        stroke-width: 1.6;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

    `,
  ],
})
export class ViewToggle {
  private readonly i18n = inject(I18n);
  readonly viewMode = inject(ViewModeService);

  readonly label = computed(() =>
    this.viewMode.mode() === 'list'
      ? this.i18n.t().today.layoutToCards
      : this.i18n.t().today.layoutToList,
  );
}
