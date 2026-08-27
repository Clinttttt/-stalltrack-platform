import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * The portal's footer navigation, in the order the payor reads: what they hold, what they owe, what they have paid.
 *
 * Fixed to the bottom because the portal is used one-handed at a stall, and the three destinations are the whole app.
 * The active link is marked by colour and weight rather than by an icon change, matching the office's other screens.
 */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="sticky bottom-0 mt-auto grid grid-cols-3 border-t border-line bg-white/95 backdrop-blur">
      <a
        class="flex flex-col items-center gap-1 py-3 text-[11px] font-semibold text-muted"
        routerLink="/"
        routerLinkActive="text-navy"
        [routerLinkActiveOptions]="{ exact: true }"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        Accounts
      </a>
      <a
        class="flex flex-col items-center gap-1 py-3 text-[11px] font-semibold text-muted"
        routerLink="/balances"
        routerLinkActive="text-navy"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        Balances
      </a>
      <a
        class="flex flex-col items-center gap-1 py-3 text-[11px] font-semibold text-muted"
        routerLink="/history"
        routerLinkActive="text-navy"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        History
      </a>
    </nav>
  `,
})
export class BottomNav {}
