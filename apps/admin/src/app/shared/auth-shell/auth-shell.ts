import { Component, Input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * The console's split brand/form furniture, shared by the screens a signed-out operator can reach.
 *
 * The sign-in and first-run setup pages each carry their own copy of this markup, which is how they were written and is
 * left alone: they are working screens and a refactor of them buys nothing today. The password screens added beside them
 * take it from here instead, so recovering an account looks like signing in to it without a third and fourth copy of the
 * same panel drifting apart from the first two.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [Icon],
  template: `
    <div class="grid h-[100dvh] overflow-hidden bg-mist lg:grid-cols-[1.05fr,0.95fr]">
      <!-- Brand panel -->
      <div class="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col lg:p-12">
        <div
          class="pointer-events-none absolute inset-0 opacity-[0.07]"
          style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0); background-size: 22px 22px;"
        ></div>
        <div class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold/10 blur-3xl"></div>

        <div class="relative flex items-center gap-3">
          <img src="/stalltrack-logo.png" alt="StallTrack" class="h-11 w-11 shrink-0 object-contain" />
          <div class="leading-tight">
            <div class="font-display text-xl font-bold tracking-wide">StallTrack</div>
            <div class="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">Platform Admin</div>
          </div>
        </div>

        <div class="relative flex flex-1 flex-col justify-center py-10">
          <div class="max-w-md">
            <span class="eyebrow">Restricted access</span>
            <h1 class="mt-4 font-display text-4xl font-bold leading-tight">{{ headline }}</h1>
            <p class="mt-4 text-base leading-relaxed text-white/70">{{ blurb }}</p>
          </div>
        </div>

        <div class="relative flex items-center gap-3 text-sm text-white/60">
          <app-icon name="shield" className="h-5 w-5 text-gold" />
          <span>Authorized personnel only. Activity is recorded for audit.</span>
        </div>
      </div>

      <!-- Form panel: the only scrolling region. -->
      <div class="flex items-start justify-center overflow-y-auto px-5 py-12 sm:px-10">
        <div class="my-auto w-full max-w-sm">
          <div class="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/stalltrack-logo.png" alt="StallTrack" class="h-10 w-10 shrink-0 object-contain" />
            <div class="leading-tight">
              <div class="font-display text-lg font-bold text-navy">StallTrack</div>
              <div class="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">Platform Admin</div>
            </div>
          </div>

          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class AuthShell {
  /** What the brand panel says this screen is for. */
  @Input() headline = 'LGU assessment & onboarding console.';
  @Input() blurb =
    'The platform-operator workspace for reviewing municipality assessment requests, approving rollouts, and managing staged onboarding across the CARCANMADCARLAN cluster.';
}
