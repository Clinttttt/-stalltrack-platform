import { Component, Input } from '@angular/core';

/**
 * The frame every signed-out console screen shares - sign in, first-run setup and both password screens - so that recovering an
 * account looks like signing in to it.
 *
 * Desktop and tablet: two panels. The StallTrack civic blue carries the identity (logo, what the console is for, in one sentence);
 * the white panel carries the form and nothing else. Phones: a compact blue header, then the form. The pages supply their own
 * heading and content; the frame holds no business logic and changes no behaviour of the screens inside it.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  template: `
    <div class="grid min-h-[100dvh] grid-rows-[auto_1fr] bg-white md:grid-rows-1 md:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1fr)] lg:grid-cols-2">
      <!-- Phones: compact brand header -->
      <header class="bg-civic text-white md:hidden">
        <div class="flex items-center gap-3 px-5 py-4">
          <img src="/stalltrack-logo.png" alt="" class="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5" />
          <div class="leading-tight">
            <div class="font-display text-lg font-bold">StallTrack</div>
            <div class="text-xs text-white/85">Platform Admin</div>
          </div>
        </div>
      </header>

      <!-- Tablet and desktop: brand panel -->
      <aside class="hidden flex-col justify-between bg-civic p-10 text-white md:flex lg:p-14">
        <div class="flex items-center gap-3">
          <img src="/stalltrack-logo.png" alt="" class="h-11 w-11 shrink-0 rounded-full bg-white object-contain p-0.5" />
          <div class="leading-tight">
            <div class="font-display text-xl font-bold">StallTrack</div>
            <div class="text-sm text-white/85">Platform Admin</div>
          </div>
        </div>

        <div class="max-w-md py-12">
          <h2 class="font-display text-3xl font-bold leading-tight lg:text-[2.6rem] lg:leading-[1.1]">Municipal onboarding, managed in one place.</h2>
          <p class="mt-4 text-base leading-relaxed text-white/90">Review LGU assessments, validate configurations, and oversee activation.</p>
        </div>

        <p class="text-sm text-white/85">Authorized personnel only. Activity is recorded for audit.</p>
      </aside>

      <!-- The form: the only part that changes from screen to screen -->
      <main class="flex min-w-0 flex-col bg-white">
        <div class="flex flex-1 items-start justify-center px-5 py-10 sm:px-10 md:items-center md:py-12">
          <section class="w-full" [class]="wide ? 'max-w-xl' : 'max-w-md'">
            <ng-content />
          </section>
        </div>
        <p class="px-5 pb-6 text-center text-xs text-muted md:hidden">Authorized personnel only. Activity is recorded for audit.</p>
      </main>
    </div>
  `,
})
export class AuthShell {
  /** The first-run setup form has two columns of fields and wants a little more room. */
  @Input() wide = false;
}
