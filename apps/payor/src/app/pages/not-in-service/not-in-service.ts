import { Component } from '@angular/core';

/**
 * What answers at payor.stalltrack.site until the portal itself is built.
 *
 * It is a real page rather than a placeholder graphic, because the address is public the moment DNS resolves and a
 * stallholder may reach it before the office announces anything. It names no municipality and shows no seal: an
 * office's identity belongs to a signed-in account, and this page has none.
 *
 * Only tokens the brand preset actually defines are used here — navy, muted, gold through `eyebrow`, and the
 * display face. A class the preset does not know renders as nothing at all, which is how a page ends up looking
 * unstyled while every build passes.
 */
@Component({
  selector: 'app-not-in-service',
  template: `
    <main class="p-shell items-center justify-center px-6 text-center">
      <p class="text-[11px] font-bold uppercase leading-none tracking-[0.18em] text-gold">StallTrack</p>
      <h1 class="mt-3 font-display text-2xl text-navy">Payor Portal</h1>
      <p class="mt-4 max-w-sm text-sm leading-relaxed text-muted">
        This portal is not yet in service. Stallholders and vendors continue to view their accounts through the
        link their municipal office provides.
      </p>
      <p class="mt-6 text-xs text-muted">
        For an account or a balance, contact the office that collects your fees.
      </p>
    </main>
  `,
})
export class NotInService {}
