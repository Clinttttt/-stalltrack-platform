import { Component, Input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * The frame every signed-out console screen shares - sign in, first-run setup and both password screens - so that recovering an
 * account looks like signing in to it.
 *
 * Tablet and desktop: two panels. The left carries the identity over the courthouse illustration (logo, one headline, one sentence, the audit
 * line); a pale wash on its left keeps the type legible while the building stays visible on the right. The right panel carries the
 * form and nothing else. Phones: a short illustrated header with the logo, then the form. The pages supply their own
 * heading and content; the frame holds no business logic and changes no behaviour of the screens inside it.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [Icon],
  template: `
    <div class="grid min-h-[100dvh] grid-rows-[auto_1fr] bg-tint md:grid-cols-[minmax(0,1fr)_minmax(24rem,1fr)] md:grid-rows-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(30rem,1fr)]">
      <!-- Phones: a compact illustrated header -->
      <header class="relative overflow-hidden border-b border-tint-line bg-tint md:hidden">
        <img src="/brand/courthouse.png" alt="" class="absolute inset-0 h-full w-full object-cover object-[78%_70%]" />
        <div class="absolute inset-0 bg-gradient-to-r from-tint via-tint/85 to-tint/30"></div>
        <div class="relative flex items-center gap-3 px-5 py-6 sm:px-10">
          <img src="/brand/stalltrack-seal.png" alt="" class="h-12 w-12 shrink-0 object-contain" />
          <div class="leading-tight">
            <div class="font-display text-2xl font-bold text-civic-deep">StallTrack</div>
            <div class="text-sm text-muted">Platform Admin</div>
          </div>
        </div>
      </header>

      <!-- Tablet and desktop: the identity panel -->
      <aside class="relative hidden overflow-hidden bg-tint md:block">
        <img src="/brand/courthouse.png" alt="" class="absolute inset-0 h-full w-full object-cover object-right-bottom" />
        <div class="absolute inset-0 bg-gradient-to-r from-tint/95 via-tint/60 to-transparent"></div>
        <div class="relative flex h-full flex-col justify-between p-10 lg:p-14 xl:px-20 xl:py-16">
          <div class="flex items-center gap-5">
            <img src="/brand/stalltrack-seal.png" alt="" class="h-16 w-16 shrink-0 object-contain lg:h-[5.5rem] lg:w-[5.5rem]" />
            <div class="leading-tight">
              <div class="font-display text-3xl font-bold tracking-tight text-civic-deep lg:text-[2.6rem]">StallTrack</div>
              <div class="mt-1 text-base text-muted lg:text-lg">Platform Admin</div>
            </div>
          </div>

          <div class="max-w-[32rem] py-10">
            <div class="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              <span class="h-px w-10 bg-civic-deep/50" aria-hidden="true"></span>Local governance. Higher standards.
            </div>
            <h2 class="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-civic-deep lg:text-5xl xl:text-[3.4rem]">
              Municipal onboarding, managed in one place.
            </h2>
            <p class="mt-5 max-w-sm text-base leading-relaxed text-ink/70 lg:text-lg">
              Review LGU assessments, validate configurations, and oversee activation.
            </p>
          </div>

          <p class="flex items-center gap-4 text-sm text-ink/65">
            <span class="h-px w-10 bg-civic-deep/50" aria-hidden="true"></span>
            Authorized personnel only. Activity is recorded for audit.
          </p>
        </div>
      </aside>

      <!-- The form: the only part that changes from screen to screen. A pale paper surface, lifted off the illustration by a soft edge. -->
      <main class="relative flex min-w-0 flex-col bg-gradient-to-b from-white to-tint md:shadow-[-18px_0_40px_-24px_rgba(22,60,107,0.35)]">
        <div class="flex flex-1 items-start justify-center px-5 py-10 sm:px-10 md:items-center lg:px-16 lg:py-16">
          <section class="w-full animate-ui-rise" [class]="wide ? 'max-w-xl' : 'max-w-[27rem]'">
            <ng-content />
            <div class="mt-12 hidden items-center justify-center gap-5 border-t border-tint-line pt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted sm:flex">
              <span>Service</span><span class="h-3 w-px bg-line" aria-hidden="true"></span><span>Integrity</span><span class="h-3 w-px bg-line" aria-hidden="true"></span><span>Trust</span>
            </div>
          </section>
        </div>
        <p class="flex items-center justify-center gap-2 px-5 pb-6 text-center text-xs text-muted md:hidden">
          <app-icon name="shield" className="h-4 w-4 text-civic" />
          Authorized personnel only. Activity is recorded for audit.
        </p>
      </main>
    </div>

  `,
})
export class AuthShell {
  /** The first-run setup form has two columns of fields and wants a little more room. */
  @Input() wide = false;
}
