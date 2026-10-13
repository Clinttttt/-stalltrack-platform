import { Component, Input } from '@angular/core';

/**
 * The frame every signed-out console screen shares - sign in, first-run setup and both password screens - so that
 * recovering an account looks like signing in to it. A compact StallTrack blue bar, one white card on the light canvas, and
 * the audit notice. The pages supply their own heading and content.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  template: `
    <div class="flex min-h-[100dvh] flex-col bg-mist">
      <header class="bg-civic text-white">
        <div class="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-5 sm:px-8">
          <img src="/stalltrack-logo.png" alt="" class="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5" />
          <div class="leading-tight">
            <div class="font-display text-lg font-bold">StallTrack</div>
            <div class="text-xs text-white/85">Platform Admin</div>
          </div>
        </div>
      </header>

      <main class="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:px-6">
        <section class="a-card w-full p-6 sm:p-8" [class]="wide ? 'max-w-xl' : 'max-w-md'">
          <ng-content />
        </section>
      </main>

      <footer class="px-5 pb-6 text-center text-xs text-muted">Authorized personnel only. Activity is recorded for audit.</footer>
    </div>
  `,
})
export class AuthShell {
  /** The first-run setup form has two columns of fields and wants a little more room. */
  @Input() wide = false;
}
