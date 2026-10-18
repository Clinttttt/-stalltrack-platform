import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The one line-icon set of the Platform (Landing and Admin).
 *
 * 24px grid, 1.8 stroke, round caps and joins, `currentColor`, decorative (`aria-hidden`): a button that holds only an icon
 * carries its own accessible name. Sizes come from the caller's class: h-4 w-4 (inline), h-5 w-5 (buttons, nav), h-6 w-6 (tiles).
 * `app-icon` is kept as a second selector so the Admin templates written before the kit existed keep working unchanged.
 *
 * Usage: <ui-icon name="check" className="h-4 w-4" />
 */
@Component({
  selector: 'ui-icon, app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 24 24"
      [attr.class]="className()"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('inbox') {
          <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        }
        @case ('check') {
          <path d="m5 13 4 4L19 7" />
        }
        @case ('x') {
          <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        }
        @case ('building') {
          <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" />
        }
        @case ('mail') {
          <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
        }
        @case ('link') {
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        }
        @case ('copy') {
          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        }
        @case ('logout') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        }
        @case ('shield') {
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" />
        }
        @case ('layers') {
          <path d="m12 2 10 5-10 5L2 7l10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />
        }
        @case ('send') {
          <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
        }
        @case ('arrowRight') {
          <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        }
        @case ('file') {
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" />
        }
        @case ('lock') {
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        }
        @case ('user') {
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        }
        @case ('activity') {
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        }
        @case ('gauge') {
          <path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" />
        }
        @case ('power') {
          <path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
        }
        @case ('key') {
          <circle cx="7.5" cy="15.5" r="4.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
        }
        @case ('building2') {
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        }
        @case ('chevronDown') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('chevronLeft') {
          <path d="m15 18-6-6 6-6" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        }
        @case ('plus') {
          <path d="M5 12h14" /><path d="M12 5v14" />
        }
        @case ('alert') {
          <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />
        }
        @case ('eye') {
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
        }
        @case ('home') {
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" />
        }
        @case ('list') {
          <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
        }
        @case ('receipt') {
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" />
        }
        @case ('ticket') {
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
        }
        @case ('zap') {
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        }
        @case ('droplet') {
          <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
        }
        @case ('download') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" />
        }
        @case ('filter') {
          <path d="M22 3H2l8 9.46V19l4 2v-8.54z" />
        }
        @case ('chevronRight') {
          <path d="m9 18 6-6-6-6" />
        }
      }
    </svg>
  `,
})
export class UiIcon {
  readonly name = input.required<string>();
  readonly className = input<string>('h-5 w-5');
}
